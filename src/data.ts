const data = {
    token: null as string | null,
    channelId: null as number | null,
    deleteReadMessages: false,
    apiUrl: null as string|null,
    path: '~' as string,
    dir: null as number|null
}
Object.defineProperty(data, 'apiUrl', {
    get() {
        return data.token && `https://api.telegram.org/bot${data.token}`;
    }
});
export default data;