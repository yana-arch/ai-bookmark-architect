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
    const treeContext = JSON.stringify(currentTree.map(n => ({ name: n.name, id: n.id })));

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

Bookmarks to Process:
${bookmarksList}

CRITICAL INSTRUCTION: Respond ONLY with a valid JSON object containing a "bookmarks" array.
The structure must be exactly:
{
  "bookmarks": [
    {
      "title": "Bookmark Title",
      "url": "https://example.com",
      "path": ["TopFolder", "SubFolder"],
      "tags": ["tag1", "tag2"]
    }
  ]
}
Do not include any explanation or markdown formatting outside the JSON object.`;
}
