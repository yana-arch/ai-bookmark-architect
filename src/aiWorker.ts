// AI Worker for multi-threaded bookmark processing
// This worker handles AI API calls for a single batch of bookmarks
import { GoogleGenAI, Type } from "@google/genai";

interface WorkerMessage {
  type: 'process_batch' | 'cancel';
  data?: {
    batch: any[];
    apiConfigs: any[];
    systemPrompt: string;
    userInstructionBlock: string;
    currentTree: any;
    batchIndex: number;
    maxRetries: number;
    userHistory?: any[]; // New: for context enrichment
    domainKnowledge?: string; // New: for context enrichment
  };
}

interface WorkerResponse {
  type: 'batch_result' | 'batch_error' | 'log' | 'progress';
  data?: any;
  error?: string;
  batchIndex?: number;
}

// Helper function to parse and validate AI response content (Optimized)
function parseAIResponse(content: string): any[] {
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
function validateBookmarks(bookmarks: any[]): any[] {
  return bookmarks.filter(bm => 
    bm && 
    typeof bm.title === 'string' && 
    typeof bm.url === 'string' && 
    Array.isArray(bm.path) && 
    Array.isArray(bm.tags)
  );
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
function extractBookmarksByRegex(content: string): any[] {
  const bookmarks: any[] = [];
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
          title: bm.title,
          url: bm.url,
          path: Array.isArray(bm.path) ? bm.path : [],
          tags: Array.isArray(bm.tags) ? bm.tags : []
        });
      }
    } catch (e) {
      // Skip invalid matches
    }
  }
  return bookmarks;
}

