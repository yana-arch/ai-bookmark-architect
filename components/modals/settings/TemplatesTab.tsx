import React from 'react';
import type { FolderTemplate } from '@/types';

interface TemplatesTabProps {
    folderTemplates: FolderTemplate[];
    onApplyFolderTemplate: (template: FolderTemplate) => void;
}

export const TemplatesTab: React.FC<TemplatesTabProps> = ({ folderTemplates, onApplyFolderTemplate }) => {
    return (
        <div className="space-y-8 animate-slideIn">
            <div className="grid gap-4">
                {folderTemplates.map(template => (
                    <div key={template.id} className="bg-white/5 border border-white/10 p-5 rounded-2xl hover:bg-white/10 transition-all group">
                        <div className="flex items-start justify-between">
                            <div>
                                <h4 className="font-bold text-gray-200 mb-1">{template.name}</h4>
                                <p className="text-xs text-gray-500 mb-3">{template.description || 'No description provided'}</p>
                                <div className="flex flex-wrap gap-2">
                                    {template.structure.slice(0, 3).map((f, i) => (
                                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400">{f.name}</span>
                                    ))}
                                    {template.structure.length > 3 && <span className="text-[10px] text-gray-600">+{template.structure.length - 3} more</span>}
                                </div>
                            </div>
                            <button onClick={() => onApplyFolderTemplate(template)} className="px-4 py-2 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-xl border border-emerald-500/20 hover:bg-emerald-500 hover:text-black transition-all">
                                Apply
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
