import React from 'react';
import type { Bookmark } from '@/types';
import { FileIcon, WarningIcon } from './Icons';

interface ImportPreviewProps {
  bookmarks: Bookmark[];
  duplicates: number;
  invalidUrls: number;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

const ImportPreview: React.FC<ImportPreviewProps> = ({
  bookmarks,
  duplicates,
  invalidUrls,
  onConfirm,
  onCancel,
  isProcessing = false
}) => {
  const totalBookmarks: number = bookmarks.length;
  const validBookmarks: number = totalBookmarks - invalidUrls;
  const newBookmarks: number = validBookmarks - duplicates;

  const getHostname = (url: string): string => {
    try {
      return new URL(url).hostname;
    } catch (e) {
      return 'invalid_url';
    }
  };

  // Group by domain for preview
  const domainStats = bookmarks.reduce((acc, bm) => {
    const domain = getHostname(bm.url);
    acc[domain] = (acc[domain] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topDomains = Object.entries(domainStats)
    .sort(([, a]: [string, number], [, b]: [string, number]) => b - a)
    .slice(0, 5);

  return (
    <div className="bg-[#282C34] rounded-xl shadow-2xl p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
      <div className="flex items-center mb-6">
        <FileIcon className="w-6 h-6 mr-3 text-blue-400" />
        <h2 className="text-xl font-bold text-white">Xem Trước Import</h2>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{totalBookmarks}</div>
          <div className="text-sm text-gray-400">Tổng số</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{validBookmarks}</div>
          <div className="text-sm text-gray-400">Hợp lệ</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">{newBookmarks}</div>
          <div className="text-sm text-gray-400">Mới</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-400">{duplicates}</div>
          <div className="text-sm text-gray-400">Trùng lặp</div>
        </div>
      </div>

      {/* Warnings */}
      {(duplicates > 0 || invalidUrls > 0) && (
        <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4 mb-6">
          <div className="flex items-center mb-2">
            <WarningIcon className="w-5 h-5 mr-2 text-yellow-400" />
            <span className="text-yellow-400 font-semibold">Cảnh báo</span>
          </div>
          <ul className="text-sm text-yellow-200 space-y-1">
            {duplicates > 0 && (
              <li>• {duplicates} bookmark trùng lặp sẽ được bỏ qua</li>
            )}
            {invalidUrls > 0 && (
              <li>• {invalidUrls} URL không hợp lệ sẽ được bỏ qua</li>
            )}
          </ul>
        </div>
      )}

      {/* Domain Statistics */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">Thống kê theo Domain</h3>
        <div className="bg-gray-900/30 rounded-lg p-4">
          <div className="space-y-2">
            {topDomains.map(([domain, count]) => (
              <div key={domain} className="flex items-center justify-between">
                <span className="text-gray-300 font-mono text-sm truncate">{domain}</span>
                <span className="font-semibold text-blue-400">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sample Bookmarks */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">Mẫu Bookmarks (10 đầu tiên)</h3>
        <div className="bg-gray-900/30 rounded-lg p-4 max-h-64 overflow-y-auto">
          <div className="space-y-3">
            {bookmarks.slice(0, 10).map((bm, index) => (
              <div key={bm.id || index} className="border border-gray-700/50 rounded p-3">
                <div className="font-medium text-white truncate">{bm.title}</div>
                <div className="text-sm text-gray-400 truncate">{bm.url}</div>
                <div className="text-xs text-gray-500 mt-1">{getHostname(bm.url)}</div>
              </div>
            ))}
            {bookmarks.length > 10 && (
              <div className="text-center text-gray-500 text-sm py-2">
                ... và {bookmarks.length - 10} bookmark khác
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="bg-gray-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Hủy
        </button>
        <button
          onClick={onConfirm}
          disabled={isProcessing || validBookmarks === 0}
          className="bg-blue-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? 'Đang xử lý...' : `Import ${validBookmarks} bookmark`}
        </button>
      </div>
    </div>
  );
};

export default ImportPreview;
