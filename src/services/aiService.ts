import type { Bookmark, Folder, UserCorrection } from '../../types';
export { 
    parseAIResponse, 
    validateBookmarks, 
    repairJson, 
    extractBookmarksByRegex 
} from '../utils/aiUtils';


/**
 * Generates the full prompt for AI categorization
 */
export function generateCategorizationPrompt(params: {
    systemPrompt: string;
    userInstructionBlock: string;
    currentTree: Folder[];
    batch: Bookmark[];
    userHistory?: UserCorrection[];
    domainKnowledge?: string;
}): string {
    const {
        systemPrompt,
        userInstructionBlock,
        currentTree,
        batch,
        userHistory,
        domainKnowledge
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
    
    const treeContext = JSON.stringify(getFullTreeContext(currentTree));

    let historyContext = '';
    if (userHistory && userHistory.length > 0) {
        const recentCorrections = userHistory.slice(-5).map(c => 
            `Correction: "${c.originalBookmarkUrl}" was moved to path [${c.correctedPath.join(' > ')}]`
        ).join('\n');
        historyContext = `\nRecent User Corrections (Learn from these):\n${recentCorrections}`;
    }

    return `${systemPrompt}

${userInstructionBlock}

${domainKnowledge ? `Domain Knowledge:\n${domainKnowledge}\n` : ''}

${historyContext}

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
   - "tags": Array of keywords
4. The JSON structure:
{
  "bookmarks": [
    {
      "title": "Example",
      "url": "https://example.com",
      "path": ["Folder"],
      "tags": ["tag"]
    }
  ]
}
Do not include any explanation or markdown formatting outside the JSON object.`;
}
