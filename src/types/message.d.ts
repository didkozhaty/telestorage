export type Message = {
    id: number;
    text: string;
}
export type ReplyMessage = Message & {
    reply_to_message: Message;
}
export type MessageWithFile = Message & {
    document: GeneralFile;
}
export type GeneralFile = {
    file_id: string;
    file_unique_id: string;
    file_size: number;
}
export type ChatInfo = {
    pinned_message: Message;
}
export type APIResponse<T> = {
    ok: boolean;
    result: T;
}