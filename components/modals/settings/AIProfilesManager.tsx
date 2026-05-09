import React, { useState, useEffect } from 'react';
import type { AIProfile, ApiConfig, Folder, Bookmark } from '@/types';
import { CogIcon, TrashIcon, SparklesIcon, AILogoIcon, SuccessIcon } from '../../ui/Icons';
import PromptPlayground from './PromptPlayground';

interface AIProfilesManagerProps {
    aiProfiles: AIProfile[];
    activeProfileId: string | null;
    setActiveProfileId: (id: string | null) => void;
    onSaveProfile: (profile: AIProfile) => Promise<void> | void;
    onDeleteProfile: (id: string) => Promise<void> | void;
    apiConfigs: ApiConfig[];
    currentTree: Folder[];
    customInstructions: string;
}

export const AIProfilesManager: React.FC<AIProfilesManagerProps> = ({
    aiProfiles,
    activeProfileId,
    setActiveProfileId,
    onSaveProfile,
    onDeleteProfile,
    apiConfigs,
    currentTree,
    customInstructions
}) => {
    const [editingProfile, setEditingProfile] = useState<AIProfile | null>(null);
    const [showPlayground, setShowPlayground] = useState(false);
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

    // Active or Default profile
    const currentProfile = aiProfiles.find(p => p.id === activeProfileId) || aiProfiles.find(p => p.isDefault) || aiProfiles[0];

    useEffect(() => {
        if (currentProfile && !editingProfile) {
            setEditingProfile({ ...currentProfile });
        }
    }, [currentProfile, activeProfileId]);

    const handleSelectProfile = (id: string) => {
        setActiveProfileId(id);
        const profile = aiProfiles.find(p => p.id === id);
        if (profile) {
            setEditingProfile({ ...profile });
        }
    };

    const handleCreateNew = () => {
        const newProfile: AIProfile = {
            id: `profile-${Date.now()}`,
            name: 'Cấu hình mới',
            isDefault: false,
            systemInstruction: 'You are an intelligent bookmark organizer...',
            temperature: 0.5,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
            requestTokenLimit: 16000,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        setEditingProfile(newProfile);
        setActiveProfileId(newProfile.id);
    };

    const handleSave = async () => {
        if (editingProfile) {
            await onSaveProfile({ ...editingProfile, updatedAt: Date.now() });
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Bạn có chắc chắn muốn xóa cấu hình này?')) {
            await onDeleteProfile(id);
        }
    };

    if (!editingProfile) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                    <AILogoIcon className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">AI Profiles</h3>
                </div>
                <button
                    onClick={handleCreateNew}
                    className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-black rounded-lg transition-all uppercase tracking-tighter"
                >
                    + Tạo mới
                </button>
            </div>

            {/* Profile Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {aiProfiles.map(profile => (
                    <div
                        key={profile.id}
                        onClick={() => handleSelectProfile(profile.id)}
                        className={`p-4 rounded-xl cursor-pointer border transition-all ${editingProfile.id === profile.id
                                ? 'bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/20'
                                : 'bg-[#121418] border-white/10 hover:border-white/20'
                            }`}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center space-x-2">
                                    <h4 className={`text-sm font-bold ${editingProfile.id === profile.id ? 'text-emerald-400' : 'text-gray-200'}`}>
                                        {profile.name}
                                    </h4>
                                    {profile.isDefault && (
                                        <span className="text-[9px] bg-white/10 text-gray-400 px-1.5 py-0.5 rounded font-bold uppercase">Default</span>
                                    )}
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1 line-clamp-1">{profile.systemInstruction}</p>
                            </div>
                            {!profile.isDefault && (
                                <button onClick={(e) => handleDelete(e, profile.id)} className="text-gray-500 hover:text-red-400 p-1">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Editor Area */}
            <div className="bg-[#121418] border border-white/10 rounded-2xl p-6 space-y-6">
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                    <input
                        type="text"
                        value={editingProfile.name}
                        onChange={e => setEditingProfile({ ...editingProfile, name: e.target.value })}
                        className="bg-transparent border-none text-lg font-bold text-white focus:ring-0 p-0 outline-none w-1/2"
                        placeholder="Tên cấu hình..."
                    />
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setShowPlayground(true)}
                            className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold rounded-xl transition-all border border-blue-500/20 flex items-center"
                        >
                            <SparklesIcon className="w-4 h-4 mr-2" />
                            Test Playground
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] flex items-center"
                        >
                            <SuccessIcon className="w-4 h-4 mr-2" />
                            Lưu cấu hình
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">System Prompt (Core Logic)</label>
                    <textarea
                        value={editingProfile.systemInstruction}
                        onChange={e => setEditingProfile({ ...editingProfile, systemInstruction: e.target.value })}
                        className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 text-xs text-gray-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none font-mono"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Temperature</label>
                            <span className="text-xs text-emerald-400 font-mono">{editingProfile.temperature?.toFixed(2) || '0.00'}</span>
                        </div>
                        <input
                            type="range" min="0" max="2" step="0.05"
                            value={editingProfile.temperature || 0}
                            onChange={e => setEditingProfile({ ...editingProfile, temperature: parseFloat(e.target.value) })}
                            className="w-full h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                        <p className="text-[9px] text-gray-600 italic">0: Khách quan (Chính xác), 2: Sáng tạo (Ngẫu nhiên)</p>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Top P</label>
                            <span className="text-xs text-emerald-400 font-mono">{editingProfile.topP?.toFixed(2) || '1.00'}</span>
                        </div>
                        <input
                            type="range" min="0" max="1" step="0.05"
                            value={editingProfile.topP || 1}
                            onChange={e => setEditingProfile({ ...editingProfile, topP: parseFloat(e.target.value) })}
                            className="w-full h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                        <p className="text-[9px] text-gray-600 italic">Giới hạn tập hợp từ vựng dựa trên xác suất tích lũy.</p>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Request Token Limit</label>
                            <span className="text-xs text-blue-400 font-mono font-black bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/10">
                                {editingProfile.requestTokenLimit ? (editingProfile.requestTokenLimit / 1000).toFixed(0) + 'K' : '16K'} TOKENS
                            </span>
                        </div>
                        <input
                            type="range" min="4000" max="128000" step="1000"
                            value={editingProfile.requestTokenLimit || 16000}
                            onChange={e => setEditingProfile({ ...editingProfile, requestTokenLimit: parseInt(e.target.value) })}
                            className="w-full h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <p className="text-[9px] text-gray-600 italic">Giới hạn token cho mỗi batch request (Model context window).</p>
                    </div>
                </div>

                {/* Advanced Settings Accordion */}
                <div className="border border-white/10 rounded-xl overflow-hidden bg-black/20">
                    <button
                        onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                    >
                        <div className="flex items-center space-x-2">
                            <CogIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Advanced Settings</span>
                        </div>
                        <span className="text-gray-500">{isAdvancedOpen ? '▼' : '▶'}</span>
                    </button>

                    {isAdvancedOpen && (
                        <div className="p-6 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/40">
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Max Output Tokens</label>
                                <input
                                    type="number" min="1" max="8192"
                                    value={editingProfile.maxOutputTokens || ''}
                                    onChange={e => setEditingProfile({ ...editingProfile, maxOutputTokens: e.target.value ? parseInt(e.target.value) : undefined })}
                                    className="w-full bg-[#121418] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                    placeholder="e.g. 2048"
                                />
                            </div>


                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Top K</label>
                                    <span className="text-xs text-gray-400 font-mono">{editingProfile.topK || 'N/A'}</span>
                                </div>
                                <input
                                    type="range" min="1" max="100" step="1"
                                    value={editingProfile.topK || 40}
                                    onChange={e => setEditingProfile({ ...editingProfile, topK: parseInt(e.target.value) })}
                                    className="w-full h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Frequency Penalty</label>
                                    <span className="text-xs text-gray-400 font-mono">{editingProfile.frequencyPenalty?.toFixed(2) || '0.00'}</span>
                                </div>
                                <input
                                    type="range" min="-2" max="2" step="0.1"
                                    value={editingProfile.frequencyPenalty || 0}
                                    onChange={e => setEditingProfile({ ...editingProfile, frequencyPenalty: parseFloat(e.target.value) })}
                                    className="w-full h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                                <p className="text-[9px] text-gray-600 italic">Tránh lặp từ (-2 đến 2)</p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Presence Penalty</label>
                                    <span className="text-xs text-gray-400 font-mono">{editingProfile.presencePenalty?.toFixed(2) || '0.00'}</span>
                                </div>
                                <input
                                    type="range" min="-2" max="2" step="0.1"
                                    value={editingProfile.presencePenalty || 0}
                                    onChange={e => setEditingProfile({ ...editingProfile, presencePenalty: parseFloat(e.target.value) })}
                                    className="w-full h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                                <p className="text-[9px] text-gray-600 italic">Khuyến khích chủ đề mới (-2 đến 2)</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showPlayground && (
                <PromptPlayground
                    profile={editingProfile}
                    apiConfigs={apiConfigs}
                    currentTree={currentTree}
                    customInstructions={customInstructions}
                    onClose={() => setShowPlayground(false)}
                />
            )}
        </div>
    );
};

export default AIProfilesManager;
