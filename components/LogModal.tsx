import React, { useState } from 'react';
import type { DetailedLog } from '../types';
import { ClipboardIcon } from './Icons';

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
        </div>
    );
};

const LogModal: React.FC<LogModalProps> = ({ logs, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#21252C] rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
                <header className="flex items-center justify-between p-4 border-b border-gray-700/50 flex-shrink-0">
                    <h2 className="text-xl font-bold text-white">Chi tiết Log Kỹ thuật</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </header>
                <main className="flex-1 p-4 overflow-y-auto">
                    {logs.length > 0 ? (
                        logs.map(log => <LogEntry key={log.id} log={log} />)
                    ) : (
                        <p className="text-center text-gray-500">Không có log nào để hiển thị.</p>
                    )}
                </main>
                <footer className="p-4 border-t border-gray-700/50 flex-shrink-0 text-right">
                     <button
                        onClick={onClose}
                        className="bg-gray-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        Đóng
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default LogModal;
