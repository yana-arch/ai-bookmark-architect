import { openDB, IDBPDatabase } from 'idb';
// Fix: Import ApiConfig type.
import type { Bookmark, Folder, ApiConfig } from './types';

const DB_NAME = 'AIBookmarkArchitectDB';
const BOOKMARKS_STORE = 'bookmarks';
const FOLDERS_STORE = 'folders';
// Fix: Add API_CONFIGS_STORE constant.
const API_CONFIGS_STORE = 'apiConfigs';

let dbPromise: Promise<IDBPDatabase>;

const initDB = () => {
    if (!dbPromise) {
        // Fix: Bump DB version to 2 and add upgrade logic for the new apiConfigs store.
        dbPromise = openDB(DB_NAME, 2, {
            upgrade(db, oldVersion) {
                if (oldVersion < 1) {
                    if (!db.objectStoreNames.contains(BOOKMARKS_STORE)) {
                        db.createObjectStore(BOOKMARKS_STORE, { keyPath: 'id' });
                    }
                    if (!db.objectStoreNames.contains(FOLDERS_STORE)) {
                        // Use a fixed key since we only store the single folder tree
                        db.createObjectStore(FOLDERS_STORE);
                    }
                }
                if (oldVersion < 2) {
                     if (!db.objectStoreNames.contains(API_CONFIGS_STORE)) {
                        db.createObjectStore(API_CONFIGS_STORE, { keyPath: 'id' });
                    }
                }
            },
        });
    }
    return dbPromise;
};

export const saveBookmarks = async (bookmarks: Bookmark[]): Promise<void> => {
    const db = await initDB();
    const tx = db.transaction(BOOKMARKS_STORE, 'readwrite');
    // Clear old bookmarks before adding new ones
    await tx.objectStore(BOOKMARKS_STORE).clear();
    await Promise.all(bookmarks.map(bm => tx.objectStore(BOOKMARKS_STORE).put(bm)));
    await tx.done;
};

export const getBookmarks = async (): Promise<Bookmark[]> => {
    const db = await initDB();
    return db.getAll(BOOKMARKS_STORE);
};

export const saveFolders = async (folders: (Folder | Bookmark)[]): Promise<void> => {
    const db = await initDB();
    await db.put(FOLDERS_STORE, folders, 'folderTree');
};

export const getFolders = async (): Promise<(Folder | Bookmark)[] | undefined> => {
    const db = await initDB();
    return db.get(FOLDERS_STORE, 'folderTree');
};

export const clearAllData = async (): Promise<void> => {
    const db = await initDB();
    const tx = db.transaction([BOOKMARKS_STORE, FOLDERS_STORE], 'readwrite');
    await tx.objectStore(BOOKMARKS_STORE).clear();
    await tx.objectStore(FOLDERS_STORE).clear();
    await tx.done;
};

// Fix: Add functions to manage API configurations in the database.
export const saveApiConfig = async (config: ApiConfig): Promise<void> => {
    const db = await initDB();
    await db.put(API_CONFIGS_STORE, config);
};

export const getApiConfigs = async (): Promise<ApiConfig[]> => {
    const db = await initDB();
    return db.getAll(API_CONFIGS_STORE);
};

export const deleteApiConfig = async (id: string): Promise<void> => {
    const db = await initDB();
    await db.delete(API_CONFIGS_STORE, id);
};
