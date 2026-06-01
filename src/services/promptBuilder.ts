/**
 * PromptBuilder — single entry point for all AI prompt construction.
 *
 * Callers pass a discriminated-union task descriptor; the module returns
 * the prompt string. All prompt logic is local here; taskHandlers.ts and
 * aiService.ts import from this module instead of from each other.
 */
import type { Bookmark, Folder, UserCorrection, PromptModifiers } from '@/types';
import {
    generateCategorizationPrompt,
    generateTagExtractionPrompt,
    generateTagMappingPrompt,
    generateTagAnalysisPrompt,
    generateTagBatchRequestPrompt,
} from './aiService';

export type PromptTask =
    | {
          type: 'categorization';
          userInstructionBlock: string;
          currentTree: Folder[];
          batch: Bookmark[];
          userHistory?: UserCorrection[];
          domainKnowledge?: string;
          tagCount?: number;
          tagLanguage?: string;
          promptModifiers?: PromptModifiers;
      }
    | {
          type: 'tagExtraction';
          batch: Bookmark[];
          tagCount?: number;
          tagLanguage?: string;
      }
    | {
          type: 'tagMapping';
          userInstructionBlock: string;
          uniqueTags: string[];
          currentTree: Folder[];
          tagLanguage?: string;
          promptModifiers?: PromptModifiers;
      }
    | {
          type: 'tagAnalysis';
          userInstructionBlock: string;
          uniqueTags: string[];
          currentTree: Folder[];
          tagLanguage?: string;
          promptModifiers?: PromptModifiers;
      }
    | {
          type: 'tagBatchRequest';
          batchIndex: number;
          totalBatches: number;
          tagLanguage?: string;
          promptModifiers?: PromptModifiers;
      };

export const PromptBuilder = {
    build(task: PromptTask): string {
        switch (task.type) {
            case 'categorization':
                return generateCategorizationPrompt({
                    userInstructionBlock: task.userInstructionBlock,
                    currentTree: task.currentTree,
                    batch: task.batch,
                    userHistory: task.userHistory,
                    domainKnowledge: task.domainKnowledge,
                    tagLanguage: task.tagLanguage,
                    tagCount: task.tagCount,
                    promptModifiers: task.promptModifiers,
                });
            case 'tagExtraction':
                return generateTagExtractionPrompt({
                    batch: task.batch,
                    tagCount: task.tagCount,
                    tagLanguage: task.tagLanguage,
                });
            case 'tagMapping':
                return generateTagMappingPrompt({
                    userInstructionBlock: task.userInstructionBlock,
                    uniqueTags: task.uniqueTags,
                    currentTree: task.currentTree,
                    tagLanguage: task.tagLanguage,
                    promptModifiers: task.promptModifiers,
                });
            case 'tagAnalysis':
                return generateTagAnalysisPrompt({
                    userInstructionBlock: task.userInstructionBlock,
                    uniqueTags: task.uniqueTags,
                    currentTree: task.currentTree,
                    tagLanguage: task.tagLanguage,
                    promptModifiers: task.promptModifiers,
                });
            case 'tagBatchRequest':
                return generateTagBatchRequestPrompt(
                    task.batchIndex,
                    task.totalBatches,
                    task.tagLanguage,
                    task.promptModifiers,
                );
        }
    },
};
