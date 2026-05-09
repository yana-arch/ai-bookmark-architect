import React from 'react';
import type { FolderTemplate } from '@/types';
import { LayersIcon, FolderIcon, SparklesIcon } from '../../ui/Icons';

interface TemplatesTabProps {
    folderTemplates: FolderTemplate[];
    onApplyFolderTemplate: (template: FolderTemplate) => void;
    onSaveFolderTemplate?: (template: FolderTemplate) => void;
}

export const TemplatesTab: React.FC<TemplatesTabProps> = ({ 
    folderTemplates = [], 
    onApplyFolderTemplate,
    onSaveFolderTemplate 
}) => {
    const [editingTemplateId, setEditingTemplateId] = React.useState<string | null>(null);

    return (
        <div className="space-y-10 animate-slideIn pb-10">
            <header className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                    <LayersIcon className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight uppercase">Structural Templates</h2>
                    <p className="text-xs text-gray-500 font-mono">ENFORCE SYSTEMATIC TAXONOMIES & HIERARCHIES</p>
                </div>
            </header>

            <div className="grid gap-8">
                {(folderTemplates || []).map(template => (
                    <div key={template.id} className="bg-[#121418]/60 border border-white/5 p-10 rounded-[2.5rem] hover:border-white/10 transition-all duration-500 group relative overflow-hidden flex flex-col shadow-2xl">
                        <div className="flex flex-col md:flex-row items-start justify-between relative z-10 mb-8 gap-8">
                            <div className="space-y-6 flex-1">
                                <div>
                                    <h4 className="text-xl font-black text-white tracking-[0.05em] uppercase group-hover:text-orange-400 transition-colors duration-500">{template.name}</h4>
                                    <p className="text-[11px] text-gray-500 mt-2 max-w-xl leading-relaxed font-medium">{template.description || 'Architectural framework for deep categorization and systematic knowledge management.'}</p>
                                </div>
                                
                                <div className="flex items-center space-x-4">
                                    <div className="flex -space-x-3">
                                        {template.structure.slice(0, 5).map((_, i) => (
                                            <div key={i} className="w-8 h-8 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center backdrop-blur-md shadow-lg group-hover:translate-y-[-2px] transition-transform duration-500" style={{ transitionDelay: `${i * 50}ms` }}>
                                                <FolderIcon className="w-3.5 h-3.5 text-orange-400/60" />
                                            </div>
                                        ))}
                                    </div>
                                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
                                        {template.structure.length} ROOT CATEGORIES
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col space-y-3 w-full md:w-auto">
                                <button 
                                    onClick={() => onApplyFolderTemplate(template)} 
                                    className="px-10 py-5 bg-white hover:bg-orange-600 text-black hover:text-white text-[11px] font-black rounded-2xl transition-all shadow-2xl uppercase tracking-[0.2em] active:scale-[0.97] flex items-center justify-center shadow-white/5 hover:shadow-orange-500/20"
                                >
                                    <SparklesIcon className="w-4 h-4 mr-3" />
                                    Deploy System
                                </button>
                                <button 
                                    onClick={() => setEditingTemplateId(editingTemplateId === template.id ? null : template.id)}
                                    className={`px-10 py-3 rounded-2xl transition-all duration-500 uppercase tracking-[0.2em] text-[9px] font-black border active:scale-[0.97] ${
                                        editingTemplateId === template.id 
                                        ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.1)]' 
                                        : 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-500 hover:text-gray-300'
                                    }`}
                                >
                                    {editingTemplateId === template.id ? 'Close Directives' : 'Refine Directives'}
                                </button>
                            </div>
                        </div>

                        {editingTemplateId === template.id && (
                            <div className="relative z-10 p-8 bg-black/40 rounded-[2rem] border border-white/5 space-y-8 animate-slideDown shadow-inner">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-2">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Base Engine Instruction</label>
                                        </div>
                                        <span className="text-[9px] px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/10 uppercase font-black tracking-tighter">Direct Taxonomy Mode</span>
                                    </div>
                                    <textarea 
                                        value={template.customPrompt || ''}
                                        onChange={(e) => onSaveFolderTemplate?.({ ...template, customPrompt: e.target.value })}
                                        placeholder="Define custom behavioral directives for standard categorization mode..."
                                        className="w-full h-28 bg-[#0a0c0e]/60 border border-white/5 rounded-[1.5rem] p-6 text-xs text-gray-300 focus:border-orange-500/50 outline-none resize-none transition-all font-medium placeholder:text-gray-700 shadow-inner custom-scrollbar"
                                    />
                                </div>
                                
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-2">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tag-Driven Instruction</label>
                                        </div>
                                        <span className="text-[9px] px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/10 uppercase font-black tracking-tighter">Global Semantic Mode</span>
                                    </div>
                                    <textarea 
                                        value={template.tagDrivenPrompt || ''}
                                        onChange={(e) => onSaveFolderTemplate?.({ ...template, tagDrivenPrompt: e.target.value })}
                                        placeholder="Define custom behavioral directives for tag-driven global mapping mode..."
                                        className="w-full h-28 bg-[#0a0c0e]/60 border border-white/5 rounded-[1.5rem] p-6 text-xs text-gray-300 focus:border-orange-500/50 outline-none resize-none transition-all font-medium placeholder:text-gray-700 shadow-inner custom-scrollbar"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="mt-8 flex flex-wrap gap-3 relative z-10">
                            {template.structure.slice(0, 6).map((f, i) => (
                                <span key={i} className="text-[9px] font-black px-4 py-2 rounded-xl bg-white/5 text-gray-500 uppercase tracking-widest border border-white/5 group-hover:bg-white/[0.08] transition-colors duration-500">
                                    {f.name}
                                </span>
                            ))}
                            {template.structure.length > 6 && (
                                <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest self-center ml-2">
                                    +{template.structure.length - 6} ARCHITECTURAL NODES
                                </span>
                            )}
                        </div>

                        {/* Background architectural watermark */}
                        <div className="absolute -right-8 -bottom-8 opacity-[0.03] group-hover:opacity-[0.07] transition-all duration-1000 group-hover:scale-110 pointer-events-none">
                            <LayersIcon className="w-48 h-48 text-white" />
                        </div>
                    </div>
                ))}

                {folderTemplates.length === 0 && (
                    <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-[2.5rem]">
                        <LayersIcon className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-20" />
                        <p className="text-gray-500 text-sm font-medium">No custom structural templates found.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
