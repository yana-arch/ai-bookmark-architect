import React from 'react';
import { CogIcon, TrashIcon, BoltIcon, TerminalIcon } from '../../ui/Icons';

interface ConfigTabProps {
    batchSize: number;
    onBatchSizeChange: (size: number) => void;
    maxRetries: number;
    onMaxRetriesChange: (retries: number) => void;
    processingMode: 'single' | 'multi';
    onProcessingModeChange: (mode: 'single' | 'multi') => void;
    onClearData: () => void;
}

export const ConfigTab: React.FC<ConfigTabProps> = ({
    batchSize, onBatchSizeChange, maxRetries, onMaxRetriesChange,
    processingMode, onProcessingModeChange, onClearData
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
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
                    <div className="flex items-center space-x-3 mb-2">
                        <BoltIcon className="w-4 h-4 text-yellow-400" />
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Throughput Tuning</h3>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex flex-col space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Batch Processing Size</label>
                                <span className="text-[10px] text-gray-400 font-mono">{batchSize} items</span>
                            </div>
                            <input 
                                type="range" min="5" max="100" step="5"
                                value={batchSize} onChange={e => onBatchSizeChange(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                            <p className="text-[9px] text-gray-600 leading-relaxed italic">Larger batches reduce cost but may exceed token limits or decrease accuracy.</p>
                        </div>

                        <div className="flex flex-col space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Max Retry Policy</label>
                                <span className="text-[10px] text-gray-400 font-mono">{maxRetries} attempts</span>
                            </div>
                            <input 
                                type="number" value={maxRetries} onChange={e => onMaxRetriesChange(parseInt(e.target.value))}
                                className="w-full bg-[#121418] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                            />
                            <p className="text-[9px] text-gray-600 leading-relaxed italic">Number of times to retry a failed batch with exponential backoff.</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
                    <div className="flex items-center space-x-3 mb-2">
                        <TerminalIcon className="w-4 h-4 text-blue-400" />
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Processing Architecture</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                            {(['single', 'multi'] as const).map(m => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => onProcessingModeChange(m)}
                                    className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all uppercase tracking-tighter ${
                                        processingMode === m 
                                        ? 'bg-white/10 text-white shadow-lg' 
                                        : 'text-gray-500 hover:text-gray-300'
                                    }`}
                                >
                                    {m === 'single' ? 'Single Stream' : 'Parallel Workers'}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-gray-500 leading-relaxed">
                            {processingMode === 'single' 
                                ? 'Sequential processing is safer for low-tier API keys to avoid rate limits.' 
                                : 'Parallel processing utilizes multiple web workers for 3x-5x faster results.'}
                        </p>
                    </div>
                </div>
            </section>

            <section className="bg-red-500/5 border border-red-500/10 rounded-3xl p-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-sm font-black text-red-500 uppercase tracking-widest flex items-center">
                            <TrashIcon className="w-4 h-4 mr-2" />
                            Data Purification
                        </h4>
                        <p className="text-[11px] text-gray-500 mt-1">Irreversibly wipe all local bookmarks, folders, and cached metadata.</p>
                    </div>
                    <button 
                        onClick={() => {
                            if (window.confirm('CRITICAL ACTION: This will permanently delete ALL local data. Proceed?')) onClearData();
                        }}
                        className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white text-[10px] font-black rounded-xl transition-all shadow-[0_0_20px_rgba(239,68,68,0.2)] uppercase tracking-widest active:scale-95"
                    >
                        Nuke Database
                    </button>
                </div>
            </section>
        </div>
    );
};
