import React from 'react';
import type { ApiConfig, ApiKeyStatus } from '@/types';
import { TerminalIcon, PowerIcon, TrashIcon } from '../../ui/Icons';

interface ProvidersTabProps {
    apiConfigs: ApiConfig[];
    onSaveApiConfig: (config: ApiConfig) => void;
    onDeleteApiConfig: (id: string) => void;
    onToggleApiConfigStatus: (id: string, status: ApiKeyStatus) => void;
    apiName: string;
    setApiName: (name: string) => void;
    apiKey: string;
    setApiKey: (key: string) => void;
    apiProvider: 'gemini' | 'openrouter' | 'custom';
    setApiProvider: (provider: 'gemini' | 'openrouter' | 'custom') => void;
    apiModel: string;
    setApiModel: (model: string) => void;
    apiUrl: string;
    setApiUrl: (url: string) => void;
    apiEditingId: string | null;
    handleAddApiKey: (e: React.FormEvent) => void;
}

export const ProvidersTab: React.FC<ProvidersTabProps> = ({
    apiConfigs, onSaveApiConfig, onDeleteApiConfig, onToggleApiConfigStatus,
    apiName, setApiName, apiKey, setApiKey, apiProvider, setApiProvider,
    apiModel, setApiModel, apiUrl, setApiUrl, apiEditingId, handleAddApiKey
}) => {
    return (
        <div className="space-y-8 animate-slideIn">
            <section>
                <h3 className="text-lg font-semibold text-white mb-4">Active AI Providers</h3>
                <div className="grid gap-3">
                    {apiConfigs.map(config => (
                        <div key={config.id} className="flex items-center justify-between bg-white/5 border border-white/10 p-4 rounded-xl hover:bg-white/10 transition-all group">
                            <div className="flex items-center space-x-4">
                                <div className={`p-2 rounded-lg ${config.provider === 'gemini' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                    <TerminalIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-200">{config.name}</p>
                                    <p className="text-xs text-gray-500">{config.model} • {config.provider}</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onToggleApiConfigStatus(config.id, config.status === 'active' ? 'inactive' : 'active')} className="p-2 hover:bg-white/5 rounded-lg">
                                    <PowerIcon className={`w-4 h-4 ${config.status === 'active' ? 'text-emerald-400' : 'text-gray-500'}`} />
                                </button>
                                <button onClick={() => onDeleteApiConfig(config.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-gray-500 hover:text-red-400">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="pt-6 border-t border-white/5">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Add Provider</h3>
                <form onSubmit={handleAddApiKey} className="space-y-4">
                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                        {(['gemini', 'openrouter', 'custom'] as const).map(p => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setApiProvider(p)}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${apiProvider === p ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                {p.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <input 
                            value={apiName} onChange={e => setApiName(e.target.value)}
                            placeholder="Connection Name" 
                            className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-emerald-500/50 outline-none"
                        />
                        <input 
                            type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                            placeholder="API Key" 
                            className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-emerald-500/50 outline-none"
                        />
                    </div>
                    <button className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                        Save Connection
                    </button>
                </form>
            </section>
        </div>
    );
};
