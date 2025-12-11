// AI Worker for multi-threaded bookmark processing
// This worker handles AI API calls for a single batch of bookmarks

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

// Import necessary libraries for the worker
// Note: Workers have limited access, so we need to be careful with imports

// Helper function to parse and validate AI response content
function parseAIResponse(content: string): any[] {
  try {
    // First attempt: direct JSON parsing
    const parsed = JSON.parse(content);
    if (parsed && parsed.bookmarks && Array.isArray(parsed.bookmarks)) {
      return parsed.bookmarks;
    }
    throw new Error('Invalid response structure');
  } catch (error) {
    // Second attempt: try to extract and repair JSON
    try {
      // Remove any leading/trailing whitespace and potential markdown formatting
      let cleanedContent = content.trim();

      // Remove markdown code blocks if present
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      // Try to find JSON object boundaries
      const jsonStart = cleanedContent.indexOf('{');
      const jsonEnd = cleanedContent.lastIndexOf('}');

      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanedContent = cleanedContent.substring(jsonStart, jsonEnd + 1);
      }

      // Attempt basic JSON repair for common issues
      let repairedContent = cleanedContent
        // Fix trailing commas before closing brackets
        .replace(/,(\s*[}\]])/g, '$1')
        // Fix missing commas between array elements
        .replace(/}(\s*){/g, '},{')
        // Fix unescaped quotes in strings (basic)
        .replace(/([^\\])"([^"]*)"([^,}\]]*[^\\])"([^"]*)"([^,}\]]*)/g, '$1"$2\\"$3\\"$4"$5');

      const parsed = JSON.parse(repairedContent);
      if (parsed && parsed.bookmarks && Array.isArray(parsed.bookmarks)) {
        // Validate each bookmark has required fields
        const validBookmarks = parsed.bookmarks.filter((bookmark: any) => {
          return bookmark &&
                 typeof bookmark.title === 'string' &&
                 typeof bookmark.url === 'string' &&
                 Array.isArray(bookmark.path) &&
                 Array.isArray(bookmark.tags);
        });

        if (validBookmarks.length > 0) {
          return validBookmarks;
        }
      }

      throw new Error('No valid bookmarks found after repair');
    } catch (repairError) {
      // Final fallback: try to extract individual bookmark objects using the cleaned content
      try {
        const bookmarks: any[] = [];
        // Use the cleaned content from the outer scope
        let searchContent = content.trim();

        // Remove markdown if present
        if (searchContent.startsWith('```json')) {
          searchContent = searchContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (searchContent.startsWith('```')) {
          searchContent = searchContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const bookmarkRegex = /{\s*"id"\s*:\s*"[^"]*"\s*,\s*"title"\s*:\s*"[^"]*"\s*,\s*"url"\s*:\s*"[^"]*"\s*,\s*"parentId"\s*:\s*"(?:[^"]*)"\s*,\s*"path"\s*:\s*\[[^\]]*\]\s*,\s*"tags"\s*:\s*\[[^\]]*\]\s*}/g;

        let match;
        while ((match = bookmarkRegex.exec(searchContent)) !== null) {
          try {
            const bookmark = JSON.parse(match[0]);
            if (bookmark.title && bookmark.url && Array.isArray(bookmark.path) && Array.isArray(bookmark.tags)) {
              bookmarks.push(bookmark);
            }
          } catch (e) {
            // Skip malformed individual bookmarks
          }
        }

        if (bookmarks.length > 0) {
          return bookmarks;
        }

        throw new Error('Could not extract any valid bookmarks');
      } catch (finalError) {
        throw new Error(`Failed to parse AI response: ${finalError.message}. Raw content: ${content.substring(0, 200)}...`);
      }
    }
  }
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
  domainKnowledge?: string
): Promise<{ categorizedBatch: any[]; usage?: any }> {
  if (provider === 'openrouter') {
    let finalSystemPrompt = systemPrompt;
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

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': `${self.location.protocol}//${self.location.host}`,
        'X-Title': 'AI Bookmark Architect'
      },
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
    // For Gemini, since workers can't import the library directly,
    // we'll post a message back to main thread to handle the call
    let geminiSystemPrompt = systemPrompt + userInstructionBlock;
    if (domainKnowledge) {
      geminiSystemPrompt += `\n\nCONTEXT ENRICHMENT:\nDomain Knowledge: ${domainKnowledge}`; 
    }
    if (userHistory && userHistory.length > 0) {
      geminiSystemPrompt += `\n\nUSER PREFERENCES (Based on corrections):\n${JSON.stringify(userHistory, null, 2)}`;
    }

    self.postMessage({
      type: 'gemini_request',
      data: {
        apiKey,
        model,
        systemPrompt: geminiSystemPrompt,
        userContent: `EXISTING STRUCTURE:\n${JSON.stringify(currentTree, null, 2)}\n\nBOOKMARKS TO CATEGORIZE:\n${JSON.stringify(batch.map(b => ({ title: b.title, url: b.url })), null, 2)}`,
        batchIndex
      }
    });

    // Wait for response from main thread
    return new Promise((resolve, reject) => {
      const handleGeminiResponse = (e: MessageEvent) => {
        if (e.data.type === 'gemini_response' && e.data.batchIndex === batchIndex) {
          self.removeEventListener('message', handleGeminiResponse);
          if (e.data.error) {
            reject(new Error(e.data.error));
          } else {
            resolve({ categorizedBatch: e.data.categorizedBatch, usage: e.data.usage });
          }
        }
      };
      self.addEventListener('message', handleGeminiResponse);

      // Timeout after 30 seconds
      setTimeout(() => {
        self.removeEventListener('message', handleGeminiResponse);
        reject(new Error('Gemini request timeout'));
      }, 30000);
    });
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

            const userContent = `EXISTING STRUCTURE:\n${JSON.stringify(currentTree, null, 2)}\n\nBOOKMARKS TO CATEGORIZE:\n${JSON.stringify(batch.map(b => ({ title: b.title, url: b.url })), null, 2)}`;

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
              domainKnowledge
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
