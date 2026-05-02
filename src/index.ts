import data from "./data";
import operations from "./messages/fileOperations";
import root from "./messages/root";
function init(token: string, channelId: number): void {
    data.token = token;
    data.channelId = channelId;
}
export default {
    init,
    mkdir: operations.addFolder,
    mv: operations.move,
    rm: operations.remove,
    rename: operations.rename,
    touch: operations.addFile,
    dir: operations.listDir,
    cat: operations.getFile,
    tree: operations.tree,
    root,
}