import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
    AIProfile,
    AnalyticsData,
    ApiConfig,
    Bookmark,
    DbConnection,
    DetailedLog,
    Folder,
    InstructionPreset,
    SmartClassifyRule,
    UserCorrection,
} from '@/types';

const localMocks = vi.hoisted(() => ({
    bookmarkStore: { getAll: vi.fn() },
    smartRuleStore: { getAll: vi.fn(), put: vi.fn(), delete: vi.fn() },
    userCorrectionStore: { getAll: vi.fn(), add: vi.fn() },
    aiProfileStore: { getAll: vi.fn(), put: vi.fn(), delete: vi.fn() },
    apiConfigStore: { getAll: vi.fn(), put: vi.fn(), delete: vi.fn() },
    instructionPresetStore: { getAll: vi.fn(), put: vi.fn(), delete: vi.fn() },
    folderTemplateStore: { getAll: vi.fn(), put: vi.fn(), delete: vi.fn() },
    logStore: { getAll: vi.fn(), add: vi.fn(), clear: vi.fn() },
    backupMetadataStore: { getAll: vi.fn(), put: vi.fn() },
    oauthTokenStore: { getAll: vi.fn() },
    dbConnectionStore: { getAll: vi.fn(), get: vi.fn(), put: vi.fn(), delete: vi.fn() },
    saveBookmarks: vi.fn(),
    getFolders: vi.fn(),
    saveFolders: vi.fn(),
    clearAllData: vi.fn(),
    saveAnalyticsData: vi.fn(),
    getAnalyticsData: vi.fn(),
}));

vi.mock('@/src/db/local', () => localMocks);

import { libraryRepo } from '@/src/db/repositories/library';
import { settingsRepo } from '@/src/db/repositories/settings';
import { systemRepo } from '@/src/db/repositories/system';

describe('LibraryRepository', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('syncBookmarks delegates to saveBookmarks', async () => {
        const bookmarks: Bookmark[] = [{ id: '1', title: 'A', url: 'https://a.com', parentId: null }];
        await libraryRepo.syncBookmarks(bookmarks);
        expect(localMocks.saveBookmarks).toHaveBeenCalledWith(bookmarks);
    });

    it('getBookmarks reads from bookmarkStore', async () => {
        const bookmarks: Bookmark[] = [{ id: '1', title: 'A', url: 'https://a.com', parentId: null }];
        localMocks.bookmarkStore.getAll.mockResolvedValue(bookmarks);
        await expect(libraryRepo.getBookmarks()).resolves.toEqual(bookmarks);
    });

    it('saveTree and getTree delegate to folder persistence', async () => {
        const tree: Folder[] = [{ id: 'root', name: 'Root', children: [], parentId: null }];
        localMocks.getFolders.mockResolvedValue(tree);
        await libraryRepo.saveTree(tree);
        expect(localMocks.saveFolders).toHaveBeenCalledWith(tree);
        await expect(libraryRepo.getTree()).resolves.toEqual(tree);
    });

    it('manages smart classify rules', async () => {
        const rule: SmartClassifyRule = {
            id: 'rule-1',
            name: 'React',
            type: 'tag',
            pattern: 'react',
            targetPath: ['Dev'],
            enabled: true,
            createdAt: 1,
        };
        localMocks.smartRuleStore.getAll.mockResolvedValue([rule]);

        await libraryRepo.saveRule(rule);
        await libraryRepo.deleteRule('rule-1');
        await expect(libraryRepo.getRules()).resolves.toEqual([rule]);

        expect(localMocks.smartRuleStore.put).toHaveBeenCalledWith(rule);
        expect(localMocks.smartRuleStore.delete).toHaveBeenCalledWith('rule-1');
    });

    it('stores user corrections', async () => {
        const correction: UserCorrection = {
            id: 'c-1',
            originalBookmarkUrl: 'https://a.com',
            originalPath: ['Old'],
            correctedPath: ['New'],
            timestamp: 1,
        };
        localMocks.userCorrectionStore.getAll.mockResolvedValue([correction]);

        await libraryRepo.addCorrection(correction);
        await expect(libraryRepo.getCorrections()).resolves.toEqual([correction]);
        expect(localMocks.userCorrectionStore.add).toHaveBeenCalledWith(correction);
    });
});

