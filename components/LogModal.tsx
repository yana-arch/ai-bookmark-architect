import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { DetailedLog } from '../types';
import { ClipboardIcon, SearchIcon, ExportIcon, TrashIcon } from './Icons';
import { formatNumber } from '../src/utils';

interface LogModalProps {
    logs: DetailedLog[];
    onClose: () => void;
}

const LogEntry: React.FC<{ log: DetailedLog }> = ({ log }) => {
    const [copied, setCopied] = useState(false);
    
    const typeClasses = {
        info: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        request: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        response: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        error: 'bg-red-500/20 text-red-300 border-red-500/30',
    };

    const handleCopy = () => {
        const contentToCopy = typeof log.content === 'string' ? log.content : JSON.stringify(log.content, null, 2);
        navigator.clipboard.writeText(contentToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={`border-l-4 p-4 mb-4 bg-gray-900/50 rounded-r-lg ${typeClasses[log.type]}`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold mr-3 uppercase ${typeClasses[log.type]}`}>{log.type}</span>
                    <span className="font-semibold text-gray-200">{log.title}</span>
                </div>
                <span className="text-xs text-gray-500">{log.timestamp}</span>
            </div>
            <div className="relative">
                <pre className="whitespace-pre-wrap break-all bg-gray-900/70 p-3 rounded-md text-xs text-gray-300 max-h-60 overflow-y-auto">
                    <code>
                        {typeof log.content === 'string' ? log.content : JSON.stringify(log.content, null, 2)}
                    </code>
                </pre>
                 <button 
                    onClick={handleCopy}
                    className="absolute top-2 right-2 p-1.5 bg-gray-700/50 rounded-md hover:bg-gray-600 transition-colors"
                    title="Copy to clipboard"
                 >
                    <ClipboardIcon className="w-4 h-4 text-gray-400" />
                </button>
                {copied && <span className="absolute top-10 right-2 text-xs text-emerald-400">Đã sao chép!</span>}
            </div>
            {log.usage && log.usage.promptTokens !== undefined && log.usage.completionTokens !== undefined && log.usage.totalTokens !== undefined && (
                <div className="mt-3 pt-3 border-t border-gray-700/50 text-xs text-gray-400 font-mono">
                    <span className="font-semibold text-gray-300">TOKEN USAGE &mdash; </span>
                    <span>Prompt: <span className="text-sky-300 font-semibold">{formatNumber(log.usage.promptTokens)}</span></span>
                    <span className="mx-2">|</span>
                    <span>Completion: <span className="text-yellow-300 font-semibold">{formatNumber(log.usage.completionTokens)}</span></span>
                    <span className="mx-2">|</span>
                    <span>Total: <span className="text-emerald-300 font-semibold">{formatNumber(log.usage.totalTokens)}</span></span>
                </div>
            )}
        </div>
    );
};

const LogModal: React.FC<LogModalProps> = ({ logs, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState<string>('all');
    const [autoScroll, setAutoScroll] = useState(true);
    const logsEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (autoScroll) {
            scrollToBottom();
        }
    }, [logs, autoScroll]);

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchesSearch = searchQuery === '' ||
                log.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (typeof log.content === 'string' && log.content.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesType = selectedType === 'all' || log.type === selectedType;

            return matchesSearch && matchesType;
        });
    }, [logs, searchQuery, selectedType]);

    const logStats = useMemo(() => {
        const stats = {
            total: logs.length,
            info: 0,
            request: 0,
            response: 0,
            error: 0,
            totalTokens: 0
        };

        logs.forEach(log => {
            stats[log.type]++;
            if (log.usage?.totalTokens) {
                stats.totalTokens += log.usage.totalTokens;
            }
        });

        return stats;
    }, [logs]);

    const handleExportLogs = () => {
        const exportData = filteredLogs.map(log => ({
            timestamp: log.timestamp,
            type: log.type,
            title: log.title,
            content: log.content,
            usage: log.usage
        }));

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleClearLogs = () => {
        if (window.confirm('Bạn có chắc chắn muốn xóa tất cả logs không? Hành động này không thể hoàn tác.')) {
            // This would need to be implemented in the parent component
            // For now, just show a message
            alert('Tính năng xóa logs sẽ được triển khai trong phiên bản tương lai.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#21252C] rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col">
                <header className="flex items-center justify-between p-4 border-b border-gray-700/50 flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white">Chi tiết Log Kỹ thuật</h2>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
                            <span>Tổng: {logStats.total}</span>
                            <span>Info: {logStats.info}</span>
                            <span>Request: {logStats.request}</span>
                            <span>Response: {logStats.response}</span>
                            <span>Error: {logStats.error}</span>
                            <span>Tokens: {formatNumber(logStats.totalTokens)}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </header>

                <div className="p-4 border-b border-gray-700/50 flex-shrink-0">
                    <div className="flex items-center space-x-4">
                        <div className="flex-1 relative">
                            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm logs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        >
                            <option value="all">Tất cả loại</option>
                            <option value="info">Info</option>
                            <option value="request">Request</option>
                            <option value="response">Response</option>
                            <option value="error">Error</option>
                        </select>

                        <label className="flex items-center space-x-2 text-sm text-gray-300">
                            <input
                                type="checkbox"
                                checked={autoScroll}
                                onChange={(e) => setAutoScroll(e.target.checked)}
                                className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                            />
                            <span>Tự động cuộn</span>
                        </label>

                        <button
                            onClick={handleExportLogs}
                            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            title="Xuất logs"
                        >
                            <ExportIcon className="w-4 h-4" />
                            <span>Xuất</span>
                        </button>

                        <button
                            onClick={handleClearLogs}
                            className="flex items-center space-x-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                            title="Xóa tất cả logs"
                        >
                            <TrashIcon className="w-4 h-4" />
                            <span>Xóa</span>
                        </button>
                    </div>
                </div>

                <main className="flex-1 p-4 overflow-y-auto">
                    {filteredLogs.length > 0 ? (
                        <>
                            {filteredLogs.slice().reverse().map(log => (
                                <LogEntry key={log.id} log={log} />
                            ))}
                            <div ref={logsEndRef} />
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <p className="text-lg mb-2">Không tìm thấy log nào</p>
                            <p className="text-sm">Thử điều chỉnh bộ lọc hoặc tìm kiếm</p>
                        </div>
                    )}
                </main>

                <footer className="p-4 border-t border-gray-700/50 flex-shrink-0 flex justify-between items-center">
                    <div className="text-sm text-gray-400">
                        Hiển thị {filteredLogs.length} / {logs.length} logs
                    </div>
                    <div className="space-x-2">
                        <button
                            onClick={handleClearLogs}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                            Xóa Logs
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                        >
                            Đóng
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default LogModal;
