export type FileFolder = {
    parent: number;
    dir: string;
    files: Record<string, number>;
    id: number;
}
export type Folder = FileFolder & {
    folders: Record<string, number>;
}
export type Tree = (FileFolder & {
    folders: Record<string, Tree>;
}) | Folder;
export type FileStored = {
    id: number;
    name: string;
}