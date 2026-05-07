import type { Bookmark, Folder, UserCorrection } from '../../types';

// Helper function to parse and validate AI response content (Optimized)
export function parseAIResponse(content: string): Bookmark[] {
    let cleanedContent = content.trim();

    // 1. Quick check for empty content
    if (!cleanedContent) return [];

    // 2. Remove markdown code blocks if present
    if (cleanedContent.includes('```')) {
        cleanedContent = cleanedContent.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1').trim();
    }

    // 3. Try direct parsing first (fastest)
    try {
        const parsed = JSON.parse(cleanedContent);
        const bookmarks = Array.isArray(parsed) ? parsed : (parsed.bookmarks || []);
        if (Array.isArray(bookmarks)) return validateBookmarks(bookmarks);
    } catch (e) {
        // If direct parse fails, proceed to more aggressive extraction
    }

    // 4. Extract JSON object using boundaries
    const jsonStart = cleanedContent.indexOf('{');
    const jsonEnd = cleanedContent.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        const jsonCandidate = cleanedContent.substring(jsonStart, jsonEnd + 1);
        try {
            const parsed = JSON.parse(repairJson(jsonCandidate));
            const bookmarks = Array.isArray(parsed) ? parsed : (parsed.bookmarks || []);
            if (Array.isArray(bookmarks)) return validateBookmarks(bookmarks);
        } catch (e) {
            // Failed to parse extracted object
        }
    }

    // 5. Last resort: regex-based individual bookmark extraction
    return extractBookmarksByRegex(cleanedContent);
}

// Sub-helper: Validate bookmark objects
export function validateBookmarks(bookmarks: any[]): Bookmark[] {
    return bookmarks.filter(bm => 
        bm && 
        typeof bm.title === 'string' && 
        typeof bm.url === 'string' && 
        (Array.isArray(bm.path) || bm.path === undefined) && 
        (Array.isArray(bm.tags) || bm.tags === undefined)
    ).map(bm => ({
        // Map to ensure it strictly follows Bookmark interface
        id: bm.id || (typeof crypto !== 'undefined' ? crypto.randomUUID() : `temp-${Date.now()}-${Math.random()}`),
        title: bm.title,
        url: bm.url,
        parentId: bm.parentId || null,
        path: bm.path || [],
        tags: bm.tags || []
    }));
}

// Sub-helper: Basic JSON repair
export function repairJson(json: string): string {
    return json
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .replace(/}(\s*){/g, '},{')    // Fix missing commas between objects
        .replace(/\](\s*)\[/g, '],[')  // Fix missing commas between arrays
        .trim();
}

// Sub-helper: Regex-based extraction
export function extractBookmarksByRegex(content: string): Bookmark[] {
    const bookmarks: Bookmark[] = [];
    const regex = /{[^{}]*"title"\s*:\s*"[^"]*"[^{}]*"url"\s*:\s*"[^"]*"[^{}]*}/g;
  
    let match;
    while ((match = regex.exec(content)) !== null) {
        try {
            const bm = JSON.parse(repairJson(match[0]));
            if (bm.title && bm.url) {
                bookmarks.push({
                    id: bm.id || (typeof crypto !== 'undefined' ? crypto.randomUUID() : `temp-${Date.now()}`),
                    title: bm.title,
                    url: bm.url,
                    parentId: bm.parentId || null,
                    path: bm.path || [],
                    tags: bm.tags || []
                });
            }
        } catch (e) {
            // Skip malformed matches
        }
    }
    return bookmarks;
}

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
