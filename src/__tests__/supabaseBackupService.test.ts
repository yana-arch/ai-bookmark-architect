import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Bookmark, Folder } from '@/types';

const apiMocks = vi.hoisted(() => ({
    listBackups: vi.fn(),
    checkKeyExists: vi.fn(),
    createBackup: vi.fn(),
    getBackup: vi.fn(),
    deleteBackup: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
    getSession: vi.fn(),
}));

vi.mock('@/src/services/apiClient', () => ({
    apiClient: apiMocks,
}));

vi.mock('@/src/services/supabaseClient', () => ({
    supabase: {
        auth: authMocks,
    },
}));

import {
    supabaseBackupService,
    supabaseKeyBackupService,
} from '@/src/services/supabaseBackupService';

const sampleBookmarks: Bookmark[] = [
    { id: 'bm-1', title: 'Example', url: 'https://example.com', parentId: null },
];

const sampleFolders: Folder[] = [
    { id: 'folder-1', name: 'Root', children: [], parentId: null },
];

describe('supabaseBackupService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authMocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } });
    });

    it('initializes only once', async () => {
        await supabaseBackupService.initialize();
        await supabaseBackupService.initialize();
        expect(authMocks.getSession).toHaveBeenCalledTimes(1);
    });

    it('reports signed-in state from session', async () => {
        await expect(supabaseBackupService.isSignedIn()).resolves.toBe(true);

        authMocks.getSession.mockResolvedValue({ data: { session: null } });
        await expect(supabaseBackupService.isSignedIn()).resolves.toBe(false);
    });

    it('maps listed backups to BackupMetadata', async () => {
        apiMocks.listBackups.mockResolvedValue([
            {
                key: 'backup-key',
                metadata: {
                    name: 'My Backup',
                    description: 'desc',
                    size: 100,
                    bookmarkCount: 1,
                    folderCount: 1,
                    type: 'manual',
                    status: 'completed',
                },
                createdAt: 123,
            },
        ]);

        await expect(supabaseBackupService.listBackups()).resolves.toEqual([
            {
                id: 'backup-key',
                name: 'My Backup',
                description: 'desc',
                timestamp: 123,
                size: 100,
                bookmarkCount: 1,
                folderCount: 1,
                type: 'manual',
                status: 'completed',
            },
        ]);
    });

    it('rejects duplicate backup names on upload', async () => {
        apiMocks.checkKeyExists.mockResolvedValue(true);

        await expect(
            supabaseBackupService.uploadBackup(
                { bookmarks: sampleBookmarks, folders: sampleFolders },
                {
                    name: 'duplicate',
                    bookmarkCount: 1,
                    folderCount: 1,
                    type: 'manual',
                    size: 0,
                    timestamp: 1,
                    status: 'completed',
                }
            )
        ).rejects.toThrow('A backup with this name already exists');
    });

    it('uploads and returns completed backup metadata', async () => {
        apiMocks.checkKeyExists.mockResolvedValue(false);
        apiMocks.createBackup.mockResolvedValue({ id: 'created-id', key: 'my-backup', success: true });

        const result = await supabaseBackupService.uploadBackup(
            { bookmarks: sampleBookmarks, folders: sampleFolders },
            {
                name: 'my-backup',
                description: 'manual export',
                bookmarkCount: 1,
                folderCount: 1,
                type: 'manual',
                size: 0,
                timestamp: 1,
                status: 'completed',
            }
        );

        expect(apiMocks.createBackup).toHaveBeenCalledWith(
            'my-backup',
            { bookmarks: sampleBookmarks, folders: sampleFolders },
            expect.objectContaining({
                name: 'my-backup',
                bookmarkCount: 1,
                folderCount: 1,
            })
        );
        expect(result).toMatchObject({
            id: 'created-id',
            name: 'my-backup',
            status: 'completed',
            bookmarkCount: 1,
            folderCount: 1,
        });
    });

    it('downloads and deletes backups via apiClient', async () => {
        apiMocks.getBackup.mockResolvedValue({
            id: 'backup-key',
            data: { bookmarks: sampleBookmarks, folders: sampleFolders },
        });

        await expect(supabaseBackupService.downloadBackup('backup-key')).resolves.toEqual({
            data: { bookmarks: sampleBookmarks, folders: sampleFolders },
        });

        await supabaseBackupService.deleteBackup('backup-key');
        expect(apiMocks.deleteBackup).toHaveBeenCalledWith('backup-key');
    });
});

describe('supabaseKeyBackupService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('rejects duplicate keys and reports progress on upload', async () => {
        apiMocks.checkKeyExists.mockResolvedValue(true);
        const onProgress = vi.fn();

        await expect(
            supabaseKeyBackupService.uploadBackup(
                'dup-key',
                { bookmarks: sampleBookmarks, folders: sampleFolders },
                {
                    name: 'dup-key',
                    bookmarkCount: 1,
                    folderCount: 1,
                    type: 'manual',
                    size: 0,
                    timestamp: 1,
                    status: 'completed',
                },
                onProgress
            )
        ).rejects.toThrow('Key already exists');

        expect(onProgress).toHaveBeenCalledWith(10);
    });

    it('uploads with progress callbacks', async () => {
        apiMocks.checkKeyExists.mockResolvedValue(false);
        apiMocks.createBackup.mockResolvedValue({ id: 'created-id', key: 'key-1', success: true });
        const onProgress = vi.fn();

        const result = await supabaseKeyBackupService.uploadBackup(
            'key-1',
            { bookmarks: sampleBookmarks, folders: sampleFolders },
            {
                name: 'key-1',
                bookmarkCount: 1,
                folderCount: 1,
                type: 'manual',
                size: 0,
                timestamp: 1,
                status: 'completed',
            },
            onProgress
        );

        expect(onProgress).toHaveBeenCalledWith(10);
        expect(onProgress).toHaveBeenCalledWith(30);
        expect(onProgress).toHaveBeenCalledWith(50);
        expect(onProgress).toHaveBeenCalledWith(100);
        expect(result.id).toBe('created-id');
    });

    it('downloads backup metadata and data with progress', async () => {
        apiMocks.getBackup.mockResolvedValue({
            id: 'key-1',
            key: 'key-1',
            data: { bookmarks: sampleBookmarks, folders: sampleFolders },
            metadata: {
                name: 'key-1',
                description: 'desc',
                size: 50,
                bookmarkCount: 1,
                folderCount: 1,
                type: 'manual',
                status: 'completed',
            },
            createdAt: 999,
        });
        const onProgress = vi.fn();

        const result = await supabaseKeyBackupService.downloadBackup('key-1', onProgress);

        expect(onProgress).toHaveBeenCalledWith(10);
        expect(onProgress).toHaveBeenCalledWith(50);
        expect(onProgress).toHaveBeenCalledWith(100);
        expect(result.metadata).toMatchObject({
            id: 'key-1',
            name: 'key-1',
            timestamp: 999,
        });
        expect(result.data.bookmarks).toEqual(sampleBookmarks);
    });
});