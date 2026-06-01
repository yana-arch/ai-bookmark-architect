import { type Bookmark, type CategorizedBookmark, type ApiConfig, type AIProfile, type PromptModifiers, type UserCorrection, type Folder } from '@/types';
import { WorkerManager } from './workerManager';

interface StandardProcessorOptions {
    workerManager: WorkerManager;
    bookmarks: Bookmark[];
    apiConfigs: ApiConfig[];
    batchSize: number;
    maxRetries: number;
    tagLanguage: string;
    activeProfile: AIProfile | null;
    promptModifiers: PromptModifiers;
    userHistory: UserCorrection[];
    systemPrompt: string;
    customInstructions: string;
    currentTree: any[];
    onProgress: (progress: { current: number, total: number }) => void;
    onLog: (message: string) => void;
    onDetailedLog: (type: 'info' | 'error' | 'success' | 'warning', title: string, content: string | object, usage?: any) => void;
    onTokenUsage: (usage: { promptTokens: number, completionTokens: number, totalTokens: number }) => void;
    onBatchResult: (results: CategorizedBookmark[]) => void;
    onComplete: (failedBatches: number) => void;
}

export class StandardProcessor {
    private options: StandardProcessorOptions;
    private completedBatches = 0;
    private failedBatches = 0;
    private nextBatchToStart = 0;
    private totalBatches = 0;
    private isAborted = false;
    private allResults: CategorizedBookmark[] = [];

    constructor(options: StandardProcessorOptions) {
        this.options = options;
        this.totalBatches = Math.ceil(options.bookmarks.length / options.batchSize);
    }

    async process() {
        if (this.totalBatches === 0) {
            this.options.onComplete(0);
            return;
        }

        const maxWorkers = WorkerManager.getMaxWorkers();
        const workersToStart = Math.min(maxWorkers, this.totalBatches);

        for (let i = 0; i < workersToStart; i++) {
            const worker = this.options.workerManager.createWorker();
            this.setupWorkerListener(worker);
            this.startNextBatch(worker);
        }
    }

    private setupWorkerListener(worker: Worker) {
        worker.addEventListener('message', (e) => {
            const { type, data, error, usage, log, batchIndex } = e.data;

            if (type === 'log') {
                this.options.onLog(`[Worker ${batchIndex}] ${log?.message || data || ''}`);
            } else if (type === 'detailed_log') {
                this.options.onDetailedLog(data.type, data.title, data.content, data.usage);
            } else if (type === 'batch_result') {
                this.completedBatches++;
                if (usage) this.options.onTokenUsage(usage);
                if (data) {
                    this.allResults.push(...data);
                    this.options.onBatchResult(data);
                }

                this.options.onProgress({
                    current: this.allResults.length,
                    total: this.options.bookmarks.length
                });

                this.checkCompletion(worker);
            } else if (type === 'batch_error') {
                this.failedBatches++;
                this.options.onLog(`[Worker] Batch ${batchIndex} thất bại: ${error}`);
                this.options.onDetailedLog('error', `Batch ${batchIndex} Failed`, error);
                this.checkCompletion(worker);
            }
        });
    }

    private startNextBatch(worker: Worker) {
        if (this.isAborted || this.nextBatchToStart >= this.totalBatches) return;

        const batchIndex = this.nextBatchToStart++;
        const start = batchIndex * this.options.batchSize;
        const end = Math.min(start + this.options.batchSize, this.options.bookmarks.length);
        const batch = this.options.bookmarks.slice(start, end);

        this.options.onLog(`Đang gửi batch ${batchIndex + 1}/${this.totalBatches} (${batch.length} bookmarks) tới Worker...`);

        const userInstructionBlock = this.options.customInstructions.trim()
            ? `\n\nUSER'S CUSTOM INSTRUCTIONS (Follow these strictly):\n- ${this.options.customInstructions.trim().replace(/\n/g, '\n- ')}`
            : '';

        this.options.workerManager.dispatchBatch(worker, {
            batch,
            batchIndex,
            systemPrompt: this.options.systemPrompt,
            userInstructionBlock,
            apiConfigs: this.options.apiConfigs,
            maxRetries: this.options.maxRetries,
            currentTree: this.options.currentTree,
            tagLanguage: this.options.tagLanguage,
            activeProfile: this.options.activeProfile,
            promptModifiers: this.options.promptModifiers,
            userHistory: this.options.userHistory
        });
    }

    private checkCompletion(worker: Worker) {
        if (this.completedBatches + this.failedBatches >= this.totalBatches) {
            this.options.workerManager.removeWorker(worker);
            if (!this.isAborted) this.options.onComplete(this.failedBatches);
        } else if (this.isAborted) {
            this.options.workerManager.removeWorker(worker);
            // If we are aborted and this was the last active worker, call onComplete
            if (this.options.workerManager.getActiveBatchCount() === 0) {
                this.options.onComplete(this.failedBatches);
            }
        } else {
            this.startNextBatch(worker);
        }
    }

    abort() {
        this.isAborted = true;
        this.options.workerManager.cancelAll();
        this.options.onLog('Đã hủy tất cả các batch đang chạy.');
        this.options.onComplete(this.failedBatches);
    }
}
