import React from 'react';
import type { BackupMetadata } from '@/types';
import { CloudIcon, ShieldCheckIcon, UploadIcon, DownloadIcon, DatabaseIcon } from '../../ui/Icons';

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
        <div className="space-y-8 animate-slideIn">
            {!isAuthenticated ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="p-6 bg-blue-500/20 text-blue-400 rounded-full mb-6">
                        <CloudIcon className="w-12 h-12" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Cloud Sync Not Active</h3>
                    <p className="text-gray-500 text-sm max-w-sm mb-8">Connect your PostgreSQL/Supabase account to enable cross-device sync and automatic backups.</p>
                    
                    {!showKeyInput ? (
                        <button 
                            onClick={() => setShowKeyInput(true)}
                            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all"
                        >
                            Connect with Access Key
                        </button>
                    ) : (
                        <div className="w-full max-w-md space-y-4 animate-fadeIn">
                            <input 
                                type="password"
                                value={cloudKey}
                                onChange={e => setCloudKey(e.target.value)}
                                placeholder="Paste your sync key here..."
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex space-x-3">
                                <button 
                                    onClick={() => {
                                        if (cloudKey) onImportCloudData?.(cloudKey);
                                    }}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all"
                                >
                                    Sync Now
                                </button>
                                <button 
                                    onClick={() => setShowKeyInput(false)}
                                    className="px-4 py-3 bg-white/5 text-gray-500 rounded-xl hover:text-white"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                <ShieldCheckIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-emerald-400">Cloud Sync Active</p>
                                <p className="text-xs text-gray-500">Last synced: Just now</p>
                            </div>
                        </div>
                        <button className="px-4 py-2 bg-white/5 hover:bg-red-500/10 text-gray-500 hover:text-red-400 text-xs font-bold rounded-xl border border-white/10 hover:border-red-500/20 transition-all">
                            Disconnect
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => onUploadCloudData?.(cloudKey)}
                            className="bg-white/5 border border-white/10 p-6 rounded-3xl hover:bg-white/10 transition-all text-center group"
                        >
                            <UploadIcon className="w-8 h-8 mx-auto mb-3 text-blue-400 group-hover:scale-110 transition-transform" />
                            <span className="block text-sm font-bold text-white">Push to Cloud</span>
                            <span className="text-[10px] text-gray-500 uppercase">Overwrite remote</span>
                        </button>
                        <button 
                            onClick={() => onImportCloudData?.(cloudKey)}
                            className="bg-white/5 border border-white/10 p-6 rounded-3xl hover:bg-white/10 transition-all text-center group"
                        >
                            <DownloadIcon className="w-8 h-8 mx-auto mb-3 text-emerald-400 group-hover:scale-110 transition-transform" />
                            <span className="block text-sm font-bold text-white">Pull from Cloud</span>
                            <span className="text-[10px] text-gray-500 uppercase">Overwrite local</span>
                        </button>
                    </div>

                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-2">Backup History</h4>
                        {backups.length === 0 ? (
                            <div className="p-12 border-2 border-dashed border-white/5 rounded-3xl text-center">
                                <p className="text-xs text-gray-600 italic">No remote backups found</p>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {backups.map(b => (
                                    <div key={b.id} className="flex items-center justify-between bg-white/5 border border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-all">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                                                <DatabaseIcon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-200">{b.name}</p>
                                                <p className="text-[10px] text-gray-500">{new Date(b.timestamp).toLocaleString()} • {b.bookmarkCount} bookmarks</p>
                                            </div>
                                        </div>
                                        <button className="px-4 py-2 bg-white/5 hover:bg-white/10 text-[10px] font-bold text-gray-300 rounded-xl transition-all border border-white/5">
                                            Restore
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
