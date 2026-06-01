import { useState, useCallback } from 'react';
import { AppState, type Bookmark, type Folder, type ApiConfig, type CategorizedBookmark, type Notification, type SmartClassifyRule } from '@/types';
import { normalizeURL } from '@/src/utils/urlUtils';
import { DEFAULT_PLANNING_PROMPT } from '@/src/constants';
import * as db from '@db';
import { GoogleGenAI } from '@google/genai';

export const useAIPlanning = (
    bookmarks: Bookmark[],
    apiConfigs: ApiConfig[],
    setFolders: (folders: (Folder | Bookmark)[]) => void,
    setSystemPrompt: (prompt: string | ((prev: string) => string)) => void,
    setAppState: (state: AppState) => void,
    setAllCategorizedBookmarks: (callback: (prev: CategorizedBookmark[]) => CategorizedBookmark[]) => void,
    setLogs: (callback: (prev: string[]) => string[]) => void,
    setErrorDetails: (details: string) => void,
    setNotifications: (callback: (prev: Notification[]) => Notification[]) => void,
    applySmartClassify: (bookmarks: Bookmark[], rules: SmartClassifyRule[]) => { classified: CategorizedBookmark[], remaining: Bookmark[] },
    sessionRules: SmartClassifyRule[]
) => {
    const [isPlanning, setIsPlanning] = useState(false);
    const [proposedStructure, setProposedStructure] = useState<(Folder | Bookmark)[]>([]);

    // Persist planning prompt
    const [planningPrompt, setPlanningPrompt] = useState<string>(() => {
        return localStorage.getItem('ai_planning_prompt') || DEFAULT_PLANNING_PROMPT;
    });

    // Save to localStorage whenever it changes
    const handleSetPlanningPrompt = useCallback((value: string | ((prev: string) => string)) => {
        setPlanningPrompt(prev => {
            const newValue = typeof value === 'function' ? value(prev) : value;
            localStorage.setItem('ai_planning_prompt', newValue);
            return newValue;
        });
    }, []);

    const generateStructureSuggestion = async (source: 'tags' | 'domains') => {
        setIsPlanning(true);
        setAppState(AppState.PLANNING);
        setLogs(prev => [...prev, `Đang phân tích ${source === 'tags' ? 'tag' : 'link gốc'} để gợi ý cấu trúc...`]);

        try {
            const availableKeys = apiConfigs.filter(c => c.status === 'active');
            if (availableKeys.length === 0) throw new Error('Chưa có API key hoạt động.');

            let inputData = '';
            if (source === 'tags') {
                const allTags = new Set<string>();
                bookmarks.forEach(bm => bm.tags?.forEach(tag => allTags.add(tag)));
                inputData = Array.from(allTags).join(', ');
            } else {
                const domains = new Set<string>();
                bookmarks.forEach(bm => domains.add(normalizeURL(bm.url)));
                inputData = Array.from(domains).slice(0, 100).join('\n'); // Limit to first 100 unique links for context
            }

            const userPrompt = `Dựa trên danh sách ${source === 'tags' ? 'tag' : 'link'} sau đây, hãy tạo một cấu trúc thư mục logic:\n\n${inputData}`;
            const currentKey = availableKeys[0]; // Use first active key
            setLogs(prev => [...prev, `Sử dụng cấu hình: ${currentKey.name} (${currentKey.provider})`]);
            let content = '';

            // Check if model is an embedding model
            if (currentKey.model && currentKey.model.toLowerCase().includes('embed')) {
                throw new Error(`Model "${currentKey.model}" là model nhúng (embedding), không hỗ trợ chat/completions. Vui lòng chọn model khác (ví dụ: gemini-2.5-flash, gpt-4o, claude-3...).`);
            }

            if (currentKey.provider === 'gemini') {
                const ai = new GoogleGenAI({ apiKey: currentKey.apiKey });
                const modelName = currentKey.model || 'gemini-2.5-flash';
                const model = ai.getGenerativeModel({ model: modelName }, { apiVersion: 'v1beta' });

                const result = await model.generateContent({
                    contents: [
                        { role: 'user', parts: [{ text: userPrompt }] }
                    ],
                    generationConfig: {
                        responseMimeType: 'application/json',
                    },
                    systemInstruction: planningPrompt
                });

                content = result.response.text();

            } else if (currentKey.provider === 'custom-gemini') {
                let endpoint = currentKey.apiUrl || '';
                if (!endpoint) throw new Error('Custom Gemini requires an API URL');

                if (!endpoint.includes(':generateContent')) {
                    endpoint = endpoint.replace(/\/$/, '') + `/models/${currentKey.model || 'gemini-1.5-flash'}:generateContent`;
                }

                const result = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-goog-api-key': currentKey.apiKey,
                    },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: userPrompt }] }],
                        generationConfig: {
                            responseMimeType: 'application/json'
                        }
                    })
                });

                if (!result.ok) {
                    const errText = await result.text();
                    throw new Error(`Custom Gemini call failed: ${result.status} - ${errText}`);
                }
                const data = await result.json();
                content = data.candidates?.[0]?.content?.parts?.[0]?.text;
            } else if (currentKey.provider === 'openai' || currentKey.provider === 'openrouter' || currentKey.provider === 'custom-openai') {
                let endpoint = '';

                if (currentKey.provider === 'openai') {
                    endpoint = 'https://api.openai.com/v1/chat/completions';
                } else if (currentKey.provider === 'openrouter') {
                    endpoint = 'https://openrouter.ai/api/v1/chat/completions';
                } else if (currentKey.provider === 'custom-openai') {
                    endpoint = currentKey.apiUrl || 'https://api.openai.com/v1/chat/completions';
                }

                if (!endpoint) {
                    throw new Error(`Endpoint URL is missing for provider: ${currentKey.provider}`);
                }

                const result = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${currentKey.apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': window.location.origin,
                        'X-Title': 'AI Bookmark Architect',
                    },
                    body: JSON.stringify({
                        model: currentKey.model,
                        messages: [
                            { role: 'system', content: planningPrompt },
                            { role: 'user', content: userPrompt }
                        ],
                        response_format: { type: 'json_object' }
                    })
                });

                if (!result.ok) {
                    const errText = await result.text();
                    throw new Error(`API call failed (${currentKey.provider}): ${result.status} - ${errText}`);
                }
                const data = await result.json();
                content = data.choices[0].message.content;
            } else {
                throw new Error(`Provider không được hỗ trợ cho lập kế hoạch: ${currentKey.provider}`);
            }

            // Parse response - assuming the AI returns { "folders": [...] } or similar
            let parsed: any;
            try {
                // Clean markdown code blocks if present
                const cleanedContent = content.replace(/```json\s*|\s*```/g, '').trim();
                const rawParsed = JSON.parse(cleanedContent);
                parsed = rawParsed.folders || rawParsed;

                if (!Array.isArray(parsed)) {
                    throw new Error('AI response is not an array of folders');
                }
            } catch (e) {
                // Fallback to regex if JSON is slightly malformed
                const match = content.match(/\[\s*{[\s\S]*}\s*\]/);
                if (match) {
                    try {
                        parsed = JSON.parse(match[0]);
                    } catch (err) {
                        throw new Error('Could not parse AI response: ' + content.substring(0, 100));
                    }
                } else {
                    throw new Error('Could not parse AI response: ' + content.substring(0, 100));
                }
            }

            if (!Array.isArray(parsed)) {
                throw new Error('Valid folder structure not found in AI response.');
            }

            // Flatten logic: If AI returned a single root folder that wraps everything, promote its children
            if (Array.isArray(parsed) && parsed.length === 1 && parsed[0].children && parsed[0].children.length > 0) {
                const rootName = parsed[0].name.toLowerCase();
                if (rootName === 'root' || rootName === 'tổng hợp' || rootName === 'bookmarks' || rootName === 'thư mục') {
                    setLogs(prev => [...prev, `Đã tự động loại bỏ thư mục gốc dư thừa: "${parsed[0].name}"`]);
                    parsed = parsed[0].children.map((c: any) => ({ ...c, parentId: null }));
                }
            }

            setProposedStructure(parsed as (Folder | Bookmark)[]);
            setLogs(prev => [...prev, 'Đã tạo cấu trúc gợi ý thành công.']);
        } catch (error: any) {
            console.error('Planning Error:', error);
            setLogs(prev => [...prev, `Lỗi: ${error.message}`]);
            setErrorDetails(`Không thể tạo gợi ý cấu trúc: ${error.message}`);
        } finally {
            setIsPlanning(false);
        }
    };


    const getStructureGuide = useCallback((nodes: (Folder | Bookmark)[], path: string[] = []): string[] => {
        if (!Array.isArray(nodes)) return [];
        let list: string[] = [];
        nodes.forEach(node => {
            if (!('url' in node)) {
                const currentPath = [...path, node.name];
                list.push(currentPath.join(' -> '));
                if (node.children) {
                    list = list.concat(getStructureGuide(node.children, currentPath));
                }
            }
        });
        return list;
    }, []);

    const confirmProposedStructure = async () => {
        setFolders(proposedStructure);
        await db.saveFolders(proposedStructure);

        // Feed the confirmed structure into the system prompt as a rigid guide
        const availableFolders = getStructureGuide(proposedStructure);
        const folderGuide = availableFolders.map((folder, index) => `${index + 1}. ${folder}`).join('\n');

        const planningGuideline = `\n\n**PLANNED STRUCTURE (Prioritize these folders):**\n${folderGuide}\n\n**STRICT CATEGORIZATION RULES:**\n1. Use the folders listed above whenever possible.\n2. If a bookmark has a tag matching one of these folders, put it there.\n3. Only create a NEW folder if the bookmark absolutely does not fit into any of the planned categories.`;

        setSystemPrompt(prev => prev + planningGuideline);

        // Apply session rules immediately
        if (sessionRules.length > 0) {
            const { classified } = applySmartClassify(bookmarks, sessionRules);
            if (classified.length > 0) {
                setAllCategorizedBookmarks(prev => [...prev, ...classified]);
                setLogs(prev => [...prev, `Smart Classify: Đã tự động phân loại ${classified.length} bookmark theo quy tắc tùy chỉnh.`]);
            }
        }

        setAppState(AppState.STRUCTURED);
        setProposedStructure([]);
        setNotifications(prev => [...prev, { id: 'confirm-struct', message: 'Đã áp dụng cấu trúc và quy tắc mới. AI đã được cập nhật chỉ dẫn theo sơ đồ này.', type: 'success' }]);
    };

    return {
        isPlanning,
        proposedStructure,
        setProposedStructure,
        planningPrompt,
        setPlanningPrompt: handleSetPlanningPrompt,
        generateStructureSuggestion,
        confirmProposedStructure
    };
};
