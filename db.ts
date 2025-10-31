import { openDB, IDBPDatabase } from 'idb';
// Fix: Import ApiConfig type.
import type { Bookmark, Folder, ApiConfig, InstructionPreset, FolderTemplate, EmptyFolderTree, DetailedLog, UserCorrection, BackupMetadata, SyncStatus, AnalyticsData, OAuthToken } from './types';

const DB_NAME = 'AIBookmarkArchitectDB';
const BOOKMARKS_STORE = 'bookmarks';
const FOLDERS_STORE = 'folders';
// Fix: Add API_CONFIGS_STORE constant.
const API_CONFIGS_STORE = 'apiConfigs';
const INSTRUCTION_PRESETS_STORE = 'instructionPresets';
const FOLDER_TEMPLATES_STORE = 'folderTemplates';
const EMPTY_FOLDER_TREES_STORE = 'emptyFolderTrees';
const LOGS_STORE = 'logs'; // New store for persistent logs
const USER_CORRECTIONS_STORE = 'userCorrections'; // New store for user corrections
// Phase 2: Enhanced Features stores
const BACKUPS_STORE = 'backups';
const SYNC_STATUS_STORE = 'syncStatus';
const ANALYTICS_STORE = 'analytics';
const OAUTH_TOKENS_STORE = 'oauthTokens';

let dbPromise: Promise<IDBPDatabase>;

