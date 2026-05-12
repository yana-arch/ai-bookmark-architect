import { initDB } from './schema';
import {
    BOOKMARKS_STORE, FOLDERS_STORE, API_CONFIGS_STORE, INSTRUCTION_PRESETS_STORE,
    FOLDER_TEMPLATES_STORE, EMPTY_FOLDER_TREES_STORE, LOGS_STORE, USER_CORRECTIONS_STORE,
    BACKUPS_STORE, SYNC_STATUS_STORE, ANALYTICS_STORE, OAUTH_TOKENS_STORE,
    SMART_RULES_STORE, DB_CONNECTIONS_STORE, AI_PROFILES_STORE
} from './constants';
import type {
    Bookmark, Folder, ApiConfig, InstructionPreset, FolderTemplate, EmptyFolderTree,
    DetailedLog, UserCorrection, BackupMetadata, SyncStatus, AnalyticsData, OAuthToken,
    SmartClassifyRule, DbConnection, AIProfile
} from '@/types';

/**
 * Generic BaseStore for standard IndexedDB operations
 */
export class BaseStore<T> {
    constructor(protected storeName: string) {}

    async getAll(): Promise<T[]> {
        const db = await initDB();
        return db.getAll(this.storeName);
    }

    async get(id: string): Promise<T | undefined> {
        const db = await initDB();
        return db.get(this.storeName, id);
    }

    async put(item: T): Promise<void> {
        const db = await initDB();
        await db.put(this.storeName, item);
    }

    async add(item: T): Promise<void> {
        const db = await initDB();
        await db.add(this.storeName, item);
    }

    async delete(id: string): Promise<void> {
        const db = await initDB();
        await db.delete(this.storeName, id);
    }

    async clear(): Promise<void> {
        const db = await initDB();
        await db.clear(this.storeName);
    }
}

// Instantiate stores
export const bookmarkStore = new BaseStore<Bookmark>(BOOKMARKS_STORE);
export const apiConfigStore = new BaseStore<ApiConfig>(API_CONFIGS_STORE);
export const instructionPresetStore = new BaseStore<InstructionPreset>(INSTRUCTION_PRESETS_STORE);
export const folderTemplateStore = new BaseStore<FolderTemplate>(FOLDER_TEMPLATES_STORE);
export const emptyFolderTreeStore = new BaseStore<EmptyFolderTree>(EMPTY_FOLDER_TREES_STORE);
export const logStore = new BaseStore<DetailedLog>(LOGS_STORE);
export const userCorrectionStore = new BaseStore<UserCorrection>(USER_CORRECTIONS_STORE);
export const backupMetadataStore = new BaseStore<BackupMetadata>(BACKUPS_STORE);
export const smartRuleStore = new BaseStore<SmartClassifyRule>(SMART_RULES_STORE);
export const dbConnectionStore = new BaseStore<DbConnection>(DB_CONNECTIONS_STORE);
export const oauthTokenStore = new BaseStore<OAuthToken>(OAUTH_TOKENS_STORE);
export const aiProfileStore = new BaseStore<AIProfile>(AI_PROFILES_STORE);

// Custom logic for Bookmarks (Batching)
export const saveBookmarks = async (bookmarks: Bookmark[]): Promise<void> => {
    const db = await initDB();
    const tx = db.transaction(BOOKMARKS_STORE, 'readwrite');
    const store = tx.objectStore(BOOKMARKS_STORE);
    await store.clear();
    const BATCH_SIZE = 100;
    for (let i = 0; i < bookmarks.length; i += BATCH_SIZE) {
        const batch = bookmarks.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(bm => store.put(bm)));
    }
    await tx.done;
};

export const getBookmarks = () => bookmarkStore.getAll();

// Custom logic for Folders (Single entry with fixed key)
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
    // Note: Do NOT add DB_CONNECTIONS_STORE here to preserve connection configs during clear.
    const stores = [
        BOOKMARKS_STORE, FOLDERS_STORE, API_CONFIGS_STORE, INSTRUCTION_PRESETS_STORE,
        FOLDER_TEMPLATES_STORE, EMPTY_FOLDER_TREES_STORE, LOGS_STORE, USER_CORRECTIONS_STORE,
        BACKUPS_STORE, SYNC_STATUS_STORE, ANALYTICS_STORE, OAUTH_TOKENS_STORE, SMART_RULES_STORE,
        AI_PROFILES_STORE
    ];
    
    const tx = db.transaction(stores, 'readwrite');
    await Promise.all(stores.map(s => tx.objectStore(s).clear()));
    await tx.done;
};

