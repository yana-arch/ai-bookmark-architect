import React from 'react';
import type { ApiConfig, ApiKeyStatus } from '@/types';
import { TerminalIcon, PowerIcon, TrashIcon, SparklesIcon, BoltIcon, AILogoIcon, CogIcon } from '@/src/components/ui/Icons';
import { CustomSelect } from '@/src/components/ui/CustomSelect';

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

            <section className="bg-gradient-to-br from-white/[0.03] to-transparent border border-white/10 rounded-[2.5rem] p-10 relative overflow-hidden group shadow-2xl">
                <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-all duration-1000 group-hover:scale-110 pointer-events-none">
                    <AILogoIcon className="w-48 h-48 text-white" />
                </div>
                
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-10 flex items-center">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-3 shadow-[0_0_12px_rgba(168,85,247,0.8)] animate-pulse"></div>
                    {apiEditingId ? 'Reconfigure Compute Node' : 'Provision New Architecture Node'}
                </h3>

                <form onSubmit={handleAddApiKey} className="space-y-8 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <CustomSelect 
                            label="Engine Type"
                            options={providerOptions}
                            value={apiProvider}
                            onChange={setApiProvider}
                        />
                        
                        <div className="flex flex-col space-y-2.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Instance Identifier</label>
                            <input 
                                value={apiName} onChange={e => setApiName(e.target.value)}
                                placeholder="e.g. Gemini 1.5 Flash - Production" 
                                className="bg-black/30 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all font-medium placeholder:text-gray-700 shadow-inner"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="flex flex-col space-y-2.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Model Specification</label>
                            <input 
                                value={apiModel} onChange={e => setApiModel(e.target.value)}
                                placeholder={apiProvider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o'} 
                                className="bg-black/30 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all font-medium placeholder:text-gray-700 shadow-inner"
                            />
                        </div>

                        <div className="flex flex-col space-y-2.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Secure API Authorization</label>
                            <input 
                                type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                                placeholder="••••••••••••••••••••••••••••••••" 
                                className="bg-black/30 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all font-mono placeholder:text-gray-700 shadow-inner"
                            />
                        </div>
                    </div>

                    {(apiProvider.includes('custom')) && (
                        <div className="flex flex-col space-y-2.5 animate-slideDown">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Custom Gateway Endpoint</label>
                            <input 
                                value={apiUrl} onChange={e => setApiUrl(e.target.value)}
                                placeholder="https://api.gateway.internal/v1" 
                                className="bg-black/30 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all font-mono placeholder:text-gray-700 shadow-inner"
                            />
                        </div>
                    )}

                    <button className={`w-full bg-gradient-to-r ${apiEditingId ? 'from-emerald-500 to-teal-600 shadow-emerald-500/20' : 'from-purple-600 to-indigo-600 shadow-purple-500/20'} hover:opacity-90 text-white font-black py-5 rounded-[1.5rem] transition-all shadow-2xl active:scale-[0.97] uppercase tracking-[0.2em] text-xs`}>
                        {apiEditingId ? 'Apply Configuration Changes' : 'Initialize Architecture Node'}
                    </button>
                </form>
            </section>

            <section>
                <div className="flex items-center space-x-3 mb-6 px-1">
                    <BoltIcon className="w-4 h-4 text-yellow-400" />
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Live Distributed Nodes</h3>
                </div>
                
                <div className="grid gap-5">
                    {apiConfigs.map(config => (
                        <div key={config.id} className="flex items-center justify-between bg-[#121418]/60 border border-white/5 p-6 rounded-[2rem] hover:border-white/10 transition-all duration-300 group relative overflow-hidden shadow-lg">
                            <div className="flex items-center space-x-6 relative z-10">
                                <div className={`p-4 rounded-[1.2rem] shadow-inner transition-all duration-500 group-hover:scale-110 ${
                                    config.provider.includes('gemini') ? 'bg-blue-500/20 text-blue-400 border border-blue-500/10' : 
                                        config.provider.includes('openai') ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/10' : 
                                            'bg-purple-500/20 text-purple-400 border border-purple-500/10'
                                }`}>
                                    {config.provider.includes('gemini') ? <SparklesIcon className="w-6 h-6" /> : 
                                        config.provider.includes('openai') ? <AILogoIcon className="w-6 h-6" /> : 
                                            <BoltIcon className="w-6 h-6" />}
                                </div>
                                <div>
                                    <div className="flex items-center space-x-3">
                                        <p className="text-sm font-black text-white tracking-widest uppercase">{config.name}</p>
                                        <div className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                                            config.status === 'active' 
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                                        }`}>
                                            {config.status}
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-500 font-mono mt-1 font-medium tracking-tight">
                                        <span className="text-gray-700 uppercase mr-2">{config.provider}</span>
                                        <span className="opacity-40 mr-2">/</span>
                                        <span className="text-blue-500/60 uppercase">{config.model}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3 relative z-10">
                                <button 
                                    onClick={() => onEditApiConfig(config)} 
                                    className="p-3 bg-white/5 border border-white/5 text-gray-500 rounded-xl hover:bg-white/10 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                    title="Edit Node"
                                >
                                    <CogIcon className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => onToggleApiConfigStatus(config.id, config.status === 'active' ? 'inactive' : 'active')} 
                                    className={`p-3 rounded-xl border transition-all duration-300 ${
                                        config.status === 'active' 
                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                                            : 'bg-white/5 border-white/10 text-gray-600'
                                    }`}
                                    title={config.status === 'active' ? 'Deactivate Node' : 'Activate Node'}
                                >
                                    <PowerIcon className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => onDeleteApiConfig(config.id)} 
                                    className="p-3 bg-red-500/5 border border-red-500/10 text-red-400/60 rounded-xl hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                    title="Delete Node"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Background architectural glow */}
                            {config.status === 'active' && (
                                <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-emerald-500/[0.03] to-transparent pointer-events-none"></div>
                            )}
                        </div>
                    ))}
                    {apiConfigs.length === 0 && (
                        <div className="text-center py-16 border-2 border-dashed border-white/5 rounded-[2.5rem] bg-black/20">
                            <p className="text-gray-600 text-sm italic font-medium">No distributed architecture nodes provisioned.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};
