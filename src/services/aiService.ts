import type { Bookmark, Folder, UserCorrection, ApiConfig, AIProfile, CategorizedBookmark } from '../../types';
import { AIClient } from './aiClient';
import { 
    parseAIResponse, 
    validateBookmarks, 
    repairJson, 
    extractBookmarksByRegex,
    parseTagExtractionResponse,
    parseTagMappingResponse,
    type TagFolderSchema
} from '../utils/aiUtils';

export { 
    parseAIResponse, 
    validateBookmarks, 
    repairJson, 
    extractBookmarksByRegex,
    parseTagExtractionResponse,
    parseTagMappingResponse,
    type TagFolderSchema
};

import type { PromptModifiers } from '../../types';

/**
 * Helper to build the prompt modifiers block
 */
function buildModifiersBlock(modifiers?: PromptModifiers): string {
    if (!modifiers) return '';
    const rules: string[] = [];
    if (modifiers.maxFolderDepth) rules.push(`- Folder Depth Limit: Ensure the generated folder structure does NOT exceed ${modifiers.maxFolderDepth} levels of depth. Limit nesting strictly to ${modifiers.maxFolderDepth} levels.`);
    if (modifiers.groupByDomain) rules.push('- Group by Domain: Prioritize grouping bookmarks by their website/domain name first (e.g., "github.com", "youtube.com").');
    if (modifiers.useEmojis) rules.push('- Use Emojis: Prepend a relevant emoji to EVERY generated folder name (e.g., "🚀 Startup", "💻 Programming").');
    if (modifiers.strictTechnical) rules.push('- Strict Technical: Strictly use standard, professional technical terminology for categories. Avoid slang or vague terms.');
    if (modifiers.groupByPurpose) rules.push('- Group by Purpose: Categorize based on user intent (e.g., "Read Later", "Tools", "Documentation", "Tutorials").');
    if (modifiers.shortFolderNames) rules.push('- Short Folder Names: Keep folder names extremely concise (1-2 words maximum). Never use long phrases.');
    if (modifiers.maintainContext) rules.push('- Maintain Context: You are part of a multi-batch process. Strive for consistency with previous decisions.');
    if (modifiers.includeHierarchy) rules.push('- Use Existing Hierarchy: Strictly follow and reuse the provided "Current Folder Structure" where possible to ensure structural continuity.');

    if (rules.length === 0) return '';
    return `\nSTRUCTURAL REQUIREMENTS:\n${rules.join('\n')}\n`;
}
/**
 * Generates the full prompt for AI categorization
 */
export function generateCategorizationPrompt(params: {
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

    const bookmarksList = batch.map(b => `- ${b.title} (${b.url})`).join('\n');
    
    // Recursive helper to get full tree context (with depth limit to save tokens)
    const getFullTreeContext = (folders: any[], depth: number = 0): any[] => {
        if (depth > 4) return []; // Limit depth to 4 levels to keep prompt size manageable
        
        return folders.map(f => ({
            name: f.name,
            children: f.children && f.children.length > 0 ? getFullTreeContext(f.children, depth + 1) : []
        }));
    };
    
    const treeContext = (promptModifiers?.includeHierarchy && currentTree.length > 0)
        ? JSON.stringify(getFullTreeContext(currentTree))
        : "None (Initial run or deep re-architecture)";

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
      "title": "Example",
      "url": "https://example.com",
      "path": ["Folder"],
      "tags": ["tag"],
      "confidence": 95
    }
  ]
}
Do not include any explanation or markdown formatting outside the JSON object.`;
}

/**
 * Generates prompt for extracting tags from a batch of bookmarks
 */
export function generateTagExtractionPrompt(params: {
    batch: Bookmark[];
    tagCount?: number;
    tagLanguage?: string;
}): string {
    const { batch, tagCount = 3, tagLanguage = 'Vietnamese and Technical Terms' } = params;
    const bookmarksList = batch.map(b => `- ${b.title} (${b.url})`).join('\n');

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
   - "url": EXACT original URL (Do not modify!)
   - "tags": Array of ${tagCount} keywords
4. The JSON structure:
{
  "bookmarks": [
    {
      "url": "https://example.com",
      "tags": ["tag1", "tag2"]
    }
  ]
}
Do not include any explanation or markdown formatting outside the JSON object.`;
}

/**
 * Generates prompt for mapping unique tags into a folder taxonomy tree
 */
export function generateTagMappingPrompt(params: {
    userInstructionBlock: string;
    uniqueTags: string[];
    currentTree: Folder[];
    tagLanguage?: string;
    promptModifiers?: PromptModifiers;
}): string {
    const { userInstructionBlock, uniqueTags, currentTree, tagLanguage = 'English', promptModifiers } = params;

    // Recursive helper to get full tree context (with depth limit)
    const getFullTreeContext = (folders: any[], depth: number = 0): any[] => {
        if (depth > 4) return []; 
        return folders.map(f => ({
            name: f.name,
            children: f.children && f.children.length > 0 ? getFullTreeContext(f.children, depth + 1) : []
        }));
    };
    
    const treeContext = JSON.stringify(getFullTreeContext(currentTree));
    
    // Safety: Limit the number of tags sent to AI to avoid context window overflow
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
      "name": "Frontend",
      "mappedTags": ["ui"],
      "children": [
        {
          "name": "React",
          "mappedTags": ["react", "hooks", "jsx"],
          "children": []
        }
      ]
    }
  ]
}
Do not include any explanation or markdown formatting outside the JSON object.`;
}

/**
 * Generates prompt for the initial analysis of tags to determine the number of batches required.
 */
export function generateTagAnalysisPrompt(params: {
    userInstructionBlock: string;
    uniqueTags: string[];
    currentTree: Folder[];
    tagLanguage?: string;
    promptModifiers?: PromptModifiers;
}): string {
    const { userInstructionBlock, uniqueTags, currentTree, tagLanguage = 'English', promptModifiers } = params;

    const getFullTreeContext = (folders: any[], depth: number = 0): any[] => {
        if (depth > 4) return []; 
        return folders.map(f => ({
            name: f.name,
            children: f.children && f.children.length > 0 ? getFullTreeContext(f.children, depth + 1) : []
        }));
    };
    
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
}

/**
 * Generates prompt to request a specific batch of the schema in the stateful chat session.
 */
export function generateTagBatchRequestPrompt(batchIndex: number, totalBatches: number, tagLanguage: string = 'English', promptModifiers?: PromptModifiers): string {
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

    const prompt = generateCategorizationPrompt({
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
