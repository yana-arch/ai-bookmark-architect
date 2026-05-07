import React, { useState } from 'react';
import type { Bookmark, Folder } from '@/types';
import { ExportIcon, DownloadIcon, ImportIcon, UploadIcon, DatabaseIcon } from '../../ui/Icons';

interface DataTabProps {
    bookmarks: Bookmark[];
    folders: Folder[];
    onExport: (options: any) => void;
    importFile: File | null;
    previewBookmarks: Bookmark[];
    onFileSelect: (file: File | null) => void;
    onImport: (mode: 'merge' | 'overwrite') => void;
}

export const DataTab: React.FC<DataTabProps> = ({
    bookmarks, folders, onExport, importFile, previewBookmarks, onFileSelect, onImport
}) => {
    const [exportOptions, setExportOptions] = useState({
        format: 'html' as 'html' | 'csv' | 'json' | 'md',
        selectedFolders: [] as string[],
        selectedTags: [] as string[],
        includeArchived: false
    });

    return (
        <div className="space-y-10 animate-slideIn pb-10">
            <section>
                <div className="flex items-center space-x-3 mb-6">
                    <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                        <ExportIcon className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Export Engine</h3>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Select Format</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {(['html', 'csv', 'json', 'md'] as const).map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setExportOptions(prev => ({ ...prev, format: f }))}
                                        className={`p-4 rounded-2xl border-2 text-center transition-all ${
                                            exportOptions.format === f 
                                            ? 'border-blue-500 bg-blue-500/10 text-blue-400' 
                                            : 'border-white/5 hover:border-white/10 text-gray-500'
                                        }`}
                                    >
                                        <div className="text-sm font-bold uppercase">{f}</div>
                                        <div className="text-[10px] opacity-60">{f === 'html' ? 'Browser' : f === 'md' ? 'Docs' : 'Data'}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Filter by Folder</label>
                                <div className="bg-black/40 border border-white/10 rounded-2xl p-4 h-48 overflow-y-auto custom-scrollbar">
                                    {folders.map(f => (
                                        <label key={f.id} className="flex items-center space-x-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={exportOptions.selectedFolders.includes(f.id)}
                                                onChange={() => setExportOptions(prev => ({
                                                    ...prev,
                                                    selectedFolders: prev.selectedFolders.includes(f.id) 
                                                        ? prev.selectedFolders.filter(id => id !== f.id)
                                                        : [...prev.selectedFolders, f.id]
                                                }))}
                                                className="w-4 h-4 rounded border-white/10 bg-black/40 text-blue-500 focus:ring-0"
                                            />
                                            <span className="text-sm text-gray-300">{f.name}</span>
                                        </label>
                                    ))}
                                    {folders.length === 0 && <p className="text-xs text-gray-600 italic">No folders created yet</p>}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Filter by Tags</label>
                                <div className="bg-black/40 border border-white/10 rounded-2xl p-4 h-48 overflow-y-auto custom-scrollbar flex flex-wrap gap-2">
                                    {Array.from(new Set(bookmarks.flatMap(b => b.tags || []))).map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => setExportOptions(prev => ({
                                                ...prev,
                                                selectedTags: prev.selectedTags.includes(tag)
                                                    ? prev.selectedTags.filter(t => t !== tag)
                                                    : [...prev.selectedTags, tag]
                                            }))}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                                exportOptions.selectedTags.includes(tag)
                                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                : 'bg-white/5 text-gray-500 border border-white/5'
                                            }`}
                                        >
                                            #{tag}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center text-center">
                        <div className="text-4xl font-black text-white mb-2">{bookmarks.length}</div>
                        <p className="text-xs text-gray-500 mb-8 uppercase tracking-widest">Bookmarks Ready</p>
                        <button 
                            onClick={() => onExport(exportOptions)}
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-2xl transition-all shadow-[0_0_30px_rgba(59,130,246,0.3)] flex items-center justify-center"
                        >
                            <DownloadIcon className="w-5 h-5 mr-3" />
                            Generate Export
                        </button>
                    </div>
                </div>
            </section>

            <section className="pt-10 border-t border-white/5">
                <div className="flex items-center space-x-3 mb-6">
                    <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                        <ImportIcon className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Import Studio</h3>
                </div>

                {!importFile ? (
                    <div className="border-2 border-dashed border-white/10 rounded-3xl p-12 flex flex-col items-center justify-center text-center group hover:border-emerald-500/50 transition-all cursor-pointer relative">
                        <input 
                            type="file" 
                            onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
                            className="absolute inset-0 opacity-0 cursor-pointer" 
                        />
                        <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                            <UploadIcon className="w-8 h-8" />
                        </div>
                        <h4 className="text-lg font-bold text-white mb-2">Drop your backup file here</h4>
                        <p className="text-sm text-gray-500">Supports HTML, CSV, and JSON formats from Chrome, Safari, and Firefox.</p>
                    </div>
                ) : (
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 animate-fadeIn">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl">
                                    <DatabaseIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white">{importFile.name}</h4>
                                    <p className="text-xs text-gray-500">{(importFile.size / 1024).toFixed(1)} KB • Ready for processing</p>
                                </div>
                            </div>
                            <button onClick={() => onFileSelect(null)} className="text-xs font-bold text-red-400 hover:underline">Change File</button>
                        </div>

                        <div className="grid grid-cols-3 gap-6 mb-8">
                            <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                                <div className="text-xl font-bold text-white">{previewBookmarks.length}</div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-tighter">Total Detected</div>
                            </div>
                            <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                                <div className="text-xl font-bold text-emerald-400">{previewBookmarks.filter(b => b.url).length}</div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-tighter">Valid Links</div>
                            </div>
                            <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                                <div className="text-xl font-bold text-orange-400">0</div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-tighter">Conflicts Found</div>
                            </div>
                        </div>

                        <div className="flex space-x-4">
                            <button 
                                onClick={() => onImport('merge')}
                                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black font-bold py-4 rounded-2xl transition-all"
                            >
                                Merge into Library
                            </button>
                            <button 
                                onClick={() => onImport('overwrite')}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl transition-all border border-white/10"
                            >
                                Overwrite Library
                            </button>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
};
