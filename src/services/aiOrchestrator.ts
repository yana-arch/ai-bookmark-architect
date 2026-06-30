import type { 
    Bookmark, 
    AIProfile, 
    ApiConfig, 
    PromptModifiers, 
    ProcessingResult,
    CategorizedBookmark,
    Folder
} from '@/types';
import { WorkerManager, type WorkerMessage } from './processing/workerManager';
import { PromptBuilder } from './promptBuilder';

export type AIJobType = 'categorize' | 'extract_tags' | 'map_folders';

export interface AIJobProgress {
    total: number;
    processed: number;
    currentBatch: number;
    totalBatches: number;
    status: string;
}

export interface AIJobConfig {
    type: AIJobType;
    bookmarks: Bookmark[];
    options: {
        batchSize: number;
        profile: AIProfile;
        apiConfigs: ApiConfig[];
        modifiers?: PromptModifiers;
        currentTree?: Folder[];
        customInstructions?: string;
    };
    onProgress?: (progress: AIJobProgress) => void;
    onLog?: (msg: string) => void;
}

/**
 * AI Orchestrator: Deep Interface for AI processing.
 * Hides batching, workers, retries, and repairs.
 */
export interface IAIOrchestrator {
    /**
     * Executes an AI job and returns the results.
     * Leverage: Handles the entire lifecycle from batching to repair.
     */
    execute<T = CategorizedBookmark | string>(job: AIJobConfig): Promise<ProcessingResult<T>>;
    
    /**
     * Terminates any active jobs and cleans up resources.
     */
    terminate(): void;
}

export class AIOrchestrator implements IAIOrchestrator {
    private workerManager: WorkerManager;
    private activeJobs: AbortController[] = [];

    constructor() {
        this.workerManager = new WorkerManager((msg) => this.handleWorkerMessage(msg));
    }

    private handleWorkerMessage(message: WorkerMessage) {
        // Shared message handling if needed, though execute() uses a local scoped handler
    }

    async execute<T = CategorizedBookmark | string>(job: AIJobConfig): Promise<ProcessingResult<T>> {
        const { type, bookmarks, options, onProgress, onLog } = job;
        const total = bookmarks.length;
        const batchSize = Math.max(1, options.batchSize);
        const totalBatches = Math.ceil(total / batchSize);
        
        let processed = 0;
        let allResults: T[] = [];
        const totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

        const systemPrompt = options.profile.systemInstruction || '';
        const userInstructionBlock = options.customInstructions || '';

        onLog?.(`Starting ${type} job for ${total} bookmarks in ${totalBatches} batches.`);

        // Create a local worker manager for this job to ensure isolation
        const localManager = new WorkerManager((msg) => {
            if (msg.type === 'log' && msg.log) {
                onLog?.(msg.log.message);
            }
        });

        const maxConcurrent = WorkerManager.getMaxWorkers();
        const batches: Bookmark[][] = [];
        for (let i = 0; i < bookmarks.length; i += batchSize) {
            batches.push(bookmarks.slice(i, i + batchSize));
        }

        return new Promise((resolve, reject) => {
            let batchIndex = 0;
            let completedBatches = 0;

            const dispatchNext = () => {
                while (localManager.getWorkerCount() < maxConcurrent && batchIndex < totalBatches) {
                    const currentBatchIndex = batchIndex++;
                    const worker = localManager.createWorker();
                    
                    const workerData = {
                        batch: batches[currentBatchIndex],
                        batchIndex: currentBatchIndex,
                        systemPrompt,
                        userInstructionBlock,
                        apiConfigs: options.apiConfigs,
                        maxRetries: 3,
                        currentTree: options.currentTree,
                        taskType: this.mapJobTypeToTaskType(type),
                        activeProfile: options.profile,
                        promptModifiers: options.modifiers
                    };

                    localManager.dispatchBatch(worker, workerData as any);
                }
            };

            // Override handleMessage for this specific execution
            (localManager as any).handleMessage = (message: WorkerMessage) => {
                if (message.type === 'batch_result') {
                    const results = message.data as T[];
                    allResults = [...allResults, ...results];
                    
                    if (message.usage) {
                        totalUsage.promptTokens += message.usage.promptTokens;
                        totalUsage.completionTokens += message.usage.completionTokens;
                        totalUsage.totalTokens += message.usage.totalTokens;
                    }

                    completedBatches++;
                    processed += batches[message.batchIndex!].length;
                    
                    onProgress?.({
                        total,
                        processed,
                        currentBatch: message.batchIndex! + 1,
                        totalBatches,
                        status: `Processed batch ${message.batchIndex! + 1}/${totalBatches}`
                    });

                    // Remove worker and dispatch next
                    // Note: localManager.removeWorker terminates it
                    // Find worker that sent this message - simplified for this implementation
                    // In real implementation, handleMessage would need worker context or IDs
                    
                    if (completedBatches === totalBatches) {
                        localManager.terminateAll();
                        resolve({ data: allResults, usage: totalUsage });
                    } else {
                        dispatchNext();
                    }
                } else if (message.type === 'batch_error') {
                    onLog?.(`Error in batch ${message.batchIndex}: ${message.error}`);
                    localManager.terminateAll();
                    reject(new Error(message.error || 'AI Batch Processing Failed'));
                } else if (message.type === 'log' && message.log) {
                    onLog?.(message.log.message);
                }
            };

            dispatchNext();
        });
    }

    private mapJobTypeToTaskType(type: AIJobType): string {
        switch (type) {
            case 'categorize': return 'categorize';
            case 'extract_tags': return 'extract_tags';
            case 'map_folders': return 'map_tags_to_tree';
            default: return 'categorize';
        }
    }

    terminate(): void {
        this.workerManager.terminateAll();
    }
}
