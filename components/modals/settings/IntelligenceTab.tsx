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
    onPromptModifierChange: (key: keyof PromptModifiers, value: boolean | number) => void;

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

            <section>
                <div className="flex items-center space-x-3 mb-6 px-1">
                    <ChipIcon className="w-4 h-4 text-blue-400" />
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Taxonomy Architecture</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {ARCHITECTURE_STYLES.map((style) => (
                        <button
                            key={style.id}
                            onClick={() => onStyleChange(style.id)}
                            className={`relative flex flex-col items-start text-left p-6 rounded-[2rem] border transition-all duration-500 group overflow-hidden ${
                                selectedStyle === style.id
                                    ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.1)]'
                                    : 'bg-[#121418]/60 border-white/5 hover:border-white/10'
                            }`}
                        >
                            <div className="flex justify-between w-full mb-4 relative z-10">
                                <h3 className={`font-black tracking-widest text-[10px] transition-colors uppercase ${
                                    selectedStyle === style.id ? 'text-blue-400' : 'text-gray-400'
                                }`}>
                                    {style.name}
                                </h3>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                                    selectedStyle === style.id 
                                        ? 'border-blue-500 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' 
                                        : 'border-white/10 group-hover:border-white/20'
                                }`}>
                                    {selectedStyle === style.id && (
                                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                    )}
                                </div>
                            </div>
                            
                            <p className="text-[10px] text-gray-500 leading-relaxed group-hover:text-gray-300 transition-colors relative z-10">
                                {style.longDescription}
                            </p>

                            <div className={`absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent transition-opacity duration-500 ${selectedStyle === style.id ? 'opacity-100' : 'opacity-0'}`}></div>
                        </button>
                    ))}
                </div>
            </section>

            {/* Global Tag Engine Section */}
            <section className="bg-gradient-to-br from-purple-500/10 to-indigo-500/5 border border-purple-500/10 rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl shadow-purple-500/5">
                <div className="absolute top-0 right-0 p-10 opacity-[0.05] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                    <LayersIcon className="w-40 h-40 text-purple-400" />
                </div>

                <div className="flex items-center justify-between mb-10 relative z-10">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-purple-500/20 rounded-2xl border border-purple-500/20 shadow-inner">
                            <LayersIcon className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="text-xs font-black text-white uppercase tracking-widest">Global Tag Engine</h3>
                            <p className="text-[10px] text-gray-500 italic mt-0.5 font-medium">Dual-phase classification: Extraction → Global Mapping</p>
                        </div>
                    </div>
                    <button
                        onClick={() => onTagDrivenModeChange(!tagDrivenMode)}
                        className={`w-16 h-8 rounded-full transition-all duration-500 relative shadow-2xl ${tagDrivenMode ? 'bg-purple-600 shadow-purple-500/20' : 'bg-gray-800'}`}
                    >
                        <div className={`absolute top-1.5 w-5 h-5 bg-white rounded-full transition-all duration-500 shadow-lg ${tagDrivenMode ? 'left-9' : 'left-1.5'}`} />
                    </button>
                </div>

                <div className={`grid grid-cols-1 md:grid-cols-2 gap-10 transition-all duration-700 ${tagDrivenMode ? 'opacity-100 translate-y-0' : 'opacity-20 pointer-events-none grayscale translate-y-2'}`}>
                    <div className="space-y-6">
                        <div className="flex flex-col space-y-3">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tags Per Bookmark</label>
                                <span className="text-[11px] text-purple-400 font-mono font-black bg-purple-500/10 px-3 py-1 rounded-lg border border-purple-500/10">{tagCount} TAGS</span>
                            </div>
                            <input 
                                type="range" min="1" max="10" step="1"
                                value={tagCount} onChange={e => onTagCountChange(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400 transition-all"
                            />
                            <p className="text-[9px] text-gray-600 leading-relaxed font-medium">Higher counts improve discovery but increase folder complexity.</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex flex-col space-y-3">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Semantic Language</label>
                                <div className="flex items-center space-x-1.5">
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                                    <span className="text-[9px] text-blue-400 font-black uppercase tracking-tighter">Output Tuning</span>
                                </div>
                            </div>
                            <input 
                                type="text" 
                                value={tagLanguage} 
                                onChange={e => onTagLanguageChange(e.target.value)}
                                placeholder="e.g. English, Vietnamese, Tech Slang..."
                                className="w-full bg-black/30 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all font-medium placeholder:text-gray-700 shadow-inner"
                            />
                        </div>
                    </div>
                </div>
                {!tagDrivenMode && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#1a1d23]/40 backdrop-blur-[2px] rounded-3xl z-20 animate-fadeIn">
                        <div className="px-6 py-2 bg-black/60 border border-white/10 rounded-full backdrop-blur-md">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Tag Engine Inactive</p>
                        </div>
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
            <section className="bg-[#121418]/40 border border-white/5 rounded-[2.5rem] p-10 relative overflow-hidden shadow-xl">
                <div className="absolute bottom-0 right-0 p-10 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                    <FolderIcon className="w-48 h-48 text-white" />
                </div>

                <div className="flex items-center space-x-4 mb-10 relative z-10">
                    <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/10">
                        <SparklesIcon className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-xs font-black text-white uppercase tracking-widest">Structural Requirements</h3>
                        <p className="text-[10px] text-gray-500 italic mt-0.5 font-medium">Prompt Modifiers for Folder Formatting</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 relative z-10">
                    {/* Max Folder Depth Slider */}
                    <div className="col-span-1 md:col-span-2 lg:col-span-3 p-8 bg-black/40 border border-white/5 hover:border-blue-500/30 rounded-[2rem] transition-all group shadow-inner">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h4 className="text-[11px] font-black text-white uppercase tracking-wider">Max Taxonomy Depth</h4>
                                <p className="text-[10px] text-gray-500 font-medium mt-1">Maximum allowed nesting levels (1 = completely flat)</p>
                            </div>
                            <div className="text-blue-400 font-black text-base bg-blue-500/20 px-4 py-2 rounded-2xl border border-blue-500/20 shadow-xl">
                                {promptModifiers.maxFolderDepth || 2}
                            </div>
                        </div>
                        <input 
                            type="range" 
                            min="1" 
                            max="5" 
                            value={promptModifiers.maxFolderDepth || 2} 
                            onChange={(e) => onPromptModifierChange('maxFolderDepth', parseInt(e.target.value))}
                            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
                        />
                        <div className="flex justify-between text-[10px] text-gray-600 mt-4 px-2 font-black tracking-widest">
                            <span>FLAT (1)</span>
                            <span>LEVEL 2</span>
                            <span>LEVEL 3</span>
                            <span>LEVEL 4</span>
                            <span>MAX (5)</span>
                        </div>
                    </div>

                    {[
                        { key: 'groupByDomain', label: 'Group by Domain', desc: 'Prioritize hostnames' },
                        { key: 'useEmojis', label: 'Use Emojis', desc: 'Visual folder icons' },
                        { key: 'strictTechnical', label: 'Strict Technical', desc: 'Dev-centric naming' },
                        { key: 'groupByPurpose', label: 'Group by Purpose', desc: 'Intent-based buckets' },
                        { key: 'shortFolderNames', label: 'Short Naming', desc: '1-2 words maximum' },
                    ].map((mod) => {
                        const isChecked = promptModifiers[mod.key as keyof PromptModifiers] as boolean;
                        return (
                            <label key={mod.key} className={`flex items-center space-x-4 p-5 rounded-[1.5rem] cursor-pointer transition-all duration-300 border ${
                                isChecked 
                                ? 'bg-blue-600/10 border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
                                : 'bg-black/30 border-white/5 hover:border-white/10'
                            }`}>
                                <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all duration-500 shadow-inner ${
                                    isChecked ? 'bg-blue-500 border-blue-500 scale-110' : 'border-white/10'
                                }`}>
                                    {isChecked && (
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                                <div>
                                    <h4 className={`text-[11px] font-black uppercase tracking-wider transition-colors ${isChecked ? 'text-white' : 'text-gray-400'}`}>{mod.label}</h4>
                                    <p className="text-[9px] text-gray-600 font-medium">{mod.desc}</p>
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


