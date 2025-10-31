// Advanced caching utilities for performance optimization

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number; // Time to live in milliseconds
    key?: string; // Optional key for IndexedDB
}

class MemoryCache<T> {
    private cache = new Map<string, CacheEntry<T>>();
    private maxSize: number;

    constructor(maxSize = 100) {
        this.maxSize = maxSize;
    }

    set(key: string, data: T, ttl = 5 * 60 * 1000): void { // Default 5 minutes TTL
        // Clean up expired entries if cache is getting full
        if (this.cache.size >= this.maxSize) {
            this.cleanup();
        }

        // If still at max size after cleanup, remove oldest entry
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
    }

    get(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        // Check if entry has expired
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return null;
        }

        return entry.data;
    }

    has(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;

        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return false;
        }

        return true;
    }

    delete(key: string): void {
        this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }

    cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                this.cache.delete(key);
            }
        }
    }

    size(): number {
        this.cleanup(); // Clean up before returning size
        return this.cache.size;
    }
}

class SessionStorageCache<T> {
    private prefix: string;

    constructor(prefix: string) {
        this.prefix = `app_cache_${prefix}_`;
    }

    private getKey(key: string): string {
        return this.prefix + key;
    }

    set(key: string, data: T, ttl = 5 * 60 * 1000): void {
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl
        };
        try {
            sessionStorage.setItem(this.getKey(key), JSON.stringify(entry));
        } catch (e) {
            console.error("Error writing to sessionStorage:", e);
        }
    }

    get(key: string): T | null {
        try {
            const item = sessionStorage.getItem(this.getKey(key));
            if (!item) return null;

            const entry: CacheEntry<T> = JSON.parse(item);
            if (Date.now() - entry.timestamp > entry.ttl) {
                sessionStorage.removeItem(this.getKey(key));
                return null;
            }
            return entry.data;
        } catch (e) {
            console.error("Error reading from sessionStorage:", e);
            return null;
        }
    }

    has(key: string): boolean {
        return this.get(key) !== null;
    }

    delete(key: string): void {
        sessionStorage.removeItem(this.getKey(key));
    }

    clear(): void {
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && key.startsWith(this.prefix)) {
                sessionStorage.removeItem(key);
            }
        }
    }
}

class IndexedDBCache<T> {
    private dbName: string;
    private storeName: string;
    private db: IDBDatabase | null = null;

    constructor(dbName: string, storeName: string) {
        this.dbName = dbName;
        this.storeName = storeName;
    }

    private async openDB(): Promise<IDBDatabase> {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                db.createObjectStore(this.storeName, { keyPath: 'key' });
            };

            request.onsuccess = (event) => {
                this.db = (event.target as IDBOpenDBRequest).result;
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error("IndexedDB error:", (event.target as IDBOpenDBRequest).error);
                reject((event.target as IDBOpenDBRequest).error);
            };
        });
    }

    async set(key: string, data: T, ttl = 24 * 60 * 60 * 1000): Promise<void> { // Default 24 hours TTL
        const db = await this.openDB();
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const entry: CacheEntry<T> = {
            key, // IndexedDB requires a keyPath
            data,
            timestamp: Date.now(),
            ttl
        };
        await new Promise<void>((resolve, reject) => {
            const request = store.put(entry);
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject((event.target as IDBRequest).error);
        });
    }

    async get(key: string): Promise<T | null> {
        const db = await this.openDB();
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);

        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => {
                const entry: CacheEntry<T> = request.result;
                if (!entry) {
                    resolve(null);
                    return;
                }

                if (Date.now() - entry.timestamp > entry.ttl) {
                    this.delete(key); // Delete expired entry
                    resolve(null);
                } else {
                    resolve(entry.data);
                }
            };
            request.onerror = (event) => reject((event.target as IDBRequest).error);
        });
    }

    async has(key: string): Promise<boolean> {
        return (await this.get(key)) !== null;
    }

    async delete(key: string): Promise<void> {
        const db = await this.openDB();
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        await new Promise<void>((resolve, reject) => {
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject((event.target as IDBRequest).error);
        });
    }

    async clear(): Promise<void> {
        const db = await this.openDB();
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        await new Promise<void>((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject((event.target as IDBRequest).error);
        });
    }

    async cleanup(): Promise<void> {
        const db = await this.openDB();
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const now = Date.now();

        return new Promise((resolve, reject) => {
            const request = store.openCursor();
            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    const entry: CacheEntry<T> = cursor.value;
                    if (now - entry.timestamp > entry.ttl) {
                        cursor.delete();
                    }
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            request.onerror = (event) => reject((event.target as IDBRequest).error);
        });
    }
}

