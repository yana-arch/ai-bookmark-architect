import React from 'react';
import { useAppDataContext, useAppConfig } from '@/src/context/AppContext';
import { AppState } from '@/types';
import type { Bookmark, Folder, SmartClassifyRule } from '@/types';
import { WarningIcon, CogIcon } from '../ui/Icons';
import { formatNumber } from '@/src/utils/formatUtils';

interface RestructurePanelProps {
    // These might stay as props if they are specific to the "instance" of the panel or UI orchestration in App
    onStart: () => void;
    onStop: () => void;
    onForceStop?: () => void;
    onApply: () => void;
    onDiscard: () => void;
    onContinue: () => void;
    onOpenLogModal: () => void;
    onSuggestStructure: (source: 'tags' | 'domains') => void;
    onConfirmProposedStructure: () => void;
    proposedStructure: (Folder | Bookmark)[];
    isGeneratingStructure: boolean;
    onOpenAIConfigModal: () => void;
    onRestructureMissing: () => void;
    sessionRules: SmartClassifyRule[];
    onSessionRulesChange: (rules: SmartClassifyRule[]) => void;
    
    // Processing state from useBookmarkProcessing (could also be in context, but for now passed from App)
    progress: { current: number; total: number };
    logs: string[];
    errorDetails: string | null;
    sessionTokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number };
    hasPartialResults: boolean;
}

