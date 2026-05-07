import React from 'react';
import type { InstructionPreset, SmartClassifyRule } from '@/types';
import { TagIcon, LinkIcon, TrashIcon, SparklesIcon, AILogoIcon, LayersIcon } from '../../ui/Icons';

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
        <div className="space-y-10 animate-slideIn pb-10">
            <header className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <SparklesIcon className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight uppercase">Intelligence Core</h2>
                    <p className="text-xs text-gray-500 font-mono">TUNE LLM REASONING & CATEGORIZATION LOGIC</p>
                </div>
            </header>

            <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-3">
                        <AILogoIcon className="w-5 h-5 text-emerald-400" />
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Prompt Engineering</h3>
                    </div>
                    <div className="flex items-center space-x-2 bg-black/40 p-1 rounded-xl border border-white/5">
                        {instructionPresets.map(preset => (
                            <button 
                                key={preset.id}
                                onClick={() => onCustomInstructionsChange(preset.instructions)}
                                className="px-3 py-1.5 hover:bg-white/10 text-[10px] font-black text-gray-500 hover:text-white rounded-lg transition-all uppercase tracking-tighter"
                            >
                                {preset.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="flex flex-col space-y-2">
                        <div className="flex justify-between items-end px-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Base System Architecture</label>
                            <span className="text-[9px] text-emerald-500 font-mono">READ-ONLY CORE LOGIC</span>
                        </div>
                        <div className="relative group">
                            <textarea 
                                value={systemPrompt} onChange={e => onSystemPromptChange(e.target.value)}
                                className="w-full h-48 bg-[#121418] border border-white/10 rounded-2xl p-5 text-xs text-gray-400 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none resize-none font-mono leading-relaxed transition-all"
                                placeholder="Core AI logic definition..."
                            />
                            <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-40 transition-opacity">
                                <LayersIcon className="w-5 h-5 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col space-y-2">
                        <div className="flex justify-between items-end px-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Behavioral Overrides</label>
                            <span className="text-[9px] text-blue-400 font-mono">DYNAMIC USER INSTRUCTIONS</span>
                        </div>
                        <textarea 
                            value={customInstructions} onChange={e => onCustomInstructionsChange(e.target.value)}
                            className="w-full h-32 bg-[#121418] border border-white/10 rounded-2xl p-5 text-sm text-gray-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none resize-none transition-all shadow-inner"
                            placeholder="Add specific rules (e.g. 'Always use Vietnamese', 'Prefer deep nesting')..."
                        />
                    </div>
                </div>
            </section>

            <section>
                <div className="flex items-center justify-between mb-6 px-1">
                    <div className="flex items-center space-x-3">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Deterministic Mapping Rules</h3>
                        <div className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-black rounded uppercase tracking-tighter border border-emerald-500/20">
                            Pre-AI Filter
                        </div>
                    </div>
                    <button className="text-[10px] font-black text-emerald-400 hover:text-emerald-300 uppercase tracking-widest transition-colors flex items-center">
                        <span className="mr-1.5 text-lg leading-none">+</span>
                        Create Rule
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {smartClassifyRules.map(rule => (
                        <div key={rule.id} className="flex items-center justify-between bg-[#121418] border border-white/10 p-5 rounded-2xl group hover:border-white/20 transition-all relative overflow-hidden">
                            <div className="flex items-center space-x-4 relative z-10">
                                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/5">
                                    {rule.type === 'tag' ? <TagIcon className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" /> }
                                </div>
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm font-black text-white tracking-wide">{rule.pattern}</span>
                                        <span className="text-[9px] bg-white/5 text-gray-500 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">
                                            {rule.type}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-emerald-500/70 font-medium mt-0.5">
                                        <span className="text-gray-600 mr-1">DESTINATION:</span>
                                        {rule.targetPath.join(' / ')}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => onDeleteSmartRule(rule.id)} className="opacity-0 group-hover:opacity-100 p-2.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all relative z-10">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                            
                            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/30"></div>
                        </div>
                    ))}
                    {smartClassifyRules.length === 0 && (
                        <div className="col-span-2 text-center py-10 border-2 border-dashed border-white/5 rounded-3xl">
                            <p className="text-gray-500 text-sm italic">No mapping rules defined. AI will handle all categorization.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};
