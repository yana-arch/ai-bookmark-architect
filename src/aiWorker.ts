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
  batchIndex: number
): Promise<{ categorizedBatch: any[]; usage?: any }> {
  if (provider === 'openrouter') {
    const finalSystemPrompt = systemPrompt + "\n\nOutput a JSON object with a single key 'bookmarks' which is an array where each object represents a bookmark with its original 'title', 'url', its final 'path' as an array of Vietnamese folder names (e.g., ['Phát triển Web', 'React']), and 'tags' as an array of Vietnamese strings (e.g., ['hướng dẫn', 'frontend', 'javascript']).";
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
    const categorizedBatch = JSON.parse(responseData.choices[0].message.content).bookmarks;

    return { categorizedBatch, usage };

  } else { // Gemini
    // For Gemini, since workers can't import the library directly,
    // we'll post a message back to main thread to handle the call
    self.postMessage({
      type: 'gemini_request',
      data: {
        apiKey,
        model,
        systemPrompt: systemPrompt + userInstructionBlock,
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
    const { batch, apiConfigs, systemPrompt, userInstructionBlock, currentTree, batchIndex, maxRetries } = data;

    try {
      self.postMessage({ type: 'log', data: `Worker starting batch ${batchIndex}`, batchIndex });

      let availableKeys = apiConfigs.filter((c: any) => c.status === 'active');
      if (availableKeys.length === 0) {
        throw new Error("No active API keys available");
      }

      let categorizedBatch: any[] = [];
      let keyIndex = 0;
      let batchSuccess = false;

      while (!batchSuccess && keyIndex < availableKeys.length) {
        const currentKeyConfig = availableKeys[keyIndex];
        let retries = 0;

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
              batchIndex
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

            const isFatalError = errorMessage.includes('429') || errorMessage.toLowerCase().includes('quota') || errorMessage.includes('API key');
            if (isFatalError) {
              self.postMessage({
                type: 'log',
                data: `Key "${currentKeyConfig.name}" has fatal error, switching keys`,
                batchIndex
              });
              break;
            }

            retries++;
            if (retries > maxRetries) {
              self.postMessage({
                type: 'log',
                data: `Max retries reached for key "${currentKeyConfig.name}", switching keys`,
                batchIndex
              });
              break;
            }
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
