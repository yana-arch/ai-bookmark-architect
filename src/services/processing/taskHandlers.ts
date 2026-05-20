import { SYSTEM_FOLDERS } from '@/types';
import { AIClient, type ChatMessage } from '../aiClient';
import { 
    generateCategorizationPrompt,
    generateTagExtractionPrompt,
    parseTagExtractionResponse,
    generateTagAnalysisPrompt,
    generateTagBatchRequestPrompt,
    parseTagMappingResponse,
    calculateRequestTokens,
    parseAIResponse
} from '../aiService';
import { extractJsonBlock } from '@/src/utils/aiUtils';
import type { Bookmark, Folder, UserCorrection, AIProfile, PromptModifiers } from '@/types';

import { TokenAwareSplitter } from './tokenAwareSplitter';

export interface TaskOptions {
    client: AIClient;
    systemPrompt: string;
    userInstructionBlock: string;
    currentTree: Folder[];
    userHistory?: UserCorrection[];
    domainKnowledge?: string;
    tagCount?: number;
    tagLanguage?: string;
    promptModifiers?: PromptModifiers;
    onLog: (message: string) => void;
}

export class TaskHandlers {
    /**
     * Handles bookmark categorization with token-aware splitting.
     */
    static async handleCategorization(
        batch: Bookmark[],
        options: TaskOptions,
        tokenLimit: number = 16000
    ): Promise<{ data: any[], usage: any }> {
        const { client, systemPrompt, userInstructionBlock, currentTree, userHistory, domainKnowledge, tagCount, tagLanguage, promptModifiers, onLog } = options;
        const totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
        const history: ChatMessage[] = [];

        const results = await TokenAwareSplitter.splitAndExecute<Bookmark, any>({
            batch,
            tokenLimit,
            calculateTokens: (subBatch) => {
                const userPrompt = generateCategorizationPrompt({
                    userInstructionBlock,
                    currentTree,
                    batch: subBatch,
                    userHistory,
                    domainKnowledge,
                    tagLanguage,
                    tagCount,
                    promptModifiers
                });
                return calculateRequestTokens({ systemPrompt, userPrompt });
            },
            executeTask: async (subBatch) => {
                const userPrompt = generateCategorizationPrompt({
                    userInstructionBlock,
                    currentTree,
                    batch: subBatch,
                    userHistory,
                    domainKnowledge,
                    tagLanguage,
                    tagCount,
                    promptModifiers
                });

                let responseText = '';
                let responseUsage: any = null;
                if (promptModifiers?.maintainContext) {
                    const { text, usage } = await client.generateChatContent(systemPrompt, [
                        ...history,
                        { role: 'user', content: userPrompt }
                    ]);
                    responseText = text;
                    responseUsage = usage;
                    if (responseText) {
                        history.push({ role: 'user', content: userPrompt });
                        history.push({ role: 'assistant', content: responseText });
                        if (history.length > 10) history.splice(0, 2);
                    }
                } else {
                    const { text, usage } = await client.generateContent(systemPrompt, userPrompt);
                    responseText = text;
                    responseUsage = usage;
                }

                if (responseUsage) {
                    totalUsage.promptTokens += responseUsage.promptTokens || 0;
                    totalUsage.completionTokens += responseUsage.completionTokens || 0;
                    totalUsage.totalTokens += responseUsage.totalTokens || 0;
                }

                if (!responseText) throw new Error('AI returned empty response');
                
                const parsedData = parseAIResponse(responseText);
                return parsedData.map(cbm => {
                    const original = subBatch.find(b => b.id === cbm.id) || subBatch.find(b => b.url === cbm.url);
                    return {
                        ...cbm,
                        id: original ? original.id : cbm.id,
                        parentId: null
                    };
                });
            },
            onLog,
            sequential: !!promptModifiers?.maintainContext
        });

        return { data: results, usage: totalUsage };
    }

