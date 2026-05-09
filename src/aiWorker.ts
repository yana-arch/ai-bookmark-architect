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
    generateTagBatchRequestPrompt,
    calculateRequestTokens
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
    promptModifiers?: any; // To avoid importing PromptModifiers if not strictly needed, but better to import it
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
            activeProfile,
            promptModifiers
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

                // Token-aware Batch Splitting Logic
                const tokenLimit = activeProfile?.requestTokenLimit || 16000;
                const chatHistory: ChatMessage[] = [];
                
                const processWithTokenLimit = async (subBatch: Bookmark[]): Promise<any[]> => {
                    let tempPrompt = '';
                    let subSystemPrompt = systemPrompt;

                    if (taskType === 'extract_tags') {
                        tempPrompt = generateTagExtractionPrompt({ batch: subBatch, tagCount, tagLanguage });
                        subSystemPrompt = ''; // Tag extraction doesn't use the main system prompt
                    } else {
                        tempPrompt = generateCategorizationPrompt({
                            userInstructionBlock,
                            currentTree,
                            batch: subBatch,
                            userHistory,
                            domainKnowledge,
                            tagLanguage,
                            tagCount,
                            promptModifiers
                        });
                    }

                    const totalTokens = calculateRequestTokens({ systemPrompt: subSystemPrompt, userPrompt: tempPrompt });

                    if (totalTokens > tokenLimit && subBatch.length > 1) {
                        const mid = Math.floor(subBatch.length / 2);
                        const left = subBatch.slice(0, mid);
                        const right = subBatch.slice(mid);
                        
                        self.postMessage({
                            type: 'log',
                            log: { message: `Batch ${batchIndex}: [${taskType}] Request size (${totalTokens} tokens) exceeds limit (${tokenLimit}). Splitting sub-batch of ${subBatch.length} into ${left.length} and ${right.length}.` },
                            batchIndex
                        } as WorkerResponse);

                        const leftResults = await processWithTokenLimit(left);
                        const rightResults = await processWithTokenLimit(right);
                        return [...leftResults, ...rightResults];
                    }

                    // Base case: Process the sub-batch
                    let responseText = '';
                    let responseUsage: any = null;

                    if (taskType === 'categorize' && promptModifiers?.maintainContext) {
                        const { text, usage: u } = await client.generateChatContent(subSystemPrompt, [
                            ...chatHistory,
                            { role: 'user', content: tempPrompt }
                        ]);
                        responseText = text;
                        responseUsage = u;
                        
                        if (responseText) {
                            chatHistory.push({ role: 'user', content: tempPrompt });
                            chatHistory.push({ role: 'assistant', content: responseText });
                            if (chatHistory.length > 10) chatHistory.splice(0, 2);
                        }
                    } else {
                        const { text, usage: u } = await client.generateContent(subSystemPrompt, tempPrompt);
                        responseText = text;
                        responseUsage = u;
                    }
                    
                    if (!responseText) throw new Error('AI returned empty response');
                    
                    let parsedData: any[] = [];
                    if (taskType === 'extract_tags') {
                        parsedData = parseTagExtractionResponse(responseText);
                        if (parsedData.length === 0) throw new Error('Failed to parse tag extraction response');
                    } else {
                        parsedData = parseAIResponse(responseText);
                    }
                    
                    if (responseUsage) {
                        if (!usage) usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
                        usage.promptTokens += responseUsage.promptTokens;
                        usage.completionTokens += responseUsage.completionTokens;
                        usage.totalTokens += responseUsage.totalTokens;
                    }

                    if (taskType === 'extract_tags') return parsedData;

                    return parsedData.map(cbm => {
                        const original = subBatch.find(b => b.url === cbm.url);
                        return {
                            ...cbm,
                            id: original ? original.id : cbm.id,
                            parentId: null
                        };
                    });
                };

                let userPrompt = '';
                let resultData: any = null;
                let usage: any = null;

                if (taskType === 'extract_tags') {
                    resultData = await processWithTokenLimit(batch);
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
                        tagLanguage,
                        promptModifiers
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

                        const batchRequestPrompt = generateTagBatchRequestPrompt(i, totalBatches, tagLanguage, promptModifiers);
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
                    resultData = await processWithTokenLimit(batch);
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