const initDB = () => {
    if (!dbPromise) {
        // Phase 2: Bump DB version to 8 and add new stores for enhanced features
        dbPromise = openDB(DB_NAME, 8, {
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
                if (oldVersion < 3) {
                    // Add indexes for better query performance
                    if (!db.objectStoreNames.contains(BOOKMARKS_STORE)) {
                        const bookmarksStore = db.createObjectStore(BOOKMARKS_STORE, { keyPath: 'id' });
                        bookmarksStore.createIndex('url', 'url', { unique: false });
                        bookmarksStore.createIndex('parentId', 'parentId', { unique: false });
                        bookmarksStore.createIndex('title', 'title', { unique: false });
                    } else {
                        // If store exists, we need to recreate it with indexes
                        // This is a simplified approach - in production you'd handle migration more carefully
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
                    // Phase 2: Enhanced Features stores
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
            },
        });
    }
    return dbPromise;
};

export const saveBookmarks = async (bookmarks: Bookmark[]): Promise<void> => {
    const db = await initDB();
    const tx = db.transaction(BOOKMARKS_STORE, 'readwrite');
    const store = tx.objectStore(BOOKMARKS_STORE);

    // Clear old bookmarks before adding new ones
    await store.clear();

    // Batch operations in chunks to avoid blocking the main thread
    const BATCH_SIZE = 100;
    for (let i = 0; i < bookmarks.length; i += BATCH_SIZE) {
        const batch = bookmarks.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(bm => store.put(bm)));
    }

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
    const tx = db.transaction([BOOKMARKS_STORE, FOLDERS_STORE, API_CONFIGS_STORE, INSTRUCTION_PRESETS_STORE, FOLDER_TEMPLATES_STORE, EMPTY_FOLDER_TREES_STORE, LOGS_STORE, USER_CORRECTIONS_STORE, BACKUPS_STORE, SYNC_STATUS_STORE, ANALYTICS_STORE, OAUTH_TOKENS_STORE], 'readwrite');
    await tx.objectStore(BOOKMARKS_STORE).clear();
    await tx.objectStore(FOLDERS_STORE).clear();
    await tx.objectStore(API_CONFIGS_STORE).clear();
    await tx.objectStore(INSTRUCTION_PRESETS_STORE).clear();
    await tx.objectStore(FOLDER_TEMPLATES_STORE).clear();
    await tx.objectStore(EMPTY_FOLDER_TREES_STORE).clear();
    await tx.objectStore(LOGS_STORE).clear(); // Clear logs as well
    await tx.objectStore(USER_CORRECTIONS_STORE).clear(); // Clear user corrections
    // Phase 2: Clear new stores
    await tx.objectStore(BACKUPS_STORE).clear();
    await tx.objectStore(SYNC_STATUS_STORE).clear();
    await tx.objectStore(ANALYTICS_STORE).clear();
    await tx.objectStore(OAUTH_TOKENS_STORE).clear();
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

// Instruction Presets CRUD operations
export const saveInstructionPreset = async (preset: InstructionPreset): Promise<void> => {
    const db = await initDB();
    await db.put(INSTRUCTION_PRESETS_STORE, preset);
};

export const getInstructionPresets = async (): Promise<InstructionPreset[]> => {
    const db = await initDB();
    return db.getAll(INSTRUCTION_PRESETS_STORE);
};

export const getInstructionPreset = async (id: string): Promise<InstructionPreset | undefined> => {
    const db = await initDB();
    return db.get(INSTRUCTION_PRESETS_STORE, id);
};

export const deleteInstructionPreset = async (id: string): Promise<void> => {
    const db = await initDB();
    await db.delete(INSTRUCTION_PRESETS_STORE, id);
};

// Folder Templates CRUD operations
export const saveFolderTemplate = async (template: FolderTemplate): Promise<void> => {
    const db = await initDB();
    await db.put(FOLDER_TEMPLATES_STORE, template);
};

export const getFolderTemplates = async (): Promise<FolderTemplate[]> => {
    const db = await initDB();
    return db.getAll(FOLDER_TEMPLATES_STORE);
};

export const getFolderTemplate = async (id: string): Promise<FolderTemplate | undefined> => {
    const db = await initDB();
    return db.get(FOLDER_TEMPLATES_STORE, id);
};

export const deleteFolderTemplate = async (id: string): Promise<void> => {
    const db = await initDB();
    await db.delete(FOLDER_TEMPLATES_STORE, id);
};

// Empty Folder Trees CRUD operations
export const saveEmptyFolderTree = async (tree: EmptyFolderTree): Promise<void> => {
    const db = await initDB();
    await db.put(EMPTY_FOLDER_TREES_STORE, tree);
};

export const getEmptyFolderTrees = async (): Promise<EmptyFolderTree[]> => {
    const db = await initDB();
    return db.getAll(EMPTY_FOLDER_TREES_STORE);
};

export const getEmptyFolderTree = async (id: string): Promise<EmptyFolderTree | undefined> => {
    const db = await initDB();
    return db.get(EMPTY_FOLDER_TREES_STORE, id);
};

export const deleteEmptyFolderTree = async (id: string): Promise<void> => {
    const db = await initDB();
    await db.delete(EMPTY_FOLDER_TREES_STORE, id);
};

// Log CRUD operations
export const saveLog = async (log: DetailedLog): Promise<void> => {
    const db = await initDB();
    await db.add(LOGS_STORE, log);
};

export const getLogs = async (): Promise<DetailedLog[]> => {
    const db = await initDB();
    return db.getAll(LOGS_STORE);
};

export const clearLogs = async (): Promise<void> => {
    const db = await initDB();
    await db.clear(LOGS_STORE);
};

// User Correction CRUD operations
export const saveUserCorrection = async (correction: UserCorrection): Promise<void> => {
    const db = await initDB();
    await db.add(USER_CORRECTIONS_STORE, correction);
};

export const getUserCorrections = async (): Promise<UserCorrection[]> => {
    const db = await initDB();
    return db.getAll(USER_CORRECTIONS_STORE);
};

export const clearUserCorrections = async (): Promise<void> => {
    const db = await initDB();
    await db.clear(USER_CORRECTIONS_STORE);
};

// Phase 2: Enhanced Features CRUD operations

// Backup Metadata CRUD operations
export const saveBackupMetadata = async (backup: BackupMetadata): Promise<void> => {
    const db = await initDB();
    await db.put(BACKUPS_STORE, backup);
};

export const getBackupMetadata = async (id: string): Promise<BackupMetadata | undefined> => {
    const db = await initDB();
    return db.get(BACKUPS_STORE, id);
};

export const getAllBackupMetadata = async (): Promise<BackupMetadata[]> => {
    const db = await initDB();
    return db.getAll(BACKUPS_STORE);
};

export const deleteBackupMetadata = async (id: string): Promise<void> => {
    const db = await initDB();
    await db.delete(BACKUPS_STORE, id);
};

// Sync Status operations
export const saveSyncStatus = async (status: SyncStatus): Promise<void> => {
    const db = await initDB();
    await db.put(SYNC_STATUS_STORE, status, 'syncStatus');
};

export const getSyncStatus = async (): Promise<SyncStatus | undefined> => {
    const db = await initDB();
    return db.get(SYNC_STATUS_STORE, 'syncStatus');
};

// Analytics Data operations
export const saveAnalyticsData = async (analytics: AnalyticsData): Promise<void> => {
    const db = await initDB();
    await db.put(ANALYTICS_STORE, analytics, 'analyticsData');
};

export const getAnalyticsData = async (): Promise<AnalyticsData | undefined> => {
    const db = await initDB();
    return db.get(ANALYTICS_STORE, 'analyticsData');
};

// OAuth Token CRUD operations
export const saveOAuthToken = async (token: OAuthToken): Promise<void> => {
    const db = await initDB();
    await db.put(OAUTH_TOKENS_STORE, token);
};

export const getOAuthToken = async (id: string): Promise<OAuthToken | undefined> => {
    const db = await initDB();
    return db.get(OAUTH_TOKENS_STORE, id);
};

export const getAllOAuthTokens = async (): Promise<OAuthToken[]> => {
    const db = await initDB();
    return db.getAll(OAUTH_TOKENS_STORE);
};

export const deleteOAuthToken = async (id: string): Promise<void> => {
    const db = await initDB();
    await db.delete(OAUTH_TOKENS_STORE, id);
};

// Utility function to convert folder structure to folder tree
export const convertStructureToTree = (structure: FolderTemplate['structure']): (Folder | Bookmark)[] => {
    const convertNode = (node: FolderTemplate['structure'][0], parentId: string | null = null): Folder => {
        const folder: Folder = {
            id: node.id,
            name: node.name,
            children: [],
            parentId
        };

        // Convert children recursively
        node.children.forEach(childNode => {
            const childFolder = convertNode(childNode, folder.id);
            folder.children.push(childFolder);
        });

        return folder;
    };

    return structure.map(node => convertNode(node));
};
