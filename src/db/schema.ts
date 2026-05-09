import { openDB, IDBPDatabase } from 'idb';
import {
    DB_NAME,
    BOOKMARKS_STORE,
    FOLDERS_STORE,
    API_CONFIGS_STORE,
    INSTRUCTION_PRESETS_STORE,
    FOLDER_TEMPLATES_STORE,
    EMPTY_FOLDER_TREES_STORE,
    LOGS_STORE,
    USER_CORRECTIONS_STORE,
    BACKUPS_STORE,
    SYNC_STATUS_STORE,
    ANALYTICS_STORE,
    OAUTH_TOKENS_STORE,
    SMART_RULES_STORE,
    DB_CONNECTIONS_STORE,
    AI_PROFILES_STORE
} from './constants';

let dbPromise: Promise<IDBPDatabase>;

export const initDB = () => {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, 10, {
            upgrade(db, oldVersion) {
                if (oldVersion < 1) {
                    if (!db.objectStoreNames.contains(BOOKMARKS_STORE)) {
                        db.createObjectStore(BOOKMARKS_STORE, { keyPath: 'id' });
                    }
                    if (!db.objectStoreNames.contains(FOLDERS_STORE)) {
                        db.createObjectStore(FOLDERS_STORE);
                    }
                }
                if (oldVersion < 2) {
                    if (!db.objectStoreNames.contains(API_CONFIGS_STORE)) {
                        db.createObjectStore(API_CONFIGS_STORE, { keyPath: 'id' });
                    }
                }
                if (oldVersion < 3) {
                    if (!db.objectStoreNames.contains(BOOKMARKS_STORE)) {
                        const bookmarksStore = db.createObjectStore(BOOKMARKS_STORE, { keyPath: 'id' });
                        bookmarksStore.createIndex('url', 'url', { unique: false });
                        bookmarksStore.createIndex('parentId', 'parentId', { unique: false });
                        bookmarksStore.createIndex('title', 'title', { unique: false });
                    } else {
                        db.deleteObjectStore(BOOKMARKS_STORE);
                        const bookmarksStore = db.createObjectStore(BOOKMARKS_STORE, { keyPath: 'id' });
                        bookmarksStore.createIndex('url', 'url', { unique: false });
                        bookmarksStore.createIndex('parentId', 'parentId', { unique: false });
                        bookmarksStore.createIndex('title', 'title', { unique: false });
                    }
                }
                if (oldVersion < 4) {
                    if (!db.objectStoreNames.contains(INSTRUCTION_PRESETS_STORE)) {
                        db.createObjectStore(INSTRUCTION_PRESETS_STORE, { keyPath: 'id' });
                    }
                }
                if (oldVersion < 5) {
                    if (!db.objectStoreNames.contains(FOLDER_TEMPLATES_STORE)) {
                        db.createObjectStore(FOLDER_TEMPLATES_STORE, { keyPath: 'id' });
                    }
                    if (!db.objectStoreNames.contains(EMPTY_FOLDER_TREES_STORE)) {
                        db.createObjectStore(EMPTY_FOLDER_TREES_STORE, { keyPath: 'id' });
                    }
                }
                if (oldVersion < 6) {
                    if (!db.objectStoreNames.contains(LOGS_STORE)) {
                        db.createObjectStore(LOGS_STORE, { keyPath: 'id' });
                    }
                }
                if (oldVersion < 7) {
                    if (!db.objectStoreNames.contains(USER_CORRECTIONS_STORE)) {
                        db.createObjectStore(USER_CORRECTIONS_STORE, { keyPath: 'id' });
                    }
                }
                if (oldVersion < 8) {
                    if (!db.objectStoreNames.contains(BACKUPS_STORE)) {
                        db.createObjectStore(BACKUPS_STORE, { keyPath: 'id' });
                    }
                    if (!db.objectStoreNames.contains(SYNC_STATUS_STORE)) {
                        db.createObjectStore(SYNC_STATUS_STORE);
                    }
                    if (!db.objectStoreNames.contains(ANALYTICS_STORE)) {
                        db.createObjectStore(ANALYTICS_STORE);
                    }
                    if (!db.objectStoreNames.contains(OAUTH_TOKENS_STORE)) {
                        db.createObjectStore(OAUTH_TOKENS_STORE, { keyPath: 'id' });
                    }
                }
                if (oldVersion < 9) {
                    if (!db.objectStoreNames.contains(SMART_RULES_STORE)) {
                        db.createObjectStore(SMART_RULES_STORE, { keyPath: 'id' });
                    }
                    if (!db.objectStoreNames.contains(DB_CONNECTIONS_STORE)) {
                        db.createObjectStore(DB_CONNECTIONS_STORE, { keyPath: 'id' });
                    }
                }
                if (oldVersion < 10) {
                    if (!db.objectStoreNames.contains(AI_PROFILES_STORE)) {
                        db.createObjectStore(AI_PROFILES_STORE, { keyPath: 'id' });
                    }
                }
            },
        });
    }
    return dbPromise;
};
