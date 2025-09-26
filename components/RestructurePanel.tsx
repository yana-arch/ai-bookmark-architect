import React from 'react';
import { AppState } from '../types';
import type { ApiConfig } from '../types';
import { WarningIcon, CogIcon } from './Icons';
import { formatNumber } from '../src/utils';

interface RestructurePanelProps {
    appState: AppState;
    progress: { current: number; total: number };
    logs: string[];
    errorDetails: string | null;
    apiConfigs: ApiConfig[];
    systemPrompt: string;
    sessionTokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number };
    customInstructions: string;
    batchSize: number;
    maxRetries: number;
    hasPartialResults: boolean;
    onStart: () => void;
    onStop: () => void;
    onApply: () => void;
    onDiscard: () => void;
    onContinue: () => void;
    onOpenApiModal: () => void;
    onOpenLogModal: () => void;
    onSystemPromptChange: (prompt: string) => void;
    onCustomInstructionsChange: (instructions: string) => void;
    onBatchSizeChange: (size: number) => void;
    onMaxRetriesChange: (retries: number) => void;
}

const RestructurePanel: React.FC<RestructurePanelProps> = (props) => {
    const { 
        appState, progress, logs, errorDetails, onStart, onStop, onApply, onDiscard, onContinue, 
        apiConfigs, onOpenApiModal, onOpenLogModal,
        systemPrompt, onSystemPromptChange, sessionTokenUsage,
        customInstructions, onCustomInstructionsChange,
        batchSize, onBatchSizeChange, maxRetries, onMaxRetriesChange,
        hasPartialResults
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

    const TokenUsageDisplay = () => sessionTokenUsage.totalTokens > 0 ? (
        <div className="text-xs text-center text-gray-400 mb-4 p-2 bg-gray-900/50 rounded-md border border-gray-700/50">
            <span>Tokens đã sử dụng: </span>
            <span className="font-mono text-emerald-400 font-bold">{formatNumber(sessionTokenUsage.totalTokens)}</span>
            <br/>
            <span className="text-gray-500"> (Prompt: </span>
            <span className="font-mono text-sky-400">{formatNumber(sessionTokenUsage.promptTokens)}</span>
            <span className="text-gray-500">, Response: </span>
            <span className="font-mono text-yellow-400">{formatNumber(sessionTokenUsage.completionTokens)}</span>
            <span className="text-gray-500">)</span>
        </div>
    ) : null;

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
                            disabled={apiConfigs.filter(c => c.status === 'active').length === 0}
                            className="w-full bg-emerald-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-600 transition-all duration-200 transform hover:scale-105 shadow-lg disabled:bg-gray-600 disabled:cursor-not-allowed disabled:scale-100">
                            {apiConfigs.filter(c => c.status === 'active').length === 0 ? 'Vui lòng thêm API Key' : 'BẮT ĐẦU TÁI CẤU TRÚC'}
                        </button>
                        <div className="mt-6">
                            <details className="group">
                                <summary className="text-sm font-medium text-gray-400 cursor-pointer list-none flex items-center justify-between group-hover:text-white transition-colors">
                                    <span>Tùy chọn & Chỉ dẫn cho AI</span>
                                    <svg className="w-4 h-4 transition-transform duration-200 transform-gpu group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                    </svg>
                                </summary>
                                <div className="mt-3 space-y-4">
                                    <div>
                                        <label htmlFor="system-prompt" className="block text-xs text-gray-400 mb-1">
                                            Chỉ dẫn hệ thống cho AI (System Prompt):
                                        </label>
                                        <textarea
                                            id="system-prompt"
                                            value={systemPrompt}
                                            onChange={(e) => onSystemPromptChange(e.target.value)}
                                            rows={5}
                                            className="w-full bg-gray-900/70 border border-gray-600 rounded-md px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="ai-instructions" className="block text-xs text-gray-400 mb-1">
                                            Chỉ dẫn bổ sung (tên thư mục, phân loại):
                                        </label>
                                        <textarea
                                            id="ai-instructions"
                                            value={customInstructions}
                                            onChange={(e) => onCustomInstructionsChange(e.target.value)}
                                            rows={3}
                                            placeholder="Ví dụ: Chỉ sử dụng tiếng Anh cho tên thư mục. Giới hạn 2 cấp thư mục."
                                            className="w-full bg-gray-900/70 border border-gray-600 rounded-md px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
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
                           Đang Xử Lý...
                        </h3>
                         <p className="text-sm text-gray-400 mb-6">
                            Đã xử lý {formatNumber(progress.current)} / {formatNumber(progress.total)} bookmarks.
                        </p>
                        <div className="w-full bg-gray-700 rounded-full h-2.5 mb-6">
                            <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${progressPercentage}%`, transition: 'width 0.5s ease-in-out' }}></div>
                        </div>
                        <div className="bg-gray-900/50 rounded-lg p-3 flex-1 overflow-y-auto">
                            <h4 className="text-sm font-semibold text-gray-300 mb-3">Nhật ký tái cấu trúc</h4>
                            <div className="space-y-2">
                               {logs.slice(-10).map((log, index) => {
                                   const isError = log.toLowerCase().includes('lỗi') || log.toLowerCase().includes('error');
                                   const isSuccess = log.toLowerCase().includes('hoàn tất') || log.toLowerCase().includes('success');
                                   const isProcessing = log.toLowerCase().includes('đang xử lý') || log.toLowerCase().includes('processing');
                                   const isInfo = !isError && !isSuccess && !isProcessing;

                                   let iconColor = 'text-gray-400';
                                   let bgColor = 'bg-gray-800/50';
                                   if (isError) {
                                       iconColor = 'text-red-400';
                                       bgColor = 'bg-red-900/20';
                                   } else if (isSuccess) {
                                       iconColor = 'text-emerald-400';
                                       bgColor = 'bg-emerald-900/20';
                                   } else if (isProcessing) {
                                       iconColor = 'text-sky-400';
                                       bgColor = 'bg-sky-900/20';
                                   }

                                   return (
                                       <div key={index} className={`flex items-start p-2 rounded-md ${bgColor} border-l-2 ${isError ? 'border-red-500' : isSuccess ? 'border-emerald-500' : isProcessing ? 'border-sky-500' : 'border-gray-600'}`}>
                                           <span className={`text-xs mr-3 mt-0.5 ${iconColor}`}>
                                               {isError ? '✗' : isSuccess ? '✓' : isProcessing ? '⟳' : 'ℹ'}
                                           </span>
                                           <span className="text-xs text-gray-300 flex-1">{log}</span>
                                       </div>
                                   );
                               })}
                            </div>
                        </div>
                        <button
                            onClick={onStop}
                            className="w-full mt-4 bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Dừng Xử Lý
                        </button>
                        <LogViewerButton />
                    </>
                );
            case AppState.REVIEW:
                 return (
                    <>
                        <h3 className="text-xl font-bold text-white mb-2">Xem lại Cấu trúc Mới</h3>
                        <p className="text-sm text-gray-400 mb-4">AI đã đề xuất một cấu trúc mới. Áp dụng các thay đổi hoặc hủy bỏ.</p>
                        <TokenUsageDisplay />
                         <div className="bg-gray-900/50 rounded-lg p-3 flex-1 overflow-y-auto mb-6">
                            <h4 className="text-sm font-semibold text-gray-300 mb-3">Nhật ký tái cấu trúc</h4>
                            <div className="space-y-2">
                               {logs.slice(-10).map((log, index) => {
                                   const isError = log.toLowerCase().includes('lỗi') || log.toLowerCase().includes('error');
                                   const isSuccess = log.toLowerCase().includes('hoàn tất') || log.toLowerCase().includes('success');
                                   const isProcessing = log.toLowerCase().includes('đang xử lý') || log.toLowerCase().includes('processing');
                                   const isInfo = !isError && !isSuccess && !isProcessing;

                                   let iconColor = 'text-gray-400';
                                   let bgColor = 'bg-gray-800/50';
                                   if (isError) {
                                       iconColor = 'text-red-400';
                                       bgColor = 'bg-red-900/20';
                                   } else if (isSuccess) {
                                       iconColor = 'text-emerald-400';
                                       bgColor = 'bg-emerald-900/20';
                                   } else if (isProcessing) {
                                       iconColor = 'text-sky-400';
                                       bgColor = 'bg-sky-900/20';
                                   }

                                   return (
                                       <div key={index} className={`flex items-start p-2 rounded-md ${bgColor} border-l-2 ${isError ? 'border-red-500' : isSuccess ? 'border-emerald-500' : isProcessing ? 'border-sky-500' : 'border-gray-600'}`}>
                                           <span className={`text-xs mr-3 mt-0.5 ${iconColor}`}>
                                               {isError ? '✗' : isSuccess ? '✓' : isProcessing ? '⟳' : 'ℹ'}
                                           </span>
                                           <span className="text-xs text-gray-300 flex-1">{log}</span>
                                       </div>
                                   );
                               })}
                            </div>
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
                        <TokenUsageDisplay />
                        <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative mb-4" role="alert">
                            <div className="flex">
                                <WarningIcon className="w-6 h-6 mr-3"/>
                                <div>
                                    <strong className="font-bold">
                                        {errorDetails?.toLowerCase().includes('dừng') ? 'Thông báo:' : 'Lỗi API hoặc hệ thống:'}
                                    </strong>
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
                             {hasPartialResults && (
                                <button 
                                    onClick={onContinue}
                                    className="w-full bg-sky-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-600 transition-colors transform hover:scale-105 shadow-lg">
                                    Tiếp tục xử lí
                                </button>
                            )}
                             {hasPartialResults && (
                                <button 
                                    onClick={onApply}
                                    className="w-full bg-emerald-500/80 text-white font-bold py-2 px-4 rounded-lg hover:bg-emerald-500 transition-colors">
                                    Áp dụng kết quả đã xử lý
                                </button>
                            )}
                            <button 
                                onClick={onDiscard}
                                className="w-full bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors">
                                Bắt đầu lại
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
