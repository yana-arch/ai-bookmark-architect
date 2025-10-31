import React from 'react';
import type { DuplicateStats } from '@/types';
import { DocumentDuplicateIcon } from './Icons';

interface DuplicateModalProps {
    stats: DuplicateStats;
    onClose: () => void;
    onClean: () => void;
}

const DuplicateModal: React.FC<DuplicateModalProps> = ({ stats, onClose, onClean }) => {
    const sortedHosts = Object.entries(stats.byHost).sort(([, a]: [string, number], [, b]: [string, number]) => b - a);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 transition-opacity duration-300">
            <div className="bg-[#282C34] rounded-xl shadow-2xl p-8 w-full max-w-lg m-4 transform transition-all duration-300 scale-100">
                <div className="flex items-center mb-4">
                    <DocumentDuplicateIcon className="w-6 h-6 mr-3 text-yellow-400" />
                    <h2 className="text-xl font-bold text-white">Quản lý Bookmark Trùng lặp</h2>
                </div>
                <p className="text-gray-400 mb-2">Đã tìm thấy <span className="font-bold text-yellow-300">{stats.count}</span> bookmark trùng lặp dựa trên URL.</p>
                <p className="text-gray-400 mb-6">Việc dọn dẹp sẽ xóa các bản sao cũ hơn và chỉ giữ lại bookmark được thêm gần đây nhất cho mỗi URL.</p>
                
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Thống kê theo Tên miền</h3>
                <div className="space-y-2 mb-6 max-h-48 overflow-y-auto bg-gray-900/30 p-3 rounded-md text-sm">
                    {sortedHosts.length > 0 ? sortedHosts.map(([host, count]) => (
                        <div key={host} className="flex items-center justify-between">
                            <span className="text-gray-300 font-mono truncate">{host}</span>
                            <span className="font-semibold text-yellow-300">{count} trùng lặp</span>
                        </div>
                    )) : <p className="text-sm text-gray-500 text-center py-4">Không có mục trùng lặp nào.</p>}
                </div>

                <div className="flex justify-end space-x-4">
                    <button
                        onClick={onClose}
                        className="bg-gray-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={onClean}
                        className="bg-yellow-500 text-black font-bold py-2 px-6 rounded-lg hover:bg-yellow-600 transition-colors"
                    >
                        Dọn dẹp tất cả ({stats.count})
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DuplicateModal;
