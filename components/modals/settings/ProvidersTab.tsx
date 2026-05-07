import React from 'react';
import type { ApiConfig, ApiKeyStatus } from '@/types';
import { TerminalIcon, PowerIcon, TrashIcon, SparklesIcon, BoltIcon, AILogoIcon, CogIcon } from '../../ui/Icons';
import { CustomSelect } from '../../ui/CustomSelect';

interface ProvidersTabProps {
    apiConfigs: ApiConfig[];
    onSaveApiConfig: (config: ApiConfig) => void;
    onDeleteApiConfig: (id: string) => void;
    onToggleApiConfigStatus: (id: string, status: ApiKeyStatus) => void;
    apiName: string;
    setApiName: (name: string) => void;
    apiKey: string;
    setApiKey: (key: string) => void;
    apiProvider: any;
    setApiProvider: (provider: any) => void;
    apiModel: string;
    setApiModel: (model: string) => void;
    apiUrl: string;
    setApiUrl: (url: string) => void;
    apiEditingId: string | null;
    handleAddApiKey: (e: React.FormEvent) => void;
    onEditApiConfig: (config: ApiConfig) => void;
}

export const ProvidersTab: React.FC<ProvidersTabProps> = ({
    apiConfigs, onDeleteApiConfig, onToggleApiConfigStatus,
    apiName, setApiName, apiKey, setApiKey, apiProvider, setApiProvider,
    apiModel, setApiModel, apiUrl, setApiUrl, apiEditingId, handleAddApiKey,
    onEditApiConfig
}) => {
    const providerOptions = [
        { id: 'gemini', label: 'Google Gemini', icon: <SparklesIcon className="w-4 h-4 text-blue-400" /> },
        { id: 'custom-gemini', label: 'Custom (Gemini Compatible)', icon: <TerminalIcon className="w-4 h-4 text-gray-400" /> },
        { id: 'openrouter', label: 'OpenRouter', icon: <BoltIcon className="w-4 h-4 text-purple-400" /> },
        { id: 'openai', label: 'OpenAI', icon: <AILogoIcon className="w-4 h-4 text-emerald-400" /> },
        { id: 'custom-openai', label: 'Custom (OpenAI Compatible)', icon: <TerminalIcon className="w-4 h-4 text-gray-400" /> },
    ];

    return (
        <div className="space-y-10 animate-slideIn pb-10">
            <header className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                    <TerminalIcon className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight uppercase">AI Engine Providers</h2>
                    <p className="text-xs text-gray-500 font-mono">MANAGE MULTI-MODEL DISTRIBUTED ARCHITECTURE</p>
                </div>
            </header>

            <section className="bg-white/5 border border-white/10 rounded-3xl p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <AILogoIcon className="w-32 h-32 text-white" />
                </div>
                
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6 flex items-center">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-2 shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>
                    {apiEditingId ? 'Reconfigure Instance' : 'Deploy New Instance'}
                </h3>

                <form onSubmit={handleAddApiKey} className="space-y-6 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <CustomSelect 
                            label="Provider"
                            options={providerOptions}
                            value={apiProvider}
                            onChange={setApiProvider}
                        />
                        
                        <div className="flex flex-col space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Instance Name</label>
                            <input 
                                value={apiName} onChange={e => setApiName(e.target.value)}
                                placeholder="e.g. Gemini Pro Production" 
                                className="bg-[#121418] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Model ID</label>
                            <input 
                                value={apiModel} onChange={e => setApiModel(e.target.value)}
                                placeholder={apiProvider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o'} 
                                className="bg-[#121418] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all"
                            />
                        </div>

                        <div className="flex flex-col space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Access Token / API Key</label>
                            <input 
                                type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                                placeholder="••••••••••••••••" 
                                className="bg-[#121418] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {(apiProvider.includes('custom')) && (
                        <div className="flex flex-col space-y-1.5 animate-fadeIn">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Custom Endpoint URL</label>
                            <input 
                                value={apiUrl} onChange={e => setApiUrl(e.target.value)}
                                placeholder="https://api.your-proxy.com/v1" 
                                className="bg-[#121418] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all font-mono"
                            />
                        </div>
                    )}

                    <button className={`w-full bg-gradient-to-r ${apiEditingId ? 'from-emerald-600 to-teal-600' : 'from-purple-600 to-blue-600'} hover:opacity-90 text-white font-bold py-4 rounded-2xl transition-all shadow-xl active:scale-[0.98]`}>
                        {apiEditingId ? 'UPDATE CONFIGURATION' : 'INITIALIZE CONNECTION'}
                    </button>
                </form>
            </section>

            <section>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 px-1">Active Architecture Nodes</h3>
                <div className="grid gap-4">
                    {apiConfigs.map(config => (
                        <div key={config.id} className="flex items-center justify-between bg-[#121418] border border-white/10 p-5 rounded-2xl hover:border-white/20 transition-all group relative overflow-hidden">
                            <div className="flex items-center space-x-5 relative z-10">
                                <div className={`p-3 rounded-2xl ${
                                    config.provider.includes('gemini') ? 'bg-blue-500/10 text-blue-400' : 
                                    config.provider.includes('openai') ? 'bg-emerald-500/10 text-emerald-400' : 
                                    'bg-purple-500/10 text-purple-400'
                                }`}>
                                    {config.provider.includes('gemini') ? <SparklesIcon className="w-5 h-5" /> : 
                                     config.provider.includes('openai') ? <AILogoIcon className="w-5 h-5" /> : 
                                     <BoltIcon className="w-5 h-5" />}
                                </div>
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <p className="text-sm font-black text-white tracking-wide uppercase">{config.name}</p>
                                        <div className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${
                                            config.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                        }`}>
                                            {config.status}
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">{config.model} • {config.provider.toUpperCase()}</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2 relative z-10">
                                <button 
                                    onClick={() => onEditApiConfig(config)} 
                                    className="p-2.5 bg-white/5 border border-white/10 text-gray-400 rounded-xl hover:bg-white/10 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <CogIcon className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => onToggleApiConfigStatus(config.id, config.status === 'active' ? 'inactive' : 'active')} 
                                    className={`p-2.5 rounded-xl border transition-all ${
                                        config.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/10 text-gray-500'
                                    }`}
                                >
                                    <PowerIcon className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => onDeleteApiConfig(config.id)} 
                                    className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Background glow for active nodes */}
                            {config.status === 'active' && (
                                <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-emerald-500/5 to-transparent pointer-events-none"></div>
                            )}
                        </div>
                    ))}
                    {apiConfigs.length === 0 && (
                        <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-3xl">
                            <p className="text-gray-500 text-sm italic">No AI nodes connected. Add your first provider to begin.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};
