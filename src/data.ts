export type StorageConfig = {
    token: string | null;
    channelId: number | null;
    deleteReadMessages: boolean;
    readonly apiUrl: string | null;
    path: string;
    dir: number | null;
}

const data: StorageConfig = {
    token: null as string | null,
    channelId: null as number | null,
    deleteReadMessages: false,
    apiUrl: null,
    path: '~' as string,
    dir: null as number | null
}
Object.defineProperty(data, 'apiUrl', {
    get() {
        return data.token && `https://api.telegram.org/bot${data.token}`;
    }
});
export default data;