const RestructurePanel: React.FC<RestructurePanelProps> = React.memo((props) => {
    const {
        onStart, onStop, onForceStop, onApply, onDiscard, onContinue, onRestructureMissing,
        onOpenLogModal, onSuggestStructure, onConfirmProposedStructure,
        proposedStructure, isGeneratingStructure, onOpenAIConfigModal,
        sessionRules, onSessionRulesChange,
        progress, logs, errorDetails, sessionTokenUsage, hasPartialResults
    } = props;
    
    const { appState } = useAppDataContext();
    const { apiConfigs, aiProfiles, activeProfileId, setActiveProfileId } = useAppConfig();

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
            <br />
            <span className="text-gray-500"> (Prompt: </span>
            <span className="font-mono text-sky-400">{formatNumber(sessionTokenUsage.promptTokens)}</span>
            <span className="text-gray-500">, Response: </span>
            <span className="font-mono text-yellow-400">{formatNumber(sessionTokenUsage.completionTokens)}</span>
            <span className="text-gray-500">)</span>
        </div>
    ) : null;

    const renderContent = () => {
        switch (appState) {
            case AppState.LOADED:
                return (
                    <div className="flex flex-col h-full justify-center items-center text-center px-4">
                        <div className="w-20 h-20 bg-sky-500/20 rounded-full flex items-center justify-center mb-6">
                            <span className="text-4xl text-sky-400">⚡</span>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Sẵn Sàng Phân Loại</h3>
                        <p className="text-gray-400 mb-6">
                            Dữ liệu đã được tải. Hãy bắt đầu quá trình tái cấu trúc bằng AI.
                        </p>

                        <div className="w-full mb-6 text-left">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Cấu hình AI</label>
                            <select
                                value={activeProfileId || ''}
                                onChange={(e) => setActiveProfileId(e.target.value || null)}
                                className="w-full bg-[#121418] border border-white/10 rounded-lg p-2 text-sm text-gray-200 outline-none focus:ring-2 focus:ring-sky-500/50"
                            >
                                <option value="" disabled>-- Chọn cấu hình --</option>
                                {aiProfiles.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} {p.isDefault ? '(Mặc định)' : ''}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-4 w-full">
                            <button
                                onClick={onStart}
                                className="w-full bg-sky-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-sky-700 transition-all shadow-lg transform hover:scale-[1.02] active:scale-95">
                                Bắt đầu Tái cấu trúc (Tất cả)
                            </button>
                            
                            <button
                                onClick={onRestructureMissing}
                                className="w-full bg-amber-600/20 text-amber-400 border border-amber-600/50 font-bold py-3 px-6 rounded-lg hover:bg-amber-600/30 transition-all flex items-center justify-center gap-2">
                                <span>⟳</span> Phân loại Bookmark ở Root
                            </button>
                        </div>
                    </div>
                );
            case AppState.STRUCTURED:
                return (
                    <div className="flex flex-col h-full justify-center items-center text-center px-4">
                        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                            <span className="text-4xl">✓</span>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Đã Lưu Thành Công!</h3>
                        <p className="text-gray-400 mb-8">
                            Kiến trúc bookmark của bạn đã được cập nhật thành công.
                        </p>
                        <div className="space-y-4 w-full">
                            <button
                                onClick={onStart}
                                className="w-full bg-sky-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-sky-700 transition-all">
                                Bắt đầu Tái cấu trúc Mới
                            </button>
                            
                            <button
                                onClick={onRestructureMissing}
                                className="w-full bg-amber-600/20 text-amber-400 border border-amber-600/50 font-bold py-3 px-6 rounded-lg hover:bg-amber-600/30 transition-all flex items-center justify-center gap-2">
                                <span>⟳</span> Phân loại Bookmark ở Root
                            </button>

                            <button
                                onClick={() => window.location.reload()}
                                className="w-full bg-gray-700 text-white py-2 px-6 rounded-lg hover:bg-gray-600 transition-all">
                                Làm mới Ứng dụng
                            </button>
                        </div>
                    </div>
                );
            case AppState.PLANNING: {
                const handleAddSessionRule = (folderName: string, path: string[]) => {
                    const pattern = prompt(`Gán quy tắc cho thư mục "${folderName}":\nNhập Tag hoặc nội dung Link (ví dụ: Github, youtube.com)`);
                    if (pattern) {
                        const type = pattern.includes('.') ? 'link' : 'tag';
                        const newRule: SmartClassifyRule = {
                            id: `session-${Date.now()}-${Math.random()}`,
                            name: `Auto to ${folderName}`,
                            type,
                            pattern,
                            targetPath: path,
                            enabled: true,
                            createdAt: Date.now()
                        };
                        onSessionRulesChange([...sessionRules, newRule]);
                    }
                };

                const renderTree = (nodes: any[], currentPath: string[] = []) => (
                    <ul className="pl-4 border-l border-gray-700 space-y-2 mt-1">
                        {nodes.map((node: any) => {
                            const nodePath = [...currentPath, node.name];
                            const nodeRules = sessionRules.filter(r => r.targetPath.join('/') === nodePath.join('/'));

                            return (
                                <li key={node.id} className="text-xs group">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 truncate">
                                            <span className="text-blue-400">📁</span> {node.name}
                                        </div>
                                        <button
                                            onClick={() => handleAddSessionRule(node.name, nodePath)}
                                            className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-emerald-500/40"
                                            title="Gán quy tắc tự động phân loại vào thư mục này"
                                        >
                                            + Quy tắc
                                        </button>
                                    </div>
                                    {nodeRules.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1 pl-4">
                                            {nodeRules.map(r => (
                                                <span key={r.id} className="text-[9px] bg-gray-800 text-gray-400 px-1 rounded border border-gray-700">
                                                    {r.type === 'tag' ? '🏷️' : '🔗'} {r.pattern}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {node.children && node.children.length > 0 && renderTree(node.children, nodePath)}
                                </li>
                            );
                        })}
                    </ul>
                );

                return (
                    <>
                        <h3 className="text-xl font-bold text-white mb-2">Lập kế hoạch cấu trúc</h3>
                        <p className="text-sm text-gray-400 mb-4">Dựa trên dữ liệu của bạn, AI đề xuất cấu trúc sau. Hãy xác nhận để bắt đầu phân loại chi tiết.</p>

                        <div className="bg-gray-900/50 rounded-lg p-4 flex-1 overflow-y-auto mb-6 border border-gray-700/50 shadow-inner">
                            {isGeneratingStructure ? (
                                <div className="flex flex-col items-center justify-center h-full space-y-3">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                                    <span className="text-xs text-emerald-400 font-medium">AI đang thiết kế kiến trúc...</span>
                                </div>
                            ) : proposedStructure.length > 0 ? (
                                <div className="text-gray-300">
                                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Sơ đồ đề xuất:</span>
                                    {renderTree(proposedStructure)}
                                </div>
                            ) : (
                                <div className="text-center text-gray-500 text-xs py-10">Đang chờ AI phản hồi...</div>
                            )}
                        </div>

                        <div className="space-y-3 mt-auto">
                            <button
                                onClick={onConfirmProposedStructure}
                                disabled={proposedStructure.length === 0}
                                className="w-full bg-emerald-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-600 transition-all shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:scale-100">
                                XÁC NHẬN CẤU TRÚC NÀY
                            </button>
                            <button
                                onClick={onDiscard}
                                className="w-full bg-gray-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors">
                                HỦY & THỬ LẠI
                            </button>
                        </div>
                    </>
                );
            }
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
                                    // const isInfo = !isError && !isSuccess && !isProcessing;

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
                        <div className="space-y-2 mt-4">
                            <button
                                onClick={onStop}
                                className="w-full bg-orange-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors"
                            >
                                Dừng Xử Lý (Graceful)
                            </button>
                            {onForceStop && (
                                <button
                                    onClick={onForceStop}
                                    className="w-full bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    Dừng Bắt Buộc (Force)
                                </button>
                            )}
                        </div>
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
                                    // const isInfo = !isError && !isSuccess && !isProcessing;

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
                                <WarningIcon className="w-6 h-6 mr-3" />
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
    };

    return (
        <aside className="w-96 bg-[#21252C] p-6 flex-shrink-0 flex flex-col border-l border-gray-700/50">
            <div className="flex-1 flex flex-col min-h-0">
                {renderContent()}
            </div>
        </aside>
    );
});

export default RestructurePanel;