    /**
     * Handles tag extraction for bookmarks.
     */
    static async handleTagExtraction(
        batch: Bookmark[],
        options: TaskOptions,
        tokenLimit: number = 16000
    ): Promise<{ data: any[], usage: any }> {
        const { client, tagCount, tagLanguage, onLog } = options;
        const totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

        const results = await TokenAwareSplitter.splitAndExecute<Bookmark, any>({
            batch,
            tokenLimit,
            calculateTokens: (subBatch) => {
                const userPrompt = generateTagExtractionPrompt({ batch: subBatch, tagCount, tagLanguage });
                return calculateRequestTokens({ systemPrompt: '', userPrompt });
            },
            executeTask: async (subBatch) => {
                const userPrompt = generateTagExtractionPrompt({ batch: subBatch, tagCount, tagLanguage });
                const { text, usage } = await client.generateContent('', userPrompt);
                
                if (!text) throw new Error('AI returned empty response for tag extraction');
                
                if (usage) {
                    totalUsage.promptTokens += usage.promptTokens || 0;
                    totalUsage.completionTokens += usage.completionTokens || 0;
                    totalUsage.totalTokens += usage.totalTokens || 0;
                }
                
                const parsedData = parseTagExtractionResponse(text);
                if (parsedData.length === 0) throw new Error('Failed to parse tag extraction response');
                
                return parsedData.map(cbm => {
                    const original = subBatch.find(b => b.id === cbm.id) || subBatch.find(b => b.url === cbm.url);
                    return {
                        ...cbm,
                        id: original ? original.id : cbm.id
                    };
                });
            },
            onLog
        });

        return { data: results, usage: totalUsage };
    }

    /**
     * Handles mapping tags to a folder tree using a stateful chat session.
     */
    static async handleTagMapping(
        uniqueTags: string[],
        options: TaskOptions
    ): Promise<{ data: any[], usage: any }> {
        const { client, systemPrompt, userInstructionBlock, currentTree, tagLanguage, promptModifiers, onLog } = options;
        const totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
        const history: ChatMessage[] = [];
        
        // Filter out fallback folders
        const filteredTree = currentTree.filter(f => f.name !== SYSTEM_FOLDERS.UNMAPPED_TAGS && f.name !== SYSTEM_FOLDERS.UNCATEGORIZED);

        const analysisPrompt = generateTagAnalysisPrompt({
            userInstructionBlock,
            uniqueTags,
            currentTree: filteredTree,
            tagLanguage,
            promptModifiers
        });

        onLog('Analyzing tags and creating batching plan...');
        const { text: planText, usage: planUsage } = await client.generateChatContent(systemPrompt, [{ role: 'user', content: analysisPrompt }]);

        if (planUsage) {
            totalUsage.promptTokens += planUsage.promptTokens || 0;
            totalUsage.completionTokens += planUsage.completionTokens || 0;
            totalUsage.totalTokens += planUsage.totalTokens || 0;
        }

        let totalBatches = 1;
        try {
            const cleanedPlan = extractJsonBlock(planText);
            const planJson = JSON.parse(cleanedPlan);
            totalBatches = planJson.totalBatches || 1;
        } catch (e) {
            onLog('Warning: Failed to parse AI batching plan, defaulting to 1 batch.');
        }

        totalBatches = Math.max(1, Math.min(totalBatches, 10));
        onLog(`AI determined it needs ${totalBatches} batches for the complete schema.`);

        history.push({ role: 'user', content: analysisPrompt });
        history.push({ role: 'assistant', content: planText });

        let resultData: any[] = [];
        
        for (let i = 1; i <= totalBatches; i++) {
            onLog(`Requesting Tag Schema batch ${i}/${totalBatches}...`);
            const batchRequestPrompt = generateTagBatchRequestPrompt(i, totalBatches, tagLanguage, promptModifiers);
            history.push({ role: 'user', content: batchRequestPrompt });

            const { text: batchText, usage: batchUsage } = await client.generateChatContent(systemPrompt, history);
            
            if (batchUsage) {
                totalUsage.promptTokens += batchUsage.promptTokens || 0;
                totalUsage.completionTokens += batchUsage.completionTokens || 0;
                totalUsage.totalTokens += batchUsage.totalTokens || 0;
            }
            history.push({ role: 'assistant', content: batchText });

            const batchSchema = parseTagMappingResponse(batchText);
            if (batchSchema && batchSchema.length > 0) {
                resultData = [...resultData, ...batchSchema];
            } else {
                onLog(`Warning: AI returned empty or invalid schema for batch ${i}.`);
            }
        }

        if (resultData.length === 0) throw new Error('Failed to parse any tag mapping schema from the chat session');
        return { data: resultData, usage: totalUsage };
    }
}
