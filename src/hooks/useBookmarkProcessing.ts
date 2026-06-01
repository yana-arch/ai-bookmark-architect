import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { getFullTreeContext } from '@/src/utils/promptUtils';
import { arrayToTree, removeEmptyFolders } from '@/src/utils/treeUtils';
import { perfMonitor } from '@/src/performance';
import { saveLog } from '@db';
import { WorkerManager } from '@/src/services/processing/workerManager';
import { TagDrivenProcessor } from '@/src/services/processing/tagDrivenProcessor';
import { StandardProcessor } from '@/src/services/processing/standardProcessor';
import type { Bookmark, Folder, CategorizedBookmark, ApiConfig, DetailedLog, AIProfile, UserCorrection, PromptModifiers } from '@/types';

interface UseBookmarkProcessingProps {
    bookmarks: Bookmark[];
    folders: (Folder | Bookmark)[];
    apiConfigs: ApiConfig[];
    batchSize: number;
    maxRetries: number;
    processingMode: 'parallel' | 'sequential';
    tagDrivenMode: boolean;
    tagCount: number;
    tagLanguage: string;
    promptModifiers: PromptModifiers;
    systemPrompt: string;
    customInstructions: string;
    onFoldersUpdate: (folders: (Folder | Bookmark)[]) => void;
    onNotificationsAdd: (notification: { id: string, message: string, type: 'info' | 'error' | 'success' | 'warning' }) => void;
    onProcessingComplete?: (hasError: boolean) => void;
    autoCleanupEmptyFolders?: boolean;
    activeProfile: AIProfile | null;
    userHistory: UserCorrection[];
}

