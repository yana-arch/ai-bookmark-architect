import { SYSTEM_FOLDERS } from '@/types';
import { AIClient } from '../aiClient';
import { PromptBuilder } from '../promptBuilder';
import { 
    parseTagExtractionResponse,
    parseTagMappingResponse,
    calculateRequestTokens,
    parseAIResponse
} from '../aiService';
import { extractJsonBlock } from '@/src/utils/aiUtils';
import type { 
    Bookmark, Folder, UserCorrection, AIProfile, PromptModifiers, 
    CategorizedBookmark, ProcessingResult, AIUsage 
} from '@/types';
import { type TagFolderSchema } from '@/src/utils/aiUtils';

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
    signal?: AbortSignal;
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
    ): Promise<ProcessingResult<CategorizedBookmark>> {
        const { client, systemPrompt, userInstructionBlock, currentTree, userHistory, domainKnowledge, tagCount, tagLanguage, promptModifiers, signal, onLog } = options;
        const totalUsage: AIUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
        const maintainContext = !!promptModifiers?.maintainContext;

        const results = await TokenAwareSplitter.splitAndExecute<Bookmark, CategorizedBookmark>({
            batch,
            tokenLimit,
            signal,
            calculateTokens: (subBatch) => {
                const userPrompt = PromptBuilder.build({
                    type: 'categorization',
                    userInstructionBlock, currentTree, batch: subBatch,
                    userHistory, domainKnowledge, tagLanguage, tagCount, promptModifiers
                });
                return calculateRequestTokens({ systemPrompt, userPrompt });
            },
            executeTask: async (subBatch) => {
                const userPrompt = PromptBuilder.build({
                    type: 'categorization',
                    userInstructionBlock, currentTree, batch: subBatch,
                    userHistory, domainKnowledge, tagLanguage, tagCount, promptModifiers
                });

                const { text, usage } = await client.complete(systemPrompt, userPrompt, { maintainContext, signal });

                if (usage) {
                    totalUsage.promptTokens += usage.promptTokens || 0;
                    totalUsage.completionTokens += usage.completionTokens || 0;
                    totalUsage.totalTokens += usage.totalTokens || 0;
                }

                if (!text) throw new Error('AI returned empty response');

                const parsedData = parseAIResponse(text) as CategorizedBookmark[];
                return parsedData.map(cbm => {
                    const original = subBatch.find(b => b.id === cbm.id) || subBatch.find(b => b.url === cbm.url);
                    return { ...cbm, id: original ? original.id : cbm.id, parentId: null };
                });
            },
            onLog,
            sequential: maintainContext
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
    ): Promise<ProcessingResult<{ id?: string, url: string, tags: string[] }>> {
        const { client, tagCount, tagLanguage, signal, onLog } = options;
        const totalUsage: AIUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

        const results = await TokenAwareSplitter.splitAndExecute<Bookmark, { id?: string, url: string, tags: string[] }>({
            batch,
            tokenLimit,
            signal,
            calculateTokens: (subBatch) => {
                const userPrompt = PromptBuilder.build({ type: 'tagExtraction', batch: subBatch, tagCount, tagLanguage });
                return calculateRequestTokens({ systemPrompt: '', userPrompt });
            },
            executeTask: async (subBatch) => {
                const userPrompt = PromptBuilder.build({ type: 'tagExtraction', batch: subBatch, tagCount, tagLanguage });
                const { text, usage } = await client.complete('', userPrompt, { signal });

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
                    return { ...cbm, id: original ? original.id : cbm.id };
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
    ): Promise<ProcessingResult<TagFolderSchema>> {
        const { client, systemPrompt, userInstructionBlock, currentTree, tagLanguage, promptModifiers, signal, onLog } = options;
        const totalUsage: AIUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

        const filteredTree = currentTree.filter(f => f.name !== SYSTEM_FOLDERS.UNMAPPED_TAGS && f.name !== SYSTEM_FOLDERS.UNCATEGORIZED);

        const analysisPrompt = PromptBuilder.build({
            type: 'tagAnalysis',
            userInstructionBlock, uniqueTags, currentTree: filteredTree, tagLanguage, promptModifiers
        });

        onLog('Analyzing tags and creating batching plan...');
        client.resetHistory();
        const { text: planText, usage: planUsage } = await client.complete(systemPrompt, analysisPrompt, { maintainContext: true, signal });

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

        let resultData: TagFolderSchema[] = [];

        for (let i = 1; i <= totalBatches; i++) {
            if (signal?.aborted) throw new Error('Mapping aborted during batch processing.');

            onLog(`Requesting Tag Schema batch ${i}/${totalBatches}...`);
            const batchRequestPrompt = PromptBuilder.build({ type: 'tagBatchRequest', batchIndex: i, totalBatches, tagLanguage, promptModifiers });
            const { text: batchText, usage: batchUsage } = await client.complete(systemPrompt, batchRequestPrompt, { maintainContext: true, signal });

            if (batchUsage) {
                totalUsage.promptTokens += batchUsage.promptTokens || 0;
                totalUsage.completionTokens += batchUsage.completionTokens || 0;
                totalUsage.totalTokens += batchUsage.totalTokens || 0;
            }

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
