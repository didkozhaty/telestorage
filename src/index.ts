import data from "./data.js";
import operations from "./messages/fileOperations.js";
import getRoot from "./messages/root.js";

export function init(token: string, channelId: number): void {
    data.token = token;
    data.channelId = channelId;
    data.path = '~';
    data.dir = null;
}

export const mkdir = operations.addFolder;
export const mv = operations.move;
export const rm = operations.remove;
export const rename = operations.rename;
export const touch = operations.addFile;
export const dir = operations.listDir;
export const cat = operations.getFile;
export const tree = operations.tree;
export const cd = operations.cd;
export const root = getRoot;

const telestorage = {
    init,
    mkdir,
    mv,
    rm,
    rename,
    touch,
    dir,
    cat,
    tree,
    cd,
    root,
}

export default telestorage;
