import React from 'react';
import type { Bookmark } from '../types';
import { BrokenLinkIcon, FileIcon } from './Icons';

interface BrokenLinkModalProps {
    brokenLinks: Bookmark[];
    onClose: () => void;
    onClean: () => void;
}

const BrokenLinkModal: React.FC<BrokenLinkModalProps> = ({ brokenLinks, onClose, onClean }) => {
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 transition-opacity duration-300">
            <div className="bg-[#282C34] rounded-xl shadow-2xl p-8 w-full max-w-2xl m-4 transform transition-all duration-300 scale-100 flex flex-col h-[70vh]">
                <div className="flex items-center mb-4 flex-shrink-0">
                    <BrokenLinkIcon className="w-6 h-6 mr-3 text-red-400" />
                    <h2 className="text-xl font-bold text-white">Quản lý Liên kết Hỏng</h2>
                </div>
                <p className="text-gray-400 mb-6 flex-shrink-0">Đã tìm thấy <span className="font-bold text-red-300">{brokenLinks.length}</span> bookmark có vẻ đã bị hỏng hoặc không thể truy cập.</p>
                
                <div className="flex-1 space-y-2 mb-6 overflow-y-auto bg-gray-900/30 p-3 rounded-md text-sm pr-1">
                    {brokenLinks.length > 0 ? brokenLinks.map((bm) => (
                        <div key={bm.id} className="flex items-start justify-between bg-gray-800/50 p-2 rounded">
                            <FileIcon className="w-4 h-4 mr-3 mt-0.5 text-gray-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-gray-200 font-medium truncate" title={bm.title}>{bm.title}</p>
                                <p className="text-xs text-red-400/80 truncate" title={bm.url}>{bm.url}</p>
                            </div>
                        </div>
                    )) : <p className="text-sm text-gray-500 text-center py-4">Không có liên kết hỏng nào.</p>}
                </div>

                <div className="flex justify-end space-x-4 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="bg-gray-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={onClean}
                        className="bg-red-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-600 transition-colors"
                    >
                        Xóa tất cả ({brokenLinks.length})
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BrokenLinkModal;