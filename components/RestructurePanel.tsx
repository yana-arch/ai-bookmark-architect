import React from 'react';
import { AppState } from '../types';
import type { ApiConfig } from '../types';
import { WarningIcon, CogIcon } from './Icons';

interface RestructurePanelProps {
    appState: AppState;
    progress: { current: number; total: number };
    logs: string[];
    errorDetails: string | null;
    apiConfigs: ApiConfig[];
    customInstructions: string;
    batchSize: number;
    maxRetries: number;
    onStart: () => void;
    onApply: () => void;
    onDiscard: () => void;
    onRetry: () => void;
    onOpenApiModal: () => void;
    onOpenLogModal: () => void;
    onCustomInstructionsChange: (instructions: string) => void;
    onBatchSizeChange: (size: number) => void;
    onMaxRetriesChange: (retries: number) => void;
}

const RestructurePanel: React.FC<RestructurePanelProps> = (props) => {
    const { 
        appState, progress, logs, errorDetails, onStart, onApply, onDiscard, onRetry, 
        apiConfigs, onOpenApiModal, onOpenLogModal,
        customInstructions, onCustomInstructionsChange,
        batchSize, onBatchSizeChange, maxRetries, onMaxRetriesChange
    } = props;
    const progressPercentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
    
    const LogViewerButton = () => (
        <div className="mt-4">
            <button
                onClick={onOpenLogModal}
                className="w-full text-sm text-sky-300 border border-sky-300/50 rounded-md py-2 hover:bg-sky-300/10 transition-colors"
            >
                Xem Log Kỹ Thuật
            </button>
        </div>
    );

    const renderContent = () => {
        switch(appState) {
            case AppState.LOADED:
            case AppState.STRUCTURED:
                 return (
                    <>
                        <h3 className="text-xl font-bold text-white mb-2">Tái cấu trúc bằng AI</h3>
                        <p className="text-sm text-gray-400 mb-6">Sắp xếp lại các bookmarks của bạn vào một cấu trúc thư mục thông minh.</p>
                        <button 
                            onClick={onStart}
                            disabled={apiConfigs.length === 0}
                            className="w-full bg-emerald-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-600 transition-all duration-200 transform hover:scale-105 shadow-lg disabled:bg-gray-600 disabled:cursor-not-allowed disabled:scale-100">
                            {apiConfigs.length === 0 ? 'Vui lòng thêm API Key' : 'BẮT ĐẦU TÁI CẤU TRÚC'}
                        </button>
                        <div className="mt-6">
                            <details className="group">
                                <summary className="text-sm font-medium text-gray-400 cursor-pointer list-none flex items-center justify-between group-hover:text-white transition-colors">
                                    <span>Tùy chọn & Chỉ dẫn cho AI</span>
                                    <svg className="w-4 h-4 transition-transform duration-200 transform-gpu group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                    </svg>
                                </summary>
                                <div className="mt-3">
                                    <label htmlFor="ai-instructions" className="block text-xs text-gray-400 mb-1">
                                        Chỉ dẫn về cách đặt tên và phân loại thư mục:
                                    </label>
                                    <textarea
                                        id="ai-instructions"
                                        value={customInstructions}
                                        onChange={(e) => onCustomInstructionsChange(e.target.value)}
                                        rows={3}
                                        placeholder="Ví dụ: Chỉ sử dụng tiếng Anh cho tên thư mục. Giới hạn 2 cấp thư mục."
                                        className="w-full bg-gray-900/70 border border-gray-600 rounded-md px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
                                    />
                                    <div className="mt-4 grid grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="batch-size" className="block text-xs text-gray-400 mb-1">
                                                Số lượng bookmark mỗi batch
                                            </label>
                                            <input
                                                type="number"
                                                id="batch-size"
                                                value={batchSize}
                                                onChange={(e) => onBatchSizeChange(parseInt(e.target.value, 10))}
                                                min="1"
                                                max="50"
                                                className="w-full bg-gray-900/70 border border-gray-600 rounded-md px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="max-retries" className="block text-xs text-gray-400 mb-1">
                                                Số lần thử lại trên mỗi key
                                            </label>
                                            <input
                                                type="number"
                                                id="max-retries"
                                                value={maxRetries}
                                                onChange={(e) => onMaxRetriesChange(parseInt(e.target.value, 10))}
                                                min="0"
                                                max="5"
                                                className="w-full bg-gray-900/70 border border-gray-600 rounded-md px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </details>
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
                        <LogViewerButton />
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
                        <LogViewerButton />
                        <div className="space-y-3 mt-4">
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
                        <LogViewerButton />
                        <div className="space-y-3 mt-4">
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
                 <div className="mt-auto pt-6 border-t border-gray-700/50">
                    <button 
                        onClick={onOpenApiModal} 
                        className="w-full flex items-center justify-center text-sm bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        <CogIcon className="w-5 h-5 mr-2" />
                        Quản lý API Keys
                    </button>
                </div>
            )}
        </aside>
    );
};

export default RestructurePanel;