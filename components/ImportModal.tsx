
import React, { useState, useEffect } from 'react';
import type { Bookmark } from '../types';
import ImportPreview from './ImportPreview';

interface ImportModalProps {
    fileName: string;
    previewBookmarks: Bookmark[];
    existingBookmarks: Bookmark[];
    onImport: (mode: 'merge' | 'overwrite') => void;
    onCancel: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({
    fileName,
    previewBookmarks,
    existingBookmarks,
    onImport,
    onCancel
}) => {
    const [showPreview, setShowPreview] = useState(false);
    const [duplicates, setDuplicates] = useState(0);
    const [invalidUrls, setInvalidUrls] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        // Analyze bookmarks for duplicates and invalid URLs
        analyzeBookmarks();
    }, [previewBookmarks, existingBookmarks]);

    const analyzeBookmarks = () => {
        let duplicateCount = 0;
        let invalidCount = 0;

        // Create set of existing URLs for duplicate detection
        const existingUrls = new Set(existingBookmarks.map(bm => bm.url));

        previewBookmarks.forEach(bookmark => {
            // Check for duplicates
            if (existingUrls.has(bookmark.url)) {
                duplicateCount++;
            }

            // Check for invalid URLs
            try {
                new URL(bookmark.url);
            } catch (e) {
                invalidCount++;
            }
        });

        setDuplicates(duplicateCount);
        setInvalidUrls(invalidCount);
    };

    const handlePreview = () => {
        setShowPreview(true);
    };

    const handleConfirmImport = async (mode: 'merge' | 'overwrite') => {
        setIsProcessing(true);
        try {
            await onImport(mode);
        } finally {
            setIsProcessing(false);
        }
    };

    if (showPreview) {
        return (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                <ImportPreview
                    bookmarks={previewBookmarks}
                    duplicates={duplicates}
                    invalidUrls={invalidUrls}
                    onConfirm={() => handleConfirmImport('merge')} // Default to merge for now
                    onCancel={() => setShowPreview(false)}
                    isProcessing={isProcessing}
                />
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 transition-opacity duration-300">
            <div className="bg-[#282C34] rounded-xl shadow-2xl p-8 w-full max-w-lg m-4 transform transition-all duration-300 scale-100">
                <div className="flex items-center mb-4">
                    <h2 className="text-xl font-bold text-white">Nhập Bookmarks</h2>
                </div>

                <p className="text-gray-400 mb-4">
                    File: <span className="font-semibold text-gray-200">{fileName}</span>
                </p>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-blue-400">{previewBookmarks.length}</div>
                        <div className="text-xs text-gray-400">Tổng số</div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-green-400">{previewBookmarks.length - invalidUrls}</div>
                        <div className="text-xs text-gray-400">Hợp lệ</div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-yellow-400">{duplicates}</div>
                        <div className="text-xs text-gray-400">Trùng lặp</div>
                    </div>
                </div>

                {/* Sample Preview */}
                {previewBookmarks.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-white mb-2">Mẫu bookmarks:</h3>
                        <div className="bg-gray-700/50 p-3 rounded-lg max-h-32 overflow-y-auto">
                            {previewBookmarks.slice(0, 5).map((b, index) => (
                                <p key={index} className="text-gray-300 text-sm truncate mb-1">
                                    <span className="font-medium">{b.title}</span>
                                </p>
                            ))}
                            {previewBookmarks.length > 5 && (
                                <p className="text-gray-400 text-sm mt-2">
                                    ... và {previewBookmarks.length - 5} bookmarks khác
                                </p>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onCancel}
                        className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handlePreview}
                        className="bg-blue-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        Xem Chi Tiết
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImportModal;
