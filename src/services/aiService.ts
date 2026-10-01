import type { Bookmark, Folder, ApiConfig, AIProfile, CategorizedBookmark, PromptModifiers } from '@/types';
import { AIClient } from './aiClient';
import { PromptBuilder } from './promptBuilder';
import { 
    parseAIResponse, 
    validateBookmarks, 
    repairJson, 
    extractBookmarksByRegex,
    parseTagExtractionResponse,
    parseTagMappingResponse,
    type TagFolderSchema
} from '@/src/utils/aiUtils';

export { 
    parseAIResponse, 
    validateBookmarks, 
    repairJson, 
    extractBookmarksByRegex,
    parseTagExtractionResponse,
    parseTagMappingResponse,
    type TagFolderSchema
};

/**
 * Runs a test categorization for the Prompt Playground
 */
export async function testCategorize(
    bookmarks: Bookmark[],
    profile: AIProfile,
    apiConfigs: ApiConfig[],
    customInstructions: string,
    currentTree: Folder[]
): Promise<{ categorized: CategorizedBookmark[], usage: any, rawText: string }> {
    const availableConfigs = apiConfigs.filter(c => c.status === 'active');
    if (availableConfigs.length === 0) throw new Error('Không có cấu hình API nào đang hoạt động.');

    // Pick first active for test
    const config = availableConfigs[0];
    const client = new AIClient(config, profile);

    const userInstructionBlock = customInstructions.trim()
        ? `\n\nUSER'S CUSTOM INSTRUCTIONS:\n- ${customInstructions.trim().replace(/\n/g, '\n- ')}`
        : '';

    const prompt = PromptBuilder.build({
        type: 'categorization',
        userInstructionBlock,
        currentTree,
        batch: bookmarks,
    });

    const response = await client.generateContent(profile.systemInstruction, prompt);
    if (!response.text) throw new Error('AI trả về kết quả rỗng.');

    const categorizedBookmarks = parseAIResponse(response.text) as CategorizedBookmark[];
    return { 
        categorized: categorizedBookmarks, 
        usage: response.usage,
        rawText: response.text 
    };
}

/**
 * Heuristic token estimation (Characters / 4)
 * Includes a 15% safety buffer
 */
export function estimateTokens(text: string): number {
    if (!text) return 0;
    const baseTokens = Math.ceil(text.length / 4);
    return Math.ceil(baseTokens * 1.15);
}

/**
 * Calculates the total tokens for a categorization request
 */
export function calculateRequestTokens(params: {
    systemPrompt: string;
    userPrompt: string;
}): number {
    return estimateTokens(params.systemPrompt) + estimateTokens(params.userPrompt);
}
