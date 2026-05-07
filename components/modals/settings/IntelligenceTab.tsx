import React from 'react';
import type { InstructionPreset, SmartClassifyRule } from '@/types';
import { TagIcon, LinkIcon, TrashIcon } from '../../ui/Icons';

interface IntelligenceTabProps {
    instructionPresets: InstructionPreset[];
    onCustomInstructionsChange: (instructions: string) => void;
    systemPrompt: string;
    onSystemPromptChange: (prompt: string) => void;
    customInstructions: string;
    smartClassifyRules: SmartClassifyRule[];
    onDeleteSmartRule: (id: string) => void;
}

export const IntelligenceTab: React.FC<IntelligenceTabProps> = ({
    instructionPresets, onCustomInstructionsChange, systemPrompt,
    onSystemPromptChange, customInstructions, smartClassifyRules, onDeleteSmartRule
}) => {
    return (
        <div className="space-y-8 animate-slideIn pb-10">
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">System Intelligence</h3>
                    <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">Quick Presets:</span>
                        {instructionPresets.map(preset => (
                            <button 
                                key={preset.id}
                                onClick={() => onCustomInstructionsChange(preset.instructions)}
                                className="px-2 py-1 bg-white/5 hover:bg-emerald-500/20 text-[10px] text-gray-400 hover:text-emerald-400 rounded-md border border-white/5 hover:border-emerald-500/20 transition-all"
                            >
                                {preset.name}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-1">
                        <div className="flex">
                            <button className="flex-1 py-2 text-xs font-bold text-emerald-400 border-b-2 border-emerald-500">Classification</button>
                            <button className="flex-1 py-2 text-xs font-bold text-gray-500 hover:text-gray-300">Planning</button>
                            <button className="flex-1 py-2 text-xs font-bold text-gray-500 hover:text-gray-300">Custom Rules</button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-3 tracking-widest">Primary System Prompt</label>
                        <textarea 
                            value={systemPrompt} onChange={e => onSystemPromptChange(e.target.value)}
                            className="w-full h-48 bg-black/40 border border-white/10 rounded-2xl p-5 text-sm text-gray-300 focus:ring-2 focus:ring-emerald-500/50 outline-none resize-none font-mono leading-relaxed"
                            placeholder="Define the AI's core logic..."
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-3 tracking-widest">User Custom Instructions</label>
                        <textarea 
                            value={customInstructions} onChange={e => onCustomInstructionsChange(e.target.value)}
                            className="w-full h-32 bg-black/40 border border-white/10 rounded-2xl p-5 text-sm text-gray-300 focus:ring-2 focus:ring-emerald-500/50 outline-none resize-none"
                            placeholder="Add your own rules (e.g., 'Ưu tiên tiếng Việt', 'Gộp các folder trùng')..."
                        />
                    </div>
                </div>
            </section>

            <section className="pt-8 border-t border-white/5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Smart Mapping Rules</h3>
                    <button className="text-xs text-emerald-400 hover:underline">Add Rule</button>
                </div>
                <div className="grid gap-3">
                    {smartClassifyRules.map(rule => (
                        <div key={rule.id} className="flex items-center justify-between bg-white/5 border border-white/10 p-4 rounded-2xl group hover:bg-white/10 transition-all">
                            <div className="flex items-center space-x-4">
                                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                                    {rule.type === 'tag' ? <TagIcon className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" /> }
                                </div>
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm font-bold text-gray-200">{rule.pattern}</span>
                                        <span className="text-[10px] text-gray-500 uppercase">Match {rule.type}</span>
                                    </div>
                                    <p className="text-xs text-emerald-400/70">→ {rule.targetPath.join(' / ')}</p>
                                </div>
                            </div>
                            <button onClick={() => onDeleteSmartRule(rule.id)} className="opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-red-400 transition-all">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};