// Helper function to make API calls
async function callAIProvider(
  provider: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userContent: string,
  batch: any[],
  userInstructionBlock: string,
  currentTree: any,
  batchIndex: number,
  userHistory?: any[],
  domainKnowledge?: string,
  apiUrl?: string
): Promise<{ categorizedBatch: any[]; usage?: any }> {
  if (provider === 'openrouter' || provider === 'custom') {
    const endpoint = provider === 'custom' && apiUrl ? apiUrl : 'https://openrouter.ai/api/v1/chat/completions';
    let finalSystemPrompt = systemPrompt;
    
    // Robust Base Instruction if systemPrompt is empty or too simple
    if (!finalSystemPrompt || finalSystemPrompt.length < 50) {
        finalSystemPrompt = `You are the AI Bookmark Architect, an expert knowledge organizer.
Your goal is to organize a chaotic list of browser bookmarks into a clean, logical folder hierarchy.

CORE RESPONSIBILITIES:
1. Analyze the 'title' and 'url' of each bookmark to understand its content.
2. Assign a 'path' (Folder structure) that best categorizes the content.
   - Use nested folders for better organization (e.g., ['Development', 'Frontend', 'React']).
   - Avoid creating too many top-level folders. Group related items.
   - Use Vietnamese for folder names unless the user specifies otherwise.
3. Assign relevant 'tags' (3-5 tags) to help search and filtering.
4. If a bookmark is broken or ambiguous, categorize it under ['Uncategorized'] or ['Review'].

STRICT FORMATTING RULES:
- Output valid JSON only.
- The 'path' must be an array of strings.
- The 'tags' must be an array of strings.`;
    }

    if (domainKnowledge) {
      finalSystemPrompt += `\n\nCONTEXT ENRICHMENT:\nDomain Knowledge: ${domainKnowledge}`; 
    }
    if (userHistory && userHistory.length > 0) {
      finalSystemPrompt += `\n\nUSER PREFERENCES (Based on corrections):\n${JSON.stringify(userHistory, null, 2)}`;
    }
    finalSystemPrompt += "\n\nOutput a JSON object with a single key 'bookmarks' which is an array where each object represents a bookmark with its original 'title', 'url', its final 'path' as an array of Vietnamese folder names (e.g., ['Phát triển Web', 'React']), and 'tags' as an array of Vietnamese strings (e.g., ['hướng dẫn', 'frontend', 'javascript']).";
    const userPrompt = `${userContent}\n\nBOOKMARKS TO CATEGORIZE:\n${JSON.stringify(batch.map(b => ({ title: b.title, url: b.url })), null, 2)}`;
    const requestPayload = {
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: finalSystemPrompt },
        { role: "user", content: userPrompt }
      ]
    };

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    if (provider === 'openrouter') {
      headers['HTTP-Referer'] = `${self.location.protocol}//${self.location.host}`;
      headers['X-Title'] = 'AI Bookmark Architect';
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(`OpenRouter API Error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
      } catch (e) {
        throw new Error(`OpenRouter API Error: ${response.status} ${response.statusText} - ${errorText}`);
      }
    }

    const responseData = await response.json();
    const usage = responseData.usage;
    const rawContent = responseData.choices[0].message.content;
    const categorizedBatch = parseAIResponse(rawContent);

    return { categorizedBatch, usage };

  } else { // Gemini
    let geminiSystemPrompt = systemPrompt + userInstructionBlock;

    // Robust Base Instruction if systemPrompt is empty or too simple
    if (!systemPrompt || systemPrompt.length < 50) {
        const baseInstruction = `You are the AI Bookmark Architect, an expert knowledge organizer.
Your goal is to organize a chaotic list of browser bookmarks into a clean, logical folder hierarchy.

CORE RESPONSIBILITIES:
1. Analyze the 'title' and 'url' of each bookmark to understand its content.
2. Assign a 'path' (Folder structure) that best categorizes the content.
   - Use nested folders for better organization (e.g., ['Development', 'Frontend', 'React']).
   - Avoid creating too many top-level folders. Group related items.
   - Use Vietnamese for folder names unless the user specifies otherwise.
3. Assign relevant 'tags' (3-5 tags) to help search and filtering.
4. If a bookmark is broken or ambiguous, categorize it under ['Uncategorized'] or ['Review'].

STRICT FORMATTING RULES:
- Output valid JSON only.
- The 'path' must be an array of strings.
- The 'tags' must be an array of strings.`;
        geminiSystemPrompt = baseInstruction + "\n\n" + userInstructionBlock;
    }

    if (domainKnowledge) {
      geminiSystemPrompt += `\n\nCONTEXT ENRICHMENT:\nDomain Knowledge: ${domainKnowledge}`; 
    }
    if (userHistory && userHistory.length > 0) {
      geminiSystemPrompt += `\n\nUSER PREFERENCES (Based on corrections):\n${JSON.stringify(userHistory, null, 2)}`;
    }

    const ai = new GoogleGenAI({ apiKey });
    const genAiResponse = await ai.models.generateContent({
        model: model,
        contents: userContent + `\n\nBOOKMARKS TO CATEGORIZE:\n${JSON.stringify(batch.map(b => ({ title: b.title, url: b.url })), null, 2)}`,
        config: {
            systemInstruction: geminiSystemPrompt,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        url: { type: Type.STRING },
                        path: { type: Type.ARRAY, items: { type: Type.STRING } },
                        tags: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ['title', 'url', 'path', 'tags']
                }
            }
        }
    });

    const usage = genAiResponse.usageMetadata;
    const tokenInfo = usage ? {
        promptTokens: usage.promptTokenCount,
        completionTokens: usage.candidatesTokenCount,
        totalTokens: usage.totalTokenCount
    } : undefined;

    // Use text() method if available, otherwise fallback (though generateContent awaits the full response)
    const rawText = typeof (genAiResponse as any).text === 'function' ? (genAiResponse as any).text() : (genAiResponse as any).text || JSON.stringify((genAiResponse as any).response);
    const categorizedBatch = parseAIResponse(rawText);

    return { categorizedBatch, usage: tokenInfo };
  }
}

// Worker message handler
self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type, data } = e.data;

  if (type === 'cancel') {
    // Handle cancellation
    self.postMessage({ type: 'log', data: 'Worker cancelled' });
    return;
  }

  if (type === 'process_batch' && data) {
    const { batch, apiConfigs, systemPrompt, userInstructionBlock, currentTree, batchIndex, maxRetries, userHistory, domainKnowledge } = data;

    try {
      self.postMessage({ type: 'log', data: `Worker starting batch ${batchIndex}`, batchIndex });

      let availableKeys = apiConfigs.filter((c: any) => c.status === 'active');
      if (availableKeys.length === 0) {
        throw new Error("No active API keys available");
      }

      let categorizedBatch: any[] = [];
      let keyIndex = 0;
      let batchSuccess = false;

      const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      while (!batchSuccess && keyIndex < availableKeys.length) {
        const currentKeyConfig = availableKeys[keyIndex];
        let retries = 0;
        let retryDelay = 1000; // Start with 1 second

        while (retries <= maxRetries) {
          try {
            self.postMessage({
              type: 'log',
              data: `Using key: ${currentKeyConfig.name} (${currentKeyConfig.provider})`,
              batchIndex
            });

            // For Gemini, we pass the raw content parts, for OpenRouter we construct the prompt differently
            // but callAIProvider abstracts this.
            // Note: userContent passed to callAIProvider for Gemini was pre-composed in the old code,
            // but here we are recomposing it inside callAIProvider to match the specific provider's needs better possibly?
            // Wait, looking at old code:
            // OpenRouter userContent: `EXISTING STRUCTURE:\n...` (from data.currentTree mostly)
            // Gemini userContent: same.
            
            // Let's keep it consistent.
            const userContent = `EXISTING STRUCTURE:\n${JSON.stringify(currentTree, null, 2)}`;

            // Log request details
            self.postMessage({
              type: 'detailed_log',
              data: {
                type: 'request',
                title: `Request đến ${currentKeyConfig.provider} (${currentKeyConfig.model})`,
                content: {
                  systemPrompt: systemPrompt + userInstructionBlock,
                  userContent,
                  batchSize: batch.length
                }
              },
              batchIndex
            });

            const result = await callAIProvider(
              currentKeyConfig.provider,
              currentKeyConfig.apiKey,
              currentKeyConfig.model,
              systemPrompt,
              userContent,
              batch,
              userInstructionBlock,
              currentTree,
              batchIndex,
              userHistory,
              domainKnowledge,
              currentKeyConfig.apiUrl
            );

            // Log response details
            self.postMessage({
              type: 'detailed_log',
              data: {
                type: 'response',
                title: `Response từ ${currentKeyConfig.provider} (${currentKeyConfig.model})`,
                content: result.categorizedBatch,
                usage: result.usage
              },
              batchIndex
            });

            categorizedBatch = result.categorizedBatch;

            self.postMessage({
              type: 'batch_result',
              data: { categorizedBatch, usage: result.usage, keyUsed: currentKeyConfig.name },
              batchIndex
            });

            batchSuccess = true;
            break;

          } catch (error: any) {
            const errorMessage = error.toString();
            self.postMessage({
              type: 'log',
              data: `Error with key "${currentKeyConfig.name}": ${errorMessage.substring(0, 100)}`,
              batchIndex
            });

            const isFatalError = (
                errorMessage.includes('401') || // Unauthorized - likely bad API key
                errorMessage.includes('403') || // Forbidden - likely permission issue
                errorMessage.includes('API key') // Generic API key error
            );

            if (isFatalError) {
              self.postMessage({
                type: 'log',
                data: `Key "${currentKeyConfig.name}" has a fatal configuration error, switching keys`,
                batchIndex
              });
              break; // Stop retrying with this key, switch to next
            }

            const isRateLimitError = (
                errorMessage.includes('429') || // Too Many Requests
                errorMessage.toLowerCase().includes('quota') || // Exceeded quota
                errorMessage.includes('rate limit') // Generic rate limit message
            );

            if (isRateLimitError && retries < maxRetries) {
                self.postMessage({
                    type: 'log',
                    data: `Rate limit hit for key "${currentKeyConfig.name}". Retrying in ${retryDelay / 1000}s...`,
                    batchIndex
                });
                await sleep(retryDelay);
                retryDelay *= 2; // Exponential backoff
            } else if (retries < maxRetries) {
                self.postMessage({
                    type: 'log',
                    data: `Transient error with key "${currentKeyConfig.name}". Retrying in ${retryDelay / 1000}s...`,
                    batchIndex
                });
                await sleep(retryDelay);
                retryDelay *= 2; // Exponential backoff
            } else {
              self.postMessage({
                type: 'log',
                data: `Max retries reached for key "${currentKeyConfig.name}", switching keys`,
                batchIndex
              });
              break;
            }

            retries++;
          }
        }

        if (batchSuccess) {
          keyIndex = 0; // Reset on success
        } else {
          keyIndex++;
        }
      }

      if (!batchSuccess) {
        throw new Error(`Batch ${batchIndex} failed after trying all keys`);
      }

    } catch (error: any) {
      self.postMessage({
        type: 'batch_error',
        error: error.toString(),
        batchIndex
      });
    }
  }
};

// Export for TypeScript (though workers don't actually export)
export {};