export const useBookmarkProcessing = ({
    bookmarks,
    folders,
    apiConfigs,
    batchSize,
    maxRetries,
    processingMode,
    tagDrivenMode,
    tagCount,
    tagLanguage,
    promptModifiers,
    systemPrompt,
    customInstructions,
    onFoldersUpdate,
    onNotificationsAdd,
    onProcessingComplete,
    autoCleanupEmptyFolders = false,
    activeProfile,
    userHistory = []
}: UseBookmarkProcessingProps) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [logs, setLogs] = useState<string[]>([]);
    const [detailedLogs, setDetailedLogs] = useState<DetailedLog[]>([]);
    const [errorDetails, setErrorDetails] = useState<string | null>(null);
    const [processedBookmarks, setProcessedBookmarks] = useState<CategorizedBookmark[]>([]);
    const processedBookmarksRef = useRef<CategorizedBookmark[]>([]);

    const setProcessedBookmarksWithRef = useCallback((updater: CategorizedBookmark[] | ((prev: CategorizedBookmark[]) => CategorizedBookmark[])) => {
        setProcessedBookmarks(prev => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            processedBookmarksRef.current = next;
            return next;
        });
    }, []);

    const [sessionTokenUsage, setSessionTokenUsage] = useState({ promptTokens: 0, completionTokens: 0, totalTokens: 0 });

    const stopProcessingRef = useRef(false);
    const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
    const sourceBookmarksRef = useRef<Bookmark[]>([]);
    const activeProcessorRef = useRef<TagDrivenProcessor | StandardProcessor | null>(null);

    const latestBookmarksRef = useRef<Bookmark[]>(bookmarks);
    const latestFoldersRef = useRef<(Folder | Bookmark)[]>(folders);
    const latestApiConfigsRef = useRef<ApiConfig[]>(apiConfigs);

    useEffect(() => { latestBookmarksRef.current = bookmarks; }, [bookmarks]);
    useEffect(() => { latestFoldersRef.current = folders; }, [folders]);
    useEffect(() => { latestApiConfigsRef.current = apiConfigs; }, [apiConfigs]);

    const handleWorkerMessage = useCallback((message: any) => {
        // Handled by processors mostly, but some global logs might come here
    }, []);

    const workerManager = useMemo(() => new WorkerManager(handleWorkerMessage), [handleWorkerMessage]);

    // Cleanup workers on unmount
    useEffect(() => {
        return () => workerManager.terminateAll();
    }, [workerManager]);

    const addDetailedLog = useCallback(async (type: DetailedLog['type'], title: string, content: string | object, usage?: DetailedLog['usage']) => {
        const newLog: DetailedLog = {
            id: `log-${Date.now()}-${Math.random()}`,
            timestamp: new Date().toLocaleTimeString('en-GB'),
            type,
            title,
            content,
            usage
        };
        setDetailedLogs(prev => [...prev, newLog]);
        try {
            await saveLog(newLog);
        } catch (e) {
            console.error('Failed to save log', e);
        }

        if (type === 'error' || (type === 'info' && title.includes('Hoàn tất'))) {
            onNotificationsAdd({
                id: newLog.id,
                message: `${newLog.title}: ${typeof newLog.content === 'string' ? newLog.content.substring(0, 100) : ''}...`,
                type: newLog.type === 'error' ? 'error' : 'success'
            });
        }
    }, [onNotificationsAdd]);

    const updateFolderTree = useCallback((allNewResults: CategorizedBookmark[], cleanup: boolean = false, immediate: boolean = false) => {
        if (updateTimerRef.current) {
            clearTimeout(updateTimerRef.current);
            updateTimerRef.current = null;
        }

        const runUpdate = () => {
            const categorizedMap = new Map<string, CategorizedBookmark>(
                [...processedBookmarksRef.current, ...allNewResults].map(cb => [cb.url, cb])
            );

            const currentValidUrls = new Set(latestBookmarksRef.current.map(bm => bm.url));
            const validSourceBookmarks = sourceBookmarksRef.current.filter(bm => currentValidUrls.has(bm.url));

            const finalFolders = arrayToTree(
                validSourceBookmarks.map(bm => {
                    const categorized = categorizedMap.get(bm.url);
                    return {
                        ...bm,
                        path: categorized ? categorized.path : (bm.path || []),
                        tags: categorized ? categorized.tags : (bm.tags || [])
                    };
                }),
                latestFoldersRef.current
            );

            onFoldersUpdate(cleanup ? removeEmptyFolders(finalFolders) : finalFolders);
        };

        if (immediate) runUpdate();
        else updateTimerRef.current = setTimeout(runUpdate, 2000);
    }, [onFoldersUpdate, processedBookmarks]);

    const startProcessing = useCallback(async (
        initialProcessed: CategorizedBookmark[],
        currentFolders: (Folder | Bookmark)[],
        overrideBookmarks?: Bookmark[]
    ) => {
        const availableKeys = latestApiConfigsRef.current.filter(c => c.status === 'active');
        if (availableKeys.length === 0) {
            const errorMsg = 'Không có API key nào đang hoạt động. Vui lòng thêm hoặc kích hoạt một key hợp lệ.';
            setErrorDetails(errorMsg);
            addDetailedLog('error', 'Không tìm thấy API key', errorMsg);
            return false;
        }

        const sourceBookmarks = overrideBookmarks || latestBookmarksRef.current;
        sourceBookmarksRef.current = sourceBookmarks;
        
        addDetailedLog('info', 'Khởi tạo xử lý', `Bắt đầu với ${availableKeys.length} API key đang hoạt động.`);

        return await perfMonitor.timeAsyncFunction('start_processing', async () => {
            stopProcessingRef.current = false;
            setIsProcessing(true);
            setProcessedBookmarksWithRef([...initialProcessed]);

            const currentProcessed = [...initialProcessed];
            const processedUrls = new Set(currentProcessed.map(b => b.url));
            const bookmarksToProcess = sourceBookmarks.filter(bm => !processedUrls.has(bm.url));
            
            const commonOptions = {
                workerManager,
                bookmarks: bookmarksToProcess,
                apiConfigs: availableKeys,
                batchSize,
                maxRetries,
                tagLanguage,
                activeProfile,
                promptModifiers,
                userHistory,
                systemPrompt,
                customInstructions,
                onProgress: setProgress,
                onLog: (msg: string) => setLogs(prev => [...prev, msg]),
                onDetailedLog: addDetailedLog,
                onTokenUsage: (usage: any) => setSessionTokenUsage(prev => ({
                    promptTokens: prev.promptTokens + usage.promptTokens,
                    completionTokens: prev.completionTokens + usage.completionTokens,
                    totalTokens: prev.totalTokens + usage.totalTokens
                })),
                onError: setErrorDetails,
            };

            if (tagDrivenMode) {
                const processor = new TagDrivenProcessor({
                    ...commonOptions,
                    tagCount,
                    currentFolders,
                    onResult: (results) => {
                        setProcessedBookmarksWithRef(prev => [...prev, ...results]);
                        updateFolderTree(results, autoCleanupEmptyFolders, true);
                    },
                    onComplete: (failedCount) => {
                        setIsProcessing(false);
                        if (failedCount === 0) {
                            addDetailedLog('success', 'Hoàn tất phân loại', 'Phân loại tag-driven thành công.');
                        }
                        if (onProcessingComplete) onProcessingComplete(failedCount > 0);
                    }
                });
                activeProcessorRef.current = processor;
                await processor.process();
            } else {
                const processor = new StandardProcessor({
                    ...commonOptions,
                    currentTree: getFullTreeContext(currentFolders),
                    onBatchResult: (results) => {
                        setProcessedBookmarksWithRef(prev => [...prev, ...results]);
                        updateFolderTree(results);
                    },
                    onComplete: (failedCount) => {
                        setIsProcessing(false);
                        updateFolderTree([], autoCleanupEmptyFolders, true);
                        if (failedCount > 0) {
                            addDetailedLog('warning', 'Hoàn tất với lỗi', `Có ${failedCount} batch bị lỗi.`);
                            setErrorDetails(`Hoàn tất với ${failedCount} batch lỗi.`);
                        } else {
                            addDetailedLog('success', 'Hoàn tất xử lý', 'Đã phân loại thành công.');
                        }
                        if (onProcessingComplete) onProcessingComplete(failedCount > 0);
                    }
                });
                activeProcessorRef.current = processor;
                await processor.process();
            }
            return true;
        });
    }, [batchSize, maxRetries, tagDrivenMode, tagCount, tagLanguage, promptModifiers, systemPrompt, customInstructions, onFoldersUpdate, addDetailedLog, onProcessingComplete, autoCleanupEmptyFolders, activeProfile, userHistory, workerManager, updateFolderTree]);

    const stopProcessing = useCallback(() => {
        stopProcessingRef.current = true;
        if (activeProcessorRef.current) activeProcessorRef.current.abort();
        setLogs(prev => [...prev, 'Đang dừng xử lý...']);
    }, []);

    const forceStop = useCallback(() => {
        workerManager.terminateAll();
        stopProcessingRef.current = true;
        if (activeProcessorRef.current) activeProcessorRef.current.abort();
        addDetailedLog('info', 'Force stop initiated', 'All workers terminated immediately');
        setLogs(prev => [...prev, 'Đã dừng xử lý bắt buộc']);
        setErrorDetails('Xử lý đã được dừng bắt buộc.');
        setIsProcessing(false);
    }, [workerManager, addDetailedLog]);

    const resetProcessingState = useCallback(() => {
        setIsProcessing(false);
        setProgress({ current: 0, total: 0 });
        setLogs([]);
        setDetailedLogs([]);
        setErrorDetails(null);
        setProcessedBookmarksWithRef([]);
        setSessionTokenUsage({ promptTokens: 0, completionTokens: 0, totalTokens: 0 });
    }, []);

    /**
     * Clean entry point: process bookmarks from scratch.
     * Wraps startProcessing with sensible defaults so callers don't need to
     * manage initialProcessed / currentFolders manually for the common case.
     */
    const process = useCallback((overrideBookmarks?: Bookmark[]) => {
        return startProcessing([], latestFoldersRef.current, overrideBookmarks);
    }, [startProcessing]);

    return {
        isProcessing, progress, logs, detailedLogs, errorDetails, sessionTokenUsage, processedBookmarks,
        process, startProcessing, stopProcessing, forceStop, resetProcessingState,
        setLogs, setDetailedLogs, setErrorDetails, setSessionTokenUsage, setProcessedBookmarks: setProcessedBookmarksWithRef, addDetailedLog
    };
};
