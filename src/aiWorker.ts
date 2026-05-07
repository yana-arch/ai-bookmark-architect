// AI Worker for multi-threaded bookmark processing
// This worker handles AI API calls for a single batch of bookmarks
import { AIClient } from './services/aiClient';
import type { Bookmark, ApiConfig, UserCorrection, Folder } from '../types';
import { 
    parseAIResponse, 
    generateCategorizationPrompt 
} from './services/aiService';

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
  };
}

interface WorkerResponse {
  type: 'batch_result' | 'batch_error' | 'log' | 'progress';
  data?: Bookmark[];
  error?: string;
  batchIndex?: number;
  log?: any;
  progress?: number;
}

// Main worker logic
self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
    const { type, data } = e.data;

    if (type === 'cancel') {
        return;
    }

    if (type === 'process_batch' && data) {
        const { 
            batch, 
            apiConfigs, 
            systemPrompt, 
            userInstructionBlock, 
            currentTree, 
            batchIndex, 
            maxRetries,
            userHistory,
            domainKnowledge
        } = data;

        // Use the first active API config
        const availableConfigs = apiConfigs.filter(c => c.status === 'active');

        if (availableConfigs.length === 0) {
            self.postMessage({
                type: 'batch_error',
                error: 'No active API key found.',
                batchIndex
            } as WorkerResponse);
            return;
        }
        
        const activeConfig = availableConfigs[0];
        const client = new AIClient(activeConfig);

        let attempts = 0;
        let success = false;

        while (attempts <= maxRetries && !success) {
            try {
                attempts++;
        
                // Log attempt
                self.postMessage({
                    type: 'log',
                    log: { message: `Batch ${batchIndex}: Attempt ${attempts}/${maxRetries + 1} using [${activeConfig.name}] (${activeConfig.provider})` },
                    batchIndex
                } as WorkerResponse);

                // Prepare prompts
                const userPrompt = generateCategorizationPrompt({
                    systemPrompt: '', // Passing empty as systemPrompt is handled by client/provider roles
                    userInstructionBlock,
                    currentTree,
                    batch,
                    userHistory,
                    domainKnowledge
                });

                // Execute using unified client
                const { text: responseText } = await client.generateContent(systemPrompt, userPrompt);

                if (!responseText) {
                    throw new Error('AI returned empty response');
                }

                // Parse Result using centralized service
                const categorizedBookmarks = parseAIResponse(responseText);

                if (categorizedBookmarks.length === 0) {
                    let errMsg = responseText || 'empty response';
                    if (errMsg.length > 150) {
                        errMsg = errMsg.substring(0, 150) + '...';
                    }
                    throw new Error(`AI returned invalid format or API error: ${errMsg}`);
                }

                // Merge back strict IDs from original batch
                const finalBookmarks = categorizedBookmarks.map(cbm => {
                    const original = batch.find(b => b.url === cbm.url);
                    return {
                        ...cbm,
                        id: original ? original.id : cbm.id,
                        parentId: null
                    };
                });

                success = true;
                self.postMessage({
                    type: 'batch_result',
                    data: finalBookmarks,
                    batchIndex
                } as WorkerResponse);

            } catch (error: any) {
                console.error(`Batch ${batchIndex} attempt ${attempts} failed:`, error);
                if (attempts > maxRetries) {
                    self.postMessage({
                        type: 'batch_error',
                        error: error.message || 'Unknown error during AI processing',
                        batchIndex
                    } as WorkerResponse);
                } else {
                    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts)));
                }
            }
        }
    }
};

