import { openDB, IDBPDatabase } from 'idb';
// Fix: Import ApiConfig type.
import type { Bookmark, Folder, ApiConfig, InstructionPreset, FolderTemplate, EmptyFolderTree, DbConnection, SyncProfile, EncryptedData } from './types';

const DB_NAME = 'AIBookmarkArchitectDB';
const BOOKMARKS_STORE = 'bookmarks';
const FOLDERS_STORE = 'folders';
// Fix: Add API_CONFIGS_STORE constant.
const API_CONFIGS_STORE = 'apiConfigs';
const INSTRUCTION_PRESETS_STORE = 'instructionPresets';
const FOLDER_TEMPLATES_STORE = 'folderTemplates';
const EMPTY_FOLDER_TREES_STORE = 'emptyFolderTrees';

let dbPromise: Promise<IDBPDatabase>;

const initDB = () => {
    if (!dbPromise) {
        // Fix: Bump DB version to 6 and add dbConnections store.
        dbPromise = openDB(DB_NAME, 6, {
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
                    if (!db.objectStoreNames.contains(DB_CONNECTIONS_STORE)) {
                        db.createObjectStore(DB_CONNECTIONS_STORE, { keyPath: 'id' });
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
    const tx = db.transaction([BOOKMARKS_STORE, FOLDERS_STORE, API_CONFIGS_STORE, INSTRUCTION_PRESETS_STORE, FOLDER_TEMPLATES_STORE, EMPTY_FOLDER_TREES_STORE], 'readwrite');
    await tx.objectStore(BOOKMARKS_STORE).clear();
    await tx.objectStore(FOLDERS_STORE).clear();
    await tx.objectStore(API_CONFIGS_STORE).clear();
    await tx.objectStore(INSTRUCTION_PRESETS_STORE).clear();
    await tx.objectStore(FOLDER_TEMPLATES_STORE).clear();
    await tx.objectStore(EMPTY_FOLDER_TREES_STORE).clear();
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

// Cloud Database Connection Store
const DB_CONNECTIONS_STORE = 'dbConnections';

// Database Connections CRUD
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

// Browser-compatible PostgreSQL HTTP client for Neon
class NeonHttpClient {
    private baseUrl: string;
    private authHeader: string;

    constructor(connection: DbConnection) {
        const url = new URL(connection.connectionString);

        if (url.hostname.includes('neon.tech') || url.hostname.includes('aws.neon.tech')) {
            // Neon HTTP API uses the full hostname from the connection string
            // e.g., https://ep-sparkling-mouse-a1dvke3q-pooler.ap-southeast-1.aws.neon.tech/v1/sql
            this.baseUrl = `https://${url.hostname}/v1/sql`;

            console.log('Neon HTTP connection details:', {
                fullHostname: url.hostname,
                baseUrl: this.baseUrl
            });
        } else {
            // Fallback for other PostgreSQL providers
            this.baseUrl = `https://${url.hostname}/v1/sql`;
        }

        // Neon HTTP API uses password as Bearer token
        this.authHeader = `Bearer ${connection.password}`;
    }

    async query(sql: string, params: any[] = []): Promise<any> {
        // Simple SQL execution for Neon HTTP API
        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: {
                'Authorization': this.authHeader,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                query: sql,
                params: params
            })
        });

        if (!response.ok) {
            throw new Error(`PostgreSQL HTTP error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        return result;
    }
}

const generateUserHash = (username: string, host: string): string => {
    // Create a unique identifier based on user and host
    return btoa(`${username}@${host}`).replace(/[+/=]/g, '').toLowerCase().slice(0, 10);
};

export const exportToCloud = async (connection: DbConnection): Promise<{ success: boolean; message: string }> => {
    const client = new NeonHttpClient(connection);
    const userHash = generateUserHash(connection.username, connection.host);

    try {
        // Create tables if they don't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS bookmarks (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                db_connection_hash TEXT NOT NULL,
                title TEXT NOT NULL,
                url TEXT NOT NULL,
                path TEXT[],
                tags TEXT[],
                parent_id TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_bookmarks_user_hash ON bookmarks(user_id, db_connection_hash);
        `);

        // Get local data
        const bookmarks = await getBookmarks();

        if (bookmarks.length === 0) {
            return { success: false, message: 'Không có bookmark nào để export.' };
        }

        // Clear existing data for this user/connection
        await client.query('DELETE FROM bookmarks WHERE user_id = $1 AND db_connection_hash = $2', [connection.username, userHash]);

        // Insert bookmarks one by one (simpler for HTTP API)
        let successCount = 0;
        for (const bm of bookmarks) {
            try {
                await client.query(
                    `INSERT INTO bookmarks (id, user_id, db_connection_hash, title, url, path, tags, parent_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [
                        bm.id,
                        connection.username,
                        userHash,
                        bm.title,
                        bm.url,
                        bm.path || [],
                        bm.tags || [],
                        bm.parentId
                    ]
                );
                successCount++;
            } catch (error) {
                console.error('Failed to insert bookmark:', bm.id, error);
            }
        }

        if (successCount > 0) {
            connection.isActive = true;
            await saveDbConnection(connection);
            return { success: true, message: `Đã export thành công ${successCount}/${bookmarks.length} bookmark(s) lên cloud.` };
        } else {
            return { success: false, message: 'Không thể export bookmark nào.' };
        }

    } catch (error: any) {
        console.error('Cloud export error:', error);
        return { success: false, message: `Lỗi khi export: ${error.message}. Vui lòng kiểm tra kết nối.` };
    }
};

export const importFromCloud = async (connection: DbConnection, mode: 'merge' | 'replace' = 'merge'): Promise<{ success: boolean; message: string }> => {
    const client = new NeonHttpClient(connection);
    const userHash = generateUserHash(connection.username, connection.host);

    try {
        // Get cloud data
        const result = await client.query(
            'SELECT * FROM bookmarks WHERE user_id = $1 AND db_connection_hash = $2 ORDER BY created_at',
            [connection.username, userHash]
        );

        // Neon may return data differently, adjust based on actual response
        const rows = result.rows || result.data || [];

        if (rows.length === 0) {
            return { success: false, message: 'Không tìm thấy bookmark nào trong cloud.' };
        }

        // Convert cloud data to local format
        const cloudBookmarks: Bookmark[] = rows.map(row => ({
            id: row.id,
            title: row.title,
            url: row.url,
            parentId: row.parent_id,
            path: row.path,
            tags: row.tags
        }));

        // Handle local data
        const existingBookmarks = await getBookmarks();

        let finalBookmarks: Bookmark[];

        if (mode === 'replace') {
            // Replace all local bookmarks
            finalBookmarks = cloudBookmarks;
            await saveBookmarks(finalBookmarks);
            await saveFolders([]); // Clear folder structure
        } else {
            // Merge: add new bookmarks, update existing by URL
            const merged = [...existingBookmarks];
            const urlMap = new Map(existingBookmarks.map(bm => [bm.url, bm]));

            for (const cloudBm of cloudBookmarks) {
                const existing = urlMap.get(cloudBm.url);
                if (existing) {
                    // Update existing with cloud data
                    Object.assign(existing, cloudBm);
                } else {
                    // Add new bookmark
                    merged.push(cloudBm);
                }
            }

            finalBookmarks = merged;
            await saveBookmarks(finalBookmarks);
        }

        return { success: true, message: `Đã import thành công ${cloudBookmarks.length} bookmark(s) từ cloud. Mode: ${mode}` };

    } catch (error: any) {
        console.error('Cloud import error:', error);
        return { success: false, message: `Lỗi khi import: ${error.message}. Vui lòng kiểm tra kết nối.` };
    }
};

// Parse PostgreSQL connection string
export const parsePostgresConnectionString = (connectionString: string): Omit<DbConnection, 'id' | 'name' | 'isActive' | 'createdAt'> => {
    // postgres://username:password@hostname:port/database
    const url = new URL(connectionString);

    if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
        throw new Error('Invalid PostgreSQL connection string. Expected postgres:// or postgresql://');
    }

    return {
        connectionString,
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        database: url.pathname.slice(1), // Remove leading slash
        username: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password)
    };
};

// Test database connection (using HTTP client)
export const testDbConnection = async (connection: DbConnection): Promise<{ success: boolean; message: string; latency?: number }> => {
    const client = new NeonHttpClient(connection);
    const start = Date.now();

    try {
        const result = await client.query('SELECT NOW() as current_time');
        const latency = Date.now() - start;
        return { success: true, message: 'Connected successfully', latency };
    } catch (error: any) {
        return { success: false, message: `Connection failed: ${error.message}` };
    }
};
