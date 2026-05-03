import type { FileStored, Folder, Tree } from '../types/folder.js';
import io from './io.js';

const parse = (folder: string): Folder => {
    const [dir, parent, id, ...entries] = folder.split('\n');
    if (dir === undefined || parent === undefined || id === undefined) {
        throw new Error("Invalid folder data");
    }

    const {files, folders} = entries.filter(Boolean).map(el => el.split(':')).reduce((acc, line) => {
        const [name, messageId] = line;
        if (!name || messageId === undefined) return acc;

        const target = name.endsWith('/') ? acc.folders : acc.files;
        target.push([name.replace(/\/$/, ''), Number.parseInt(messageId)]);
        return acc;
    }, {files: [], folders: []} as Record<string, [string, number][]>);

    return {
        dir,
        parent: Number.parseInt(parent),
        id: Number.parseInt(id),
        folders: Object.fromEntries(folders),
        files: Object.fromEntries(files)
    };
}
const tree = async (folder: string, levels = -1): Promise<Tree> => {
    if(levels === 0) return parse(folder);
    const obj = parse(folder);
    const folders: Promise<ReadonlyArray<readonly [string, Tree]>> = Promise.all(Object.entries(obj.folders)
        .map(([name, id]) => io.msg.readFile(id as number)
        .then(blob => blob.text())
        .then(async folderContent => [name, await tree(folderContent, levels - 1)] as const)));
    return {
        ...obj,
        folders: Object.fromEntries(await folders)
    } as Tree;
}
const relative = async (folder: Folder, path: string): Promise<FileStored | Folder | null> => {
    const parts = path.split('/').filter(p => p !== '' && p !== '.');
    let current: Folder = folder;
    for(const part of parts) {
        if(part === '..') {
            if (current.parent < 0) return current;
            current = parse(await io.msg.fileText(current.parent));
        } else if(part in current.folders) {
            current = parse(await io.msg.fileText(current.folders[part]));
        } else if(part in current.files) {
            return { id: current.files[part], name: part } as FileStored;
        } else {
            return null;
        }
    }
    return current;
}
const toString = (folder: Folder): string => {
    const files = Object.entries(folder.files).map(([name, id]) => `${name}:${id}`).join('\n');
    const folders = Object.entries(folder.folders).map(([name, id]) => `${name}/:${id}`).join('\n');
    return [folder.dir, folder.parent, folder.id, files, folders].filter(value => value !== '').join('\n');
}
export default {
    tree,
    parse,
    relative,
    toString
};
