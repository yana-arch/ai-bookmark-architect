import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { getFullTreeContext } from '@/src/utils/promptUtils';
import { arrayToTree, removeEmptyFolders } from '@/src/utils/treeUtils';
import { perfMonitor } from '@/src/performance';
import { systemRepo } from '@/src/db/repositories/system';
import { AIOrchestrator } from '@/src/services/aiOrchestrator';
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
    
    const orchestrator = useMemo(() => new AIOrchestrator(), []);

    const latestBookmarksRef = useRef<Bookmark[]>(bookmarks);
    const latestFoldersRef = useRef<(Folder | Bookmark)[]>(folders);
    const latestApiConfigsRef = useRef<ApiConfig[]>(apiConfigs);

    useEffect(() => { latestBookmarksRef.current = bookmarks; }, [bookmarks]);
    useEffect(() => { latestFoldersRef.current = folders; }, [folders]);
    useEffect(() => { latestApiConfigsRef.current = apiConfigs; }, [apiConfigs]);

    // Cleanup orchestrator on unmount
    useEffect(() => {
        return () => orchestrator.terminate();
    }, [orchestrator]);

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
            await systemRepo.addLog(newLog);
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
        if (availableKeys.length === 0 || !activeProfile) {
            const errorMsg = 'Cấu hình AI không hợp lệ hoặc không có API key nào đang hoạt động.';
            setErrorDetails(errorMsg);
            addDetailedLog('error', 'Cấu hình lỗi', errorMsg);
            return false;
        }

        const sourceBookmarks = overrideBookmarks || latestBookmarksRef.current;
        sourceBookmarksRef.current = sourceBookmarks;
        
        return await perfMonitor.timeAsyncFunction('start_processing', async () => {
            stopProcessingRef.current = false;
            setIsProcessing(true);
            setProcessedBookmarksWithRef([...initialProcessed]);

            const currentProcessed = [...initialProcessed];
            const processedUrls = new Set(currentProcessed.map(b => b.url));
            const bookmarksToProcess = sourceBookmarks.filter(bm => !processedUrls.has(bm.url));
            
            try {
                const result = await orchestrator.execute({
                    type: tagDrivenMode ? 'extract_tags' : 'categorize',
                    bookmarks: bookmarksToProcess,
                    options: {
                        batchSize,
                        profile: activeProfile,
                        apiConfigs: availableKeys,
                        modifiers: promptModifiers,
                        currentTree: getFullTreeContext(currentFolders),
                        customInstructions
                    },
                    onProgress: (p) => {
                        setProgress({ current: p.processed, total: p.total });
                    },
                    onLog: (msg) => setLogs(prev => [...prev, msg]),
                });

                if (tagDrivenMode) {
                    // Phase 2: Tag-driven mapping
                    // For now, assume result.data is CategorizedBookmark[] for simplicity in this refactor
                    // In real tag-driven mode, we would call execute('map_folders') next.
                }

                const results = result.data as CategorizedBookmark[];
                setProcessedBookmarksWithRef(prev => [...prev, ...results]);
                updateFolderTree(results, autoCleanupEmptyFolders, true);
                
                setSessionTokenUsage(prev => ({
                    promptTokens: prev.promptTokens + result.usage.promptTokens,
                    completionTokens: prev.completionTokens + result.usage.completionTokens,
                    totalTokens: prev.totalTokens + result.usage.totalTokens
                }));

                setIsProcessing(false);
                addDetailedLog('success', 'Hoàn tất xử lý', `Đã phân loại thành công ${results.length} bookmarks.`);
                if (onProcessingComplete) onProcessingComplete(false);
                return true;

            } catch (error: any) {
                setErrorDetails(error.message);
                addDetailedLog('error', 'Lỗi xử lý', error.message);
                setIsProcessing(false);
                if (onProcessingComplete) onProcessingComplete(true);
                return false;
            }
        });
    }, [batchSize, tagDrivenMode, tagCount, tagLanguage, promptModifiers, customInstructions, onFoldersUpdate, addDetailedLog, onProcessingComplete, autoCleanupEmptyFolders, activeProfile, orchestrator, updateFolderTree]);

    const stopProcessing = useCallback(() => {
        stopProcessingRef.current = true;
        orchestrator.terminate();
        setLogs(prev => [...prev, 'Đang dừng xử lý...']);
    }, [orchestrator]);

    const forceStop = useCallback(() => {
        orchestrator.terminate();
        stopProcessingRef.current = true;
        addDetailedLog('info', 'Force stop initiated', 'All workers terminated immediately');
        setLogs(prev => [...prev, 'Đã dừng xử lý bắt buộc']);
        setErrorDetails('Xử lý đã được dừng bắt buộc.');
        setIsProcessing(false);
    }, [orchestrator, addDetailedLog]);

    const resetProcessingState = useCallback(() => {
        setIsProcessing(false);
        setProgress({ current: 0, total: 0 });
        setLogs([]);
        setDetailedLogs([]);
        setErrorDetails(null);
        setProcessedBookmarksWithRef([]);
        setSessionTokenUsage({ promptTokens: 0, completionTokens: 0, totalTokens: 0 });
    }, []);

    const process = useCallback((overrideBookmarks?: Bookmark[]) => {
        return startProcessing([], latestFoldersRef.current, overrideBookmarks);
    }, [startProcessing]);

    return {
        isProcessing, progress, logs, detailedLogs, errorDetails, sessionTokenUsage, processedBookmarks,
        process, startProcessing, stopProcessing, forceStop, resetProcessingState,
        setLogs, setDetailedLogs, setErrorDetails, setSessionTokenUsage, setProcessedBookmarks: setProcessedBookmarksWithRef, addDetailedLog
    };
};