// API Configs
export const saveApiConfig = (config: ApiConfig) => apiConfigStore.put(config);
export const getApiConfigs = () => apiConfigStore.getAll();
export const deleteApiConfig = (id: string) => apiConfigStore.delete(id);

// Instruction Presets
export const saveInstructionPreset = (preset: InstructionPreset) => instructionPresetStore.put(preset);
export const getInstructionPresets = () => instructionPresetStore.getAll();
export const getInstructionPreset = (id: string) => instructionPresetStore.get(id);
export const deleteInstructionPreset = (id: string) => instructionPresetStore.delete(id);

// Folder Templates
export const saveFolderTemplate = (template: FolderTemplate) => folderTemplateStore.put(template);
export const getFolderTemplates = () => folderTemplateStore.getAll();
export const getFolderTemplate = (id: string) => folderTemplateStore.get(id);
export const deleteFolderTemplate = (id: string) => folderTemplateStore.delete(id);

// Empty Folder Trees
export const saveEmptyFolderTree = (tree: EmptyFolderTree) => emptyFolderTreeStore.put(tree);
export const getEmptyFolderTrees = () => emptyFolderTreeStore.getAll();
export const getEmptyFolderTree = (id: string) => emptyFolderTreeStore.get(id);
export const deleteEmptyFolderTree = (id: string) => emptyFolderTreeStore.delete(id);

// Logs
export const saveLog = (log: DetailedLog) => logStore.add(log);
export const getLogs = () => logStore.getAll();
export const clearLogs = () => logStore.clear();

// User Corrections
export const saveUserCorrection = (correction: UserCorrection) => userCorrectionStore.add(correction);
export const getUserCorrections = () => userCorrectionStore.getAll();
export const clearUserCorrections = () => userCorrectionStore.clear();

// Backups
export const saveBackupMetadata = (backup: BackupMetadata) => backupMetadataStore.put(backup);
export const getBackupMetadata = (id: string) => backupMetadataStore.get(id);
export const getAllBackupMetadata = () => backupMetadataStore.getAll();
export const deleteBackupMetadata = (id: string) => backupMetadataStore.delete(id);

// Sync Status (Single entry)
export const saveSyncStatus = async (status: SyncStatus): Promise<void> => {
    const db = await initDB();
    await db.put(SYNC_STATUS_STORE, status, 'syncStatus');
};

export const getSyncStatus = async (): Promise<SyncStatus | undefined> => {
    const db = await initDB();
    return db.get(SYNC_STATUS_STORE, 'syncStatus');
};

// Analytics (Single entry)
export const saveAnalyticsData = async (analytics: AnalyticsData): Promise<void> => {
    const db = await initDB();
    await db.put(ANALYTICS_STORE, analytics, 'analyticsData');
};

export const getAnalyticsData = async (): Promise<AnalyticsData | undefined> => {
    const db = await initDB();
    return db.get(ANALYTICS_STORE, 'analyticsData');
};

// OAuth Tokens
export const saveOAuthToken = (token: OAuthToken) => oauthTokenStore.put(token);
export const getOAuthToken = (id: string) => oauthTokenStore.get(id);
export const getAllOAuthTokens = () => oauthTokenStore.getAll();
export const deleteOAuthToken = (id: string) => oauthTokenStore.delete(id);

// Smart Rules
export const saveSmartClassifyRule = (rule: SmartClassifyRule) => smartRuleStore.put(rule);
export const getSmartClassifyRules = () => smartRuleStore.getAll();
export const deleteSmartClassifyRule = (id: string) => smartRuleStore.delete(id);

// DB Connections
export const saveDbConnection = (connection: DbConnection) => dbConnectionStore.put(connection);
export const getDbConnections = () => dbConnectionStore.getAll();
export const getDbConnection = (id: string) => dbConnectionStore.get(id);
export const deleteDbConnection = (id: string) => dbConnectionStore.delete(id);

// AI Profiles
export const saveAIProfile = (profile: AIProfile) => aiProfileStore.put(profile);
export const getAIProfiles = () => aiProfileStore.getAll();
export const getAIProfile = (id: string) => aiProfileStore.get(id);
export const deleteAIProfile = (id: string) => aiProfileStore.delete(id);
