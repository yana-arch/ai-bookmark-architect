import { initDB } from './schema';
import {
    BOOKMARKS_STORE, FOLDERS_STORE, API_CONFIGS_STORE, INSTRUCTION_PRESETS_STORE,
    FOLDER_TEMPLATES_STORE, EMPTY_FOLDER_TREES_STORE, LOGS_STORE, USER_CORRECTIONS_STORE,
    BACKUPS_STORE, SYNC_STATUS_STORE, ANALYTICS_STORE, OAUTH_TOKENS_STORE,
    SMART_RULES_STORE, DB_CONNECTIONS_STORE
} from './constants';
import type {
    Bookmark, Folder, ApiConfig, InstructionPreset, FolderTemplate, EmptyFolderTree,
    DetailedLog, UserCorrection, BackupMetadata, SyncStatus, AnalyticsData, OAuthToken,
    SmartClassifyRule, DbConnection
} from '../../types';

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
    const tx = db.transaction([
        BOOKMARKS_STORE, FOLDERS_STORE, API_CONFIGS_STORE, INSTRUCTION_PRESETS_STORE,
        FOLDER_TEMPLATES_STORE, EMPTY_FOLDER_TREES_STORE, LOGS_STORE, USER_CORRECTIONS_STORE,
        BACKUPS_STORE, SYNC_STATUS_STORE, ANALYTICS_STORE, OAUTH_TOKENS_STORE, SMART_RULES_STORE
    ], 'readwrite');
    
    // We also need to clear DB_CONNECTIONS_STORE but it might not be in the transaction if not added above.
    // The original code didn't clear DB_CONNECTIONS_STORE in clearAllData.
    // I will stick to original logic.
    
    await tx.objectStore(BOOKMARKS_STORE).clear();
    await tx.objectStore(FOLDERS_STORE).clear();
    await tx.objectStore(API_CONFIGS_STORE).clear();
    await tx.objectStore(INSTRUCTION_PRESETS_STORE).clear();
    await tx.objectStore(FOLDER_TEMPLATES_STORE).clear();
    await tx.objectStore(EMPTY_FOLDER_TREES_STORE).clear();
    await tx.objectStore(LOGS_STORE).clear();
    await tx.objectStore(USER_CORRECTIONS_STORE).clear();
    await tx.objectStore(BACKUPS_STORE).clear();
    await tx.objectStore(SYNC_STATUS_STORE).clear();
    await tx.objectStore(ANALYTICS_STORE).clear();
    await tx.objectStore(OAUTH_TOKENS_STORE).clear();
    await tx.objectStore(SMART_RULES_STORE).clear();
    await tx.done;
};

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

export const saveSyncStatus = async (status: SyncStatus): Promise<void> => {
    const db = await initDB();
    await db.put(SYNC_STATUS_STORE, status, 'syncStatus');
};

export const getSyncStatus = async (): Promise<SyncStatus | undefined> => {
    const db = await initDB();
    return db.get(SYNC_STATUS_STORE, 'syncStatus');
};

export const saveAnalyticsData = async (analytics: AnalyticsData): Promise<void> => {
    const db = await initDB();
    await db.put(ANALYTICS_STORE, analytics, 'analyticsData');
};

export const getAnalyticsData = async (): Promise<AnalyticsData | undefined> => {
    const db = await initDB();
    return db.get(ANALYTICS_STORE, 'analyticsData');
};

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

export const saveSmartClassifyRule = async (rule: SmartClassifyRule): Promise<void> => {
    const db = await initDB();
    await db.put(SMART_RULES_STORE, rule);
};

export const getSmartClassifyRules = async (): Promise<SmartClassifyRule[]> => {
    const db = await initDB();
    return db.getAll(SMART_RULES_STORE);
};

export const deleteSmartClassifyRule = async (id: string): Promise<void> => {
    const db = await initDB();
    await db.delete(SMART_RULES_STORE, id);
};

// DbConnection CRUD
export const saveDbConnection = async (connection: DbConnection): Promise<void> => {
    const db = await initDB();
    await db.put(DB_CONNECTIONS_STORE, connection);
};

export const getDbConnections = async (): Promise<DbConnection[]> => {
    const db = await initDB();
    return db.getAll(DB_CONNECTIONS_STORE);
};

export const getDbConnection = async (id: string): Promise<DbConnection | undefined> => {
    const db = await initDB();
    return db.get(DB_CONNECTIONS_STORE, id);
};

export const deleteDbConnection = async (id: string): Promise<void> => {
    const db = await initDB();
    await db.delete(DB_CONNECTIONS_STORE, id);
};

export const convertStructureToTree = (structure: FolderTemplate['structure']): (Folder | Bookmark)[] => {
    if (!structure || structure.length === 0) return [];
    const result: Folder[] = [];
    const stack: { node: FolderTemplate['structure'][0]; parent: Folder | null }[] = 
        structure.map(n => ({ node: n, parent: null }));
    const folderMap = new Map<string, Folder>();
    while (stack.length > 0) {
        const { node, parent } = stack.pop()!;
        const folder: Folder = {
            id: node.id,
            name: node.name,
            children: [],
            parentId: parent ? parent.id : null
        };
        folderMap.set(folder.id, folder);
        if (parent) {
            parent.children.push(folder);
        } else {
            result.push(folder);
        }
        if (node.children && node.children.length > 0) {
            for (let i = node.children.length - 1; i >= 0; i--) {
                stack.push({ node: node.children[i], parent: folder });
            }
        }
    }
    return result;
};
