/**
 * PromptBuilder — single entry point for all AI prompt construction.
 *
 * Callers pass a discriminated-union task descriptor; the module returns
 * the prompt string. All prompt logic is local here.
 */
import type { Bookmark, Folder, UserCorrection, PromptModifiers } from '@/types';
import { getFullTreeContext, buildModifiersBlock } from '@/src/utils/promptUtils';

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
                return this.generateCategorizationPrompt(task);
            case 'tagExtraction':
                return this.generateTagExtractionPrompt(task);
            case 'tagMapping':
                return this.generateTagMappingPrompt(task);
            case 'tagAnalysis':
                return this.generateTagAnalysisPrompt(task);
            case 'tagBatchRequest':
                return this.generateTagBatchRequestPrompt(task);
        }
    },

    generateCategorizationPrompt(params: {
        userInstructionBlock: string;
        currentTree: Folder[];
        batch: Bookmark[];
        userHistory?: UserCorrection[];
        domainKnowledge?: string;
        tagLanguage?: string;
        tagCount?: number;
        promptModifiers?: PromptModifiers;
    }): string {
        const {
            userInstructionBlock,
            currentTree,
            batch,
            userHistory,
            domainKnowledge,
            tagLanguage = 'English',
            tagCount = 3,
            promptModifiers
        } = params;

        const bookmarksList = batch.map(b => `- ID: ${b.id} | ${b.title} (${b.url})`).join('\n');
        
        const treeContext = (promptModifiers?.includeHierarchy && currentTree.length > 0)
            ? JSON.stringify(getFullTreeContext(currentTree))
            : 'None (Initial run or deep re-architecture)';

        let historyContext = '';
        if (userHistory && userHistory.length > 0) {
            const recentCorrections = userHistory.slice(-5).map(c => 
                `Correction: "${c.originalBookmarkUrl}" was moved to path [${c.correctedPath.join(' > ')}]`
            ).join('\n');
            historyContext = `\nRecent User Corrections (Learn from these):\n${recentCorrections}`;
        }

        return `${domainKnowledge ? `Domain Knowledge:\n${domainKnowledge}\n` : ''}

${historyContext}
${buildModifiersBlock(promptModifiers)}
${userInstructionBlock ? `\nCRITICAL OVERRIDE: The user instructions below SUPERSEDE any conflicting rules from the general strategy or structural requirements above.\n${userInstructionBlock}\n` : ''}
Current Folder Structure (Reuse these if suitable):
${treeContext}

Bookmarks to Process (${batch.length} items):
${bookmarksList}

CRITICAL INSTRUCTION: 
1. Respond ONLY with a valid JSON object containing a "bookmarks" array.
2. You MUST return exactly ${batch.length} items in the "bookmarks" array. Do not skip any bookmark.
3. For each item, provide:
   - "id": The EXACT internal ID provided in the list (CRITICAL for matching)
   - "title": Original title
   - "url": EXACT original URL (Do not modify!)
   - "path": Array of folder names (e.g., ["Tech", "React"])
   - "tags": Array of keywords (Aim for exactly ${tagCount} tags per bookmark)
   - "confidence": A number from 0 to 100 representing your certainty in this categorization.
4. Folder names and tags MUST be written in the language specified: ${tagLanguage}.
5. The JSON structure:
{
  "bookmarks": [
    {
      "id": "original-id",
      "title": "Example",
      "url": "https://example.com",
      "path": ["Folder"],
      "tags": ["tag"],
      "confidence": 95
    }
  ]
}
Do not include any explanation or markdown formatting outside the JSON object.`;
    },

    generateTagExtractionPrompt(params: {
        batch: Bookmark[];
        tagCount?: number;
        tagLanguage?: string;
    }): string {
        const { batch, tagCount = 3, tagLanguage = 'Vietnamese and Technical Terms' } = params;
        const bookmarksList = batch.map(b => `- ID: ${b.id} | ${b.title} (${b.url})`).join('\n');

        return `You are an AI specialized in analyzing web pages based on title and URL to extract concise, relevant tags.
Your goal is to generate ${tagCount} tags for each bookmark.
Tags should be in ${tagLanguage}.
Tags should be relevant keywords that describe the content and category of the bookmark.

Bookmarks to Process (${batch.length} items):
${bookmarksList}

CRITICAL INSTRUCTION:
1. Respond ONLY with a valid JSON object containing a "bookmarks" array.
2. You MUST return exactly ${batch.length} items. Do not skip any bookmark.
3. For each item, provide:
   - "id": The EXACT internal ID provided in the list
   - "url": EXACT original URL (Do not modify!)
   - "tags": Array of ${tagCount} keywords
4. The JSON structure:
{
  "bookmarks": [
    {
      "id": "original-id",
      "url": "https://example.com",
      "tags": ["tag1", "tag2"]
    }
  ]
}
Do not include any explanation or markdown formatting outside the JSON object.`;
    },

    generateTagMappingPrompt(params: {
        userInstructionBlock: string;
        uniqueTags: string[];
        currentTree: Folder[];
        tagLanguage?: string;
        promptModifiers?: PromptModifiers;
    }): string {
        const { userInstructionBlock, uniqueTags, currentTree, tagLanguage = 'English', promptModifiers } = params;

        const treeContext = JSON.stringify(getFullTreeContext(currentTree));
        
        const MAX_TAGS = 600;
        const truncatedTags = uniqueTags.length > MAX_TAGS 
            ? uniqueTags.slice(0, MAX_TAGS) 
            : uniqueTags;
        
        const tagsList = truncatedTags.join(', ');

        return `Your task is to take a flat list of tags and map them into a logical, hierarchical folder structure.
You MUST respect the Taxonomy Architecture defined in the system prompt above.
Create a highly detailed, specific folder structure. Keep categories granular and visible at the top levels to provide a detailed taxonomy. Do not over-group independent topics into deep general folders.
${buildModifiersBlock(promptModifiers)}
${userInstructionBlock ? `\nCRITICAL OVERRIDE: The user instructions below SUPERSEDE any conflicting rules from the general strategy or structural requirements above.\n${userInstructionBlock}\n` : ''}
Current Folder Structure (Reuse these if suitable):
${treeContext}

Unique Tags to Map${uniqueTags.length > MAX_TAGS ? ` (Top ${MAX_TAGS} of ${uniqueTags.length})` : ''}:
[${tagsList}]

CRITICAL INSTRUCTION:
1. Respond ONLY with a valid JSON object containing a "tagSchema" array.
2. Build a hierarchical folder structure. For each folder, you can define child folders ("children").
3. Assign each unique tag from the list to exactly ONE logical folder in your structure by placing the tag inside the "mappedTags" array of that folder.
4. If a tag is very general (like "Resources" or "Web"), try to find a more specific child folder or create one.
5. Ensure ALL tags from the list are mapped somewhere.
6. DO NOT create any folders named "[Unmapped Tags]", "[Uncategorized]", "Khác", "Others", or similar fallback folders. If a tag doesn't fit, find the closest semantic match.
7. ALL generated folder names MUST be strictly written in the requested language: ${tagLanguage}.
8. The JSON structure:
{
  "tagSchema": [
    {
      "name": "Category",
      "mappedTags": ["ui"],
      "children": [
        {
          "name": "Subcategory",
          "mappedTags": ["react", "hooks", "jsx"],
          "children": []
        }
      ]
    }
  ]
}
Do not include any explanation or markdown formatting outside the JSON object.`;
    },

    generateTagAnalysisPrompt(params: {
        userInstructionBlock: string;
        uniqueTags: string[];
        currentTree: Folder[];
        tagLanguage?: string;
        promptModifiers?: PromptModifiers;
    }): string {
        const { userInstructionBlock, uniqueTags, currentTree, tagLanguage = 'English', promptModifiers } = params;

        const treeContext = JSON.stringify(getFullTreeContext(currentTree));
        const tagsList = uniqueTags.join(', ');

        return `Your task is to analyze a flat list of tags and determine how many batches you will need to map ALL of them into a detailed, hierarchical folder structure.
We will conduct a stateful chat session. In this first step, you just need to calculate the plan.
${buildModifiersBlock(promptModifiers)}
${userInstructionBlock ? `\nCRITICAL OVERRIDE: The user instructions below SUPERSEDE any conflicting rules from the general strategy or structural requirements above.\n${userInstructionBlock}\n` : ''}
Current Folder Structure (Reuse these if suitable):
${treeContext}

All Unique Tags to Map (${uniqueTags.length} tags):
[${tagsList}]

Target Language for Folders: ${tagLanguage}

CRITICAL INSTRUCTION FOR THIS STEP:
1. You are constrained by output token limits. A single JSON response containing a massive schema might exceed your output limit.
2. Calculate how many batches (totalBatches) you need to safely return the complete TagFolderSchema without being truncated. Assume you can safely return about 150-200 mapped tags per batch.
3. Respond ONLY with a valid JSON object containing the plan. Do NOT output the schema yet.
4. The JSON structure must be:
{
  "totalBatches": number,
  "reason": "Brief explanation of your batching plan"
}
Do not include any explanation or markdown formatting outside the JSON object.`;
    },

    generateTagBatchRequestPrompt(params: {
        batchIndex: number;
        totalBatches: number;
        tagLanguage?: string;
        promptModifiers?: PromptModifiers;
    }): string {
        const { batchIndex, totalBatches, tagLanguage = 'English', promptModifiers } = params;
        return `Please generate the TagFolderSchema for batch ${batchIndex} of ${totalBatches}.
${buildModifiersBlock(promptModifiers)}
CRITICAL INSTRUCTION:
1. Respond ONLY with a valid JSON object containing a "tagSchema" array for this specific batch.
2. Remember to respect the taxonomy rules: create a highly detailed, specific folder structure.
3. DO NOT create any folders named "[Unmapped Tags]", "[Uncategorized]", "Khác", "Others", or similar fallback folders. If a tag doesn't fit, find the closest semantic match.
4. ALL generated folder names MUST be strictly written in the requested language: ${tagLanguage}.
5. The JSON structure must be exactly:
{
  "tagSchema": [
    {
      "name": "Category",
      "mappedTags": ["tag1", "tag2"],
      "children": []
    }
  ]
}
Do not include any explanation or markdown formatting outside the JSON object.`;
    }
};
