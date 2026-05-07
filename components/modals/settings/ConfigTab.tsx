import React from 'react';

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
        <div className="space-y-8 animate-slideIn">
            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Batch Processing Size</label>
                    <input 
                        type="number" value={batchSize} onChange={e => onBatchSizeChange(parseInt(e.target.value))}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Max Retry Attempts</label>
                    <input 
                        type="number" value={maxRetries} onChange={e => onMaxRetriesChange(parseInt(e.target.value))}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none"
                    />
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Processing Architecture</label>
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                    {(['single', 'multi'] as const).map(m => (
                        <button
                            key={m}
                            type="button"
                            onClick={() => onProcessingModeChange(m)}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${processingMode === m ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            {m === 'single' ? 'SINGLE THREAD' : 'MULTI THREAD (WORKERS)'}
                        </button>
                    ))}
                </div>
            </div>
            <section className="pt-6 border-t border-white/5">
                <h4 className="text-sm font-bold text-red-400 mb-4">Danger Zone</h4>
                <button 
                    onClick={() => {
                        if (window.confirm('Are you sure? This will delete ALL local bookmarks and folders.')) onClearData();
                    }}
                    className="px-6 py-3 border border-red-500/20 bg-red-500/10 text-red-500 text-sm font-bold rounded-xl hover:bg-red-500 hover:text-white transition-all"
                >
                    Clear All Local Data
                </button>
            </section>
        </div>
    );
};
