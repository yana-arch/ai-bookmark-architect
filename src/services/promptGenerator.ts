import { GoogleGenAI } from '@google/genai';
import { ApiConfig } from '../../types';

// Helper to pick the best available API config
export const getActiveApiConfig = (apiConfigs: ApiConfig[]): ApiConfig | null => {
    return apiConfigs.find(c => c.status === 'active') || null;
};

// Internal helper for generic generation
const generateAIContent = async (
    metaSystemPrompt: string,
    userPrompt: string,
    apiConfig: ApiConfig
): Promise<string> => {
    try {
        if (apiConfig.provider === 'gemini') {
            const ai = new GoogleGenAI({ apiKey: apiConfig.apiKey });
      
            const result = await ai.models.generateContent({
                model: apiConfig.model || 'gemini-1.5-flash',
                contents: [
                    { role: 'system', parts: [{ text: metaSystemPrompt }] },
                    { role: 'user', parts: [{ text: userPrompt }] }
                ]
            });
      
            // Handle the specific response structure of @google/genai v0.1+
            const response = result;
            return typeof (response as any).text === 'function' 
                ? (response as any).text() 
                : (response as any).text || '';

        } else if (apiConfig.provider === 'openrouter' || apiConfig.provider === 'custom') {
            const endpoint = apiConfig.provider === 'custom' && apiConfig.apiUrl 
                ? apiConfig.apiUrl 
                : 'https://openrouter.ai/api/v1/chat/completions';
        
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiConfig.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.href,
                    'X-Title': 'AI Bookmark Architect Prompt Gen'
                },
                body: JSON.stringify({
                    model: apiConfig.model,
                    messages: [
                        { role: 'system', content: metaSystemPrompt },
                        { role: 'user', content: userPrompt }
                    ]
                })
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.statusText}`);
            }

            const data = await response.json();
            return data.choices?.[0]?.message?.content?.trim() || '';
        }
    
        throw new Error('Unsupported provider');
    } catch (error) {
        console.error('Error generating prompt:', error);
        throw error;
    }
};

export const generateSystemPrompt = async (
    userIntent: string,
    apiConfig: ApiConfig
): Promise<string> => {
    const metaSystemPrompt = `
You are an expert Prompt Engineer specializing in AI agents for data organization.
Your task is to convert a user's rough idea into a precise, professional "System Instruction" for another AI agent.

The "Target Agent" is a Bookmark Architect that organizes browser bookmarks into folders.
The "Target Agent" receives a list of bookmarks (Title, URL) and must assign them a folder path and tags.

RULES:
1. Output ONLY the System Instruction text.
2. Do NOT include JSON schemas or formatting rules (the system handles that automatically).
3. Focus on:
   - Categorization Logic (How to group items).
   - Naming Conventions (Vietnamese/English, Capitalization).
   - Tagging Strategy (What makes a good tag).
   - Handling Ambiguity (What to do with unclear items).
4. Keep the tone professional, direct, and strict.
5. If the user's intent is vague, assume a standard "Category/Subcategory" structure based on the content topic.

Example User Intent: "Sort by tech stack"
Example Output: "You are a Technical Librarian. Analyze the content of each bookmark to determine the specific technology stack. Group bookmarks primarily by their main programming language (e.g., 'JavaScript', 'Python') and secondarily by framework or library (e.g., 'React', 'Django'). Use specific, technical tags. If a bookmark is a general tutorial, categorize it under 'Tutorials'."
`;
    const userPrompt = `User Intent: "${userIntent}"\n\nGenerate the System Instruction:`;
    return generateAIContent(metaSystemPrompt, userPrompt, apiConfig);
};

export const generatePlanningPrompt = async (
    userIntent: string,
    apiConfig: ApiConfig
): Promise<string> => {
    const metaSystemPrompt = `
You are an expert Prompt Engineer.
Your task is to create a "Planning Instruction" for an AI Architect.

The "Target Agent" (Architect) needs to look at a list of unsorted bookmarks and PROPOSE a folder tree structure.
This structure will be used as a blueprint for organizing the bookmarks later.

RULES:
1. Output ONLY the Planning Instruction text.
2. Focus on:
   - How to analyze the input list to find common themes.
   - How to structure the hierarchy (Depth, Breadth).
   - Naming conventions for the folders.
3. Keep it high-level but specific about the STRATEGY.

Example User Intent: "Focus on shopping and hobbies"
Example Output: "Analyze the input list to identify clusters related to e-commerce, hobbies, and personal interests. Create a folder tree where 'Shopping' and 'Hobbies' are top-level directories. Group shopping items by product category (e.g., 'Tech', 'Clothes') and hobbies by activity type. Keep other items in broad categories like 'Reference' or 'News'."
`;
    const userPrompt = `User Intent: "${userIntent}"\n\nGenerate the Planning Instruction:`;
    return generateAIContent(metaSystemPrompt, userPrompt, apiConfig);
};
