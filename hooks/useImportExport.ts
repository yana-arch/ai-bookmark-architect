import { useState, useCallback } from 'react';
import { Bookmark, Folder, AppState } from '../types';
import { perfMonitor } from '../src/performance';
import { normalizeURL, parseHTMLBookmarks, parseCSVBookmarks, exportBookmarksToCSV } from '../src/utils';
import * as db from '../db';

export const useImportExport = (
    bookmarks: Bookmark[],
    folders: (Folder | Bookmark)[],
    setBookmarks: (bookmarks: Bookmark[]) => void,
    setFolders: (folders: (Folder | Bookmark)[]) => void,
    setAppState: (state: AppState) => void,
    setNotifications: (callback: (prev: any[]) => any[]) => void
) => {
    const [showImportModal, setShowImportModal] = useState(false);
    const [importFileName, setImportFileName] = useState<string>('');
    const [previewBookmarks, setPreviewBookmarks] = useState<Bookmark[]>([]);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isKeyInputModalOpen, setIsKeyInputModalOpen] = useState(false);
    const [keyInputMode, setKeyInputMode] = useState<'upload' | 'import'>('upload');

    const handleFileLoaded = useCallback(async (fileName: string, loadedBookmarks: Bookmark[]) => {
        setImportFileName(fileName);
        setPreviewBookmarks(loadedBookmarks);
        setShowImportModal(true);
    }, []);

    const handleImportClick = useCallback(() => {
        // Create a hidden file input to trigger file selection
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.html,.csv';
        input.multiple = false;
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const content = event.target?.result as string;
                    if (content) {
                        try {
                            let parsedBookmarks: Bookmark[] = [];
                            if (file.name.endsWith('.html')) {
                                parsedBookmarks = parseHTMLBookmarks(content);
                            } else if (file.name.endsWith('.csv')) {
                                parsedBookmarks = parseCSVBookmarks(content);
                            }
                            handleFileLoaded(file.name, parsedBookmarks);
                        } catch (error: any) {
                            alert(`Lỗi khi đọc file: ${error.message}`);
                        }
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }, [handleFileLoaded]);

    const processImport = useCallback(async (mode: 'merge' | 'overwrite') => {
        if (previewBookmarks.length === 0) return;
        await perfMonitor.timeAsyncFunction('process_import', async () => {

            let combinedBookmarks: Bookmark[] = [];
            if (mode === 'merge') {
                const urlMap = new Map(bookmarks.map(bm => [normalizeURL(bm.url), bm]));

                // For merge, we want to add new bookmarks AND potentially update existing ones if the new ones have tags
                const newBookmarks = previewBookmarks.filter(bm => !urlMap.has(normalizeURL(bm.url)));
                const existingToUpdate = previewBookmarks.filter(bm => urlMap.has(normalizeURL(bm.url)));

                // Create a copy of existing bookmarks
                const updatedExisting = bookmarks.map(bm => {
                    const normalizedUrl = normalizeURL(bm.url);
                    const newInfo = existingToUpdate.find(ni => normalizeURL(ni.url) === normalizedUrl);
                    if (newInfo && newInfo.tags && newInfo.tags.length > 0) {
                        // Update existing bookmark with new tags if it doesn't have any or merge them
                        const mergedTags = Array.from(new Set([...(bm.tags || []), ...newInfo.tags]));
                        return { ...bm, tags: mergedTags };
                    }
                    return bm;
                });

                combinedBookmarks = [...updatedExisting, ...newBookmarks];
            } else { // overwrite
                combinedBookmarks = previewBookmarks;
            }

            await db.saveBookmarks(combinedBookmarks);
            await db.saveFolders([]); // Clear structure on any import
            setBookmarks(combinedBookmarks);
            setFolders([]);
            setAppState(AppState.LOADED);
            setShowImportModal(false);
            setImportFileName('');
            setPreviewBookmarks([]);
        });
    }, [previewBookmarks, bookmarks, setBookmarks, setFolders, setAppState]);

    const handleExportBookmarks = useCallback(async (options: any) => {
        await perfMonitor.timeAsyncFunction('export_bookmarks', async () => {
            // Filter bookmarks based on options
            let filteredBookmarks = bookmarks;

            // Filter by folders
            if (options.selectedFolders && options.selectedFolders.length > 0) {
                // Create a function to recursively get all bookmark IDs in selected folders
                const getBookmarksInSelectedFolders = (folderItems: (Folder | Bookmark)[], selectedFolderIds: string[], collectedBookmarkIds: Set<string> = new Set()): Set<string> => {
                    folderItems.forEach(item => {
                        if ('children' in item) {
                            // Check if this folder or any of its path matches selected folders
                            const isSelected = selectedFolderIds.some(selectedId => {
                                // Check if the folder ID matches or if it's part of the path
                                return item.id === selectedId || selectedId.includes(item.id);
                            });

                            if (isSelected) {
                                // Add all bookmarks in this folder and subfolders
                                const collectBookmarks = (folder: Folder) => {
                                    folder.children.forEach(child => {
                                        if ('url' in child) {
                                            collectedBookmarkIds.add(child.id);
                                        } else {
                                            collectBookmarks(child as Folder);
                                        }
                                    });
                                };
                                collectBookmarks(item as Folder);
                            } else {
                                // Recursively check children
                                getBookmarksInSelectedFolders(item.children, selectedFolderIds, collectedBookmarkIds);
                            }
                        }
                    });
                    return collectedBookmarkIds;
                };

                const selectedBookmarkIds = getBookmarksInSelectedFolders(folders, options.selectedFolders);
                filteredBookmarks = filteredBookmarks.filter(bm => selectedBookmarkIds.has(bm.id));
            }

            // Filter by tags
            if (options.selectedTags && options.selectedTags.length > 0) {
                filteredBookmarks = filteredBookmarks.filter(bm =>
                    options.selectedTags.some((tag: string) => bm.tags?.includes(tag))
                );
            }

            // Build export content based on format
            let content: string;
            let mimeType: string;
            let fileName: string;

            if (options.format === 'html') {
                const buildHtml = (items: (Folder | Bookmark)[], level: number): string => {
                    let html = '';
                    const indent = ' '.repeat(level * 4);

                    items.forEach(item => {
                        if ('url' in item) { // It's a bookmark
                            const tagsAttribute = item.tags && item.tags.length > 0 ? ` TAGS="${item.tags.join(',')}"` : '';
                            html += `${indent}<DT><A HREF="${item.url}"${tagsAttribute}>${item.title}</A>\n`;
                        } else { // It's a folder
                            html += `${indent}<DT><H3>${item.name}</H3>\n`;
                            if (item.children && item.children.length > 0) {
                                html += `${indent}<DL><p>\n`;
                                html += buildHtml(item.children, level + 1);
                                html += `${indent}</DL><p>\n`;
                            }
                        }
                    });
                    return html;
                };

                // Create folder structure from filtered bookmarks
                const filteredFolders = folders.length > 0 ? folders : [];
                const bookmarksHtml = buildHtml(filteredFolders, 1);
                content = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
${bookmarksHtml}</DL><p>`;
                mimeType = 'text/html';
                fileName = 'bookmarks_export.html';
            } else if (options.format === 'csv') {
                content = exportBookmarksToCSV(filteredBookmarks);
                mimeType = 'text/csv';
                fileName = 'bookmarks_export.csv';
            } else if (options.format === 'json') {
                content = JSON.stringify(filteredBookmarks, null, 2);
                mimeType = 'application/json';
                fileName = 'bookmarks_export.json';
            } else if (options.format === 'md') {
                const buildMarkdown = (items: (Folder | Bookmark)[], level: number): string => {
                    let md = '';
                    items.forEach(item => {
                        if ('url' in item) { // It's a bookmark
                            md += `${'  '.repeat(level)}- [${item.title}](${item.url})`;
                            if (item.tags && item.tags.length > 0) {
                                md += ` (Tags: ${item.tags.join(', ')})`;
                            }
                            md += '\n';
                        } else { // It's a folder
                            md += `${'#'.repeat(level + 1)} ${item.name}\n\n`;
                            if (item.children && item.children.length > 0) {
                                md += buildMarkdown(item.children, level + 1);
                            }
                        }
                    });
                    return md;
                };

                const filteredFolders = folders.length > 0 ? folders : [];
                content = buildMarkdown(filteredFolders, 0);
                mimeType = 'text/markdown';
                fileName = 'bookmarks_export.md';
            } else {
                throw new Error(`Unsupported export format: ${options.format}`);
            }

            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }, [folders, bookmarks]);

    const handleUploadData = useCallback(async (key: string) => {
        await perfMonitor.timeAsyncFunction('upload_data', async () => {
            try {
                // Dynamic import to split code
                const { keyBasedService } = await import('../src/services/postgresqlService');
                const metadata = {
                    name: `Backup ${new Date().toLocaleString('vi-VN')}`,
                    description: `Manual backup with ${bookmarks.length} bookmarks`,
                    bookmarkCount: bookmarks.length,
                    folderCount: folders.length,
                    type: 'manual' as const,
                    size: 0, // Will be calculated by service
                    timestamp: Date.now(),
                    status: 'completed' as const,
                };

                await keyBasedService.uploadBackup(key, { bookmarks, folders: folders as Folder[] }, metadata, (progress) => {
                    setNotifications(prev => [...prev, {
                        id: `upload-progress-${Date.now()}-${Math.random()}`,
                        message: `Upload progress: ${progress}%`,
                        type: 'info'
                    }]);
                });

                setNotifications(prev => [...prev, {
                    id: `upload-success-${Date.now()}`,
                    message: 'Upload thành công! Dữ liệu đã được lưu với key của bạn.',
                    type: 'success'
                }]);
            } catch (error: any) {
                setNotifications(prev => [...prev, {
                    id: `upload-error-${Date.now()}`,
                    message: `Upload thất bại: ${error.message}`,
                    type: 'error'
                }]);
                throw error;
            }
        });
    }, [bookmarks, folders, setNotifications]);

    const handleImportData = useCallback(async (key: string) => {
        await perfMonitor.timeAsyncFunction('import_data', async () => {
            try {
                const { keyBasedService } = await import('../src/services/postgresqlService');
                const result = await keyBasedService.downloadBackup(key, (progress) => {
                    setNotifications(prev => [...prev, {
                        id: `import-progress-${Date.now()}-${Math.random()}`,
                        message: `Import progress: ${progress}%`,
                        type: 'info'
                    }]);
                });

                // Save imported data
                await db.saveBookmarks(result.data.bookmarks);
                await db.saveFolders(result.data.folders);

                // Update state
                setBookmarks(result.data.bookmarks);
                setFolders(result.data.folders);
                setAppState(AppState.STRUCTURED);

                setNotifications(prev => [...prev, {
                    id: `import-success-${Date.now()}`,
                    message: `Import thành công! Đã tải ${result.data.bookmarks.length} bookmarks.`,
                    type: 'success'
                }]);
            } catch (error: any) {
                setNotifications(prev => [...prev, {
                    id: `import-error-${Date.now()}`,
                    message: `Import thất bại: ${error.message}`,
                    type: 'error'
                }]);
                throw error;
            }
        });
    }, [setBookmarks, setFolders, setAppState, setNotifications]);

    return {
        showImportModal,
        setShowImportModal,
        importFileName,
        setImportFileName,
        previewBookmarks,
        setPreviewBookmarks,
        isExportModalOpen,
        setIsExportModalOpen,
        isKeyInputModalOpen,
        setIsKeyInputModalOpen,
        keyInputMode,
        setKeyInputMode,
        handleImportClick,
        processImport,
        handleExportBookmarks,
        handleUploadData,
        handleImportData,
        handleFileLoaded
    };
};
