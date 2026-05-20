import type { ApiConfig, AIProfile } from '@/types';

/**
 * Interface representing a standardized AI response.
 */
export interface AIResponse {
    /** The generated text content, typically a JSON string for this application. */
    text: string;
    /** The full raw response from the AI provider. */
    raw?: any;
    /** Optional token usage information. */
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

/**
 * A client for interacting with various AI providers (Gemini, OpenAI, OpenRouter).
 * Standardizes requests and responses across different API architectures.
 */
export class AIClient {
    private config: ApiConfig;
    private profile?: AIProfile;

    /**
     * Initializes the AIClient with a specific configuration.
     * @param config The API configuration including provider, key, and model.
     * @param profile The AI Profile containing model parameters.
     */
    constructor(config: ApiConfig, profile?: AIProfile) {
        this.config = config;
        this.profile = profile;
    }

    /**
     * Generates content using the configured AI provider.
     * @param systemPrompt The system instructions for the AI.
     * @param userPrompt The user-specific input/bookmarks to process.
     * @returns A promise resolving to a standardized AIResponse.
     * @throws Error if the provider is unsupported or the API request fails.
     */
    async generateContent(systemPrompt: string, userPrompt: string): Promise<AIResponse> {
        const { provider } = this.config;

        switch (provider) {
            case 'gemini':
            case 'custom-gemini':
                return this.callGemini(systemPrompt, userPrompt);
            case 'openai':
            case 'openrouter':
            case 'custom-openai':
                return this.callOpenAI(systemPrompt, userPrompt);
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    }

    /**
     * Generates content using a stateful chat session approach.
     */
    async generateChatContent(systemPrompt: string, messages: ChatMessage[]): Promise<AIResponse> {
        const { provider } = this.config;

        switch (provider) {
            case 'gemini':
            case 'custom-gemini':
                return this.callGeminiChat(systemPrompt, messages);
            case 'openai':
            case 'openrouter':
            case 'custom-openai':
                return this.callOpenAIChat(systemPrompt, messages);
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    }

    /**
     * Internal method to call Google Gemini or compatible custom endpoints.
     */
    private async callGemini(systemPrompt: string, userPrompt: string): Promise<AIResponse> {
        const { apiKey, model, apiUrl, provider } = this.config;
        
        let endpoint = this.resolveGeminiEndpoint(provider, model || 'gemini-1.5-flash', apiKey, apiUrl);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
                }],
                generationConfig: {
                    responseMimeType: 'application/json',
                    ...(this.profile?.temperature !== undefined ? { temperature: this.profile.temperature } : {}),
                    ...(this.profile?.topP !== undefined ? { topP: this.profile.topP } : {}),
                    ...(this.profile?.topK !== undefined ? { topK: this.profile.topK } : {}),
                    ...(this.profile?.maxOutputTokens !== undefined ? { maxOutputTokens: this.profile.maxOutputTokens } : {}),
                    ...(this.profile?.frequencyPenalty !== undefined ? { frequencyPenalty: this.profile.frequencyPenalty } : {}),
                    ...(this.profile?.presencePenalty !== undefined ? { presencePenalty: this.profile.presencePenalty } : {}),
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini API Error (${provider}): ${response.status} - ${errText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        return { 
            text, 
            raw: data,
            usage: data.usageMetadata ? {
                promptTokens: data.usageMetadata.promptTokenCount || 0,
                completionTokens: data.usageMetadata.candidatesTokenCount || 0,
                totalTokens: data.usageMetadata.totalTokenCount || 0
            } : undefined
        };
    }

    /**
     * Internal method to call Google Gemini with chat history.
     */
    private async callGeminiChat(systemPrompt: string, messages: ChatMessage[]): Promise<AIResponse> {
        const { apiKey, model, apiUrl, provider } = this.config;
        
        const endpoint = this.resolveGeminiEndpoint(provider, model || 'gemini-1.5-flash', apiKey, apiUrl);

        // Map ChatMessage to Gemini format
        const contents = messages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : msg.role === 'system' ? 'user' : msg.role,
            parts: [{ text: msg.content }]
        }));

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                },
                contents: contents,
                generationConfig: {
                    responseMimeType: 'application/json',
                    ...(this.profile?.temperature !== undefined ? { temperature: this.profile.temperature } : {}),
                    ...(this.profile?.topP !== undefined ? { topP: this.profile.topP } : {}),
                    ...(this.profile?.topK !== undefined ? { topK: this.profile.topK } : {}),
                    ...(this.profile?.maxOutputTokens !== undefined ? { maxOutputTokens: this.profile.maxOutputTokens } : {}),
                    ...(this.profile?.frequencyPenalty !== undefined ? { frequencyPenalty: this.profile.frequencyPenalty } : {}),
                    ...(this.profile?.presencePenalty !== undefined ? { presencePenalty: this.profile.presencePenalty } : {}),
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini API Error (${provider}): ${response.status} - ${errText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        return { 
            text, 
            raw: data,
            usage: data.usageMetadata ? {
                promptTokens: data.usageMetadata.promptTokenCount || 0,
                completionTokens: data.usageMetadata.candidatesTokenCount || 0,
                totalTokens: data.usageMetadata.totalTokenCount || 0
            } : undefined
        };
    }

    /**
     * Internal method to call OpenAI, OpenRouter, or compatible custom endpoints.
     */
    private async callOpenAI(systemPrompt: string, userPrompt: string): Promise<AIResponse> {
        return this.callOpenAIChat(systemPrompt, [{ role: 'user', content: userPrompt }]);
    }

    /**
     * Internal method to call OpenAI-compatible endpoints with chat history.
     */
    private async callOpenAIChat(systemPrompt: string, messages: ChatMessage[]): Promise<AIResponse> {
        const { provider, apiKey, model, apiUrl } = this.config;
        
        const endpoint = this.resolveOpenAIEndpoint(provider, apiUrl);

        const apiMessages = [
            { role: 'system', content: systemPrompt },
            ...messages
        ];

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://ai-bookmark-architect.vercel.app',
                'X-Title': 'AI Bookmark Architect',
            },
            body: JSON.stringify({
                model: model,
                messages: apiMessages,
                response_format: { type: 'json_object' },
                ...(this.profile?.temperature !== undefined ? { temperature: this.profile.temperature } : {}),
                ...(this.profile?.topP !== undefined ? { top_p: this.profile.topP } : {}),
                ...(this.profile?.maxOutputTokens !== undefined ? { max_tokens: this.profile.maxOutputTokens } : {}),
                ...(this.profile?.frequencyPenalty !== undefined ? { frequency_penalty: this.profile.frequencyPenalty } : {}),
                ...(this.profile?.presencePenalty !== undefined ? { presence_penalty: this.profile.presencePenalty } : {}),
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI API Error (${provider}): ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '';
        
        return { 
            text, 
            raw: data,
            usage: data.usage ? {
                promptTokens: data.usage.prompt_tokens || 0,
                completionTokens: data.usage.completion_tokens || 0,
                totalTokens: data.usage.total_tokens || 0
            } : undefined
        };
    }

    /**
     * Resolves the correct Gemini API endpoint based on configuration.
     */
    private resolveGeminiEndpoint(provider: string, model: string, apiKey: string, apiUrl?: string): string {
        if (provider === 'gemini') {
            return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        }
        
        let endpoint = apiUrl || '';
        if (!endpoint.includes(':generateContent')) {
            endpoint = endpoint.replace(/\/$/, '') + `/models/${model}:generateContent?key=${apiKey}`;
        } else if (!endpoint.includes('key=')) {
            endpoint += (endpoint.includes('?') ? '&' : '?') + `key=${apiKey}`;
        }
        return endpoint;
    }

    /**
     * Resolves the correct OpenAI-compatible API endpoint based on configuration.
     */
    private resolveOpenAIEndpoint(provider: string, apiUrl?: string): string {
        switch (provider) {
            case 'openai':
                return 'https://api.openai.com/v1/chat/completions';
            case 'openrouter':
                return 'https://openrouter.ai/api/v1/chat/completions';
            case 'custom-openai':
                return apiUrl || 'https://api.openai.com/v1/chat/completions';
            default:
                throw new Error(`Invalid OpenAI provider: ${provider}`);
        }
    }
}

