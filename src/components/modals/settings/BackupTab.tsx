import React from 'react';
import type { BackupMetadata } from '@/types';
import { CloudIcon, ShieldCheckIcon, UploadIcon, DownloadIcon, DatabaseIcon } from '@/src/components/ui/Icons';

interface BackupTabProps {
    isAuthenticated: boolean;
    showKeyInput: boolean;
    setShowKeyInput: (show: boolean) => void;
    cloudKey: string;
    setCloudKey: (key: string) => void;
    backups: BackupMetadata[];
    onImportCloudData?: (key: string) => Promise<void>;
    onUploadCloudData?: (key: string) => Promise<void>;
}

export const BackupTab: React.FC<BackupTabProps> = ({
    isAuthenticated, showKeyInput, setShowKeyInput, cloudKey, setCloudKey,
    backups, onImportCloudData, onUploadCloudData
}) => {
    return (
        <div className="space-y-10 animate-slideIn pb-10">
            <header className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                    <CloudIcon className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight uppercase">Cloud Synchronization</h2>
                    <p className="text-xs text-gray-500 font-mono">SECURE MULTI-DEVICE DATA ARCHITECTURE</p>
                </div>
            </header>

            {!isAuthenticated ? (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-[#121418]/40 border border-white/5 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                    <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>
                    
                    <div className="p-8 bg-blue-500/10 text-blue-400 rounded-[2.5rem] mb-8 border border-blue-500/10 shadow-inner group-hover:scale-110 transition-transform duration-1000">
                        <CloudIcon className="w-16 h-16" />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-tighter">Sync Inactive</h3>
                    <p className="text-gray-500 text-[11px] max-w-xs mb-10 font-medium leading-relaxed uppercase tracking-widest opacity-60">Connect your distributed vault to enable autonomous synchronization.</p>
                    
                    {!showKeyInput ? (
                        <button 
                            onClick={() => setShowKeyInput(true)}
                            className="px-12 py-5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white text-xs font-black rounded-2xl shadow-2xl shadow-blue-500/20 transition-all active:scale-[0.97] uppercase tracking-[0.2em]"
                        >
                            Authorize Architecture Node
                        </button>
                    ) : (
                        <div className="w-full max-w-md space-y-5 animate-slideUp px-10">
                            <input 
                                type="password"
                                value={cloudKey}
                                onChange={e => setCloudKey(e.target.value)}
                                placeholder="PASTE ACCESS TOKEN..."
                                className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-mono text-xs tracking-widest placeholder:text-gray-800 shadow-inner"
                            />
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => {
                                        if (cloudKey) onImportCloudData?.(cloudKey);
                                    }}
                                    className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl uppercase tracking-widest text-[10px] active:scale-[0.97]"
                                >
                                    Establish Link
                                </button>
                                <button 
                                    onClick={() => setShowKeyInput(false)}
                                    className="flex-1 bg-white/5 text-gray-500 rounded-2xl hover:bg-white/10 hover:text-gray-300 font-black uppercase tracking-widest text-[10px] transition-all"
                                >
                                    Abort
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-10">
                    <div className="bg-emerald-500/[0.03] border border-emerald-500/20 p-8 rounded-[2.5rem] flex items-center justify-between shadow-2xl">
                        <div className="flex items-center space-x-6">
                            <div className="w-16 h-16 rounded-[1.8rem] bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-inner">
                                <ShieldCheckIcon className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-xs font-black text-emerald-400 uppercase tracking-widest">Distributed Node Active</p>
                                <p className="text-[10px] text-gray-500 font-mono mt-1">STATUS: SYNCHRONIZED • LATENCY: OPTIMAL</p>
                            </div>
                        </div>
                        <button className="px-6 py-3 bg-white/5 hover:bg-red-500/10 text-gray-600 hover:text-red-400 text-[10px] font-black rounded-xl border border-white/5 hover:border-red-500/20 transition-all uppercase tracking-widest">
                            Disconnect Node
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <button 
                            onClick={() => onUploadCloudData?.(cloudKey)}
                            className="bg-[#121418]/60 border border-white/5 p-10 rounded-[2.5rem] hover:border-white/10 transition-all duration-500 text-center group relative overflow-hidden shadow-xl"
                        >
                            <div className="absolute -top-10 -right-10 p-10 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000 pointer-events-none">
                                <UploadIcon className="w-32 h-32 text-blue-400" />
                            </div>
                            <div className="p-4 bg-blue-500/10 rounded-2xl w-fit mx-auto mb-6 group-hover:scale-110 transition-transform duration-500">
                                <UploadIcon className="w-8 h-8 text-blue-400" />
                            </div>
                            <span className="block text-sm font-black text-white uppercase tracking-widest mb-1">Push Architecture</span>
                            <span className="text-[10px] text-gray-600 uppercase font-medium">Overwrite remote repository</span>
                        </button>
                        <button 
                            onClick={() => onImportCloudData?.(cloudKey)}
                            className="bg-[#121418]/60 border border-white/5 p-10 rounded-[2.5rem] hover:border-white/10 transition-all duration-500 text-center group relative overflow-hidden shadow-xl"
                        >
                            <div className="absolute -top-10 -right-10 p-10 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000 pointer-events-none">
                                <DownloadIcon className="w-32 h-32 text-emerald-400" />
                            </div>
                            <div className="p-4 bg-emerald-500/10 rounded-2xl w-fit mx-auto mb-6 group-hover:scale-110 transition-transform duration-500">
                                <DownloadIcon className="w-8 h-8 text-emerald-400" />
                            </div>
                            <span className="block text-sm font-black text-white uppercase tracking-widest mb-1">Pull Architecture</span>
                            <span className="text-[10px] text-gray-600 uppercase font-medium">Synchronize local registry</span>
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center space-x-3 px-2">
                            <DatabaseIcon className="w-4 h-4 text-gray-500" />
                            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Remote Snapshot History</h4>
                        </div>
                        {backups.length === 0 ? (
                            <div className="py-20 border-2 border-dashed border-white/5 rounded-[3rem] text-center bg-black/20">
                                <p className="text-[11px] text-gray-600 font-medium italic">No remote architecture snapshots detected.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {backups.map(b => (
                                    <div key={b.id} className="flex items-center justify-between bg-[#121418]/60 border border-white/5 p-6 rounded-[1.8rem] hover:border-white/10 transition-all duration-300 group">
                                        <div className="flex items-center space-x-5">
                                            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl group-hover:scale-110 transition-transform duration-500">
                                                <DatabaseIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-white tracking-widest uppercase">{b.name}</p>
                                                <p className="text-[10px] text-gray-500 font-mono mt-1">
                                                    <span className="text-gray-700">{new Date(b.timestamp).toLocaleString()}</span>
                                                    <span className="mx-3 opacity-20">|</span>
                                                    <span className="text-blue-500/60 font-black">{b.bookmarkCount} OBJECTS</span>
                                                </p>
                                            </div>
                                        </div>
                                        <button className="px-6 py-3 bg-white/5 hover:bg-white/10 text-[9px] font-black text-gray-400 hover:text-white rounded-xl transition-all border border-white/5 uppercase tracking-widest active:scale-95">
                                            Restore Snapshot
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
