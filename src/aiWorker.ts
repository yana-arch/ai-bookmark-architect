import { AIClient } from './services/aiClient';
import { TaskHandlers } from './services/processing/taskHandlers';
import { AIExecutionManager } from './services/processing/aiExecutionManager';
import type { Bookmark, ApiConfig, UserCorrection, Folder, AIProfile } from '@/types';

// Type definitions for the worker
interface WorkerMessage {
  type: 'process_batch' | 'cancel';
  data?: {
    batch: Bookmark[];
    apiConfigs: ApiConfig[];
    systemPrompt: string;
    userInstructionBlock: string;
    currentTree: Folder[];
    batchIndex: number;
    maxRetries: number;
    userHistory?: UserCorrection[];
    domainKnowledge?: string;
    taskType?: 'categorize' | 'extract_tags' | 'map_tags_to_tree';
    uniqueTags?: string[];
    tagCount?: number;
    tagLanguage?: string;
    activeProfile?: AIProfile;
    promptModifiers?: any; 
  };
}

interface WorkerResponse {
  type: 'batch_result' | 'batch_error' | 'log' | 'progress';
  data?: any;
  error?: string;
  batchIndex?: number;
  log?: any;
  progress?: number;
  usage?: any;
}

let currentAbortController: AbortController | null = null;

// Main worker logic
self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
    const { type, data } = e.data;

    if (type === 'cancel') {
        if (currentAbortController) {
            currentAbortController.abort();
            currentAbortController = null;
        }
        return;
    }

    if (!data) return;

    if (type === 'process_batch') {
        currentAbortController = new AbortController();
        const signal = currentAbortController.signal;
        
        const { 
            batch, 
            apiConfigs, 
            systemPrompt, 
            userInstructionBlock, 
            currentTree, 
            batchIndex, 
            maxRetries,
            userHistory,
            domainKnowledge,
            taskType = 'categorize',
            uniqueTags = [],
            tagCount = 3,
            tagLanguage = 'Vietnamese and Technical Terms',
            activeProfile,
            promptModifiers
        } = data;

        try {
            const result = await AIExecutionManager.executeWithRetry(
                `Batch ${batchIndex}`,
                async (client) => {
                    const tokenLimit = activeProfile?.requestTokenLimit || 16000;
                    const options = {
                        client,
                        systemPrompt,
                        userInstructionBlock,
                        currentTree,
                        userHistory,
                        domainKnowledge,
                        tagCount,
                        tagLanguage,
                        promptModifiers,
                        signal,
                        onLog: (msg: string) => self.postMessage({ type: 'log', log: { message: `Batch ${batchIndex}: ${msg}` }, batchIndex } as WorkerResponse)
                    };

                    if (taskType === 'extract_tags') {
                        return await TaskHandlers.handleTagExtraction(batch, options, tokenLimit);
                    } else if (taskType === 'map_tags_to_tree') {
                        return await TaskHandlers.handleTagMapping(uniqueTags, options);
                    } else {
                        return await TaskHandlers.handleCategorization(batch, options, tokenLimit);
                    }
                },
                {
                    apiConfigs,
                    maxRetries,
                    activeProfile,
                    signal,
                    onLog: (msg) => self.postMessage({ type: 'log', log: { message: msg }, batchIndex } as WorkerResponse)
                }
            );

            self.postMessage({
                type: 'batch_result',
                data: result.data,
                batchIndex,
                usage: result.usage
            } as WorkerResponse);

        } catch (error: any) {
            if (error.name === 'AbortError' || signal.aborted) {
                self.postMessage({ type: 'log', log: { message: `Batch ${batchIndex} was cancelled.` }, batchIndex } as WorkerResponse);
            } else {
                self.postMessage({ type: 'batch_error', error: error.message || 'Unknown error during AI processing', batchIndex } as WorkerResponse);
            }
        } finally {
            currentAbortController = null;
        }
    }
};

