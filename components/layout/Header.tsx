import React from 'react';
import { AILogoIcon, UploadIcon, ImportIcon, ChartIcon } from '../ui/Icons';

interface HeaderProps {
    onOpenBackup: () => void;
    onOpenData: () => void;
    onOpenAnalytics: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenBackup, onOpenData, onOpenAnalytics }) => {
    return (
        <header className="flex items-center justify-between p-4 border-b border-gray-700/50 flex-shrink-0">
            <h1 className="text-lg font-bold text-white flex items-center">
                <AILogoIcon className="w-6 h-6 mr-3 text-emerald-400" />
                AI Bookmark Architect
            </h1>
            <div className="flex items-center space-x-2">
                <button
                    onClick={onOpenBackup}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
                    title="Upload dữ liệu"
                >
                    <UploadIcon className="w-4 h-4" />
                </button>
                <button
                    onClick={onOpenData}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors"
                    title="Import dữ liệu"
                >
                    <ImportIcon className="w-4 h-4" />
                </button>

                <button
                    onClick={onOpenAnalytics}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-md transition-colors"
                    title="Xem phân tích dữ liệu"
                >
                    <ChartIcon className="w-4 h-4" />
                </button>
                <button className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600"></button>
                <button className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600"></button>
                <button className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600"></button>
            </div>
        </header>
    );
};

export default Header;
