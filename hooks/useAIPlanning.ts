import { useState, useCallback } from 'react';
import { Bookmark, Folder, ApiConfig, AppState } from '../types';
import { normalizeURL } from '../src/utils';
import { DEFAULT_PLANNING_PROMPT } from '../src/constants';
import * as db from '../db';
import { GoogleGenAI } from "@google/genai";

export const useAIPlanning = (
    bookmarks: Bookmark[],
    apiConfigs: ApiConfig[],
    setFolders: (folders: (Folder | Bookmark)[]) => void,
    setSystemPrompt: (prompt: string | ((prev: string) => string)) => void,
    setAppState: (state: AppState) => void,
    setAllCategorizedBookmarks: (callback: (prev: any[]) => any[]) => void,
    setLogs: (callback: (prev: string[]) => string[]) => void,
    setErrorDetails: (details: string) => void,
    setNotifications: (callback: (prev: any[]) => any[]) => void,
    applySmartClassify: (bookmarks: Bookmark[], rules: any[]) => { classified: any[], remaining: any[] },
    sessionRules: any[]
) => {
    const [isPlanning, setIsPlanning] = useState(false);
    const [proposedStructure, setProposedStructure] = useState<(Folder | Bookmark)[]>([]);
    const [planningPrompt, setPlanningPrompt] = useState<string>(DEFAULT_PLANNING_PROMPT);

    const generateStructureSuggestion = async (source: 'tags' | 'domains') => {
        setIsPlanning(true);
        setAppState(AppState.PLANNING);
        setLogs(prev => [...prev, `Đang phân tích ${source === 'tags' ? 'tag' : 'link gốc'} để gợi ý cấu trúc...`]);

        try {
            const availableKeys = apiConfigs.filter(c => c.status === 'active');
            if (availableKeys.length === 0) throw new Error("Chưa có API key hoạt động.");

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
            let content = '';

            if (currentKey.provider === 'gemini') {
                const ai = new GoogleGenAI({ apiKey: currentKey.apiKey });
                const model = currentKey.model || 'gemini-2.5-flash';
                
                const result = await ai.models.generateContent({
                    model: model,
                    contents: [
                        { role: 'user', parts: [{ text: userPrompt }] }
                    ],
                    config: {
                        systemInstruction: planningPrompt,
                        responseMimeType: "application/json",
                    }
                });
                
                const response = result;
                content = typeof (response as any).text === 'function' 
                    ? (response as any).text() 
                    : (response as any).text || JSON.stringify((response as any));

            } else {
                // OpenRouter or Custom
                const endpoint = currentKey.provider === 'custom' && currentKey.apiUrl 
                    ? currentKey.apiUrl 
                    : 'https://openrouter.ai/api/v1/chat/completions';

                const result = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${currentKey.apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': window.location.href,
                        'X-Title': 'AI Bookmark Architect'
                    },
                    body: JSON.stringify({
                        model: currentKey.model,
                        messages: [
                            { role: 'system', content: planningPrompt },
                            { role: 'user', content: userPrompt }
                        ],
                        response_format: { type: "json_object" }
                    })
                });

                if (!result.ok) {
                    const errText = await result.text();
                    throw new Error(`API call failed: ${result.status} - ${errText}`);
                }
                const data = await result.json();
                content = data.choices[0].message.content;
            }
            
            // Parse response - assuming the AI returns { "folders": [...] } or similar
            let parsed;
            try {
                // Clean markdown code blocks if present
                const cleanedContent = content.replace(/```json\s*|\s*```/g, '').trim();
                const rawParsed = JSON.parse(cleanedContent);
                parsed = rawParsed.folders || rawParsed;
            } catch (e) {
                // Fallback to regex if JSON is slightly malformed
                const match = content.match(/\[\s*{[\s\S]*}\s*\]/);
                if (match) parsed = JSON.parse(match[0]);
                else throw new Error("Could not parse AI response: " + content.substring(0, 100));
            }

            // Flatten logic: If AI returned a single root folder that wraps everything, promote its children
            if (Array.isArray(parsed) && parsed.length === 1 && parsed[0].children && parsed[0].children.length > 0) {
                const rootName = parsed[0].name.toLowerCase();
                if (rootName === 'root' || rootName === 'tổng hợp' || rootName === 'bookmarks' || rootName === 'thư mục') {
                    setLogs(prev => [...prev, `Đã tự động loại bỏ thư mục gốc dư thừa: "${parsed[0].name}"`]);
                    parsed = parsed[0].children.map((c: any) => ({ ...c, parentId: null }));
                }
            }

            setProposedStructure(parsed);
            setLogs(prev => [...prev, "Đã tạo cấu trúc gợi ý thành công."]);
        } catch (error: any) {
            console.error("Planning Error:", error);
            setLogs(prev => [...prev, `Lỗi: ${error.message}`]);
            setErrorDetails(`Không thể tạo gợi ý cấu trúc: ${error.message}`);
        } finally {
            setIsPlanning(false);
        }
    };


    const getStructureGuide = useCallback((nodes: any[], path: string[] = []): string[] => {
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
        setPlanningPrompt,
        generateStructureSuggestion,
        confirmProposedStructure
    };
};
