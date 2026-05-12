import React, { useState } from 'react';
import type { AIProfile, ApiConfig, Folder, Bookmark } from '@/types';
import { testCategorize } from '@/src/services/aiService';
import { XIcon, PlayIcon } from '@/src/components/ui/Icons';

interface PromptPlaygroundProps {
    profile: AIProfile;
    apiConfigs: ApiConfig[];
    currentTree: Folder[];
    customInstructions: string;
    onClose: () => void;
}

export const PromptPlayground: React.FC<PromptPlaygroundProps> = ({
    profile,
    apiConfigs,
    currentTree,
    customInstructions,
    onClose
}) => {
    const [testBookmarksText, setTestBookmarksText] = useState("https://reactjs.org - React Documentation\nhttps://tailwindcss.com/docs - Tailwind CSS");
    const [result, setResult] = useState<any>(null);
    const [rawText, setRawText] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleTest = async () => {
        setIsLoading(true);
        setError(null);
        setResult(null);
        setRawText('');

        try {
            // Parse simple text into Mock Bookmark array
            const lines = testBookmarksText.split('\n').filter(l => l.trim().length > 0);
            const mockBookmarks: Bookmark[] = lines.map((line, index) => {
                const parts = line.split(' - ');
                return {
                    id: `test-${index}`,
                    url: parts[0]?.trim() || '',
                    title: parts[1]?.trim() || parts[0]?.trim() || 'Test Bookmark',
                    tags: [],
                    path: [],
                    parentId: null
                };
            });

            const { categorized, usage, rawText: raw } = await testCategorize(
                mockBookmarks,
                profile,
                apiConfigs,
                customInstructions,
                currentTree
            );

            setResult({ categorized, usage });
            setRawText(raw);
        } catch (err: any) {
            setError(err.message || 'Lỗi không xác định khi test.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] backdrop-blur-md animate-fadeIn p-4">
            <div className="bg-[#1a1d23] border border-blue-500/30 rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden glass-effect">
                <div className="flex justify-between items-center p-4 border-b border-white/10 bg-black/20">
                    <div className="flex items-center space-x-3">
                        <span className="text-xl">🧪</span>
                        <h2 className="text-lg font-bold text-white tracking-tight">Prompt Playground</h2>
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-[10px] rounded uppercase font-bold">
                            {profile.name}
                        </span>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Input Area */}
                    <div className="w-1/2 flex flex-col border-r border-white/10 p-4 space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Test Bookmarks (1 per line: URL - Title)</label>
                            <textarea 
                                value={testBookmarksText}
                                onChange={e => setTestBookmarksText(e.target.value)}
                                className="w-full h-48 bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none font-mono"
                                placeholder="https://example.com - Example Title"
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                            <h4 className="text-xs font-bold text-gray-500 uppercase">Context Sent to AI</h4>
                            <div className="bg-white/5 p-3 rounded-lg text-[10px] font-mono text-gray-400 space-y-2">
                                <p><strong className="text-emerald-400">System Prompt:</strong> {profile.systemInstruction.substring(0, 100)}...</p>
                                <p><strong className="text-blue-400">Temperature:</strong> {profile.temperature}</p>
                                <p><strong className="text-blue-400">Top P:</strong> {profile.topP}</p>
                                {customInstructions && <p><strong className="text-yellow-400">Custom Rules:</strong> Applied</p>}
                                <p><strong className="text-purple-400">Current Tree:</strong> {currentTree.length} root folders</p>
                            </div>
                        </div>

                        <button 
                            onClick={handleTest}
                            disabled={isLoading}
                            className={`w-full py-3 flex items-center justify-center rounded-xl font-bold uppercase tracking-widest transition-all ${
                                isLoading ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg'
                            }`}
                        >
                            {isLoading ? 'Đang phân tích...' : <><PlayIcon className="w-4 h-4 mr-2" /> Chạy Thử Nghiệm</>}
                        </button>
                    </div>

                    {/* Output Area */}
                    <div className="w-1/2 flex flex-col p-4 bg-black/20">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Kết quả AI</h3>
                            {result?.usage && (
                                <span className="text-[10px] text-gray-500 font-mono">
                                    Tokens: {result.usage.totalTokens || (result.usage.promptTokens + result.usage.completionTokens)}
                                </span>
                            )}
                        </div>

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-mono">
                                <strong>Lỗi:</strong> {error}
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {!result && !error && !isLoading && (
                                <div className="h-full flex items-center justify-center text-gray-600 text-sm italic">
                                    Nhấn "Chạy Thử Nghiệm" để xem kết quả
                                </div>
                            )}

                            {isLoading && (
                                <div className="h-full flex flex-col items-center justify-center space-y-4">
                                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-blue-400 text-xs font-mono animate-pulse">AI đang suy nghĩ...</p>
                                </div>
                            )}

                            {result && (
                                <div className="space-y-4">
                                    <div className="bg-[#121418] border border-white/5 rounded-xl overflow-hidden">
                                        <div className="bg-white/5 px-3 py-2 border-b border-white/5 flex justify-between">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Parsed JSON</span>
                                        </div>
                                        <div className="p-4 overflow-x-auto">
                                            <pre className="text-[11px] text-emerald-400 font-mono">
                                                {JSON.stringify(result.categorized, null, 2)}
                                            </pre>
                                        </div>
                                    </div>

                                    <div className="bg-[#121418] border border-white/5 rounded-xl overflow-hidden">
                                        <div className="bg-white/5 px-3 py-2 border-b border-white/5 flex justify-between">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Raw Response</span>
                                        </div>
                                        <div className="p-4 overflow-x-auto">
                                            <pre className="text-[11px] text-gray-500 font-mono">
                                                {rawText}
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PromptPlayground;
