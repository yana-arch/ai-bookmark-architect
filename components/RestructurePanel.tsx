import React, { useState } from 'react';
import { AppState } from '../types';
import type { ApiConfig } from '../types';
import { WarningIcon, CogIcon, TrashIcon } from './Icons';

interface RestructurePanelProps {
    appState: AppState;
    progress: { current: number; total: number };
    logs: string[];
    errorDetails: string | null;
    apiConfigs: ApiConfig[];
    onStart: () => void;
    onApply: () => void;
    onDiscard: () => void;
    onRetry: () => void;
    onSaveApiConfig: (config: ApiConfig) => void;
    onDeleteApiConfig: (id: string) => void;
}

const ApiConfigManager: React.FC<{
    apiConfigs: ApiConfig[],
    onSaveApiConfig: (config: ApiConfig) => void;
    onDeleteApiConfig: (id: string) => void;
}> = ({ apiConfigs, onSaveApiConfig, onDeleteApiConfig }) => {
    const [name, setName] = useState('');
    const [apiKey, setApiKey] = useState('');

    const handleAddKey = (e: React.FormEvent) => {
        e.preventDefault();
        if(!name.trim() || !apiKey.trim()) {
            alert("Vui lòng nhập tên và API key.");
            return;
        }
        onSaveApiConfig({
            id: `key-${Date.now()}`,
            name,
            provider: 'gemini',
            apiKey,
            model: 'gemini-2.5-flash',
            status: 'active'
        });
        setName('');
        setApiKey('');
    };

    return (
        <div className="mt-auto pt-6 border-t border-gray-700/50">
            <h4 className="text-base font-bold text-white mb-3 flex items-center">
                <CogIcon className="w-5 h-5 mr-2 text-gray-400" />
                Thêm API Key & Xử Lý
            </h4>

            <div className="space-y-2 mb-4">
                {apiConfigs.map(config => (
                    <div key={config.id} className="flex items-center justify-between bg-gray-900/50 p-2 rounded-md text-sm">
                        <span className="text-gray-300 font-medium truncate">{config.name}</span>
                        <TrashIcon onClick={() => onDeleteApiConfig(config.id)} className="w-4 h-4 text-gray-500 hover:text-red-500 cursor-pointer transition-colors" />
                    </div>
                ))}
            </div>
            
            <form onSubmit={handleAddKey} className="space-y-3">
                <input 
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Tên gợi nhớ (e.g., Key cá nhân)"
                    className="w-full bg-gray-900/70 border border-gray-600 rounded-md px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                 <input 
                    type="password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="Dán API Key của bạn vào đây"
                    className="w-full bg-gray-900/70 border border-gray-600 rounded-md px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button type="submit" className="w-full text-sm bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors">
                    Thêm & Lưu API Key
                </button>
            </form>
        </div>
    )
}


