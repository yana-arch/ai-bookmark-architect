import type { DbConnection, Bookmark } from '../../types';
import { getBookmarks, saveBookmarks, saveFolders, saveDbConnection } from './local';

export class NeonHttpClient {
    private baseUrl: string;
    private authHeader: string;

    constructor(connection: DbConnection) {
        const url = new URL(connection.connectionString);
        if (url.hostname.includes('neon.tech') || url.hostname.includes('aws.neon.tech')) {
            this.baseUrl = `https://${url.hostname}/v1/sql`;
            console.log('Neon HTTP connection details:', {
                fullHostname: url.hostname,
                baseUrl: this.baseUrl
            });
        } else {
            this.baseUrl = `https://${url.hostname}/v1/sql`;
        }
        this.authHeader = `Bearer ${connection.password}`;
    }

    async query(sql: string, params: any[] = []): Promise<any> {
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
    return btoa(`${username}@${host}`).replace(/[+/=]/g, '').toLowerCase().slice(0, 10);
};

export const exportToCloud = async (connection: DbConnection): Promise<{ success: boolean; message: string }> => {
    const client = new NeonHttpClient(connection);
    const userHash = generateUserHash(connection.username, connection.host);

    try {
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

        const bookmarks = await getBookmarks();

        if (bookmarks.length === 0) {
            return { success: false, message: 'Không có bookmark nào để export.' };
        }

        await client.query('DELETE FROM bookmarks WHERE user_id = $1 AND db_connection_hash = $2', [connection.username, userHash]);

        const BATCH_SIZE = 50;
        let successCount = 0;

        for (let i = 0; i < bookmarks.length; i += BATCH_SIZE) {
            const batch = bookmarks.slice(i, i + BATCH_SIZE);
            const batchPromises = batch.map(bm => 
                client.query(
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
                )
            );

            try {
                await Promise.all(batchPromises);
                successCount += batch.length;
            } catch (error) {
                console.error('Failed to insert batch starting at index', i, error);
                for (const bm of batch) {
                    try {
                        await client.query(
                            `INSERT INTO bookmarks (id, user_id, db_connection_hash, title, url, path, tags, parent_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                            [
                                bm.id,
                                bm.title,
                                bm.url,
                                bm.path || [],
                                bm.tags || [],
                                bm.parentId
                            ]
                        );
                        successCount++;
                    } catch (innerError) {
                        console.error('Failed to insert individual bookmark:', bm.id, innerError);
                    }
                }
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
        const result = await client.query(
            'SELECT * FROM bookmarks WHERE user_id = $1 AND db_connection_hash = $2 ORDER BY created_at',
            [connection.username, userHash]
        );

        const rows = result.rows || result.data || [];

        if (rows.length === 0) {
            return { success: false, message: 'Không tìm thấy bookmark nào trong cloud.' };
        }

        const cloudBookmarks: Bookmark[] = rows.map((row: any) => ({
            id: row.id,
            title: row.title,
            url: row.url,
            parentId: row.parent_id,
            path: row.path,
            tags: row.tags
        }));

        const existingBookmarks = await getBookmarks();
        let finalBookmarks: Bookmark[];

        if (mode === 'replace') {
            finalBookmarks = cloudBookmarks;
            await saveBookmarks(finalBookmarks);
            await saveFolders([]);
        } else {
            const merged = [...existingBookmarks];
            const urlMap = new Map(existingBookmarks.map(bm => [bm.url, bm]));

            for (const cloudBm of cloudBookmarks) {
                const existing = urlMap.get(cloudBm.url);
                if (existing) {
                    Object.assign(existing, cloudBm);
                } else {
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

export const parseDbConnectionString = (connectionString: string): Omit<DbConnection, 'id' | 'name' | 'isActive' | 'createdAt'> => {
    const url = new URL(connectionString);

    if (url.protocol === 'supabase:') {
        const pathParts = url.pathname.split('/');
        const apiKey = pathParts[1] || url.pathname.slice(1);
        return {
            connectionString,
            host: url.hostname,
            port: 5432,
            database: 'postgres',
            username: 'postgres',
            password: apiKey,
            provider: 'supabase'
        };
    } else if (url.protocol === 'postgresql:' || url.protocol === 'postgres:') {
        return {
            connectionString,
            host: url.hostname,
            port: parseInt(url.port) || 5432,
            database: url.pathname.slice(1),
            username: decodeURIComponent(url.username),
            password: decodeURIComponent(url.password),
            provider: url.hostname.includes('neon.tech') ? 'neon' : 'postgresql'
        };
    } else {
        throw new Error('Invalid connection string. Expected supabase:// or postgres[t]:// format');
    }
};

export const testDbConnection = async (connection: DbConnection): Promise<{ success: boolean; message: string; latency?: number }> => {
    const client = new NeonHttpClient(connection);
    const start = Date.now();
    try {
        await client.query('SELECT NOW() as current_time');
        const latency = Date.now() - start;
        return { success: true, message: 'Connected successfully', latency };
    } catch (error: any) {
        return { success: false, message: `Connection failed: ${error.message}` };
    }
};
