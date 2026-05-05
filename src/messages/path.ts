import data from '../data.js';
import type { Folder } from '../types/folder.js';
import fs from './fileSystem.js';
import io from './io.js';
import root from './root.js';

export const FORBIDDEN_NAME_CHARS = [':', '/', '~'] as const;

export const assertEntryName = (name: string, type = 'Entry name'): void => {
    if (!name || name === '.' || name === '..') {
        throw new Error(`${type} cannot be empty, "." or ".."`);
    }

    const forbidden = FORBIDDEN_NAME_CHARS.find(char => name.includes(char));
    if (forbidden) {
        throw new Error(`${type} cannot contain "${forbidden}"`);
    }
};

export const assertPathSegmentNames = (path: string): void => {
    path.split('/').filter(Boolean).forEach(part => {
        if (part === '.' || part === '..') return;
        if (part === '~' && (path === '~' || path.startsWith('~/'))) return;
        assertEntryName(part, 'Path segment');
    });
};

const rootFolder = async (): Promise<Folder> => fs.parse(await root());

const folderFromMessageId = async (messageId: number): Promise<Folder> => {
    const folder = fs.parse(await io.msg.fileText(messageId));
    if (folder.id !== messageId) {
        return {...folder, id: messageId};
    }

    return folder;
};

export const currentFolder = async (): Promise<Folder> => {
    if (data.dir !== null) {
        return folderFromMessageId(data.dir);
    }

    return cd();
};

const setCurrentFolder = (folder: Folder, path?: string): Folder => {
    data.dir = folder.id;
    data.path = path ?? folder.dir;
    return folder;
};

export const resolveFolder = async (path = '.'): Promise<Folder> => {
    assertPathSegmentNames(path);

    if (path === '' || path === '.') {
        return currentFolder();
    }

    const fromRoot = path === '/' || path === '~' || path.startsWith('~/') || path.startsWith('/');
    const base = fromRoot ? await rootFolder() : await currentFolder();
    const normalizedPath = path === '~' ? '' : path.replace(/^~\//, '').replace(/^\/+/, '');
    const target = await fs.relative(base, normalizedPath);
    if (!target || !('folders' in target)) {
        throw new Error('Folder not found');
    }

    return target;
};

export const cd = async (target: string | number = '/'): Promise<Folder> => {
    if (typeof target === 'number') {
        return setCurrentFolder(await folderFromMessageId(target), `#${target}`);
    }

    const folder = await resolveFolder(target);
    return setCurrentFolder(folder, target === '/' ? '~' : target);
};