// CachedOperation class for managing multiple cache layers
class CachedOperation<T> {
    private caches: (MemoryCache<T> | SessionStorageCache<T> | IndexedDBCache<T>)[];
    private operation: () => Promise<T>;
    private defaultTtl: number;

    constructor(
        caches: (MemoryCache<T> | SessionStorageCache<T> | IndexedDBCache<T>)[],
        operation: () => Promise<T>,
        defaultTtl: number = 5 * 60 * 1000
    ) {
        this.caches = caches;
        this.operation = operation;
        this.defaultTtl = defaultTtl;
    }

    async get(key: string, ttl?: number): Promise<T> {
        const cacheTtl = ttl || this.defaultTtl;

        // Try caches in order (memory -> session -> indexeddb)
        for (const cache of this.caches) {
            const cached = cache.get(key);
            if (cached !== null) {
                return cached;
            }
        }

        // Execute operation and cache result
        const result = await this.operation();

        // Store in all caches
        for (const cache of this.caches) {
            cache.set(key, result, cacheTtl);
        }

        return result;
    }

    set(key: string, value: T, ttl?: number): void {
        const cacheTtl = ttl || this.defaultTtl;
        for (const cache of this.caches) {
            cache.set(key, value, cacheTtl);
        }
    }

    has(key: string): boolean {
        return this.caches.some(cache => cache.has(key));
    }

    delete(key: string): void {
        for (const cache of this.caches) {
            cache.delete(key);
        }
    }

    clear(): void {
        for (const cache of this.caches) {
            cache.clear();
        }
    }
}

// Cache key utilities
export const cacheKeys = {
    searchResults: (query: string, dataHash: string) => `search_${query}_${dataHash}`,
    apiResponse: (endpoint: string, params: any) => `api_${endpoint}_${JSON.stringify(params)}`,
    folderStructure: (bookmarksHash: string) => `folders_${bookmarksHash}`,
};

// Hash generation utility
export const generateHash = (data: any): string => {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
};

// Cache statistics
export const cacheStats = {
    hits: 0,
    misses: 0,
    reset: () => {
        cacheStats.hits = 0;
        cacheStats.misses = 0;
    },
    getHitRate: () => {
        const total = cacheStats.hits + cacheStats.misses;
        return total > 0 ? cacheStats.hits / total : 0;
    }
};

// Global cache instances
const memoryApiResponseCache = new MemoryCache<any>(50);
const memoryFolderCache = new MemoryCache<any>(20);
const memorySearchCache = new MemoryCache<any>(30);

// Session storage caches
const apiResponseSessionCache = new SessionStorageCache<any>('api_responses');
const folderSessionCache = new SessionStorageCache<any>('folders');
const searchSessionCache = new SessionStorageCache<any>('search');

// IndexedDB caches
const apiResponseIndexedDBCache = new IndexedDBCache<any>('ApiResponses', 'responses');
const folderIndexedDBCache = new IndexedDBCache<any>('Folders', 'structures');
const searchIndexedDBCache = new IndexedDBCache<any>('Search', 'results');

export const apiResponseCache = new CachedOperation(
    [memoryApiResponseCache, apiResponseSessionCache, apiResponseIndexedDBCache],
    async () => { throw new Error("Operation not provided for apiResponseCache"); },
    5 * 60 * 1000 // Default TTL 5 minutes
);
export const folderCache = new CachedOperation(
    [memoryFolderCache, folderSessionCache, folderIndexedDBCache],
    async () => { throw new Error("Operation not provided for folderCache"); },
    20 * 60 * 1000 // Default TTL 20 minutes
);
export const searchCache = new CachedOperation(
    [memorySearchCache, searchSessionCache, searchIndexedDBCache],
    async () => { throw new Error("Operation not provided for searchCache"); },
    10 * 60 * 1000 // Default TTL 10 minutes
);

// Periodic cleanup for IndexedDB caches
setInterval(() => {
    apiResponseIndexedDBCache.cleanup();
    folderIndexedDBCache.cleanup();
    searchIndexedDBCache.cleanup();
}, 60 * 60 * 1000); // Clean up every 1 hour
