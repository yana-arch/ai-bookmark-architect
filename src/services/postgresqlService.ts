import { apiClient } from './apiClient';
import { supabase } from './supabaseClient';
import type { BackupMetadata, Bookmark, Folder } from '@/types';

class PostgreSQLService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Ensure Supabase is ready
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
      status: result.metadata.status
    }));
  }

  async uploadBackup(
    data: { bookmarks: Bookmark[]; folders: Folder[] },
    metadata: Omit<BackupMetadata, 'id'>
  ): Promise<BackupMetadata> {
    // Use the backup name as the key
    const key = metadata.name;

    // Check if key already exists
    const exists = await apiClient.checkKeyExists(key);
    if (exists) {
      throw new Error('A backup with this name already exists. Please choose a different name.');
    }

    // Calculate size
    const jsonString = JSON.stringify({ data, metadata });
    const sizeBytes = new Blob([jsonString]).size;

    // Upload to Supabase via API client
    const result = await apiClient.createBackup(key, data, {
      ...metadata,
      size: sizeBytes
    });

    const backupMetadata: BackupMetadata = {
      id: result.id,
      name: metadata.name,
      description: metadata.description,
      timestamp: Date.now(),
      size: sizeBytes,
      bookmarkCount: metadata.bookmarkCount,
      folderCount: metadata.folderCount,
      type: metadata.type,
      status: 'completed'
    };

    return backupMetadata;
  }

  async downloadBackup(backupId: string): Promise<{ data: { bookmarks: Bookmark[]; folders: Folder[] } }> {
    // Download from Supabase via API client
    const result = await apiClient.getBackup(backupId);

    return {
      data: result.data
    };
  }

  async deleteBackup(backupId: string): Promise<void> {
    await apiClient.deleteBackup(backupId);
  }
}

export const postgresqlService = new PostgreSQLService();

// Keep the old export for backward compatibility
class KeyBasedService {
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

    // Check if key already exists
    const exists = await this.checkKeyExists(key);
    if (exists) {
      throw new Error('Key already exists. Please choose a different key.');
    }

    onProgress?.(30);

    // Calculate size
    const jsonString = JSON.stringify({ data, metadata });
    const sizeBytes = new Blob([jsonString]).size;

    onProgress?.(50);

    // Upload to Supabase via API client
    const result = await apiClient.createBackup(key, data, {
      ...metadata,
      size: sizeBytes
    });

    onProgress?.(100);

    const backupMetadata: BackupMetadata = {
      id: result.id,
      name: metadata.name,
      description: metadata.description,
      timestamp: Date.now(),
      size: sizeBytes,
      bookmarkCount: metadata.bookmarkCount,
      folderCount: metadata.folderCount,
      type: metadata.type,
      status: 'completed'
    };

    return backupMetadata;
  }

  async downloadBackup(
    key: string,
    onProgress?: (progress: number) => void
  ): Promise<{ metadata: BackupMetadata; data: { bookmarks: Bookmark[]; folders: Folder[] } }> {
    onProgress?.(10);

    // Download from Supabase via API client
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
      status: result.metadata.status
    };

    onProgress?.(100);

    return {
      metadata,
      data: result.data
    };
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
      status: result.metadata.status
    }));
  }

  async deleteBackup(key: string): Promise<void> {
    await apiClient.deleteBackup(key);
  }
}

export const keyBasedService = new KeyBasedService();
