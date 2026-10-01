import { type Bookmark, type CategorizedBookmark, type ApiConfig, type AIProfile, type PromptModifiers, type UserCorrection } from '@/types';
import { WorkerManager } from './workerManager';

export interface CommonProcessorOptions {
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
    onProgress: (progress: { current: number, total: number }) => void;
    onLog: (message: string) => void;
    onDetailedLog: (type: 'info' | 'error' | 'success' | 'warning', title: string, content: string | object, usage?: any) => void;
    onTokenUsage: (usage: { promptTokens: number, completionTokens: number, totalTokens: number }) => void;
    onComplete: (failedBatches: number) => void;
}

export abstract class BaseProcessor<T extends CommonProcessorOptions> {
    protected options: T;
    protected completedBatches = 0;
    protected failedBatches = 0;
    protected nextBatchToStart = 0;
    protected totalBatches = 0;
    protected isAborted = false;

    constructor(options: T) {
        this.options = options;
        this.totalBatches = Math.ceil(options.bookmarks.length / options.batchSize);
    }

    protected abstract handleWorkerMessage(e: MessageEvent, worker: Worker): void;
    protected abstract startNextBatch(worker: Worker): void;

    protected setupWorkerListener(worker: Worker) {
        worker.addEventListener('message', (e) => {
            const { type, usage, data, log } = e.data;

            if (type === 'log') {
                this.options.onLog(`[Worker] ${log?.message || data || ''}`);
            } else if (type === 'detailed_log') {
                this.options.onDetailedLog(data.type, data.title, data.content, data.usage);
            } else if (usage) {
                this.options.onTokenUsage(usage);
            }

            this.handleWorkerMessage(e, worker);
        });
    }

    protected checkCompletion(worker: Worker) {
        if (this.completedBatches + this.failedBatches >= this.totalBatches) {
            this.options.workerManager.removeWorker(worker);
            if (!this.isAborted) this.options.onComplete(this.failedBatches);
        } else if (this.isAborted) {
            this.options.workerManager.removeWorker(worker);
            if (this.options.workerManager.getActiveBatchCount() === 0) {
                this.options.onComplete(this.failedBatches);
            }
        } else {
            this.startNextBatch(worker);
        }
    }

    public abstract process(): Promise<void>;

    public abort() {
        this.isAborted = true;
        this.options.workerManager.cancelAll();
        this.options.onLog('Processing aborted.');
        this.options.onComplete(this.failedBatches);
    }

    protected getCommonBatchData(batch: Bookmark[], batchIndex: number) {
        const userInstructionBlock = this.options.customInstructions.trim()
            ? `\n\nUSER'S CUSTOM INSTRUCTIONS (Follow these strictly):\n- ${this.options.customInstructions.trim().replace(/\n/g, '\n- ')}`
            : '';

        return {
            batch,
            batchIndex,
            systemPrompt: this.options.systemPrompt,
            userInstructionBlock,
            apiConfigs: this.options.apiConfigs,
            maxRetries: this.options.maxRetries,
            tagLanguage: this.options.tagLanguage,
            activeProfile: this.options.activeProfile,
            promptModifiers: this.options.promptModifiers,
            userHistory: this.options.userHistory
        };
    }
}
