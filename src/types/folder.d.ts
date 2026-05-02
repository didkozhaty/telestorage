type FileFolder = {
    parent: number;
    dir: string;
    files: Record<string, number>;
    id: number;
}
type Folder = FileFolder & {
    folders: Record<string, number>;
}
type Tree = (FileFolder & {
    folders: Record<string, Tree>;
}) | Folder;
type FileStored = {
    id: number;
    name: string;
}