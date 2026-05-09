import React, { useState } from 'react';
import type { Bookmark, Folder } from '@/types';
import { ExportIcon, DownloadIcon, ImportIcon, UploadIcon, DatabaseIcon, LayersIcon, TagIcon } from '../../ui/Icons';

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

    const formatDetails = {
        html: { name: 'Web Browser', desc: 'Standard bookmark format' },
        csv: { name: 'Spreadsheet', desc: 'Excel / Google Sheets' },
        json: { name: 'Raw Data', desc: 'Developer / Backup' },
        md: { name: 'Markdown', desc: 'Notion / Obsidian' }
    };

    return (
        <div className="space-y-12 animate-slideIn pb-10">
            <header className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                    <DatabaseIcon className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight uppercase">Data Orchestration</h2>
                    <p className="text-xs text-gray-500 font-mono">EXPORT, IMPORT & ARCHIVE MANAGEMENT</p>
                </div>
            </header>

            <section>
                <div className="flex items-center justify-between mb-8 px-1">
                    <div className="flex items-center space-x-3">
                        <ExportIcon className="w-5 h-5 text-blue-400" />
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Advanced Export Engine</h3>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-3 space-y-10">
                        <div className="space-y-4">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Target Format</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {(['html', 'csv', 'json', 'md'] as const).map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setExportOptions(prev => ({ ...prev, format: f }))}
                                        className={`p-5 rounded-2xl border transition-all relative overflow-hidden group ${exportOptions.format === f
                                                ? 'border-blue-500 bg-blue-500/10 text-white shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                                                : 'border-white/5 bg-[#121418] hover:border-white/10 text-gray-500'
                                            }`}
                                    >
                                        <div className="text-sm font-black uppercase tracking-widest relative z-10">{f}</div>
                                        <div className="text-[9px] opacity-60 mt-1 relative z-10">{formatDetails[f].name}</div>
                                        {exportOptions.format === f && (
                                            <div className="absolute -right-2 -bottom-2 opacity-10">
                                                <DownloadIcon className="w-12 h-12" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Selective Folders</label>
                                    <LayersIcon className="w-4 h-4 text-gray-600" />
                                </div>
                                <div className="bg-[#121418] border border-white/10 rounded-2xl p-4 h-72 overflow-y-auto custom-scrollbar space-y-1 shadow-inner">
                                    {folders.map(f => (
                                        <label key={f.id} className={`flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-colors ${exportOptions.selectedFolders.includes(f.id) ? 'bg-blue-500/10 border border-blue-500/20' : 'hover:bg-white/5 border border-transparent'
                                            }`}>
                                            <input
                                                type="checkbox"
                                                checked={exportOptions.selectedFolders.includes(f.id)}
                                                onChange={() => setExportOptions(prev => ({
                                                    ...prev,
                                                    selectedFolders: prev.selectedFolders.includes(f.id)
                                                        ? prev.selectedFolders.filter(id => id !== f.id)
                                                        : [...prev.selectedFolders, f.id]
                                                }))}
                                                className="w-4 h-4 rounded border-white/10 bg-black/40 text-blue-500 focus:ring-0 transition-all"
                                            />
                                            <span className={`text-xs font-bold uppercase tracking-tight ${exportOptions.selectedFolders.includes(f.id) ? 'text-blue-400' : 'text-gray-400'}`}>
                                                {f.name}
                                            </span>
                                        </label>
                                    ))}
                                    {folders.length === 0 && <p className="text-[10px] text-gray-600 italic p-4 text-center">No folders created yet</p>}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tag Filtering</label>
                                    <TagIcon className="w-4 h-4 text-gray-600" />
                                </div>
                                <div className="bg-[#121418] border border-white/10 rounded-2xl p-4 h-72 overflow-y-auto custom-scrollbar flex flex-wrap gap-2 content-start shadow-inner">
                                    {Array.from(new Set(bookmarks.flatMap(b => b.tags || []))).map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => setExportOptions(prev => ({
                                                ...prev,
                                                selectedTags: prev.selectedTags.includes(tag)
                                                    ? prev.selectedTags.filter(t => t !== tag)
                                                    : [...prev.selectedTags, tag]
                                            }))}
                                            className={`px-3 py-2 rounded-xl text-[10px] font-bold transition-all uppercase tracking-tight ${exportOptions.selectedTags.includes(tag)
                                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                                                    : 'bg-white/5 text-gray-500 border border-white/5 hover:border-white/20'
                                                }`}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                    {bookmarks.length === 0 && <p className="text-[10px] text-gray-600 italic p-4 text-center w-full">No tags available</p>}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-1 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center shadow-2xl shadow-blue-500/20 h-full min-h-[300px] relative overflow-hidden group border border-white/10">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-400/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700 delay-100"></div>

                        <div className="relative z-10">
                            <div className="text-4xl font-black text-white mb-2 tracking-tighter drop-shadow-2xl">{bookmarks.length}</div>
                            <p className="text-[10px] text-white/70 mb-10 uppercase tracking-[0.3em] font-black">ENTITIES LOADED</p>
                            <button
                                onClick={() => onExport(exportOptions)}
                                className="w-full bg-white text-blue-600 font-black py-4 px-6 rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-xl flex items-center justify-center uppercase tracking-widest text-[10px]"
                            >
                                <DownloadIcon className="w-4 h-4 mr-3" />
                                Compile Export
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="pt-12 border-t border-white/5">
                <div className="flex items-center justify-between mb-8 px-1">
                    <div className="flex items-center space-x-3">
                        <ImportIcon className="w-5 h-5 text-emerald-400" />
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Import Studio</h3>
                    </div>
                </div>

                {!importFile ? (
                    <div className="border-2 border-dashed border-white/10 rounded-[2.5rem] p-16 flex flex-col items-center justify-center text-center group hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all cursor-pointer relative bg-[#121418]">
                        <input
                            type="file"
                            onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <div className="p-5 bg-emerald-500/10 text-emerald-400 rounded-[2rem] mb-6 group-hover:scale-110 transition-transform duration-500 shadow-inner">
                            <UploadIcon className="w-10 h-10" />
                        </div>
                        <h4 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Drop data payload</h4>
                        <p className="text-sm text-gray-500 max-w-sm">Compatible with HTML, CSV, and JSON manifests from all major browser architectures.</p>
                    </div>
                ) : (
                    <div className="bg-[#121418] border border-white/10 rounded-[2.5rem] p-10 animate-fadeIn relative overflow-hidden">
                        <div className="flex items-center justify-between mb-10 relative z-10">
                            <div className="flex items-center space-x-5">
                                <div className="p-4 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/10">
                                    <DatabaseIcon className="w-8 h-8" />
                                </div>
                                <div>
                                    <h4 className="text-lg font-black text-white tracking-tight uppercase">{importFile.name}</h4>
                                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">{(importFile.size / 1024).toFixed(1)} KB • READY FOR INGESTION</p>
                                </div>
                            </div>
                            <button onClick={() => onFileSelect(null)} className="text-[10px] font-black text-red-400 hover:text-red-300 uppercase tracking-widest border-b border-red-500/30 pb-0.5 transition-colors">Discard</button>
                        </div>

                        <div className="grid grid-cols-3 gap-6 mb-10 relative z-10">
                            {[
                                { label: 'TOTAL ENTITIES', value: previewBookmarks.length, color: 'text-white' },
                                { label: 'VALIDATED LINKS', value: previewBookmarks.filter(b => b.url).length, color: 'text-emerald-400' },
                                { label: 'CONFLICTS', value: 0, color: 'text-orange-400' }
                            ].map((stat, i) => (
                                <div key={i} className="bg-black/20 p-6 rounded-3xl border border-white/5 backdrop-blur-sm">
                                    <div className={`text-2xl font-black ${stat.color} mb-1 tracking-tighter`}>{stat.value}</div>
                                    <div className="text-[9px] text-gray-600 font-black uppercase tracking-widest">{stat.label}</div>
                                </div>
                            ))}
                        </div>

                        <div className="flex space-x-6 relative z-10">
                            <button
                                onClick={() => onImport('merge')}
                                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black font-black py-5 rounded-2xl transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] uppercase tracking-widest text-xs active:scale-95"
                            >
                                Merge into Cluster
                            </button>
                            <button
                                onClick={() => onImport('overwrite')}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-black py-5 rounded-2xl transition-all border border-white/10 uppercase tracking-widest text-xs active:scale-95"
                            >
                                Overwrite Cluster
                            </button>
                        </div>

                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    </div>
                )}
            </section>
        </div>
    );
};
