import type { ApiConfig } from '../types';

export interface AIResponse {
    text: string;
    raw?: any;
}

export class AIClient {
    private config: ApiConfig;

    constructor(config: ApiConfig) {
        this.config = config;
    }

    async generateContent(systemPrompt: string, userPrompt: string): Promise<AIResponse> {
        const { provider, apiKey, model, apiUrl } = this.config;

        if (provider === 'gemini' || provider === 'custom-gemini') {
            return this.callGemini(systemPrompt, userPrompt);
        }

        if (provider === 'openai' || provider === 'openrouter' || provider === 'custom-openai') {
            return this.callOpenAI(systemPrompt, userPrompt);
        }

        throw new Error(`Unsupported provider: ${provider}`);
    }

    private async callGemini(systemPrompt: string, userPrompt: string): Promise<AIResponse> {
        const { apiKey, model, apiUrl, provider } = this.config;
        
        let endpoint = '';
        if (provider === 'gemini') {
            endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`;
        } else {
            endpoint = apiUrl || '';
            if (!endpoint.includes(':generateContent')) {
                endpoint = endpoint.replace(/\/$/, '') + `/models/${model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`;
            } else if (!endpoint.includes('key=')) {
                endpoint += (endpoint.includes('?') ? '&' : '?') + `key=${apiKey}`;
            }
        }

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
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini API Error (${provider}): ${response.status} - ${errText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        return { text, raw: data };
    }

    private async callOpenAI(systemPrompt: string, userPrompt: string): Promise<AIResponse> {
        const { provider, apiKey, model, apiUrl } = this.config;
        
        let endpoint = '';
        if (provider === 'openai') {
            endpoint = 'https://api.openai.com/v1/chat/completions';
        } else if (provider === 'openrouter') {
            endpoint = 'https://openrouter.ai/api/v1/chat/completions';
        } else if (provider === 'custom-openai') {
            endpoint = apiUrl || 'https://api.openai.com/v1/chat/completions';
        }

        if (!endpoint) {
            throw new Error(`Missing endpoint for provider: ${provider}`);
        }

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
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI API Error (${provider}): ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '';
        
        return { text, raw: data };
    }
}
