// AI Worker for multi-threaded bookmark processing
// This worker handles AI API calls for a single batch of bookmarks
import { GoogleGenAI } from '@google/genai';
import type { Bookmark, ApiConfig, UserCorrection, Folder } from '../types';

// Type definitions for the worker
interface WorkerMessage {
  type: 'process_batch' | 'cancel';
  data?: {
    batch: Bookmark[];
    apiConfigs: ApiConfig[];
    systemPrompt: string;
    userInstructionBlock: string;
    currentTree: Folder[]; // Assuming currentTree is a list of root folders
    batchIndex: number;
    maxRetries: number;
    userHistory?: UserCorrection[]; // New: for context enrichment
    domainKnowledge?: string; // New: for context enrichment
  };
}

interface WorkerResponse {
  type: 'batch_result' | 'batch_error' | 'log' | 'progress';
  data?: Bookmark[];
  error?: string;
  batchIndex?: number;
  log?: any; // Keep log as any or define a specific Log type if needed, but for worker messaging it's flexible
  progress?: number;
}

// Helper function to parse and validate AI response content (Optimized)
function parseAIResponse(content: string): Bookmark[] {
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
function validateBookmarks(bookmarks: any[]): Bookmark[] {
    return bookmarks.filter(bm => 
        bm && 
    typeof bm.title === 'string' && 
    typeof bm.url === 'string' && 
    (Array.isArray(bm.path) || bm.path === undefined) && 
    (Array.isArray(bm.tags) || bm.tags === undefined)
    ).map(bm => ({
        // Map to ensure it strictly follows Bookmark interface
        id: bm.id || crypto.randomUUID(), // Ensure ID exists if AI didn't return it (though usually we preserve IDs)
        title: bm.title,
        url: bm.url,
        parentId: bm.parentId || null,
        path: bm.path || [],
        tags: bm.tags || []
    }));
}

// Sub-helper: Basic JSON repair
function repairJson(json: string): string {
    return json
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .replace(/}(\s*){/g, '},{')    // Fix missing commas between objects
        .replace(/\](\s*)\[/g, '],[')  // Fix missing commas between arrays
        .trim();
}

// Sub-helper: Regex-based extraction
function extractBookmarksByRegex(content: string): Bookmark[] {
    const bookmarks: Bookmark[] = [];
    // Look for patterns that look like bookmark objects
    // This is more flexible than the previous rigid regex
    const regex = /{[^{}]*"title"\s*:\s*"[^"]*"[^{}]*"url"\s*:\s*"[^"]*"[^{}]*}/g;
  
    let match;
    while ((match = regex.exec(content)) !== null) {
        try {
            // Try to parse the match, maybe with a little repair
            const bm = JSON.parse(repairJson(match[0]));
            if (bm.title && bm.url) {
                bookmarks.push({
                    id: bm.id || crypto.randomUUID(),
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

// Main worker logic
self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
    const { type, data } = e.data;

    if (type === 'cancel') {
    // In a web worker, we can't really "cancel" a promise easily without AbortController
    // but we can ignore the result.
    // The main thread will terminate the worker if needed.
        return;
    }

    if (type === 'process_batch' && data) {
        const { 
            batch, 
            apiConfigs, 
            systemPrompt, 
            userInstructionBlock, 
            currentTree, 
            batchIndex, 
            maxRetries,
            userHistory,
            domainKnowledge
        } = data;

        // Use the first active API config
        const availableConfigs = apiConfigs.filter(c => c.status === 'active');

        if (availableConfigs.length === 0) {
            self.postMessage({
                type: 'batch_error',
                error: 'No active API key found.',
                batchIndex
            } as WorkerResponse);
            return;
        }
        
        const activeConfig = availableConfigs[0];

        let attempts = 0;
        let success = false;

        while (attempts <= maxRetries && !success) {
            try {
                attempts++;
        
                // Log attempt
                self.postMessage({
                    type: 'log',
                    log: { message: `Batch ${batchIndex}: Attempt ${attempts}/${maxRetries + 1}` },
                    batchIndex
                } as WorkerResponse);

                // Prepare Prompt
                const bookmarksList = batch.map(b => `- ${b.title} (${b.url})`).join('\n');
        
                // Convert current tree to string representation for context
                const treeContext = JSON.stringify(currentTree.map(n => ({ name: n.name, id: n.id }))); // Simplified tree

                // Add user history context if available
                let historyContext = '';
                if (userHistory && userHistory.length > 0) {
                    // Take last 5 relevant corrections
                    const recentCorrections = userHistory.slice(-5).map(c => 
                        `Correction: "${c.originalBookmarkUrl}" was moved to path [${c.correctedPath.join(' > ')}]`
                    ).join('\n');
                    historyContext = `\nRecent User Corrections (Learn from these):\n${recentCorrections}`;
                }

                const fullPrompt = `${systemPrompt}

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

                let responseText: string | undefined;

                if (activeConfig.provider === 'gemini') {
                    // Initialize Gemini (Updated for @google/genai SDK)
                    const genAI = new GoogleGenAI({ apiKey: activeConfig.apiKey });
            
                    // Call API
                    const result = await genAI.models.generateContent({
                        model: activeConfig.model || 'gemini-1.5-flash',
                        contents: [
                            {
                                parts: [
                                    {
                                        text: fullPrompt
                                    }
                                ]
                            }
                        ],
                        config: {
                            responseMimeType: 'application/json'
                        }
                    });

                    responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
                } else {
                    // OpenRouter or Custom
                    const endpoint = activeConfig.provider === 'custom' && activeConfig.apiUrl 
                        ? activeConfig.apiUrl 
                        : 'https://openrouter.ai/api/v1/chat/completions';

                    const result = await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${activeConfig.apiKey}`,
                            'Content-Type': 'application/json',
                            'HTTP-Referer': self.location.origin || 'http://localhost', // Optional. Site URL for rankings on openrouter.ai.
                            'X-OpenRouter-Title': 'AI Bookmark Architect', // Optional. Site title for rankings on openrouter.ai.
                        },
                        body: JSON.stringify({
                            model: activeConfig.model,
                            messages: [
                                { role: 'user', content: fullPrompt }
                            ],
                            response_format: { type: 'json_object' }
                        })
                    });

                    if (!result.ok) {
                        const errText = await result.text();
                        throw new Error(`API call failed: ${result.status} - ${errText}`);
                    }
                    const data = await result.json();
                    responseText = data.choices[0].message.content;
                }

                if (!responseText) {
                    throw new Error('AI returned empty response');
                }

                // Parse Result
                const categorizedBookmarks = parseAIResponse(responseText);

                if (categorizedBookmarks.length === 0) {
                    console.error("AI Response content was:", responseText);
                    let errMsg = responseText || 'empty response';
                    if (errMsg.length > 150) {
                        errMsg = errMsg.substring(0, 150) + '...';
                    }
                    throw new Error(`AI returned invalid format or API error: ${errMsg}`);
                }

                // Merge back strict IDs from original batch to ensure data integrity
                // The AI might mess up IDs or not return them, so we map back by URL or Index
                // Strategy: Assume order is preserved or try to match by URL
                // Simple strategy: Map by URL
                const finalBookmarks = categorizedBookmarks.map(cbm => {
                    const original = batch.find(b => b.url === cbm.url);
                    return {
                        ...cbm,
                        id: original ? original.id : cbm.id, // Restore original ID
                        parentId: null // Reset parentId as it will be determined by path later
                    };
                });

                success = true;
                self.postMessage({
                    type: 'batch_result',
                    data: finalBookmarks,
                    batchIndex
                } as WorkerResponse);

            } catch (error: any) {
                console.error(`Batch ${batchIndex} attempt ${attempts} failed:`, error);
        
                if (attempts > maxRetries) {
                    self.postMessage({
                        type: 'batch_error',
                        error: error.message || 'Unknown error during AI processing',
                        batchIndex
                    } as WorkerResponse);
                } else {
                    // Wait a bit before retry (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts)));
                }
            }
        }
    }
};
