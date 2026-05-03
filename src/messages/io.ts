import data from '../data.js';
import {type APIResponse, type GeneralFile, type MessageWithFile, type ReplyMessage, type Message} from '../types/message.js';

type FormParameters = Record<string, unknown>;
type FileInput = {file: Blob, filename?: string};

const requireTelegramConfig = () => {
    if (!data.apiUrl || data.channelId === null || !data.token) {
        throw new Error("telestorage is not initialized. Call init(token, channelId) first.");
    }

    return {
        apiUrl: data.apiUrl,
        channelId: data.channelId,
        token: data.token
    };
}

const telegramResult = async <T>(response: Response): Promise<T> => {
    const payload = await response.json() as APIResponse<T>;
    if (!response.ok || !payload.ok || payload.result === undefined) {
        const details = payload.description ?? response.statusText;
        throw new Error(`Telegram API request failed: ${details}`);
    }

    return payload.result;
}

const objectToFormData = (obj?: FormParameters, formData = new FormData()): FormData => {
    Object.entries(obj || {}).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        if (typeof value === 'object' && value !== null) {
            formData.append(key, JSON.stringify(value));
        } else {
            formData.append(key, String(value));
        }
    });
    return formData;
}
const send = (text: string, parameters: FormParameters = {}): Promise<Message> => {
    const {apiUrl, channelId} = requireTelegramConfig();
    const body = objectToFormData(parameters);
    body.append('text', text);
    body.append('chat_id', channelId.toString());
    return fetch(`${apiUrl}/sendMessage`, {
        method: 'POST',
        body
    }).then(telegramResult<Message>);
}
const reply = (text: string, message_id: number): Promise<ReplyMessage> => 
    send(text, {reply_parameters: {message_id}}).then((message) => {
        if (!('reply_to_message' in message)) {
            throw new Error("Telegram response did not include reply_to_message");
        }
        return message as ReplyMessage;
    });
const sendFile = (text: string, file: FileInput, parameters: FormParameters = {}): Promise<MessageWithFile> => {
    const {apiUrl, channelId} = requireTelegramConfig();
    const body = objectToFormData(parameters || {});
    body.append('caption', text);
    body.append('chat_id', channelId.toString());
    body.append('document', file.file, file.filename || '');
    body.append('disable_content_type_detection', true.toString());
    return fetch(`${apiUrl}/sendDocument`, {
        method: 'POST',
        body
    }).then(telegramResult<MessageWithFile>);
};
const getMessage = (message_id: number) => reply('read', message_id)
.then((msg: ReplyMessage) => {
    if (data.deleteReadMessages) 
        deleteMessage(msg.message_id);
    return msg.reply_to_message;
});
const getFile = (file: GeneralFile): Promise<Blob> => 
    fetch(`${requireTelegramConfig().apiUrl}/getFile?file_id=${file.file_id}`).then(telegramResult<{file_path: string}>)
    .then(response => response.file_path)
    .then(filePath => fetch(`https://api.telegram.org/file/bot${requireTelegramConfig().token}/${filePath}`))
    .then(res => res.blob());
export const readText = async (messageId: number): Promise<string> => 
    getMessage(messageId).then(msg => msg.text ?? msg.caption ?? '');
const isMessageWithFile = (msg: Message): msg is MessageWithFile => 'document' in msg;
export const readFile = async (messageId: number): Promise<Blob> =>
    getMessage(messageId).then((msg) => {
        if (isMessageWithFile(msg)) return msg.document;
        throw new Error("Message does not contain a file");
    }).then(getFile);
const deleteMessage = (messageId: number): Promise<void> => 
    fetch(`${requireTelegramConfig().apiUrl}/deleteMessage`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            chat_id: requireTelegramConfig().channelId,
            message_id: messageId
        })
    }).then(telegramResult<boolean>).then(() => undefined);
const msgFileText = async (messageId: number): Promise<string> =>
    readFile(messageId).then(blob => blob.text());
const fileText = (file: GeneralFile): Promise<string> =>
    getFile(file).then(blob => blob.text());
const editText = (messageId: number, newText: string): Promise<Message> =>
    fetch(`${requireTelegramConfig().apiUrl}/editMessageCaption`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            chat_id: data.channelId,
            message_id: messageId,
            caption: newText
        })
    }).then(telegramResult<Message>);
const editFile = (messageId: number, newFile: FileInput): Promise<MessageWithFile> => {
    const {apiUrl, channelId} = requireTelegramConfig();
    const body = new FormData();
    body.append('chat_id', channelId.toString());
    body.append('message_id', messageId.toString());
    body.append('media', JSON.stringify({
        type: 'document',
        media: 'attach://document'
    }));
    body.append('document', newFile.file, newFile.filename || '');
    return fetch(`${apiUrl}/editMessageMedia`, {
        method: 'POST',
        body
    }).then(telegramResult<MessageWithFile>);
}

export default {
    msg: {
        readText,
        readFile,
        fileText: msgFileText,
        send,
        reply,
        sendFile,
        edit: {
            text: editText,
            file: editFile
        }
    },
    file: {
        get: getFile,
        text: fileText
    }
};
