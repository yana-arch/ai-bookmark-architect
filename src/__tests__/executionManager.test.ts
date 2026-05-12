import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIExecutionManager } from '@/src/services/processing/aiExecutionManager';
import { AIClient } from '@/src/services/aiClient';

// Mock AIClient
vi.mock('../services/aiClient', () => {
    return {
        AIClient: vi.fn().mockImplementation(() => ({
            generateContent: vi.fn()
        }))
    };
});

describe('AIExecutionManager', () => {
    const mockConfigs = [
        { id: '1', name: 'Key 1', provider: 'google', status: 'active', apiKey: 'abc' },
        { id: '2', name: 'Key 2', provider: 'google', status: 'active', apiKey: 'def' }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should succeed on first attempt', async () => {
        const task = vi.fn().mockResolvedValue('success');
        const options = {
            apiConfigs: mockConfigs,
            maxRetries: 3,
            onLog: vi.fn()
        };

        const result = await AIExecutionManager.executeWithRetry('TestTask', task, options as any);

        expect(result).toBe('success');
        expect(task).toHaveBeenCalledTimes(1);
    });

    it('should retry and succeed on second attempt', async () => {
        const task = vi.fn()
            .mockRejectedValueOnce(new Error('Fail'))
            .mockResolvedValueOnce('success');
        
        const options = {
            apiConfigs: mockConfigs,
            maxRetries: 3,
            onLog: vi.fn()
        };

        const result = await AIExecutionManager.executeWithRetry('TestTask', task, options as any);

        expect(result).toBe('success');
        expect(task).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
        const task = vi.fn().mockRejectedValue(new Error('Constant Fail'));
        const options = {
            apiConfigs: mockConfigs,
            maxRetries: 1,
            onLog: vi.fn()
        };

        await expect(AIExecutionManager.executeWithRetry('TestTask', task, options as any))
            .rejects.toThrow('Constant Fail');
        
        expect(task).toHaveBeenCalledTimes(2); // 1 original + 1 retry
    });

    it('should fail immediately if no active configs', async () => {
        const task = vi.fn();
        const options = {
            apiConfigs: [],
            maxRetries: 3,
            onLog: vi.fn()
        };

        await expect(AIExecutionManager.executeWithRetry('TestTask', task, options as any))
            .rejects.toThrow('No active API key found.');
    });
});
