import { type Bookmark, type CategorizedBookmark } from '@/types';
import { WorkerManager } from './workerManager';
import { BaseProcessor, CommonProcessorOptions } from './baseProcessor';

interface StandardProcessorOptions extends CommonProcessorOptions {
    currentTree: any[];
    onBatchResult: (results: CategorizedBookmark[]) => void;
}

export class StandardProcessor extends BaseProcessor<StandardProcessorOptions> {
    private allResults: CategorizedBookmark[] = [];

    constructor(options: StandardProcessorOptions) {
        super(options);
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

    protected handleWorkerMessage(e: MessageEvent, worker: Worker) {
        const { type, data, error, batchIndex } = e.data;

        if (type === 'batch_result') {
            this.completedBatches++;
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
    }

    protected startNextBatch(worker: Worker) {
        if (this.isAborted || this.nextBatchToStart >= this.totalBatches) return;

        const batchIndex = this.nextBatchToStart++;
        const start = batchIndex * this.options.batchSize;
        const end = Math.min(start + this.options.batchSize, this.options.bookmarks.length);
        const batch = this.options.bookmarks.slice(start, end);

        this.options.onLog(`Đang gửi batch ${batchIndex + 1}/${this.totalBatches} (${batch.length} bookmarks) tới Worker...`);

        this.options.workerManager.dispatchBatch(worker, {
            ...this.getCommonBatchData(batch, batchIndex),
            currentTree: this.options.currentTree,
        });
    }
}
