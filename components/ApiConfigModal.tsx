
import React, { useState } from 'react';
import type { ApiConfig } from '../types';
import { CogIcon, TrashIcon } from './Icons';

interface ApiConfigModalProps {
    onClose: () => void;
    apiConfigs: ApiConfig[];
    onSaveApiConfig: (config: ApiConfig) => void;
    onDeleteApiConfig: (id: string) => void;
}

const ApiConfigModal: React.FC<ApiConfigModalProps> = ({ onClose, apiConfigs, onSaveApiConfig, onDeleteApiConfig }) => {
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 transition-opacity duration-300">
            <div className="bg-[#282C34] rounded-xl shadow-2xl p-8 w-full max-w-md m-4 transform transition-all duration-300 scale-100">
                <div className="flex items-center mb-4">
                    <CogIcon className="w-6 h-6 mr-3 text-sky-400" />
                    <h2 className="text-xl font-bold text-white">Quản lý API Keys</h2>
                </div>
                <p className="text-gray-400 mb-6">Thêm, xem, và xóa các API key Gemini của bạn. Các key được lưu trữ an toàn trong trình duyệt của bạn.</p>
                
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Các Key Hiện Có</h3>
                <div className="space-y-2 mb-4 max-h-40 overflow-y-auto bg-gray-900/30 p-2 rounded-md">
                    {apiConfigs.length > 0 ? apiConfigs.map(config => (
                        <div key={config.id} className="flex items-center justify-between bg-gray-900/50 p-2 rounded-md text-sm">
                            <span className="text-gray-300 font-medium truncate">{config.name}</span>
                            <button
                                onClick={() => onDeleteApiConfig(config.id)}
                                className="p-1 rounded-full hover:bg-red-500/20"
                                title={`Xóa key ${config.name}`}
                            >
                                <TrashIcon className="w-4 h-4 text-gray-500 hover:text-red-500 cursor-pointer transition-colors" />
                            </button>
                        </div>
                    )) : <p className="text-sm text-gray-500 text-center py-4">Chưa có API key nào.</p>}
                </div>
                
                <form onSubmit={handleAddKey} className="space-y-3 pt-4 border-t border-gray-700/50">
                     <h3 className="text-sm font-semibold text-gray-300">Thêm Key Mới</h3>
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
                    <button type="submit" className="w-full text-sm bg-emerald-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-emerald-600 transition-colors">
                        Thêm & Lưu API Key
                    </button>
                </form>

                <div className="mt-8 text-right">
                    <button
                        onClick={onClose}
                        className="bg-gray-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ApiConfigModal;
