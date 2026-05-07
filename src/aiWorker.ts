// AI Worker for multi-threaded bookmark processing
// This worker handles AI API calls for a single batch of bookmarks
import { GoogleGenAI } from '@google/genai';
import type { Bookmark, ApiConfig, UserCorrection, Folder } from '../types';
import { 
    parseAIResponse, 
    generateCategorizationPrompt 
} from './services/aiService';

// Type definitions for the worker
interface WorkerMessage {
  type: 'process_batch' | 'cancel';
  data?: {
    batch: Bookmark[];
    apiConfigs: ApiConfig[];
    systemPrompt: string;
    userInstructionBlock: string;
    currentTree: Folder[];
    batchIndex: number;
    maxRetries: number;
    userHistory?: UserCorrection[];
    domainKnowledge?: string;
  };
}

interface WorkerResponse {
  type: 'batch_result' | 'batch_error' | 'log' | 'progress';
  data?: Bookmark[];
  error?: string;
  batchIndex?: number;
  log?: any;
  progress?: number;
}

// Main worker logic
self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
    const { type, data } = e.data;

    if (type === 'cancel') {
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
                    log: { message: `Batch ${batchIndex}: Attempt ${attempts}/${maxRetries + 1} using [${activeConfig.name}] (${activeConfig.provider})` },
                    batchIndex
                } as WorkerResponse);

                // Prepare Prompt using centralized service
                const fullPrompt = generateCategorizationPrompt({
                    systemPrompt,
                    userInstructionBlock,
                    currentTree,
                    batch,
                    userHistory,
                    domainKnowledge
                });

                let responseText: string | undefined;

                if (activeConfig.provider === 'gemini' || activeConfig.provider === 'custom-gemini') {
                    let endpoint = '';
                    if (activeConfig.provider === 'gemini') {
                        endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${activeConfig.model || 'gemini-1.5-flash'}:generateContent?key=${activeConfig.apiKey}`;
                    } else {
                        endpoint = activeConfig.apiUrl || '';
                        if (!endpoint.includes(':generateContent')) {
                            endpoint = endpoint.replace(/\/$/, '') + `/models/${activeConfig.model || 'gemini-1.5-flash'}:generateContent?key=${activeConfig.apiKey}`;
                        } else if (!endpoint.includes('key=')) {
                            endpoint += (endpoint.includes('?') ? '&' : '?') + `key=${activeConfig.apiKey}`;
                        }
                    }

                    const result = await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            contents: [{
                                parts: [{ text: fullPrompt }]
                            }],
                            generationConfig: {
                                responseMimeType: 'application/json',
                            }
                        })
                    });

                    if (!result.ok) {
                        const errText = await result.text();
                        throw new Error(`Gemini call failed (${activeConfig.provider}): ${result.status} - ${errText}`);
                    }
                    const data = await result.json();
                    responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                } else if (activeConfig.provider === 'openai' || activeConfig.provider === 'openrouter' || activeConfig.provider === 'custom-openai') {
                    let endpoint = '';
                    if (activeConfig.provider === 'openai') {
                        endpoint = 'https://api.openai.com/v1/chat/completions';
                    } else if (activeConfig.provider === 'openrouter') {
                        endpoint = 'https://openrouter.ai/api/v1/chat/completions';
                    } else if (activeConfig.provider === 'custom-openai') {
                        endpoint = activeConfig.apiUrl || 'https://api.openai.com/v1/chat/completions';
                    }

                    if (!endpoint) {
                        throw new Error(`Endpoint URL is missing for provider: ${activeConfig.provider}`);
                    }

                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${activeConfig.apiKey}`,
                            'Content-Type': 'application/json',
                            'HTTP-Referer': 'https://ai-bookmark-architect.vercel.app', // For OpenRouter
                            'X-Title': 'AI Bookmark Architect', // For OpenRouter
                        },
                        body: JSON.stringify({
                            model: activeConfig.model,
                            messages: [
                                { role: 'system', content: systemPrompt },
                                { role: 'user', content: generateCategorizationPrompt({
                                    systemPrompt: '', // Already passed as system role
                                    userInstructionBlock,
                                    currentTree,
                                    batch
                                }) }
                            ],
                            response_format: { type: 'json_object' }
                        })
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`API Error (${activeConfig.provider}): ${response.status} - ${errorText}`);
                    }

                    const result = await response.json();
                    responseText = result.choices[0]?.message?.content || '';
                } else {
                    throw new Error(`Provider không được hỗ trợ hoặc chưa cấu hình đúng: ${activeConfig.provider}`);
                }

                if (!responseText) {
                    throw new Error('AI returned empty response');
                }

                // Parse Result using centralized service
                const categorizedBookmarks = parseAIResponse(responseText);

                if (categorizedBookmarks.length === 0) {
                    let errMsg = responseText || 'empty response';
                    if (errMsg.length > 150) {
                        errMsg = errMsg.substring(0, 150) + '...';
                    }
                    throw new Error(`AI returned invalid format or API error: ${errMsg}`);
                }

                // Merge back strict IDs from original batch
                const finalBookmarks = categorizedBookmarks.map(cbm => {
                    const original = batch.find(b => b.url === cbm.url);
                    return {
                        ...cbm,
                        id: original ? original.id : cbm.id,
                        parentId: null
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
                    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts)));
                }
            }
        }
    }
};
