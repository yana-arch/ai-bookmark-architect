import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIClient } from '@/src/services/aiClient';
import { ApiConfig } from '@/types';

describe('AIClient', () => {
    const mockConfig: ApiConfig = {
        id: '1',
        name: 'Test Gemini',
        provider: 'gemini',
        apiKey: 'test-key',
        status: 'active',
        model: 'gemini-1.5-flash'
    };

    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    it('should call Gemini API with correct parameters', async () => {
        const client = new AIClient(mockConfig);
        const mockResponse = {
            ok: true,
            json: () => Promise.resolve({
                candidates: [{ content: { parts: [{ text: '{"bookmarks": []}' }] } }]
            })
        };
        (fetch as any).mockResolvedValue(mockResponse);

        const result = await client.generateContent('system prompt', 'user prompt');

        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('generativelanguage.googleapis.com'),
            expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('system prompt')
            })
        );
        expect(result.text).toBe('{"bookmarks": []}');
    });

    it('should call OpenAI API with correct parameters', async () => {
        const openAIConfig: ApiConfig = {
            ...mockConfig,
            provider: 'openai',
            name: 'Test OpenAI'
        };
        const client = new AIClient(openAIConfig);
        const mockResponse = {
            ok: true,
            json: () => Promise.resolve({
                choices: [{ message: { content: '{"bookmarks": []}' } }]
            })
        };
        (fetch as any).mockResolvedValue(mockResponse);

        const result = await client.generateContent('system prompt', 'user prompt');

        expect(fetch).toHaveBeenCalledWith(
            'https://api.openai.com/v1/chat/completions',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    'Authorization': 'Bearer test-key'
                })
            })
        );
        expect(result.text).toBe('{"bookmarks": []}');
    });
});
