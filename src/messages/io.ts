import data from '../data.js';
import {type GeneralFile, type MessageWithFile, type ReplyMessage, type Message} from '../types/message.js';
import { requireTelegramConfig, telegramFetch } from './telegram.js';

type FormParameters = Record<string, unknown>;
export type FileInput = {file: Blob | GeneralFile | string, filename?: string};

const fileId = (file: GeneralFile | string): string => typeof file === 'string' ? file : file.file_id;

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
    return telegramFetch<Message>(`${apiUrl}/sendMessage`, {
        method: 'POST',
        body
    });
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
    if (file.file instanceof Blob) {
        body.append('document', file.file, file.filename || '');
    } else {
        body.append('document', fileId(file.file));
    }
    body.append('disable_content_type_detection', true.toString());
    return telegramFetch<MessageWithFile>(`${apiUrl}/sendDocument`, {
        method: 'POST',
        body
    });
};
const getMessage = (message_id: number) => reply('read', message_id)
.then((msg: ReplyMessage) => {
    if (data.deleteReadMessages) 
        deleteMessage(msg.message_id);
    return msg.reply_to_message;
});
const getFile = (file: GeneralFile): Promise<Blob> => 
    telegramFetch<{file_path: string}>(`${requireTelegramConfig().apiUrl}/getFile?file_id=${file.file_id}`, {})
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
    telegramFetch<boolean>(`${requireTelegramConfig().apiUrl}/deleteMessage`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            chat_id: requireTelegramConfig().channelId,
            message_id: messageId
        })
    }).then(() => undefined);
const msgFileText = async (messageId: number): Promise<string> =>
    readFile(messageId).then(blob => blob.text());
const fileText = (file: GeneralFile): Promise<string> =>
    getFile(file).then(blob => blob.text());
const editText = (messageId: number, newText: string): Promise<Message> =>
    telegramFetch<Message>(`${requireTelegramConfig().apiUrl}/editMessageCaption`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            chat_id: data.channelId,
            message_id: messageId,
            caption: newText
        })
    });
const editFile = (messageId: number, newFile: FileInput): Promise<MessageWithFile> => {
    const {apiUrl, channelId} = requireTelegramConfig();
    const body = new FormData();
    body.append('chat_id', channelId.toString());
    body.append('message_id', messageId.toString());
    if (newFile.file instanceof Blob) {
        body.append('media', JSON.stringify({
            type: 'document',
            media: 'attach://document'
        }));
        body.append('document', newFile.file, newFile.filename || '');
    } else {
        body.append('media', JSON.stringify({
            type: 'document',
            media: fileId(newFile.file)
        }));
    }
    return telegramFetch<MessageWithFile>(`${apiUrl}/editMessageMedia`, {
        method: 'POST',
        body
    });
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
