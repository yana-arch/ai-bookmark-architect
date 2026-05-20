import { describe, it, expect, vi } from 'vitest';
import { TokenAwareSplitter } from '@/src/services/processing/tokenAwareSplitter';

describe('TokenAwareSplitter', () => {
    it('should not split if below token limit', async () => {
        const batch = [1, 2, 3];
        const executeTask = vi.fn().mockImplementation(async (b) => b);
        const calculateTokens = vi.fn().mockReturnValue(100);
        
        const results = await TokenAwareSplitter.splitAndExecute({
            batch,
            tokenLimit: 200,
            calculateTokens,
            executeTask
        });

        expect(results).toEqual([1, 2, 3]);
        expect(executeTask).toHaveBeenCalledTimes(1);
        expect(executeTask).toHaveBeenCalledWith([1, 2, 3]);
    });

    it('should split once if token limit exceeded', async () => {
        const batch = [1, 2, 3, 4];
        const executeTask = vi.fn().mockImplementation(async (b) => b);
        
        // Return > 100 for full batch, but < 100 for sub-batches
        const calculateTokens = vi.fn()
            .mockReturnValueOnce(150) // Full batch [1,2,3,4]
            .mockReturnValueOnce(50)  // Left sub-batch [1,2]
            .mockReturnValueOnce(50); // Right sub-batch [3,4]
        
        const results = await TokenAwareSplitter.splitAndExecute({
            batch,
            tokenLimit: 100,
            calculateTokens,
            executeTask
        });

        expect(results).toEqual([1, 2, 3, 4]);
        expect(executeTask).toHaveBeenCalledTimes(2);
        expect(executeTask).toHaveBeenCalledWith([1, 2]);
        expect(executeTask).toHaveBeenCalledWith([3, 4]);
    });

    it('should split recursively if needed', async () => {
        const batch = [1, 2, 3, 4];
        const executeTask = vi.fn().mockImplementation(async (b) => b);
        
        // Mock tokens to force deep split
        const calculateTokens = (subBatch: any[]) => subBatch.length > 1 ? 150 : 50;
        
        const results = await TokenAwareSplitter.splitAndExecute({
            batch,
            tokenLimit: 100,
            calculateTokens,
            executeTask
        });

        expect(results).toEqual([1, 2, 3, 4]);
        expect(executeTask).toHaveBeenCalledTimes(4); // Each item processed individually
    });

    it('should handle empty batch', async () => {
        const executeTask = vi.fn();
        const results = await TokenAwareSplitter.splitAndExecute({
            batch: [],
            tokenLimit: 100,
            calculateTokens: () => 0,
            executeTask
        });
        expect(results).toEqual([]);
        expect(executeTask).not.toHaveBeenCalled();
    });

    it('should split sequentially if sequential is true', async () => {
        const batch = [1, 2, 3, 4];
        const executionOrder: string[] = [];
        const executeTask = vi.fn().mockImplementation(async (b) => {
            executionOrder.push(`start-${b.join(',')}`);
            await new Promise(resolve => setTimeout(resolve, 10));
            executionOrder.push(`end-${b.join(',')}`);
            return b;
        });
        
        // Return > 100 for full batch, but < 100 for sub-batches
        const calculateTokens = vi.fn()
            .mockReturnValueOnce(150) // Full batch [1,2,3,4]
            .mockReturnValueOnce(50)  // Left sub-batch [1,2]
            .mockReturnValueOnce(50); // Right sub-batch [3,4]
        
        const results = await TokenAwareSplitter.splitAndExecute({
            batch,
            tokenLimit: 100,
            calculateTokens,
            executeTask,
            sequential: true
        });

        expect(results).toEqual([1, 2, 3, 4]);
        expect(executeTask).toHaveBeenCalledTimes(2);
        // Under sequential mode, [1,2] must start and end before [3,4] starts
        expect(executionOrder).toEqual([
            'start-1,2',
            'end-1,2',
            'start-3,4',
            'end-3,4'
        ]);
    });
});
