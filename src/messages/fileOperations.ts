import root from "./root.js";
import io from "./io.js";
import fs from "./fileSystem.js";
import type { FileStored, Folder, Tree } from "../types/folder.js";
const addFile = async (filename: string, content: Blob, path: string) => {
    const folder = await fs.relative(fs.parse(await root()) as Folder, path) as Folder;
    const msg = await io.msg.sendFile(filename, {file: content, filename}, {reply_parameters: {message_id: folder.id}});
    folder.files[filename] = msg.message_id;
    const contentToWrite = new Blob([fs.toString(folder)], {type: 'text/plain'});
    await io.msg.edit.file(folder.id, {file: contentToWrite, filename: folder.dir.split('/').slice(-1)[0]});
}
const addFolder = async (foldername: string, path: string) => {
    const folder = await fs.relative(fs.parse(await root()) as Folder, path) as Folder;
    const msg = await io.msg.sendFile(foldername, {file: new Blob([''], {type: 'text/plain'}), filename: foldername}, 
        {reply_parameters: {message_id: folder.id}});
    const resultingFolder: Folder = {
        id: msg.message_id,
        dir: foldername,
        parent: folder.id,
        files: {},
        folders: {}
    }
    const contentToWrite = new Blob([fs.toString(resultingFolder)], {type: 'text/plain'});
    await io.msg.edit.file(folder.id, {file: contentToWrite, filename: folder.dir.split('/').slice(-1)[0]});
}
const rename = async (path: string, newName: string) => {
    const parent = path.split('/').slice(0, -1).join('/');
    const folder = await fs.relative(fs.parse(await root()) as Folder, parent) as Folder;
    const target = path.split('/').slice(-1)[0];
    let fileId: number;
    const category = folder.files[target] ? folder.files : folder.folders[target] ? folder.folders : null;
    if(!category) throw new Error("Target not found");
    fileId = category[target];
    delete category[target];
    category[newName] = fileId;
    const contentToWrite = new Blob([fs.toString(folder)], {type: 'text/plain'});
    let folderEditPromise = category === folder.folders ? (fs.relative(folder, newName) as Promise<Folder>).then((renamed: Folder) => 
        ({...renamed, dir: renamed.dir.replace(RegExp(`${target}$`), newName)} as Folder)).then(fs.toString)
        .then(str => new Blob([str], {type: 'text/plain'}))
        .then(blob => io.msg.edit.file(folder.id, {file: blob, filename: newName})) : Promise.resolve();
    await Promise.all([io.msg.edit.file(folder.id, {file: contentToWrite, filename: folder.dir.split('/').slice(-1)[0]})
        , io.msg.edit.text(fileId, newName), folderEditPromise]);
    
}
const move = async (source: string, destination: string) => {
    const sourceParent = source.split('/').slice(0, -1).join('/');
    const sourceFolder = await fs.relative(fs.parse(await root()) as Folder, sourceParent) as Folder;
    const sourceTarget = source.split('/').slice(-1)[0];
    let fileId: number;
    const sourceCategory = sourceFolder.files[sourceTarget] ? sourceFolder.files : sourceFolder.folders[sourceTarget] ? sourceFolder.folders : null;
    if(!sourceCategory) throw new Error("Source not found");
    fileId = sourceCategory[sourceTarget];
    delete sourceCategory[sourceTarget];
    const destinationFolder = await fs.relative(fs.parse(await root()) as Folder, destination) as Folder;
    const destionationCategory = sourceCategory === sourceFolder.files ? destinationFolder.files : destinationFolder.folders;
    destionationCategory[sourceTarget] = fileId;
    const contentToWriteSource = new Blob([fs.toString(sourceFolder)], {type: 'text/plain'});
    const contentToWriteDestination = new Blob([fs.toString(destinationFolder)], {type: 'text/plain'});
    await Promise.all([io.msg.edit.file(sourceFolder.id, {file: contentToWriteSource, filename: sourceFolder.dir.split('/').slice(-1)[0]}), 
        io.msg.edit.file(destinationFolder.id, {file: contentToWriteDestination, filename: destinationFolder.dir.split('/').slice(-1)[0]})]);
}
const remove = async (path: string) => {
    const parent = path.split('/').slice(0, -1).join('/');
    const folder = await fs.relative(fs.parse(await root()) as Folder, parent) as Folder;
    const target = path.split('/').slice(-1)[0];
    let fileId: number;
    const category = folder.files[target] ? folder.files : folder.folders[target] ? folder.folders : null;
    if(!category) throw new Error("Target not found");
    fileId = category[target];
    delete category[target];
    const contentToWrite = new Blob([fs.toString(folder)], {type: 'text/plain'});
    await Promise.all([io.msg.edit.file(folder.id, {file: contentToWrite, filename: folder.dir.split('/').slice(-1)[0]})]);
}
const listDir = async (path: string) => {
    const folder = await fs.relative(fs.parse(await root()) as Folder, path) as Folder;
    return Object.keys(folder.folders).map(key => key + '/').concat(Object.keys(folder.files)).join('\n');
}
const getFile = async (path: string) => {
    const file = await fs.relative(fs.parse(await root()) as Folder, path) as FileStored;
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
        const branch = `${prefix}${isLast ? '└─ ' : '├─ '}`;

        if (entry.type === 'folder') {
            lines.push(`${branch}${entry.name}/`);
            if(typeof node.folders === 'object')
                lines.push(...subTree(node.folders[entry.name] as Tree, `${prefix}${isLast ? '   ' : '│  '}`));
        } else {
            lines.push(`${branch}${entry.name}`);
        }
    });
    return lines;
};
const tree = async (path: string, levels = -1) => {
    const folder = await fs.relative(fs.parse(await root()) as Folder, path) as Folder;
    const content = await fs.tree(await io.msg.fileText(folder.id), levels);
    const lines: string[] = [`${content.dir}/`];

    ;
    return subTree(content, '').join('\n');
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
