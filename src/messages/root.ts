import data from '../data';
import { type APIResponse, type ChatInfo, type GeneralFile } from '../types/message';
import io from './io';
import fs from './fileSystem';
const getRoot = async () => fetch(`${data.apiUrl}/getChat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            chat_id: data.channelId
        })
    }).then(res => res.json())
    .then((chatInfo: APIResponse<ChatInfo>) => chatInfo.result.pinned_message)
    .then(msg => msg ? msg : mount())
    .then(msg => {
        if (!('document' in msg)) throw new Error("Pinned message does not contain a file");
        return msg.document as GeneralFile;
    })
    .then(msg => io.file.text(msg));
const mount = async () => {
    const rootFile = new Blob([''], {type: 'text/plain'});
    const msg = await io.msg.sendFile('root', {file: rootFile, filename: 'root'});
    await Promise.all([fetch(`${data.apiUrl}/pinChatMessage`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            chat_id: data.channelId,
            message_id: msg.id
        })
    }), io.msg.edit.file(msg.id, {file: new Blob([`~/\n-1\n${msg.id}`], {type: 'text/plain'}), filename: 'root'})]);
    return msg;
}
export default getRoot;

