import root from "./root.js";
import io from "./io.js";
import fs from "./fileSystem.js";
import type { FileStored, Folder, Tree } from "../types/folder.js";

type FolderEntry = Record<string, number>;

const rootFolder = async (): Promise<Folder> => fs.parse(await root());

const basename = (path: string): string => path.split('/').filter(Boolean).at(-1) ?? path;

const getFolder = async (path: string): Promise<Folder> => {
    const target = await fs.relative(await rootFolder(), path);
    if (!target || !('folders' in target)) {
        throw new Error("Folder not found");
    }

    return target;
}

const getParentAndName = async (path: string): Promise<{parent: Folder, name: string}> => {
    const parts = path.split('/').filter(Boolean);
    const name = parts.pop();
    if (!name) throw new Error("Target not found");

    return {
        parent: await getFolder(parts.join('/')),
        name
    };
}

const findEntry = (folder: Folder, name: string): {entries: FolderEntry, id: number, isFolder: boolean} => {
    if (name in folder.files) {
        return {entries: folder.files, id: folder.files[name], isFolder: false};
    }

    if (name in folder.folders) {
        return {entries: folder.folders, id: folder.folders[name], isFolder: true};
    }

    throw new Error("Target not found");
}

const folderBlob = (folder: Folder): Blob => new Blob([fs.toString(folder)], {type: 'text/plain'});

const writeFolder = (folder: Folder) =>
    io.msg.edit.file(folder.id, {file: folderBlob(folder), filename: basename(folder.dir)});

const addFile = async (filename: string, content: Blob, path: string) => {
    const folder = await getFolder(path);
    const msg = await io.msg.sendFile(filename, {file: content, filename}, {reply_parameters: {message_id: folder.id}});
    folder.files[filename] = msg.message_id;
    await writeFolder(folder);
}

const addFolder = async (foldername: string, path: string) => {
    const folder = await getFolder(path);
    const msg = await io.msg.sendFile(foldername, {file: new Blob([''], {type: 'text/plain'}), filename: foldername},
        {reply_parameters: {message_id: folder.id}});
    const resultingFolder: Folder = {
        id: msg.message_id,
        dir: foldername,
        parent: folder.id,
        files: {},
        folders: {}
    }

    folder.folders[foldername] = msg.message_id;
    await Promise.all([
        io.msg.edit.file(resultingFolder.id, {file: folderBlob(resultingFolder), filename: foldername}),
        writeFolder(folder)
    ]);
}

const rename = async (path: string, newName: string) => {
    const {parent, name} = await getParentAndName(path);
    const entry = findEntry(parent, name);
    delete entry.entries[name];
    entry.entries[newName] = entry.id;

    const folderEditPromise = entry.isFolder
        ? io.msg.fileText(entry.id)
            .then(fs.parse)
            .then(renamed => ({...renamed, dir: newName}))
            .then(renamed => io.msg.edit.file(entry.id, {file: folderBlob(renamed), filename: newName}))
        : Promise.resolve();

    await Promise.all([
        writeFolder(parent),
        io.msg.edit.text(entry.id, newName),
        folderEditPromise
    ]);
}

const move = async (source: string, destination: string) => {
    const {parent: sourceFolder, name: sourceTarget} = await getParentAndName(source);
    const sourceEntry = findEntry(sourceFolder, sourceTarget);
    delete sourceEntry.entries[sourceTarget];

    const destinationFolder = await getFolder(destination);
    const destinationEntries = sourceEntry.isFolder ? destinationFolder.folders : destinationFolder.files;
    destinationEntries[sourceTarget] = sourceEntry.id;

    const movedFolderEditPromise = sourceEntry.isFolder
        ? io.msg.fileText(sourceEntry.id)
            .then(fs.parse)
            .then(moved => ({...moved, parent: destinationFolder.id}))
            .then(writeFolder)
        : Promise.resolve();

    await Promise.all([
        writeFolder(sourceFolder),
        writeFolder(destinationFolder),
        movedFolderEditPromise
    ]);
}

const remove = async (path: string) => {
    const {parent, name} = await getParentAndName(path);
    const entry = findEntry(parent, name);
    delete entry.entries[name];
    await writeFolder(parent);
}

const listDir = async (path: string) => {
    const folder = await getFolder(path);
    return Object.keys(folder.folders).map(key => key + '/').concat(Object.keys(folder.files)).join('\n');
}

const getFile = async (path: string) => {
    const file = await fs.relative(await rootFolder(), path) as FileStored | Folder | null;
    if (!file || 'folders' in file) {
        throw new Error("File not found");
    }

    return io.msg.readFile(file.id);
}

const subTree = (node: Tree, prefix: string) => {
    const lines: string[] = [];
    const folderNames = Object.keys(node.folders ?? {}).sort();
    const fileNames = Object.keys(node.files ?? {}).sort();
    const entries = [
        ...folderNames.map(name => ({name, type: 'folder'} as const)),
        ...fileNames.map(name => ({name, type: 'file'} as const))
    ];

    entries.forEach((entry, index) => {
        const isLast = index === entries.length - 1;
        const branch = `${prefix}${isLast ? '`-- ' : '|-- '}`;

        if (entry.type === 'folder') {
            lines.push(`${branch}${entry.name}/`);
            lines.push(...subTree(node.folders[entry.name] as Tree, `${prefix}${isLast ? '    ' : '|   '}`));
        } else {
            lines.push(`${branch}${entry.name}`);
        }
    });
    return lines;
};

const tree = async (path: string, levels = -1) => {
    const folder = await getFolder(path);
    const content = await fs.tree(await io.msg.fileText(folder.id), levels);
    return [`${content.dir}/`, ...subTree(content, '')].join('\n');
}

export default {
    addFile,
    addFolder,
    rename,
    move,
    remove,
    listDir,
    getFile,
    tree
}
