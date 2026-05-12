import type { Bookmark } from '@/types';

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

/**
 * Helper to extract JSON content from text (Robust).
 * Handles markdown blocks and finds the first occurrence of { or [.
 */
export function extractJsonBlock(content: string): string {
    let cleaned = content.trim();
    if (cleaned.includes('```')) {
        cleaned = cleaned.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1').trim();
    }
    
    try {
        JSON.parse(repairJson(cleaned));
        return cleaned;
    } catch (e) {
        const startBrace = cleaned.indexOf('{');
        const startBracket = cleaned.indexOf('[');
        const jsonStart = (startBrace !== -1 && (startBracket === -1 || startBrace < startBracket)) ? startBrace : startBracket;
        
        const endBrace = cleaned.lastIndexOf('}');
        const endBracket = cleaned.lastIndexOf(']');
        const jsonEnd = (endBrace !== -1 && (endBracket === -1 || endBrace > endBracket)) ? endBrace : endBracket;

        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            return cleaned.substring(jsonStart, jsonEnd + 1);
        }
    }
    return cleaned;
}

/**
 * Generic helper to parse JSON responses with repair logic.
 */
export function parseJsonResponse<T>(content: string, fallback: T): T {
    const cleaned = extractJsonBlock(content);
    try {
        return JSON.parse(repairJson(cleaned)) as T;
    } catch (e) {
        return fallback;
    }
}

// Helper function to parse and validate AI response content (Optimized)
export function parseAIResponse(content: string): Bookmark[] {
    const cleanedContent = extractJsonBlock(content);

    try {
        const parsed = JSON.parse(repairJson(cleanedContent));
        const bookmarks = Array.isArray(parsed) ? parsed : (parsed.bookmarks || []);
        if (Array.isArray(bookmarks)) return validateBookmarks(bookmarks);
    } catch (e) {
        // Fallback to more aggressive extraction if structured JSON fails
    }

    return extractBookmarksByRegex(content);
}

// Parse response for Tag Extraction
export function parseTagExtractionResponse(content: string): { id?: string, url: string, tags: string[] }[] {
    const parsed = parseJsonResponse<any>(content, {});
    const bookmarks = Array.isArray(parsed) ? parsed : (parsed.bookmarks || []);
    
    if (Array.isArray(bookmarks)) {
        return bookmarks.map(bm => ({
            id: bm.id,
            url: bm.url || '',
            tags: Array.isArray(bm.tags) ? bm.tags : []
        })).filter(bm => bm.url || bm.id);
    }
    return [];
}

// Parse response for Tag Mapping Schema
export interface TagFolderSchema {
    name: string;
    mappedTags: string[];
    children: TagFolderSchema[];
}

export function parseTagMappingResponse(content: string): TagFolderSchema[] {
    const parsed = parseJsonResponse<any>(content, {});
    const schema = Array.isArray(parsed) ? parsed : (parsed.tagSchema || []);
    
    if (Array.isArray(schema)) {
        const validateSchema = (nodes: any[]): TagFolderSchema[] => {
            return nodes.map(node => ({
                name: node.name || 'Untitled',
                mappedTags: Array.isArray(node.mappedTags) ? node.mappedTags : [],
                children: Array.isArray(node.children) ? validateSchema(node.children) : []
            }));
        };
        return validateSchema(schema);
    }
    return [];
}