const RestructurePanel: React.FC<RestructurePanelProps> = (props) => {
    const { appState, progress, logs, errorDetails, onStart, onApply, onDiscard, onRetry, apiConfigs, onSaveApiConfig, onDeleteApiConfig } = props;
    const progressPercentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
    
    const renderContent = () => {
        switch(appState) {
            case AppState.LOADED:
            case AppState.STRUCTURED:
                 return (
                    <>
                        <h3 className="text-xl font-bold text-white mb-2">AI Restructuring</h3>
                        <p className="text-sm text-gray-400 mb-6">Sắp xếp lại các bookmarks của bạn vào một cấu trúc thư mục thông minh.</p>
                        <button 
                            onClick={onStart}
                            disabled={apiConfigs.length === 0}
                            className="w-full bg-emerald-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-600 transition-all duration-200 transform hover:scale-105 shadow-lg disabled:bg-gray-600 disabled:cursor-not-allowed disabled:scale-100">
                            {apiConfigs.length === 0 ? 'Vui lòng thêm API Key' : 'KÍCH HOẠT TÁI CẤU TRÚC'}
                        </button>
                        <div className="mt-4 text-xs text-gray-500 text-center">
                            <label className="flex items-center justify-center space-x-2">
                                <input type="checkbox" className="form-checkbox bg-gray-700 border-gray-600 rounded text-emerald-500 focus:ring-emerald-500" />
                                <span>Xem trước mỗi mục được áp dụng</span>
                            </label>
                        </div>
                    </>
                );
            case AppState.PROCESSING:
                return (
                    <>
                        <h3 className="text-xl font-bold text-white mb-2">
                            Batch {progress.current}/{progress.total}: Đang Xử Lý...
                        </h3>
                        <p className="text-sm text-gray-400 mb-6">Đang phân tích và gộp các thư mục...</p>
                        <div className="w-full bg-gray-700 rounded-full h-2.5 mb-6">
                            <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${progressPercentage}%`, transition: 'width 0.5s ease-in-out' }}></div>
                        </div>
                        <div className="bg-gray-900/50 rounded-lg p-3 flex-1 overflow-y-auto">
                            <h4 className="text-sm font-semibold text-gray-300 mb-2">Tech diễn giải</h4>
                            <ul className="text-xs text-gray-400 space-y-2">
                               {logs.map((log, index) => (
                                   <li key={index} className="flex items-start">
                                       <span className="text-emerald-400 mr-2">&rarr;</span>
                                       <span>{log}</span>
                                    </li>
                               ))}
                            </ul>
                        </div>
                    </>
                );
            case AppState.REVIEW:
                 return (
                    <>
                        <h3 className="text-xl font-bold text-white mb-2">Xem lại Cấu trúc Mới</h3>
                        <p className="text-sm text-gray-400 mb-6">AI đã đề xuất một cấu trúc mới. Áp dụng các thay đổi hoặc hủy bỏ.</p>
                         <div className="bg-gray-900/50 rounded-lg p-3 flex-1 overflow-y-auto mb-6">
                            <h4 className="text-sm font-semibold text-gray-300 mb-2">Nhật ký Tái cấu trúc</h4>
                            <ul className="text-xs text-gray-400 space-y-2">
                               {logs.slice(-10).map((log, index) => (
                                   <li key={index} className="flex items-start">
                                       <span className="text-emerald-400 mr-2">&rarr;</span>
                                       <span>{log}</span>
                                    </li>
                               ))}
                            </ul>
                        </div>
                        <div className="space-y-3">
                            <button 
                                onClick={onApply}
                                className="w-full bg-emerald-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-600 transition-all duration-200 transform hover:scale-105 shadow-lg">
                                Áp Dụng Thay Đổi
                            </button>
                             <button 
                                onClick={onDiscard}
                                className="w-full bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors">
                                Hủy Bỏ
                            </button>
                        </div>
                    </>
                );
            case AppState.ERROR:
                 return (
                    <>
                        <h3 className="text-xl font-bold text-white mb-2">Xử lý bị gián đoạn</h3>
                        <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative mb-4" role="alert">
                            <div className="flex">
                                <WarningIcon className="w-6 h-6 mr-3"/>
                                <div>
                                    <strong className="font-bold">Lỗi trùng lặp hoặc API xảy ra:</strong>
                                    <span className="block sm:inline ml-1">{errorDetails}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-900/50 rounded-lg p-3 flex-1 overflow-y-auto mb-6">
                            <ul className="text-xs text-gray-400 space-y-2 font-mono">
                               {logs.map((log, index) => (
                                   <li key={index} className={log.toLowerCase().includes('lỗi') ? 'text-red-400' : ''}>{log}</li>
                               ))}
                            </ul>
                        </div>
                        <div className="space-y-3">
                            <button 
                                onClick={onApply}
                                className="w-full bg-emerald-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-emerald-600 transition-colors">
                                Áp dụng kết quả đã xử lý
                            </button>
                            <button 
                                onClick={onRetry}
                                className="w-full bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors">
                                Thử Lại
                            </button>
                        </div>
                    </>
                );
        }
    }
    
    return (
        <aside className="w-96 bg-[#21252C] p-6 flex-shrink-0 flex flex-col border-l border-gray-700/50">
            <div className="flex-1 flex flex-col min-h-0">
                {renderContent()}
            </div>
            {(appState === AppState.LOADED || appState === AppState.STRUCTURED || appState === AppState.ERROR) && (
                <ApiConfigManager 
                    apiConfigs={apiConfigs}
                    onSaveApiConfig={onSaveApiConfig}
                    onDeleteApiConfig={onDeleteApiConfig}
                />
            )}
        </aside>
    );
};

export default RestructurePanel;
