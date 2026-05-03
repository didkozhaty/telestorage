import data from '../data.js';
import { type APIResponse, type ChatInfo, type GeneralFile } from '../types/message.js';
import io from './io.js';
const requireTelegramConfig = () => {
    if (!data.apiUrl || data.channelId === null) {
        throw new Error("telestorage is not initialized. Call init(token, channelId) first.");
    }

    return {
        apiUrl: data.apiUrl,
        channelId: data.channelId
    };
}
const telegramResult = async <T>(response: Response): Promise<T> => {
    const payload = await response.json() as APIResponse<T>;
    if (!response.ok || !payload.ok || payload.result === undefined) {
        throw new Error(`Telegram API request failed: ${payload.description ?? response.statusText}`);
    }
    return payload.result;
}
const getRoot = async () => {
    const {apiUrl, channelId} = requireTelegramConfig();
    return fetch(`${apiUrl}/getChat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            chat_id: channelId
        })
    }).then(telegramResult<ChatInfo>)
    .then(chatInfo => chatInfo.pinned_message)
    .then(msg => msg ? msg : mount())
    .then(msg => {
        if (!('document' in msg)) throw new Error("Pinned message does not contain a file");
        return msg.document as GeneralFile;
    })
    .then(msg => io.file.text(msg));
}
const mount = async () => {
    const {apiUrl, channelId} = requireTelegramConfig();
    const rootFile = new Blob([''], {type: 'text/plain'});
    const msg = await io.msg.sendFile('root', {file: rootFile, filename: 'root'});
    await Promise.all([fetch(`${apiUrl}/pinChatMessage`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            chat_id: channelId,
            message_id: msg.message_id
        })
    }).then(telegramResult<boolean>), io.msg.edit.file(msg.message_id, {file: new Blob([`~/\n-1\n${msg.message_id}`], {type: 'text/plain'}), filename: 'root'})]);
    return msg;
}
export default getRoot;

