import React from 'react';
import { CogIcon, TrashIcon, BoltIcon, TerminalIcon, LayersIcon } from '@/src/components/ui/Icons';

interface ConfigTabProps {
    batchSize: number;
    onBatchSizeChange: (size: number) => void;
    maxRetries: number;
    onMaxRetriesChange: (retries: number) => void;
    processingMode: 'parallel' | 'sequential';
    onProcessingModeChange: (mode: 'parallel' | 'sequential') => void;
    tagDrivenMode: boolean;
    onTagDrivenModeChange: (enabled: boolean) => void;
    autoCleanupEmptyFolders?: boolean;
    onAutoCleanupChange?: (cleanup: boolean) => void;
    onCleanupEmptyFolders?: () => void;
    onClearData: () => void;
}

export const ConfigTab: React.FC<ConfigTabProps> = ({
    batchSize, onBatchSizeChange, maxRetries, onMaxRetriesChange,
    processingMode, onProcessingModeChange, 
    tagDrivenMode, onTagDrivenModeChange,
    autoCleanupEmptyFolders = false, onAutoCleanupChange, onCleanupEmptyFolders,
    onClearData
}) => {
    return (
        <div className="space-y-10 animate-slideIn pb-10">
            <header className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-gray-500/20 rounded-lg">
                    <CogIcon className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight uppercase">System Configuration</h2>
                    <p className="text-xs text-gray-500 font-mono">GLOBAL RUNTIME PARAMETERS & ENGINE TUNING</p>
                </div>
            </header>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Throughput Tuning */}
                <div className="bg-[#121418]/60 border border-white/5 rounded-[2.5rem] p-8 space-y-8 relative overflow-hidden shadow-xl group">
                    <div className="absolute -top-10 -right-10 p-10 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                        <BoltIcon className="w-32 h-32 text-yellow-400" />
                    </div>

                    <div className="flex items-center space-x-4 mb-2 relative z-10">
                        <div className="p-3 bg-yellow-500/10 rounded-2xl border border-yellow-500/10">
                            <BoltIcon className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div>
                            <h3 className="text-xs font-black text-white uppercase tracking-widest">Throughput Tuning</h3>
                            <p className="text-[10px] text-gray-500 font-medium">Engine Load & Capacity Control</p>
                        </div>
                    </div>
                    
                    <div className="space-y-8 relative z-10">
                        <div className="flex flex-col space-y-4">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Batch Processing Size</label>
                                <span className="text-[11px] text-emerald-400 font-mono font-black bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/10">{batchSize} ITEMS</span>
                            </div>
                            <input 
                                type="range" min="5" max="100" step="5"
                                value={batchSize} onChange={e => onBatchSizeChange(parseInt(e.target.value))}
                                className="w-full h-2 bg-black/40 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
                            />
                            <p className="text-[9px] text-gray-600 leading-relaxed font-medium">Larger batches reduce cost but may exceed token limits or decrease accuracy.</p>
                        </div>

                        <div className="flex flex-col space-y-4">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Max Retry Policy</label>
                                <span className="text-[11px] text-emerald-400 font-mono font-black bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/10">{maxRetries} ATTEMPTS</span>
                            </div>
                            <input 
                                type="number" value={maxRetries} onChange={e => onMaxRetriesChange(parseInt(e.target.value))}
                                className="w-full bg-black/30 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-mono shadow-inner"
                            />
                            <p className="text-[9px] text-gray-600 leading-relaxed font-medium">Number of times to retry a failed batch with exponential backoff.</p>
                        </div>
                    </div>
                </div>

                {/* Processing Architecture */}
                <div className="bg-[#121418]/60 border border-white/5 rounded-[2.5rem] p-8 space-y-8 relative overflow-hidden shadow-xl group">
                    <div className="absolute -top-10 -right-10 p-10 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                        <TerminalIcon className="w-32 h-32 text-blue-400" />
                    </div>

                    <div className="flex items-center space-x-4 mb-2 relative z-10">
                        <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/10">
                            <TerminalIcon className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-xs font-black text-white uppercase tracking-widest">Processing Architecture</h3>
                            <p className="text-[10px] text-gray-500 font-medium">Concurrency & Execution Flow</p>
                        </div>
                    </div>

                    <div className="space-y-8 relative z-10">
                        <div className="flex bg-black/40 p-2 rounded-2xl border border-white/5 shadow-inner">
                            {(['sequential', 'parallel'] as const).map(m => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => onProcessingModeChange(m)}
                                    className={`flex-1 py-3 px-4 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${
                                        processingMode === m 
                                            ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]' 
                                            : 'text-gray-500 hover:text-gray-300'
                                    }`}
                                >
                                    {m === 'sequential' ? 'Sequential' : 'Parallel Burst'}
                                </button>
                            ))}
                        </div>
                        <div className="p-5 bg-black/20 rounded-2xl border border-white/5 shadow-inner">
                            <p className="text-[10px] text-gray-500 leading-relaxed font-medium italic">
                                {processingMode === 'sequential' 
                                    ? 'Sequential processing is safer for low-tier API keys to avoid rate limits and ensures predictable ordering.' 
                                    : 'Parallel processing utilizes multiple web workers for 3x-5x faster results, ideal for premium high-limit API keys.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Workspace Optimization */}
                <div className="bg-[#121418]/60 border border-white/5 rounded-[2.5rem] p-8 space-y-8 relative overflow-hidden shadow-xl group md:col-span-2">
                    <div className="absolute -top-10 -right-10 p-10 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                        <TrashIcon className="w-32 h-32 text-emerald-400" />
                    </div>

                    <div className="flex items-center space-x-4 mb-2 relative z-10">
                        <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/10">
                            <TrashIcon className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-xs font-black text-white uppercase tracking-widest">Workspace Optimization</h3>
                            <p className="text-[10px] text-gray-500 font-medium">Automatic Maintenance & Cleanup</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                        <div className="flex items-center justify-between p-6 bg-black/30 rounded-[1.8rem] border border-white/5 shadow-inner group/toggle">
                            <div className="max-w-[70%]">
                                <label className="text-[11px] font-black text-white uppercase tracking-wider">Auto Cleanup Folders</label>
                                <p className="text-[10px] text-gray-600 font-medium mt-1">Automatically remove empty nodes after AI processing cycles.</p>
                            </div>
                            <button
                                onClick={() => onAutoCleanupChange?.(!autoCleanupEmptyFolders)}
                                className={`w-16 h-8 rounded-full transition-all duration-500 relative shadow-2xl ${autoCleanupEmptyFolders ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-gray-800'}`}
                            >
                                <div className={`absolute top-1.5 w-5 h-5 bg-white rounded-full transition-all duration-500 shadow-lg ${autoCleanupEmptyFolders ? 'left-9' : 'left-1.5'}`} />
                            </button>
                        </div>

                        <button
                            onClick={onCleanupEmptyFolders}
                            className="flex flex-col items-center justify-center p-6 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/30 rounded-[1.8rem] transition-all duration-500 group/btn shadow-inner"
                        >
                            <div className="flex items-center space-x-3">
                                <TrashIcon className="w-4 h-4 text-emerald-500 group-hover/btn:scale-110 transition-transform" />
                                <span className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">Trigger Manual Cleanup</span>
                            </div>
                            <p className="text-[9px] text-emerald-500/40 font-medium mt-2">Force immediate sanitation of empty directory structures</p>
                        </button>
                    </div>
                </div>
            </section>

            {/* Danger Zone */}
            <section className="bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20 rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl shadow-red-500/5 group">
                <div className="absolute top-0 right-0 p-10 opacity-[0.05] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                    <TrashIcon className="w-40 h-40 text-red-500" />
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                    <div className="flex items-center space-x-5 text-center md:text-left">
                        <div className="p-4 bg-red-500/20 rounded-2xl border border-red-500/20 shadow-inner">
                            <TrashIcon className="w-6 h-6 text-red-500" />
                        </div>
                        <div>
                            <h4 className="text-xs font-black text-red-500 uppercase tracking-[0.2em] flex items-center justify-center md:justify-start">
                                Data Purification Protocol
                            </h4>
                            <p className="text-[11px] text-gray-500 mt-1 font-medium italic">Irreversibly wipe all local bookmarks, folders, and cached metadata.</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => {
                            if (window.confirm('CRITICAL ACTION: This will permanently delete ALL local data. Proceed?')) onClearData();
                        }}
                        className="w-full md:w-auto px-10 py-5 bg-red-600 hover:bg-red-500 text-white text-[11px] font-black rounded-[1.5rem] transition-all shadow-2xl shadow-red-500/30 uppercase tracking-[0.2em] active:scale-[0.97] hover:shadow-red-500/50"
                    >
                        Execute Database Wipe
                    </button>
                </div>
            </section>
        </div>
    );
};
