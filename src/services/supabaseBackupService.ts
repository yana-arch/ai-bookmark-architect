import { apiClient } from './apiClient';
import { supabase } from './supabaseClient';
import type { BackupMetadata, Bookmark, Folder } from '@/types';

class SupabaseBackupService {
    private initialized = false;

    async initialize(): Promise<void> {
        if (this.initialized) return;
        await supabase.auth.getSession();
        this.initialized = true;
    }

    async isSignedIn(): Promise<boolean> {
        const { data: { session } } = await supabase.auth.getSession();
        return !!session;
    }

    async listBackups(): Promise<BackupMetadata[]> {
        const results = await apiClient.listBackups();

        return results.map(result => ({
            id: result.key,
            name: result.metadata.name,
            description: result.metadata.description,
            timestamp: result.createdAt,
            size: result.metadata.size,
            bookmarkCount: result.metadata.bookmarkCount,
            folderCount: result.metadata.folderCount,
            type: result.metadata.type,
            status: result.metadata.status,
        }));
    }

    async uploadBackup(
        data: { bookmarks: Bookmark[]; folders: Folder[] },
        metadata: Omit<BackupMetadata, 'id'>
    ): Promise<BackupMetadata> {
        const key = metadata.name;
        const exists = await apiClient.checkKeyExists(key);
        if (exists) {
            throw new Error('A backup with this name already exists. Please choose a different name.');
        }

        const jsonString = JSON.stringify({ data, metadata });
        const sizeBytes = new Blob([jsonString]).size;

        const result = await apiClient.createBackup(key, data, {
            ...metadata,
            size: sizeBytes,
        });

        return {
            id: result.id,
            name: metadata.name,
            description: metadata.description,
            timestamp: Date.now(),
            size: sizeBytes,
            bookmarkCount: metadata.bookmarkCount,
            folderCount: metadata.folderCount,
            type: metadata.type,
            status: 'completed',
        };
    }

    async downloadBackup(backupId: string): Promise<{ data: { bookmarks: Bookmark[]; folders: Folder[] } }> {
        const result = await apiClient.getBackup(backupId);
        return { data: result.data };
    }

    async deleteBackup(backupId: string): Promise<void> {
        await apiClient.deleteBackup(backupId);
    }
}

export const supabaseBackupService = new SupabaseBackupService();

class SupabaseKeyBackupService {
    async checkKeyExists(key: string): Promise<boolean> {
        return apiClient.checkKeyExists(key);
    }

    async uploadBackup(
        key: string,
        data: { bookmarks: Bookmark[]; folders: Folder[] },
        metadata: Omit<BackupMetadata, 'id'>,
        onProgress?: (progress: number) => void
    ): Promise<BackupMetadata> {
        onProgress?.(10);

        const exists = await this.checkKeyExists(key);
        if (exists) {
            throw new Error('Key already exists. Please choose a different key.');
        }

        onProgress?.(30);

        const jsonString = JSON.stringify({ data, metadata });
        const sizeBytes = new Blob([jsonString]).size;

        onProgress?.(50);

        const result = await apiClient.createBackup(key, data, {
            ...metadata,
            size: sizeBytes,
        });

        onProgress?.(100);

        return {
            id: result.id,
            name: metadata.name,
            description: metadata.description,
            timestamp: Date.now(),
            size: sizeBytes,
            bookmarkCount: metadata.bookmarkCount,
            folderCount: metadata.folderCount,
            type: metadata.type,
            status: 'completed',
        };
    }

    async downloadBackup(
        key: string,
        onProgress?: (progress: number) => void
    ): Promise<{ metadata: BackupMetadata; data: { bookmarks: Bookmark[]; folders: Folder[] } }> {
        onProgress?.(10);

        const result = await apiClient.getBackup(key);

        onProgress?.(50);

        const metadata: BackupMetadata = {
            id: result.id,
            name: result.metadata.name,
            description: result.metadata.description,
            timestamp: result.createdAt,
            size: result.metadata.size,
            bookmarkCount: result.metadata.bookmarkCount,
            folderCount: result.metadata.folderCount,
            type: result.metadata.type,
            status: result.metadata.status,
        };

        onProgress?.(100);

        return { metadata, data: result.data };
    }

    async listBackups(): Promise<BackupMetadata[]> {
        const results = await apiClient.listBackups();

        return results.map(result => ({
            id: result.key,
            name: result.metadata.name,
            description: result.metadata.description,
            timestamp: result.createdAt,
            size: result.metadata.size,
            bookmarkCount: result.metadata.bookmarkCount,
            folderCount: result.metadata.folderCount,
            type: result.metadata.type,
            status: result.metadata.status,
        }));
    }

    async deleteBackup(key: string): Promise<void> {
        await apiClient.deleteBackup(key);
    }
}

export const supabaseKeyBackupService = new SupabaseKeyBackupService();