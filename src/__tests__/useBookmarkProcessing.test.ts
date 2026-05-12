import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useBookmarkProcessing } from '@/src/hooks/useBookmarkProcessing';

// Mock the services
vi.mock('../services/processing/workerManager', () => ({
    WorkerManager: vi.fn().mockImplementation(() => ({
        terminateAll: vi.fn(),
        createWorker: vi.fn(),
        removeWorker: vi.fn(),
        dispatchBatch: vi.fn()
    }))
}));

vi.mock('../services/processing/tagDrivenProcessor', () => ({
    TagDrivenProcessor: vi.fn().mockImplementation(() => ({
        process: vi.fn()
    }))
}));

vi.mock('../services/processing/standardProcessor', () => ({
    StandardProcessor: vi.fn().mockImplementation(() => ({
        process: vi.fn()
    }))
}));

describe('useBookmarkProcessing hook', () => {
    const mockProps: any = {
        bookmarks: [],
        folders: [],
        apiConfigs: [{ id: 'k1', status: 'active' }],
        batchSize: 10,
        maxRetries: 3,
        processingMode: 'parallel',
        tagDrivenMode: false,
        tagCount: 3,
        tagLanguage: 'vi',
        promptModifiers: {},
        systemPrompt: 'sys',
        customInstructions: '',
        onFoldersUpdate: vi.fn(),
        onNotificationsAdd: vi.fn(),
        onProcessingComplete: vi.fn(),
        autoCleanupEmptyFolders: false,
        activeProfile: null,
        userHistory: []
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize with default state', () => {
        const { result } = renderHook(() => useBookmarkProcessing(mockProps));
        expect(result.current.isProcessing).toBe(false);
        expect(result.current.progress.current).toBe(0);
        expect(result.current.logs).toHaveLength(0);
    });

    it('should reset state correctly', () => {
        const { result } = renderHook(() => useBookmarkProcessing(mockProps));
        
        act(() => {
            result.current.resetProcessingState();
        });

        expect(result.current.isProcessing).toBe(false);
        expect(result.current.progress.current).toBe(0);
    });
});
