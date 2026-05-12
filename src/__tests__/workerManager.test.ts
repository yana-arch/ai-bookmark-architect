import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkerManager } from '@/src/services/processing/workerManager';

// Mock Worker
class MockWorker {
    listeners: Record<string, ((e: any) => void)[]> = {};
    onmessage: ((e: MessageEvent) => void) | null = null;
    postMessage = vi.fn();
    terminate = vi.fn();

    addEventListener(type: string, listener: (e: any) => void) {
        if (!this.listeners[type]) this.listeners[type] = [];
        this.listeners[type].push(listener);
    }

    removeEventListener(type: string, listener: (e: any) => void) {
        if (!this.listeners[type]) return;
        this.listeners[type] = this.listeners[type].filter(l => l !== listener);
    }

    dispatchEvent(event: any) {
        if (this.onmessage && event.type === 'message') {
            this.onmessage(event);
        }
        if (this.listeners[event.type]) {
            this.listeners[event.type].forEach(l => l(event));
        }
    }
}

// More robust URL mock
const MockURL = vi.fn().mockImplementation((path, base) => ({
    href: `${base || ''}${path}`,
    toString() { return this.href; }
}));

global.Worker = MockWorker as any;
global.URL = MockURL as any;

describe('WorkerManager', () => {
    let manager: WorkerManager;
    let mockOnMessage: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockOnMessage = vi.fn();
        manager = new WorkerManager(mockOnMessage);
    });

    it('should create a worker', () => {
        const worker = manager.createWorker();
        expect(worker).toBeDefined();
        expect(manager.getWorkerCount()).toBe(1);
    });

    it('should dispatch a batch', () => {
        const worker = manager.createWorker();
        const batchData: any = { batchIndex: 1, batch: [] };
        manager.dispatchBatch(worker, batchData);
        
        expect(worker.postMessage).toHaveBeenCalledWith({
            type: 'process_batch',
            data: batchData
        });
        expect(manager.getActiveBatchCount()).toBe(1);
    });

    it('should handle message and update active batches', () => {
        const worker = manager.createWorker();
        const batchData: any = { batchIndex: 1, batch: [] };
        manager.dispatchBatch(worker, batchData);
        
        // Simulate message from worker
        const message = { type: 'batch_result', batchIndex: 1, data: 'success' };
        (worker as any).dispatchEvent({ type: 'message', data: message });
        
        expect(mockOnMessage).toHaveBeenCalledWith(message);
        expect(manager.getActiveBatchCount()).toBe(0);
    });

    it('should terminate all workers', () => {
        const worker1 = manager.createWorker();
        const worker2 = manager.createWorker();
        
        manager.terminateAll();
        
        expect(worker1.terminate).toHaveBeenCalled();
        expect(worker2.terminate).toHaveBeenCalled();
        expect(manager.getWorkerCount()).toBe(0);
    });

    it('should remove a specific worker', () => {
        const worker = manager.createWorker();
        manager.removeWorker(worker);
        
        expect(worker.terminate).toHaveBeenCalled();
        expect(manager.getWorkerCount()).toBe(0);
    });
});
