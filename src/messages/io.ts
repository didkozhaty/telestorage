import data from '../data';
import {type APIResponse, type GeneralFile, type MessageWithFile, type ReplyMessage, type Message} from '../types/message';
const objectToFormData = (obj?: Object, formData = new FormData()): FormData => {
    Object.entries(obj || {}).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
            formData.append(key, JSON.stringify(value));
        } else {
            formData.append(key, value);
        }
    });
    return formData;
}
const send = (text: string, parameters: Object) => {
    const body = objectToFormData(parameters);
    body.append('text', text);
    body.append('chat_id', data.channelId!.toString());
    return fetch(`${data.apiUrl}/sendMessage`, {
        method: 'POST',
        body
    }).then(res => res.json()).then((response: APIResponse<Message>) => response.result);
}
const reply = (text: string, message_id: number) => send(text, {reply_parameters: {message_id}}) as unknown as Promise<ReplyMessage>;
const sendFile = (text: string, file: {file: Blob, filename?: string}, parameters?: Object) => {
    const body = objectToFormData(parameters || {});
    body.append('caption', text);
    body.append('chat_id', data.channelId!.toString());
    body.append('document', file.file, file.filename || '');
    body.append('disable_content_type_detection', true.toString());
    return fetch(`${data.apiUrl}/sendDocument`, {
        method: 'POST',
        body
    }).then(res => res.json()).then((response: APIResponse<MessageWithFile>) => response.result);
};
const getMessage = (message_id: number) => reply('read', message_id)
.then((msg: ReplyMessage) => {
    if (data.deleteReadMessages) 
        deleteMessage(msg.id);
    return msg.reply_to_message;
});
const getFile = (file: GeneralFile): Promise<Blob> => 
    fetch(`${data.apiUrl}/getFile?file_id=${file.file_id}`).then(res => res.json())
    .then((response: APIResponse<{file_path: string}>) => response.result.file_path)
    .then(filePath => fetch(`https://api.telegram.org/file/bot${data.token}/${filePath}`))
    .then(res => res.blob());
export const readText = async (messageId: number): Promise<string> => 
    getMessage(messageId).then(msg => msg.text);
const isMessageWithFile = (msg: Message): msg is MessageWithFile => 'document' in msg;
export const readFile = async (messageId: number): Promise<Blob> =>
    getMessage(messageId).then((msg) => {
        if (isMessageWithFile(msg)) return msg.document;
        throw new Error("Message does not contain a file");
    }).then(getFile);
const deleteMessage = (messageId: number): Promise<void> => 
    fetch(`${data.apiUrl}/deleteMessage`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            chat_id: data.channelId,
            message_id: messageId
        })
    }) as unknown as Promise<void>;
const msgFileText = async (messageId: number): Promise<string> =>
    readFile(messageId).then(blob => blob.text());
const fileText = (file: GeneralFile): Promise<string> =>
    getFile(file).then(blob => blob.text());
const editText = (messageId: number, newText: string) =>
    fetch(`${data.apiUrl}/editMessageCaption`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            chat_id: data.channelId,
            message_id: messageId,
            caption: newText
        })
    }).then(r => r.json()).then((response: APIResponse<Message>) => response.result) as unknown as Promise<Message>;
const editFile = (messageId: number, newFile: {file: Blob, filename?: string}) => {
    const body = new FormData();
    body.append('chat_id', data.channelId!.toString());
    body.append('message_id', messageId.toString());
    body.append('document', newFile.file, newFile.filename || '');
    body.append('disable_content_type_detection', true.toString());
    return fetch(`${data.apiUrl}/editMessageMedia`, {
        method: 'POST',
        body
    }).then(res => res.json()).then((response: APIResponse<MessageWithFile>) => response.result);
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