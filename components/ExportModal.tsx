import React, { useState, useEffect } from 'react';
import type { Folder, Bookmark } from '@/types';
import { ExportIcon, FolderIcon } from './Icons';

interface ExportModalProps {
  folders: Folder[];
  bookmarks: Bookmark[];
  onExport: (options: ExportOptions) => void;
  onCancel: () => void;
}

interface ExportOptions {
  format: 'html' | 'csv' | 'json' | 'md';
  selectedFolders: string[];
  selectedTags: string[];
  dateRange: {
    from: Date | null;
    to: Date | null;
  };
  includeArchived: boolean;
}

const ExportModal: React.FC<ExportModalProps> = ({
  folders,
  bookmarks,
  onExport,
  onCancel
}) => {
  const [options, setOptions] = useState<ExportOptions>({
    format: 'html',
    selectedFolders: [],
    selectedTags: [],
    dateRange: { from: null, to: null },
    includeArchived: false
  });

  const [isExporting, setIsExporting] = useState(false);

  // Extract all available tags from bookmarks
  const availableTags = Array.from(
    new Set(
      bookmarks.flatMap(bm => bm.tags || [])
    )
  ).sort();

  // Flatten folder structure for selection
  const flattenFolders = (items: (Folder | Bookmark)[], prefix = ''): Array<{id: string, name: string, fullPath: string}> => {
    const result: Array<{id: string, name: string, fullPath: string}> = [];

    items.forEach(item => {
      // Only process folders, skip bookmarks
      if ('children' in item) {
        const fullPath = prefix ? `${prefix} / ${item.name}` : item.name;
        result.push({ id: item.id, name: item.name, fullPath });

        if (item.children) {
          result.push(...flattenFolders(item.children, fullPath));
        }
      }
    });

    return result;
  };

  const availableFolders = flattenFolders(folders);

  const handleFolderToggle = (folderId: string) => {
    setOptions(prev => ({
      ...prev,
      selectedFolders: prev.selectedFolders.includes(folderId)
        ? prev.selectedFolders.filter(id => id !== folderId)
        : [...prev.selectedFolders, folderId]
    }));
  };

  const handleTagToggle = (tag: string) => {
    setOptions(prev => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tag)
        ? prev.selectedTags.filter(t => t !== tag)
        : [...prev.selectedTags, tag]
    }));
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(options);
      onCancel();
    } finally {
      setIsExporting(false);
    }
  };

  // Calculate preview count
  const getPreviewCount = () => {
    let filteredBookmarks = bookmarks;

    // Filter by folders
    if (options.selectedFolders.length > 0) {
      const folderIds = new Set(options.selectedFolders);
      filteredBookmarks = filteredBookmarks.filter(bm => folderIds.has(bm.parentId || ''));
    }

    // Filter by tags
    if (options.selectedTags.length > 0) {
      filteredBookmarks = filteredBookmarks.filter(bm =>
        options.selectedTags.some(tag => bm.tags?.includes(tag))
      );
    }

    // Filter by date range
    if (options.dateRange.from || options.dateRange.to) {
      filteredBookmarks = filteredBookmarks.filter(bm => {
        // Assuming bookmarks have a createdAt or similar date field
        // For now, we'll skip date filtering as it's not implemented in the data model
        return true;
      });
    }

    return filteredBookmarks.length;
  };

  const previewCount = getPreviewCount();

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#282C34] rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center mb-6">
          <ExportIcon className="w-6 h-6 mr-3 text-blue-400" />
          <h2 className="text-xl font-bold text-white">Xuất Bookmarks</h2>
        </div>

        {/* Format Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Định dạng xuất</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { value: 'html', label: 'HTML', desc: 'Netscape format' },
              { value: 'csv', label: 'CSV', desc: 'Spreadsheet' },
              { value: 'json', label: 'JSON', desc: 'Machine-readable' },
              { value: 'md', label: 'Markdown', desc: 'Human-readable' }
            ].map(format => (
              <button
                key={format.value}
                onClick={() => setOptions(prev => ({ ...prev, format: format.value as ExportOptions['format'] }))}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  options.format === format.value
                    ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                    : 'border-gray-600 hover:border-gray-500 text-gray-300'
                }`}
              >
                <div className="font-semibold">{format.label}</div>
                <div className="text-xs opacity-75">{format.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Folder Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Chọn thư mục</h3>
          <div className="bg-gray-900/30 rounded-lg p-4 max-h-48 overflow-y-auto">
            {availableFolders.length > 0 ? (
              <div className="space-y-2">
                {availableFolders.map(folder => (
                  <label key={folder.id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-800/50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={options.selectedFolders.includes(folder.id)}
                      onChange={() => handleFolderToggle(folder.id)}
                      className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <FolderIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300 text-sm">{folder.fullPath}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Không có thư mục nào</p>
            )}
          </div>
          <div className="mt-2 text-xs text-gray-400">
            {options.selectedFolders.length === 0 ? 'Xuất tất cả thư mục' : `Đã chọn ${options.selectedFolders.length} thư mục`}
          </div>
        </div>

        {/* Tag Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Chọn tags</h3>
          <div className="bg-gray-900/30 rounded-lg p-4 max-h-48 overflow-y-auto">
            {availableTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                  <label key={tag} className="flex items-center space-x-2 cursor-pointer bg-gray-700/50 hover:bg-gray-600/50 px-3 py-1 rounded-full">
                    <input
                      type="checkbox"
                      checked={options.selectedTags.includes(tag)}
                      onChange={() => handleTagToggle(tag.toString())}
                      className="rounded border-gray-600 text-blue-600 focus:ring-blue-500 scale-75"
                    />
                    <span className="text-gray-300 text-sm">#{tag}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Không có tags nào</p>
            )}
          </div>
          <div className="mt-2 text-xs text-gray-400">
            {options.selectedTags.length === 0 ? 'Xuất tất cả tags' : `Đã chọn ${options.selectedTags.length} tags`}
          </div>
        </div>

        {/* Preview */}
        <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-blue-400 mb-2">Xem trước</h3>
          <p className="text-blue-200">
            Sẽ xuất <span className="font-bold">{previewCount}</span> bookmarks
            {options.selectedFolders.length > 0 && ` từ ${options.selectedFolders.length} thư mục đã chọn`}
            {options.selectedTags.length > 0 && ` với ${options.selectedTags.length} tags đã chọn`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            disabled={isExporting}
            className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || previewCount === 0}
            className="bg-blue-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isExporting ? 'Đang xuất...' : `Xuất ${previewCount} bookmarks`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