describe('SettingsRepository', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('saves and deletes AI profiles', async () => {
        const profile: AIProfile = {
            id: 'p-1',
            name: 'Default',
            isDefault: true,
            createdAt: 1,
            updatedAt: 1,
        };
        localMocks.aiProfileStore.getAll.mockResolvedValue([profile]);

        await settingsRepo.saveProfile(profile);
        await settingsRepo.deleteProfile('p-1');
        await expect(settingsRepo.getProfiles()).resolves.toEqual([profile]);
        await expect(settingsRepo.getActiveProfile()).resolves.toEqual(profile);

        expect(localMocks.aiProfileStore.put).toHaveBeenCalledWith(profile);
        expect(localMocks.aiProfileStore.delete).toHaveBeenCalledWith('p-1');
    });

    it('filters active API configs', async () => {
        const configs: ApiConfig[] = [
            { id: '1', name: 'Active', provider: 'gemini', apiKey: 'k', model: 'm', status: 'active' },
            { id: '2', name: 'Inactive', provider: 'gemini', apiKey: 'k', model: 'm', status: 'inactive' },
        ];
        localMocks.apiConfigStore.getAll.mockResolvedValue(configs);

        await expect(settingsRepo.getActiveConfigs()).resolves.toEqual([configs[0]]);
    });

    it('saves and deletes presets and templates', async () => {
        const preset: InstructionPreset = {
            id: 'preset-1',
            name: 'Preset',
            description: 'd',
            folderStructure: [],
            namingRules: [],
            customInstructions: 'inst',
            createdAt: 1,
            updatedAt: 1,
        };

        await settingsRepo.savePreset(preset);
        await settingsRepo.deletePreset('preset-1');
        await settingsRepo.deleteTemplate('template-1');

        expect(localMocks.instructionPresetStore.put).toHaveBeenCalledWith(preset);
        expect(localMocks.instructionPresetStore.delete).toHaveBeenCalledWith('preset-1');
        expect(localMocks.folderTemplateStore.delete).toHaveBeenCalledWith('template-1');
    });
});

describe('SystemRepository', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('adds and clears logs', async () => {
        const log: DetailedLog = {
            id: 'log-1',
            timestamp: '2026-01-01',
            type: 'info',
            title: 'Test',
            content: 'hello',
        };
        localMocks.logStore.getAll.mockResolvedValue([log]);

        await systemRepo.addLog(log);
        await systemRepo.clearLogs();
        await expect(systemRepo.getLogs()).resolves.toEqual([log]);

        expect(localMocks.logStore.add).toHaveBeenCalledWith(log);
        expect(localMocks.logStore.clear).toHaveBeenCalled();
    });

    it('manages database connections', async () => {
        const connection: DbConnection = {
            id: 'conn-1',
            name: 'Neon',
            isActive: true,
            createdAt: 1,
            connectionString: 'postgresql://user:pass@host/db',
            host: 'host',
            port: 5432,
            database: 'db',
            username: 'user',
            password: 'pass',
            provider: 'neon',
        };
        localMocks.dbConnectionStore.getAll.mockResolvedValue([connection]);
        localMocks.dbConnectionStore.get.mockResolvedValue(connection);

        await systemRepo.saveDbConnection(connection);
        await systemRepo.deleteDbConnection('conn-1');
        await expect(systemRepo.getDbConnections()).resolves.toEqual([connection]);
        await expect(systemRepo.getDbConnection('conn-1')).resolves.toEqual(connection);

        expect(localMocks.dbConnectionStore.put).toHaveBeenCalledWith(connection);
        expect(localMocks.dbConnectionStore.delete).toHaveBeenCalledWith('conn-1');
    });

    it('persists analytics data', async () => {
        const analytics: AnalyticsData = {
            totalBookmarks: 10,
            totalFolders: 2,
            avgBookmarksPerFolder: 5,
            topDomains: [],
            folderDistribution: [],
            tagUsage: [],
            aiPerformance: {
                totalRequests: 1,
                successRate: 100,
                avgTokensPerRequest: 50,
                accuracyScore: 100,
            },
            usageStats: {
                totalSessions: 1,
                avgSessionDuration: 1,
                mostUsedFeatures: ['import'],
                importCount: 1,
                exportCount: 0,
            },
            growthTrends: [],
        };
        localMocks.getAnalyticsData.mockResolvedValue(analytics);

        await systemRepo.saveAnalytics(analytics);
        await expect(systemRepo.getAnalytics()).resolves.toEqual(analytics);

        expect(localMocks.saveAnalyticsData).toHaveBeenCalledWith(analytics);
    });

    it('factoryReset clears all user data', async () => {
        await systemRepo.factoryReset();
        expect(localMocks.clearAllData).toHaveBeenCalled();
    });
});