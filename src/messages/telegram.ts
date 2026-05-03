import data from "../data.js";
import type { APIResponse } from "../types/message.js";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const requireTelegramConfig = () => {
    if (!data.apiUrl || data.channelId === null || !data.token) {
        throw new Error("telestorage is not initialized. Call init(token, channelId) first.");
    }

    return {
        apiUrl: data.apiUrl,
        channelId: data.channelId,
        token: data.token
    };
}

export const telegramFetch = async <T>(url: string, init: RequestInit, retries = 2): Promise<T> => {
    const response = await fetch(url, init);
    const payload = await response.json() as APIResponse<T>;
    if ((!response.ok || !payload.ok) && payload.parameters?.retry_after && retries > 0) {
        await sleep((payload.parameters.retry_after + 1) * 1000);
        return telegramFetch<T>(url, init, retries - 1);
    }

    if (!response.ok || !payload.ok || payload.result === undefined) {
        const details = payload.description ?? response.statusText;
        throw new Error(`Telegram API request failed: ${details}`);
    }

    return payload.result;
}
