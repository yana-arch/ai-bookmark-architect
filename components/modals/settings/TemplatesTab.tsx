import React from 'react';
import type { FolderTemplate } from '@/types';
import { LayersIcon, FolderIcon, SparklesIcon } from '../../ui/Icons';

interface TemplatesTabProps {
    folderTemplates: FolderTemplate[];
    onApplyFolderTemplate: (template: FolderTemplate) => void;
}

export const TemplatesTab: React.FC<TemplatesTabProps> = ({ folderTemplates = [], onApplyFolderTemplate }) => {
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

            <div className="grid gap-6">
                {(folderTemplates || []).map(template => (
                    <div key={template.id} className="bg-[#121418] border border-white/10 p-8 rounded-[2rem] hover:border-white/20 transition-all group relative overflow-hidden">
                        <div className="flex items-start justify-between relative z-10">
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-lg font-black text-white tracking-tight uppercase group-hover:text-orange-400 transition-colors">{template.name}</h4>
                                    <p className="text-xs text-gray-500 mt-1 max-w-md leading-relaxed">{template.description || 'Architectural framework for deep categorization.'}</p>
                                </div>
                                
                                <div className="flex items-center space-x-3">
                                    <div className="flex -space-x-2">
                                        {template.structure.slice(0, 4).map((_, i) => (
                                            <div key={i} className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm">
                                                <FolderIcon className="w-3 h-3 text-gray-400" />
                                            </div>
                                        ))}
                                    </div>
                                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
                                        {template.structure.length} ROOT CATEGORIES
                                    </span>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {template.structure.slice(0, 5).map((f, i) => (
                                        <span key={i} className="text-[9px] font-black px-2.5 py-1 rounded-lg bg-white/5 text-gray-400 uppercase tracking-tighter border border-white/5">
                                            {f.name}
                                        </span>
                                    ))}
                                    {template.structure.length > 5 && (
                                        <span className="text-[9px] font-black text-gray-600 uppercase tracking-tighter self-center">
                                            +{template.structure.length - 5} MORE
                                        </span>
                                    )}
                                </div>
                            </div>

                            <button 
                                onClick={() => onApplyFolderTemplate(template)} 
                                className="px-6 py-3 bg-white hover:bg-orange-500 text-black hover:text-white text-[10px] font-black rounded-xl transition-all shadow-xl uppercase tracking-widest active:scale-95 flex items-center"
                            >
                                <SparklesIcon className="w-3.5 h-3.5 mr-2" />
                                Deploy Template
                            </button>
                        </div>

                        {/* Background watermark */}
                        <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <LayersIcon className="w-32 h-32 text-white" />
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
