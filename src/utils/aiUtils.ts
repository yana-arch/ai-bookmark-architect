import type { Bookmark } from '../../types';

// Sub-helper: Basic JSON repair
export function repairJson(json: string): string {
    return json
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .replace(/}(\s*){/g, '},{')    // Fix missing commas between objects
        .replace(/\](\s*)\[/g, '],[')  // Fix missing commas between arrays
        .trim();
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
        id: bm.id || (typeof crypto !== 'undefined' ? crypto.randomUUID() : `temp-${Date.now()}-${Math.random()}`),
        title: bm.title,
        url: bm.url,
        parentId: bm.parentId || null,
        path: bm.path || [],
        tags: bm.tags || []
    }));
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

// Helper function to parse and validate AI response content (Optimized)
export function parseAIResponse(content: string): Bookmark[] {
    let cleanedContent = content.trim();

    if (!cleanedContent) return [];

    if (cleanedContent.includes('```')) {
        cleanedContent = cleanedContent.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1').trim();
    }

    try {
        const parsed = JSON.parse(cleanedContent);
        const bookmarks = Array.isArray(parsed) ? parsed : (parsed.bookmarks || []);
        if (Array.isArray(bookmarks)) return validateBookmarks(bookmarks);
    } catch (e) {
        // Fallback to more aggressive extraction
    }

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

    return extractBookmarksByRegex(cleanedContent);
}
