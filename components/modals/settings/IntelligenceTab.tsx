import React, { useState } from 'react';
import type { InstructionPreset, SmartClassifyRule, ArchitectureStyle, AIProfile, ApiConfig, Folder, PromptModifiers } from '@/types';
import { TagIcon, LinkIcon, TrashIcon, SparklesIcon, AILogoIcon, LayersIcon, ChipIcon, XIcon, FolderIcon } from '../../ui/Icons';
import { ARCHITECTURE_STYLES } from '@/src/architectureStyles';
import AIProfilesManager from './AIProfilesManager';

interface IntelligenceTabProps {
    instructionPresets: InstructionPreset[];
    onCustomInstructionsChange: (instructions: string) => void;
    systemPrompt: string;
    onSystemPromptChange: (prompt: string) => void;
    customInstructions: string;
    smartClassifyRules: SmartClassifyRule[];
    onSaveSmartRule: (rule: SmartClassifyRule) => Promise<void> | void;
    onDeleteSmartRule: (id: string) => Promise<void> | void;
    
    // AI Profiles Props
    aiProfiles: AIProfile[];
    activeProfileId: string | null;
    setActiveProfileId: (id: string | null) => void;
    handleSaveProfile: (profile: AIProfile) => Promise<void> | void;
    handleDeleteProfile: (id: string) => Promise<void> | void;
    apiConfigs: ApiConfig[];
    currentTree: Folder[];
    
    // Architecture props
    selectedStyle: ArchitectureStyle;
    onStyleChange: (styleId: ArchitectureStyle) => void;

    // Tag Engine props
    tagDrivenMode: boolean;
    onTagDrivenModeChange: (enabled: boolean) => void;
    tagCount: number;
    onTagCountChange: (count: number) => void;
    tagLanguage: string;
    onTagLanguageChange: (lang: string) => void;

    // Prompt Modifiers
    promptModifiers: PromptModifiers;
    onPromptModifierChange: (key: keyof PromptModifiers, value: boolean) => void;

    // Lifted state for rule creation
    isAddingRule: boolean;
    setIsAddingRule: (isAdding: boolean) => void;
    newRulePattern: string;
    setNewRulePattern: (pattern: string) => void;
    newRuleType: 'tag' | 'link';
    setNewRuleType: (type: 'tag' | 'link') => void;
    newRulePath: string;
    setNewRulePath: (path: string) => void;
}

