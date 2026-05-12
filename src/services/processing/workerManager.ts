import { type ApiConfig, type AIProfile, type PromptModifiers, type UserCorrection, type Bookmark, type Folder } from '@/types';

export interface WorkerMessage {
    type: 'log' | 'detailed_log' | 'batch_result' | 'batch_error';
    data?: any;
    error?: string;
    batchIndex?: number;
    log?: { message: string };
    usage?: { promptTokens: number, completionTokens: number, totalTokens: number };
}

export interface WorkerBatchData {
    batch: Bookmark[];
    batchIndex: number;
    systemPrompt?: string;
    userInstructionBlock?: string;
    apiConfigs: ApiConfig[];
    maxRetries: number;
    currentTree?: any[];
    taskType?: 'extract_tags' | 'map_tags_to_tree';
    uniqueTags?: string[];
    tagCount?: number;
    tagLanguage?: string;
    activeProfile?: AIProfile | null;
    promptModifiers?: PromptModifiers;
    userHistory?: UserCorrection[];
}

export class WorkerManager {
    private workers: Worker[] = [];
    private activeBatchIndices: Set<number> = new Set();
    private onMessage: (message: WorkerMessage) => void;

    constructor(onMessage: (message: WorkerMessage) => void) {
        this.onMessage = onMessage;
    }

    createWorker(): Worker {
        const worker = new Worker(new URL('../../aiWorker.ts', import.meta.url), { type: 'module' });
        worker.addEventListener('message', (e) => this.handleMessage(e.data));
        
        worker.addEventListener('error', (e) => {
            console.error('Worker error:', e);
            this.handleMessage({
                type: 'batch_error',
                error: `Worker error: ${e.message || 'Unknown error'}`
            });
        });

        worker.addEventListener('messageerror', (e) => {
            console.error('Worker message error:', e);
            this.handleMessage({
                type: 'batch_error',
                error: 'Worker message serialization error'
            });
        });

        this.workers.push(worker);
        return worker;
    }

    private handleMessage(message: WorkerMessage) {
        if (message.type === 'batch_result' || message.type === 'batch_error') {
            if (message.batchIndex !== undefined) {
                this.activeBatchIndices.delete(message.batchIndex);
            }
        }
        this.onMessage(message);
    }

    dispatchBatch(worker: Worker, data: WorkerBatchData) {
        this.activeBatchIndices.add(data.batchIndex);
        worker.postMessage({
            type: 'process_batch',
            data
        });
    }

    terminateAll() {
        this.workers.forEach(worker => worker.terminate());
        this.workers = [];
        this.activeBatchIndices.clear();
    }

    removeWorker(worker: Worker) {
        worker.terminate();
        this.workers = this.workers.filter(w => w !== worker);
    }

    getActiveBatchCount(): number {
        return this.activeBatchIndices.size;
    }

    static getMaxWorkers(): number {
        return Math.min(6, (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 3);
    }

    getWorkerCount(): number {
        return this.workers.length;
    }
}
