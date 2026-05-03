import type { FileStored, Folder, Tree } from '../types/folder.js';
import io from './io.js';
const parse = (folder: string): Folder => {
    const obj = {} as Folder;
    const lines = folder.split('\n');
    obj.dir = lines.shift()!;
    obj.parent = Number.parseInt(lines.shift()!);
    obj.id = Number.parseInt(lines.shift()!);
    const {files, folders} = lines.map(el => el.split(':')).reduce((acc, line) => {
        const target = line[0].endsWith('/') ? acc.folders : acc.files;
        target.push([line[0].slice(0, -1), Number.parseInt(line[1])]);
        return acc;
    }, {files: [], folders: []} as Record<string, [string, number][]>);
    obj.folders = Object.fromEntries(folders);
    obj.files = Object.fromEntries(files);
    return obj;
}
const tree = async (folder: string, levels = -1) => {
    if(levels === 0) return parse(folder);
    const obj = parse(folder);
    const folders = Promise.all(Object.entries(obj.folders)
        .map(([name, id]) => io.msg.readFile(id as number)
        .then(blob => blob.text())
        .then(folderContent => [name, tree(folderContent, levels - 1)])));
    obj.folders = Object.fromEntries(await folders);
    return obj as Tree;
}
const relative = async (folder: Folder, path: string): Promise<FileStored | Folder | null> => {
    const parts = path.split('/').filter(p => p !== '' && p !== '.');
    let current: Folder = folder;
    for(const part of parts) {
        if(part === '..') {
            current = parse(await io.msg.fileText(current.parent));
        } else if(current.folders[part]) {
            current = parse(await io.msg.fileText(current.folders[part]));
        } else if(current.files[part]) {
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
    return `${folder.dir}\n${folder.parent}\n${folder.id}\n${files}\n${folders}`;
}
export default {
    tree,
    parse,
    relative,
    toString
};