export const IntelligenceTab: React.FC<IntelligenceTabProps> = ({
    instructionPresets, onCustomInstructionsChange, systemPrompt,
    onSystemPromptChange, customInstructions, smartClassifyRules, onSaveSmartRule, onDeleteSmartRule,
    aiProfiles, activeProfileId, setActiveProfileId, handleSaveProfile, handleDeleteProfile, apiConfigs, currentTree,
    selectedStyle, onStyleChange,
    tagDrivenMode, onTagDrivenModeChange, tagCount, onTagCountChange, tagLanguage, onTagLanguageChange,
    promptModifiers, onPromptModifierChange,
    isAddingRule, setIsAddingRule, newRulePattern, setNewRulePattern, newRuleType, setNewRuleType, newRulePath, setNewRulePath
}) => {
    const handleAddRule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRulePattern || !newRulePath) return;

        await onSaveSmartRule({
            id: typeof crypto !== 'undefined' ? crypto.randomUUID() : `rule-${Date.now()}`,
            name: newRulePattern,
            type: newRuleType,
            pattern: newRulePattern,
            targetPath: newRulePath.split(/[\/\\]|>|→/).map(s => s.trim()).filter(Boolean),
            enabled: true,
            createdAt: Date.now()
        });

        setIsAddingRule(false);
        setNewRulePattern('');
        setNewRulePath('');
    };

    return (
        <div className="space-y-10 animate-slideIn pb-10">
            <header className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <SparklesIcon className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight uppercase">Intelligence Core</h2>
                    <p className="text-xs text-gray-500 font-mono">TUNE LLM REASONING & TAXONOMY ENGINE</p>
                </div>
            </header>

            {/* Architecture Style Section */}
            <section>
                <div className="flex items-center space-x-3 mb-6 px-1">
                    <ChipIcon className="w-4 h-4 text-blue-400" />
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Taxonomy Architecture</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {ARCHITECTURE_STYLES.map((style) => (
                        <button
                            key={style.id}
                            onClick={() => onStyleChange(style.id)}
                            className={`relative flex flex-col items-start text-left p-5 rounded-2xl border transition-all duration-300 group overflow-hidden ${
                                selectedStyle === style.id
                                    ? 'bg-blue-600/10 border-blue-500 ring-2 ring-blue-500/20'
                                    : 'bg-white/5 border-white/10 hover:border-white/20'
                            }`}
                        >
                            <div className="flex justify-between w-full mb-3">
                                <h3 className={`font-bold tracking-wider text-[11px] transition-colors uppercase ${
                                    selectedStyle === style.id ? 'text-blue-400' : 'text-gray-200'
                                }`}>
                                    {style.name}
                                </h3>
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                                    selectedStyle === style.id 
                                        ? 'border-blue-500 bg-blue-500' 
                                        : 'border-white/20'
                                }`}>
                                    {selectedStyle === style.id && (
                                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                    )}
                                </div>
                            </div>
                            
                            <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-2 group-hover:text-gray-400 transition-colors">
                                {style.longDescription}
                            </p>

                            {selectedStyle === style.id && (
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none"></div>
                            )}
                        </button>
                    ))}
                </div>
            </section>

            {/* Global Tag Engine Section */}
            <section className="bg-purple-500/5 border border-purple-500/10 rounded-3xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                    <LayersIcon className="w-32 h-32 text-purple-400" />
                </div>

                <div className="flex items-center justify-between mb-8 relative z-10">
                    <div className="flex items-center space-x-3">
                        <LayersIcon className="w-5 h-5 text-purple-400" />
                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Global Tag Engine</h3>
                            <p className="text-[9px] text-gray-500 italic mt-0.5">Dual-phase classification: Extraction → Global Mapping</p>
                        </div>
                    </div>
                    <button
                        onClick={() => onTagDrivenModeChange(!tagDrivenMode)}
                        className={`w-14 h-7 rounded-full transition-all duration-300 relative shadow-inner ${tagDrivenMode ? 'bg-purple-600' : 'bg-gray-800'}`}
                    >
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-lg ${tagDrivenMode ? 'left-8' : 'left-1'}`} />
                    </button>
                </div>

                <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 transition-all duration-500 ${tagDrivenMode ? 'opacity-100' : 'opacity-40 pointer-events-none grayscale'}`}>
                    <div className="space-y-4">
                        <div className="flex flex-col space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tags Per Bookmark</label>
                                <span className="text-[10px] text-purple-400 font-mono font-black">{tagCount} TAGS</span>
                            </div>
                            <input 
                                type="range" min="1" max="10" step="1"
                                value={tagCount} onChange={e => onTagCountChange(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                            <p className="text-[9px] text-gray-600 leading-relaxed italic">Higher counts improve discovery but increase folder complexity.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex flex-col space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Semantic Language</label>
                                <span className="text-[9px] text-blue-400 font-mono uppercase">Output Optimization</span>
                            </div>
                            <input 
                                type="text" 
                                value={tagLanguage} 
                                onChange={e => onTagLanguageChange(e.target.value)}
                                placeholder="e.g. English, Vietnamese, Tech Slang..."
                                className="w-full bg-[#121418] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all font-medium"
                            />
                        </div>
                    </div>
                </div>
                {!tagDrivenMode && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#1a1d23]/20 backdrop-blur-[1px] rounded-3xl z-20">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Engine Offline</p>
                    </div>
                )}
            </section>

            <AIProfilesManager 
                aiProfiles={aiProfiles}
                activeProfileId={activeProfileId}
                setActiveProfileId={setActiveProfileId}
                onSaveProfile={handleSaveProfile}
                onDeleteProfile={handleDeleteProfile}
                apiConfigs={apiConfigs}
                currentTree={currentTree}
                customInstructions={customInstructions}
            />

            {/* Prompt Modifiers Section */}
            <section className="bg-white/5 border border-white/10 rounded-3xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
                    <FolderIcon className="w-32 h-32 text-white" />
                </div>

                <div className="flex items-center space-x-3 mb-8 relative z-10">
                    <SparklesIcon className="w-5 h-5 text-blue-400" />
                    <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Structural Requirements</h3>
                        <p className="text-[9px] text-gray-500 italic mt-0.5">Prompt Modifiers for Folder Formatting</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
                    {[
                        { key: 'flattenStructure', label: 'Flatten Structure', desc: 'Max 1 level deep' },
                        { key: 'groupByDomain', label: 'Group by Domain', desc: 'Prioritize websites' },
                        { key: 'useEmojis', label: 'Use Emojis', desc: 'Add icons to names' },
                        { key: 'strictTechnical', label: 'Strict Technical', desc: 'Use standard dev terms' },
                        { key: 'groupByPurpose', label: 'Group by Purpose', desc: 'E.g., Read Later, Tools' },
                        { key: 'shortFolderNames', label: 'Short Folder Names', desc: 'Concise, 1-2 words max' },
                    ].map((mod) => {
                        const isChecked = promptModifiers[mod.key as keyof PromptModifiers];
                        return (
                            <label key={mod.key} className="flex items-center space-x-3 p-4 bg-[#121418] border border-white/10 hover:border-blue-500/50 rounded-xl cursor-pointer transition-all group">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                                    isChecked ? 'bg-blue-500 border-blue-500' : 'border-white/20 group-hover:border-white/40'
                                }`}>
                                    {isChecked && <div className="w-2 h-2 bg-white rounded-sm"></div>}
                                </div>
                                <div>
                                    <h4 className="text-[11px] font-bold text-white uppercase tracking-wider">{mod.label}</h4>
                                    <p className="text-[9px] text-gray-500">{mod.desc}</p>
                                </div>
                                <input 
                                    type="checkbox" 
                                    checked={isChecked} 
                                    onChange={(e) => onPromptModifierChange(mod.key as keyof PromptModifiers, e.target.checked)} 
                                    className="hidden" 
                                />
                            </label>
                        );
                    })}
                </div>
            </section>

            <section className="bg-white/5 border border-white/10 rounded-3xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
                    <AILogoIcon className="w-32 h-32 text-white" />
                </div>

                <div className="flex items-center justify-between mb-8 relative z-10">
                    <div className="flex items-center space-x-3">
                        <AILogoIcon className="w-5 h-5 text-emerald-400" />
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Behavioral Overrides</h3>
                    </div>
                    <div className="flex items-center space-x-2 bg-black/40 p-1 rounded-xl border border-white/5">
                        {instructionPresets.map(preset => (
                            <button 
                                key={preset.id}
                                onClick={() => onCustomInstructionsChange(preset.customInstructions)}
                                className="px-3 py-1.5 hover:bg-white/10 text-[10px] font-black text-gray-500 hover:text-white rounded-lg transition-all uppercase tracking-tighter"
                            >
                                {preset.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-8 relative z-10">
                    <div className="flex flex-col space-y-2">
                        <textarea 
                            value={customInstructions} onChange={e => onCustomInstructionsChange(e.target.value)}
                            className="w-full h-32 bg-[#121418] border border-white/10 rounded-2xl p-5 text-sm text-gray-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none resize-none transition-all shadow-inner"
                            placeholder="Add specific rules (e.g. 'Always use Vietnamese', 'Prefer deep nesting')..."
                        />
                        <p className="text-[10px] text-gray-500 italic px-1">Các quy tắc này sẽ được ưu tiên cao nhất, ghi đè lên System Prompt của Profile hiện tại.</p>
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
                    <button 
                        onClick={() => setIsAddingRule(!isAddingRule)}
                        className={`text-[10px] font-black uppercase tracking-widest transition-all flex items-center px-4 py-2 rounded-xl border ${
                            isAddingRule 
                            ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                    >
                        {isAddingRule ? (
                            <>
                                <XIcon className="w-3 h-3 mr-2" />
                                Cancel
                            </>
                        ) : (
                            <>
                                <span className="mr-1.5 text-lg leading-none">+</span>
                                Create Rule
                            </>
                        )}
                    </button>
                </div>

                {isAddingRule && (
                    <form onSubmit={handleAddRule} className="mb-8 p-6 bg-white/5 border border-emerald-500/20 rounded-3xl space-y-6 animate-fadeIn">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Match Pattern (Tag or URL)</label>
                                <input 
                                    type="text" value={newRulePattern} onChange={e => setNewRulePattern(e.target.value)}
                                    className="w-full bg-[#121418] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                                    placeholder="e.g. 'programming' or 'github.com'"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Rule Logic Type</label>
                                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                                    {(['tag', 'link'] as const).map(t => (
                                        <button
                                            key={t} type="button" onClick={() => setNewRuleType(t)}
                                            className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all uppercase tracking-tighter ${
                                                newRuleType === t ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
                                            }`}
                                        >
                                            {t === 'tag' ? 'Tag Match' : 'URL Substring'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Target Folder Path (Separate by /, &gt;, or →)</label>
                            <input 
                                type="text" value={newRulePath} onChange={e => setNewRulePath(e.target.value)}
                                className="w-full bg-[#121418] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                                placeholder="e.g. 'Development > Web > Frontend'"
                                required
                            />
                        </div>
                        <div className="flex justify-end pt-2">
                            <button 
                                type="submit"
                                className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] uppercase tracking-widest active:scale-95"
                            >
                                Activate Deterministic Rule
                            </button>
                        </div>
                    </form>
                )}

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
                    {smartClassifyRules.length === 0 && !isAddingRule && (
                        <div className="col-span-2 text-center py-10 border-2 border-dashed border-white/5 rounded-3xl">
                            <p className="text-gray-500 text-sm italic">No mapping rules defined. AI will handle all categorization.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};


