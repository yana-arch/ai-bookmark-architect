import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TagDrivenProcessor } from '@/src/services/processing/tagDrivenProcessor';

describe('TagDrivenProcessor', () => {
    let mockWorkerManager: any;
    let mockOptions: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockWorkerManager = {
            createWorker: vi.fn(() => {
                const worker = {
                    postMessage: vi.fn(),
                    terminate: vi.fn(),
                    onmessage: null,
                    listeners: {} as Record<string, ((e: any) => void)[]>,
                    addEventListener: vi.fn((type: string, listener: (e: any) => void) => {
                        if (!worker.listeners[type]) worker.listeners[type] = [];
                        worker.listeners[type].push(listener);
                    }),
                    dispatchEvent: vi.fn((event: any) => {
                        if (worker.listeners[event.type]) {
                            worker.listeners[event.type].forEach(l => l(event));
                        }
                    })
                };
                return worker;
            }),
            dispatchBatch: vi.fn(),
            removeWorker: vi.fn(),
            terminateAll: vi.fn()
        };

        mockOptions = {
            workerManager: mockWorkerManager,
            bookmarks: [
                { id: '1', title: 'B1', url: 'U1', tags: [] },
                { id: '2', title: 'B2', url: 'U2', tags: ['existing'] }
            ],
            apiConfigs: [{ id: 'k1', status: 'active', name: 'K1', provider: 'google' }],
            batchSize: 1,
            maxRetries: 3,
            tagCount: 3,
            tagLanguage: 'vi',
            activeProfile: null,
            promptModifiers: {},
            userHistory: [],
            systemPrompt: 'sys',
            customInstructions: '',
            currentFolders: [],
            onProgress: vi.fn(),
            onLog: vi.fn(),
            onDetailedLog: vi.fn(),
            onTokenUsage: vi.fn(),
            onResult: vi.fn(),
            onError: vi.fn(),
            onComplete: vi.fn()
        };
    });

    it('should identify bookmarks needing tagging', async () => {
        const processor = new TagDrivenProcessor(mockOptions);
        await processor.process();
        
        expect(mockOptions.onLog).toHaveBeenCalledWith(expect.stringContaining('Đã tìm thấy 1 bookmark có sẵn tags'));
        expect(mockWorkerManager.createWorker).toHaveBeenCalledTimes(1); // 1 worker for the 1 bookmark needing tagging
    });

    it('should complete tagging phase and start mapping phase', async () => {
        const processor = new TagDrivenProcessor(mockOptions);
        await processor.process();
        
        const taggingWorker = mockWorkerManager.createWorker.mock.results[0].value;
        
        // Simulate completion of tagging
        taggingWorker.dispatchEvent({ 
            type: 'message',
            data: { 
                type: 'batch_result', 
                data: [{ url: 'U1', tags: ['new-tag'] }],
                usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 }
            } 
        });

        expect(mockOptions.onProgress).toHaveBeenCalled();
        expect(mockOptions.onTokenUsage).toHaveBeenCalledWith({ promptTokens: 10, completionTokens: 5, totalTokens: 15 });
        
        // Should have created a second worker for mapping
        expect(mockWorkerManager.createWorker).toHaveBeenCalledTimes(2);
        expect(mockOptions.onLog).toHaveBeenCalledWith(expect.stringContaining('ĐANG TẠO CẤU TRÚC THƯ MỤC'));
    });

    it('should handle tagging error', async () => {
        const processor = new TagDrivenProcessor(mockOptions);
        await processor.process();
        
        const taggingWorker = mockWorkerManager.createWorker.mock.results[0].value;
        
        taggingWorker.dispatchEvent({ 
            type: 'message',
            data: { 
                type: 'batch_error', 
                error: 'Tagging failed' 
            } 
        });

        // Error in one batch shouldn't stop others, but here we only have one
        expect(mockOptions.onLog).toHaveBeenCalledWith(expect.stringContaining('thất bại: Tagging failed'));
    });
});
