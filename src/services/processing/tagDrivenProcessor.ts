import { type Bookmark, type CategorizedBookmark, type ApiConfig, type AIProfile, type PromptModifiers, type UserCorrection, type Folder } from '@/types';
import { WorkerManager, WorkerBatchData } from './workerManager';
import { distributeBookmarksByTagSchema } from '@/src/utils/treeUtils';

interface TagDrivenProcessorOptions {
    workerManager: WorkerManager;
    bookmarks: Bookmark[];
    apiConfigs: ApiConfig[];
    batchSize: number;
    maxRetries: number;
    tagCount: number;
    tagLanguage: string;
    activeProfile: AIProfile | null;
    promptModifiers: PromptModifiers;
    userHistory: UserCorrection[];
    systemPrompt: string;
    customInstructions: string;
    currentFolders: (Folder | Bookmark)[];
    onProgress: (progress: { current: number, total: number }) => void;
    onLog: (message: string) => void;
    onDetailedLog: (type: 'info' | 'error' | 'success' | 'warning', title: string, content: string | object, usage?: any) => void;
    onTokenUsage: (usage: { promptTokens: number, completionTokens: number, totalTokens: number }) => void;
    onResult: (bookmarks: CategorizedBookmark[], folders: (Folder | Bookmark)[]) => void;
    onError: (error: string) => void;
    onComplete: (hasError: boolean) => void;
}

export class TagDrivenProcessor {
    private options: TagDrivenProcessorOptions;
    private extractedTagsMap = new Map<string, string[]>();
    private completedBatches = 0;
    private failedBatches = 0;
    private nextBatchToStart = 0;
    private actualTotalBatches = 0;
    private bookmarksNeedingTagging: Bookmark[] = [];
    private isAborted = false;

    constructor(options: TagDrivenProcessorOptions) {
        this.options = options;
    }

    async process() {
        const { bookmarks, batchSize, onLog } = this.options;

        const bookmarksWithExistingTags = bookmarks.filter(bm => bm.tags && bm.tags.length > 0);
        this.bookmarksNeedingTagging = bookmarks.filter(bm => !bm.tags || bm.tags.length === 0);

        if (bookmarksWithExistingTags.length > 0) {
            bookmarksWithExistingTags.forEach(bm => {
                this.extractedTagsMap.set(bm.url, bm.tags || []);
            });
            onLog(`Đã tìm thấy ${bookmarksWithExistingTags.length} bookmark có sẵn tags. Bỏ qua bước trích xuất cho các mục này.`);
        }

        this.actualTotalBatches = Math.ceil(this.bookmarksNeedingTagging.length / batchSize);

        if (this.bookmarksNeedingTagging.length === 0) {
            await this.finalizeTagDrivenProcessing();
        } else {
            const maxWorkers = WorkerManager.getMaxWorkers();
            const workersToStart = Math.min(maxWorkers, this.actualTotalBatches);

            for (let i = 0; i < workersToStart; i++) {
                const worker = this.options.workerManager.createWorker();
                this.setupTaggingListener(worker);
                this.startNextTaggingBatch(worker);
            }
        }
    }

    private setupTaggingListener(worker: Worker) {
        worker.addEventListener('message', (e) => {
            const { type, data, error, usage, batchIndex } = e.data;

            if (type === 'log') {
                this.options.onLog(`[Worker ${batchIndex}] ${e.data.log?.message || data || ''}`);
            } else if (type === 'batch_result') {
                this.completedBatches++;
                if (usage) this.options.onTokenUsage(usage);

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
                                    path: [] // Path not known yet in tagging phase
                                });
                            }
                        }
                    });
                }

                // Incremental update: notify that we have tags for these bookmarks
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
        });
    }

    private startNextTaggingBatch(worker: Worker) {
        if (this.isAborted || this.nextBatchToStart >= this.actualTotalBatches) return;

        const batchIndex = this.nextBatchToStart++;
        const start = batchIndex * this.options.batchSize;
        const end = Math.min(start + this.options.batchSize, this.bookmarksNeedingTagging.length);
        const batch = this.bookmarksNeedingTagging.slice(start, end);

        this.options.onLog(`[Tagging] Batch ${batchIndex + 1}/${this.actualTotalBatches}...`);

        this.options.workerManager.dispatchBatch(worker, {
            batch,
            batchIndex,
            apiConfigs: this.options.apiConfigs,
            maxRetries: this.options.maxRetries,
            taskType: 'extract_tags',
            tagCount: this.options.tagCount,
            tagLanguage: this.options.tagLanguage,
            activeProfile: this.options.activeProfile,
            promptModifiers: this.options.promptModifiers,
            userHistory: this.options.userHistory
        });
    }

    private updateTaggingProgress() {
        const taggingProgress = Math.min(
            Math.floor((this.completedBatches / this.actualTotalBatches) * 90),
            90
        );
        this.options.onProgress({
            current: Math.floor((taggingProgress / 100) * this.options.bookmarks.length),
            total: this.options.bookmarks.length
        });
    }

    private async checkTaggingCompletion(worker: Worker) {
        if (this.completedBatches + this.failedBatches >= this.actualTotalBatches) {
            this.options.workerManager.removeWorker(worker);
            if (!this.isAborted) await this.finalizeTagDrivenProcessing();
        } else {
            this.startNextTaggingBatch(worker);
        }
    }

    private async finalizeTagDrivenProcessing() {
        if (this.isAborted) return;

        if (this.failedBatches > 0) {
            this.options.onDetailedLog('warning', 'Lỗi phân tags một số bookmark', `Có ${this.failedBatches} batch tagging thất bại.`);
        }

        if (this.extractedTagsMap.size === 0) {
            this.options.onLog('Không tìm thấy tag nào để phân tích.');
            this.options.onComplete(true);
            return;
        }

        this.options.onLog(`--- ĐANG TẠO CẤU TRÚC THƯ MỤC TỪ ${this.extractedTagsMap.size} TAGS ---`);

        const allTags = new Set<string>();
        this.extractedTagsMap.forEach(tags => tags.forEach(t => allTags.add(t)));
        const uniqueTags = Array.from(allTags).slice(0, 600);

        if (uniqueTags.length === 0) {
            this.options.onLog('Không tìm thấy tag nào để phân tích.');
            this.options.onComplete(true);
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
                this.options.onResult(distributedBookmarks, []); // arrayToTree will be called in hook
                this.options.onComplete(false);
                this.options.workerManager.removeWorker(mappingWorker);
            } else if (type === 'batch_error') {
                this.options.onError(`Lỗi tạo thư mục: ${error}`);
                this.options.onComplete(true);
                this.options.workerManager.removeWorker(mappingWorker);
            }
        });

        const userInstructionBlock = this.options.customInstructions.trim()
            ? `\n\nUSER'S CUSTOM INSTRUCTIONS:\n- ${this.options.customInstructions.trim().replace(/\n/g, '\n- ')}`
            : '';

        this.options.workerManager.dispatchBatch(mappingWorker, {
            batch: [],
            batchIndex: 0,
            systemPrompt: this.options.systemPrompt,
            userInstructionBlock,
            apiConfigs: this.options.apiConfigs,
            maxRetries: this.options.maxRetries,
            taskType: 'map_tags_to_tree',
            uniqueTags,
            tagLanguage: this.options.tagLanguage,
            activeProfile: this.options.activeProfile,
            promptModifiers: this.options.promptModifiers,
            userHistory: this.options.userHistory
        });
    }

    abort() {
        this.isAborted = true;
        this.options.workerManager.cancelAll();
        this.options.onLog('Đã dừng xử lý tag-driven.');
    }
}
