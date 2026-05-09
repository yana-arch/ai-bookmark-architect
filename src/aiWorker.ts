// AI Worker for multi-threaded bookmark processing
// This worker handles AI API calls for a single batch of bookmarks
import { AIClient } from './services/aiClient';
import type { Bookmark, ApiConfig, UserCorrection, Folder, AIProfile } from '../types';
import { 
    parseAIResponse, 
    generateCategorizationPrompt,
    generateTagExtractionPrompt,
    parseTagExtractionResponse,
    generateTagMappingPrompt,
    parseTagMappingResponse,
    generateTagAnalysisPrompt,
    generateTagBatchRequestPrompt
} from './services/aiService';
import type { ChatMessage } from './services/aiClient';

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
  };
}

interface WorkerResponse {
  type: 'batch_result' | 'batch_error' | 'log' | 'progress';
  data?: any;
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
            domainKnowledge,
            taskType = 'categorize',
            uniqueTags = [],
            tagCount = 3,
            tagLanguage = 'Vietnamese and Technical Terms',
            activeProfile
        } = data;

        const availableConfigs = apiConfigs.filter(c => c.status === 'active');

        if (availableConfigs.length === 0) {
            self.postMessage({
                type: 'batch_error',
                error: 'No active API key found.',
                batchIndex
            } as WorkerResponse);
            return;
        }
        
        // Randomly pick an initial config for load balancing
        let currentConfigIndex = Math.floor(Math.random() * availableConfigs.length);
        let attempts = 0;
        let success = false;

        while (attempts <= maxRetries && !success) {
            const activeConfig = availableConfigs[currentConfigIndex];
            const client = new AIClient(activeConfig, activeProfile);
            
            try {
                attempts++;
        
                self.postMessage({
                    type: 'log',
                    log: { message: `Batch ${batchIndex}: Attempt ${attempts}/${maxRetries + 1} using [${activeConfig.name}] (${activeConfig.provider})` },
                    batchIndex
                } as WorkerResponse);

                let userPrompt = '';
                let resultData: any = null;
                let usage: any = null;

                if (taskType === 'extract_tags') {
                    userPrompt = generateTagExtractionPrompt({ batch, tagCount, tagLanguage });
                    const { text: responseText, usage: responseUsage } = await client.generateContent('', userPrompt);
                    if (!responseText) throw new Error('AI returned empty response');
                    resultData = parseTagExtractionResponse(responseText);
                    usage = responseUsage;
                    if (resultData.length === 0) throw new Error('Failed to parse tag extraction response');
                } 
                else if (taskType === 'map_tags_to_tree') {
                    // Stateful Chat Session for Mapping
                    const history: ChatMessage[] = [];
                    
                    // Do not show the AI existing fallback folders to prevent it from using them
                    const filteredTree = currentTree.filter(f => f.name !== '[Unmapped Tags]' && f.name !== '[Uncategorized]');

                    const analysisPrompt = generateTagAnalysisPrompt({
                        userInstructionBlock,
                        uniqueTags,
                        currentTree: filteredTree,
                        tagLanguage
                    });

                    // Initial call to get batching plan
                    const { text: planText, usage: planUsage } = await client.generateChatContent(systemPrompt, [{ role: 'user', content: analysisPrompt }]);
                    usage = planUsage;

                    let totalBatches = 1;
                    try {
                        const cleanedPlan = planText.replace(/```json/g, '').replace(/```/g, '').trim();
                        const planJson = JSON.parse(cleanedPlan);
                        totalBatches = planJson.totalBatches || 1;
                    } catch (e) {
                        console.warn('Failed to parse AI batching plan, defaulting to 1 batch', e);
                    }

                    // Safety bounds
                    totalBatches = Math.max(1, Math.min(totalBatches, 10));

                    self.postMessage({
                        type: 'log',
                        log: { message: `AI determined it needs ${totalBatches} batches to deliver the complete schema.` },
                        batchIndex
                    } as WorkerResponse);

                    history.push({ role: 'user', content: analysisPrompt });
                    history.push({ role: 'assistant', content: planText });

                    resultData = [];
                    
                    for (let i = 1; i <= totalBatches; i++) {
                        self.postMessage({
                            type: 'log',
                            log: { message: `Requesting Tag Schema batch ${i}/${totalBatches}...` },
                            batchIndex
                        } as WorkerResponse);

                        const batchRequestPrompt = generateTagBatchRequestPrompt(i, totalBatches, tagLanguage);
                        history.push({ role: 'user', content: batchRequestPrompt });

                        const { text: batchText, usage: batchUsage } = await client.generateChatContent(systemPrompt, history);
                        
                        // Accumulate token usage
                        if (batchUsage && usage) {
                            usage.promptTokens += batchUsage.promptTokens;
                            usage.completionTokens += batchUsage.completionTokens;
                            usage.totalTokens += batchUsage.totalTokens;
                        }

                        history.push({ role: 'assistant', content: batchText });

                        const batchSchema = parseTagMappingResponse(batchText);
                        if (batchSchema && batchSchema.length > 0) {
                            resultData = [...resultData, ...batchSchema];
                        } else {
                            self.postMessage({
                                type: 'log',
                                log: { message: `Warning: AI returned empty or invalid schema for batch ${i}.` },
                                batchIndex
                            } as WorkerResponse);
                        }
                    }

                    if (resultData.length === 0) throw new Error('Failed to parse any tag mapping schema from the chat session');
                }
                else {
                    // categorize
                    userPrompt = generateCategorizationPrompt({
                        userInstructionBlock,
                        currentTree,
                        batch,
                        userHistory,
                        domainKnowledge,
                        tagLanguage
                    });

                    const { text: responseText, usage: responseUsage } = await client.generateContent(systemPrompt, userPrompt);

                    if (!responseText) {
                        throw new Error('AI returned empty response');
                    }

                    const categorizedBookmarks = parseAIResponse(responseText);
                    usage = responseUsage;

                    if (categorizedBookmarks.length === 0) {
                        let errMsg = responseText || 'empty response';
                        if (errMsg.length > 150) {
                            errMsg = errMsg.substring(0, 150) + '...';
                        }
                        throw new Error(`AI returned invalid format: ${errMsg}`);
                    }

                    resultData = categorizedBookmarks.map(cbm => {
                        const original = batch.find(b => b.url === cbm.url);
                        return {
                            ...cbm,
                            id: original ? original.id : cbm.id,
                            parentId: null
                        };
                    });
                }

                success = true;
                self.postMessage({
                    type: 'batch_result',
                    data: resultData,
                    batchIndex,
                    usage: usage
                } as WorkerResponse);

            } catch (error: any) {
                console.error(`Batch ${batchIndex} attempt ${attempts} failed with [${activeConfig.name}]:`, error);
                
                // Failover to next config
                currentConfigIndex = (currentConfigIndex + 1) % availableConfigs.length;

                if (attempts > maxRetries) {
                    self.postMessage({
                        type: 'batch_error',
                        error: error.message || 'Unknown error during AI processing',
                        batchIndex
                    } as WorkerResponse);
                } else {
                    // Exponential backoff
                    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts - 1)));
                }
            }
        }
    }
};

