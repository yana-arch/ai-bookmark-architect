import { type Bookmark, type CategorizedBookmark, type Folder } from '@/types';
import { WorkerManager } from './workerManager';
import { distributeBookmarksByTagSchema } from '@/src/utils/treeUtils';
import { BaseProcessor, CommonProcessorOptions } from './baseProcessor';

interface TagDrivenProcessorOptions extends CommonProcessorOptions {
    tagCount: number;
    currentFolders: (Folder | Bookmark)[];
    onResult: (bookmarks: CategorizedBookmark[], folders: (Folder | Bookmark)[]) => void;
    onError: (error: string) => void;
}

export class TagDrivenProcessor extends BaseProcessor<TagDrivenProcessorOptions> {
    private extractedTagsMap = new Map<string, string[]>();
    private bookmarksNeedingTagging: Bookmark[] = [];

    constructor(options: TagDrivenProcessorOptions) {
        super(options);
        // totalBatches will be recalculated in process() because it depends on bookmarksNeedingTagging
    }

    async process() {
        const { bookmarks, onLog } = this.options;

        const bookmarksWithExistingTags = bookmarks.filter(bm => bm.tags && bm.tags.length > 0);
        this.bookmarksNeedingTagging = bookmarks.filter(bm => !bm.tags || bm.tags.length === 0);

        if (bookmarksWithExistingTags.length > 0) {
            bookmarksWithExistingTags.forEach(bm => {
                this.extractedTagsMap.set(bm.url, bm.tags || []);
            });
            onLog(`Đã tìm thấy ${bookmarksWithExistingTags.length} bookmark có sẵn tags. Bỏ qua bước trích xuất cho các mục này.`);
        }

        this.totalBatches = Math.ceil(this.bookmarksNeedingTagging.length / this.options.batchSize);

        if (this.bookmarksNeedingTagging.length === 0) {
            await this.finalizeTagDrivenProcessing();
        } else {
            const maxWorkers = WorkerManager.getMaxWorkers();
            const workersToStart = Math.min(maxWorkers, this.totalBatches);

            for (let i = 0; i < workersToStart; i++) {
                const worker = this.options.workerManager.createWorker();
                this.setupWorkerListener(worker);
                this.startNextBatch(worker);
            }
        }
    }

    protected handleWorkerMessage(e: MessageEvent, worker: Worker) {
        const { type, data, error, batchIndex } = e.data;

        if (type === 'batch_result') {
            this.completedBatches++;

            const batchResults: CategorizedBookmark[] = [];
            if (Array.isArray(data) && batchIndex !== undefined) {
                const start = batchIndex * this.options.batchSize;
                const end = Math.min(start + this.options.batchSize, this.bookmarksNeedingTagging.length);
                const batch = this.bookmarksNeedingTagging.slice(start, end);

                data.forEach(item => {
                    if (item.url && item.tags) {
                        this.extractedTagsMap.set(item.url, item.tags);
                        const original = batch.find(b => b.url === item.url);
                        if (original) {
                            batchResults.push({
                                ...original,
                                tags: item.tags,
                                path: []
                            });
                        }
                    }
                });
            }

            if (batchResults.length > 0) {
                this.options.onResult(batchResults, []);
            }

            this.updateTaggingProgress();
            this.checkTaggingCompletion(worker);
        } else if (type === 'batch_error') {
            this.failedBatches++;
            this.options.onLog(`[Worker] Batch ${batchIndex} thất bại: ${error}`);
            this.checkTaggingCompletion(worker);
        }
    }

    protected startNextBatch(worker: Worker) {
        if (this.isAborted || this.nextBatchToStart >= this.totalBatches) return;

        const batchIndex = this.nextBatchToStart++;
        const start = batchIndex * this.options.batchSize;
        const end = Math.min(start + this.options.batchSize, this.bookmarksNeedingTagging.length);
        const batch = this.bookmarksNeedingTagging.slice(start, end);

        this.options.onLog(`[Tagging] Batch ${batchIndex + 1}/${this.totalBatches}...`);

        this.options.workerManager.dispatchBatch(worker, {
            ...this.getCommonBatchData(batch, batchIndex),
            taskType: 'extract_tags',
            tagCount: this.options.tagCount,
        });
    }

    private updateTaggingProgress() {
        const taggingProgress = Math.min(
            Math.floor((this.completedBatches / this.totalBatches) * 90),
            90
        );
        this.options.onProgress({
            current: Math.floor((taggingProgress / 100) * this.options.bookmarks.length),
            total: this.options.bookmarks.length
        });
    }

    private async checkTaggingCompletion(worker: Worker) {
        if (this.completedBatches + this.failedBatches >= this.totalBatches) {
            this.options.workerManager.removeWorker(worker);
            if (!this.isAborted) await this.finalizeTagDrivenProcessing();
        } else {
            this.startNextBatch(worker);
        }
    }

    private async finalizeTagDrivenProcessing() {
        if (this.isAborted) return;

        if (this.failedBatches > 0) {
            this.options.onDetailedLog('warning', 'Lỗi phân tags một số bookmark', `Có ${this.failedBatches} batch tagging thất bại.`);
        }

        if (this.extractedTagsMap.size === 0) {
            this.options.onLog('Không tìm thấy tag nào để phân tích.');
            this.options.onComplete(1); // Signifies error
            return;
        }

        this.options.onLog(`--- ĐANG TẠO CẤU TRÚC THƯ MỤC TỪ ${this.extractedTagsMap.size} TAGS ---`);

        const allTags = new Set<string>();
        this.extractedTagsMap.forEach(tags => tags.forEach(t => allTags.add(t)));
        const uniqueTags = Array.from(allTags).slice(0, 600);

        if (uniqueTags.length === 0) {
            this.options.onLog('Không tìm thấy tag nào để phân tích.');
            this.options.onComplete(1);
            return;
        }

        const mappingWorker = this.options.workerManager.createWorker();
        mappingWorker.addEventListener('message', (e) => {
            const { type, data, error, log, usage } = e.data;

            if (type === 'log') {
                this.options.onLog(`[Mapping] ${log?.message || data || ''}`);
            } else if (type === 'batch_result') {
                if (usage) this.options.onTokenUsage(usage);

                const bookmarksWithTags = this.options.bookmarks.map(bm => ({
                    ...bm,
                    tags: this.extractedTagsMap.get(bm.url) || bm.tags || []
                }));

                const distributedBookmarks = distributeBookmarksByTagSchema(bookmarksWithTags, data) as CategorizedBookmark[];
                this.options.onResult(distributedBookmarks, []);
                this.options.onComplete(0);
                this.options.workerManager.removeWorker(mappingWorker);
            } else if (type === 'batch_error') {
                this.options.onError(`Lỗi tạo thư mục: ${error}`);
                this.options.onComplete(1);
                this.options.workerManager.removeWorker(mappingWorker);
            }
        });

        this.options.workerManager.dispatchBatch(mappingWorker, {
            ...this.getCommonBatchData([], 0),
            taskType: 'map_tags_to_tree',
            uniqueTags,
        });
    }

    abort() {
        this.isAborted = true;
        this.options.workerManager.cancelAll();
        this.options.onLog('Đã dừng xử lý tag-driven.');
        this.options.onComplete(this.failedBatches || 1);
    }
}
