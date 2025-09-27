// Advanced caching utilities for performance optimization

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number; // Time to live in milliseconds
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

// Global cache instances
export const apiResponseCache = new MemoryCache<any>(50); // Cache API responses
export const folderCache = new MemoryCache<any>(20); // Cache folder structures
export const searchCache = new MemoryCache<any>(30); // Cache search results

// Cache keys generators
export const cacheKeys = {
    apiResponse: (provider: string, model: string, prompt: string) =>
        `api_${provider}_${model}_${prompt.slice(0, 100).replace(/\s+/g, '_')}`,

    folderStructure: (bookmarksHash: string) =>
        `folders_${bookmarksHash}`,

    searchResults: (query: string, bookmarksHash: string) =>
        `search_${query}_${bookmarksHash}`,

    duplicateStats: (bookmarksHash: string) =>
        `duplicates_${bookmarksHash}`,
};

// Utility to generate simple hash for cache invalidation
export const generateHash = (data: any): string => {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
};

// Cache statistics for monitoring
export const cacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,

    reset(): void {
        this.hits = 0;
        this.misses = 0;
        this.sets = 0;
    },

    get hitRate(): number {
        const total = this.hits + this.misses;
        return total > 0 ? (this.hits / total) * 100 : 0;
    },

    report(): void {
        console.log(`Cache Stats - Hits: ${this.hits}, Misses: ${this.misses}, Sets: ${this.sets}, Hit Rate: ${this.hitRate.toFixed(1)}%`);
    }
};

// Enhanced cache wrapper with statistics
export class CachedOperation<T> {
    private cache: MemoryCache<T>;
    private operation: () => Promise<T>;
    private ttl: number;

    constructor(cache: MemoryCache<T>, operation: () => Promise<T>, ttl = 5 * 60 * 1000) {
        this.cache = cache;
        this.operation = operation;
        this.ttl = ttl;
    }

    async execute(cacheKey: string): Promise<T> {
        // Try to get from cache first
        const cached = this.cache.get(cacheKey);
        if (cached !== null) {
            cacheStats.hits++;
            return cached;
        }

        cacheStats.misses++;

        // Execute operation
        const result = await this.operation();

        // Cache the result
        this.cache.set(cacheKey, result, this.ttl);
        cacheStats.sets++;

        return result;
    }
}

// Periodic cache cleanup
setInterval(() => {
    apiResponseCache.cleanup();
    folderCache.cleanup();
    searchCache.cleanup();
}, 10 * 60 * 1000); // Clean up every 10 minutes
