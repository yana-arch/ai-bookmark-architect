import { useState, useRef, useCallback, useEffect } from 'react';
import { type Bookmark, type Folder, type CategorizedBookmark, type ApiConfig, type DetailedLog, type AIProfile } from '../types';
import { arrayToTree, removeEmptyFolders, distributeBookmarksByTagSchema } from '../src/utils/treeUtils';
import { perfMonitor } from '../src/performance';
import { saveLog } from '../db';

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
    systemPrompt: string;
    customInstructions: string;
    onFoldersUpdate: (folders: (Folder | Bookmark)[]) => void;
    onNotificationsAdd: (notification: { id: string, message: string, type: 'info' | 'error' | 'success' | 'warning' }) => void;
    onProcessingComplete?: (hasError: boolean) => void;
    autoCleanupEmptyFolders?: boolean;
    activeProfile: AIProfile | null;
}

// Helper to simplify folder structure for AI context (removes IDs and Bookmarks)
interface SimplifiedFolder {
    name: string;
    children: SimplifiedFolder[];
}

const simplifyFolderStructure = (folders: (Folder | Bookmark)[]): SimplifiedFolder[] => {
    return folders
        .filter(item => !('url' in item)) // Filter out bookmarks
        .map(item => {
            const folder = item as Folder;
            return {
                name: folder.name,
                children: simplifyFolderStructure(folder.children)
            };
        });
};

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
    systemPrompt,
    customInstructions,
    onFoldersUpdate,
    onNotificationsAdd,
    onProcessingComplete,
    autoCleanupEmptyFolders = false,
    activeProfile
}: UseBookmarkProcessingProps) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [logs, setLogs] = useState<string[]>([]);
    const [detailedLogs, setDetailedLogs] = useState<DetailedLog[]>([]);
    const [errorDetails, setErrorDetails] = useState<string | null>(null);
    const [processedBookmarks, setProcessedBookmarks] = useState<CategorizedBookmark[]>([]);
    const [sessionTokenUsage, setSessionTokenUsage] = useState({ promptTokens: 0, completionTokens: 0, totalTokens: 0 });

    const workersRef = useRef<Worker[]>([]);
    const activeWorkersRef = useRef<Set<number>>(new Set());
    const stopProcessingRef = useRef(false);
    const updateTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Cleanup workers on unmount
    useEffect(() => {
        return () => {
            workersRef.current.forEach(worker => worker.terminate());
            workersRef.current = [];
        };
    }, []);

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

    const stopProcessing = useCallback(() => {
        stopProcessingRef.current = true;
        setLogs(prev => [...prev, 'Đang dừng xử lý... (Đợi các batch hiện tại hoàn tất)']);
    }, []);

    const forceStop = useCallback(() => {
        workersRef.current.forEach(worker => worker.terminate());
        workersRef.current = [];
        activeWorkersRef.current.clear();
        stopProcessingRef.current = true;

        addDetailedLog('info', 'Force stop initiated', 'All workers terminated immediately');
        setLogs(prev => [...prev, 'Đã dừng xử lý bắt buộc - tất cả worker đã bị terminate']);
        setErrorDetails('Xử lý đã được dừng bắt buộc.');
        setIsProcessing(false);
    }, [addDetailedLog]);

    const latestBookmarksRef = useRef<Bookmark[]>(bookmarks);
    const latestFoldersRef = useRef<(Folder | Bookmark)[]>(folders);
    const latestApiConfigsRef = useRef<ApiConfig[]>(apiConfigs);

    // Always keep track of the latest data
    useEffect(() => {
        latestBookmarksRef.current = bookmarks;
    }, [bookmarks]);

    useEffect(() => {
        latestFoldersRef.current = folders;
    }, [folders]);

    useEffect(() => {
        latestApiConfigsRef.current = apiConfigs;
    }, [apiConfigs]);

    const sourceBookmarksRef = useRef<Bookmark[]>([]);

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
        sourceBookmarksRef.current = sourceBookmarks; // Snapshot bookmarks to avoid sync issues during processing

        // Dynamic concurrency based on hardware, capped at 6 for stability
        const MAX_CONCURRENT_WORKERS = processingMode === 'sequential'
            ? 1
            : Math.min(6, (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 3);

        addDetailedLog('info', 'Khởi tạo xử lý', `Bắt đầu với ${availableKeys.length} API key đang hoạt động: ${availableKeys.map(k => `${k.name} [ID: ${k.id}] (${k.provider})`).join(', ')}`);

        return await perfMonitor.timeAsyncFunction('start_processing', async () => {
            stopProcessingRef.current = false;
            setIsProcessing(true);

            const currentProcessed = [...initialProcessed];
            setProcessedBookmarks(currentProcessed);

            const processedUrls = new Set(currentProcessed.map(b => b.url));
            const bookmarksToProcess = sourceBookmarks.filter(bm => !processedUrls.has(bm.url));
            const BATCH_SIZE = Math.max(1, batchSize);
            const totalBatches = Math.ceil(bookmarksToProcess.length / BATCH_SIZE);

            // Branch for tag_driven mode
            if (tagDrivenMode) {
                let currentPhase: 'tagging' | 'mapping' = 'tagging';
                let completedBatches = 0;
                let failedBatches = 0;
                let nextBatchToStart = 0;

                // Temporary storage for intermediate results
                const extractedTagsMap = new Map<string, string[]>(); // url -> tags[]

                // Optimization: Pre-fill tags for bookmarks that already have them
                const bookmarksWithExistingTags = bookmarksToProcess.filter(bm => bm.tags && bm.tags.length > 0);
                const bookmarksNeedingTagging = bookmarksToProcess.filter(bm => !bm.tags || bm.tags.length === 0);

                if (bookmarksWithExistingTags.length > 0) {
                    bookmarksWithExistingTags.forEach(bm => {
                        extractedTagsMap.set(bm.url, bm.tags || []);
                    });
                    setLogs(prev => [...prev, `Đã tìm thấy ${bookmarksWithExistingTags.length} bookmark có sẵn tags. Bỏ qua bước trích xuất cho các mục này.`]);
                }

                const actualTotalBatches = Math.ceil(bookmarksNeedingTagging.length / BATCH_SIZE);
                let finalSchema: any = null;

                const finalizeTagDrivenProcessing = async () => {
                    if (stopProcessingRef.current) return;

                    if (failedBatches > 0) {
                        addDetailedLog('warning', 'Lỗi phân tags một số bookmark', `Có ${failedBatches} batch tagging thất bại. Các bookmark này sẽ được giữ nguyên hoặc để ở root.`);
                    }

                    if (extractedTagsMap.size === 0) {
                        setLogs(prev => [...prev, 'Không tìm thấy tag nào để phân tích.']);
                        setIsProcessing(false);
                        if (onProcessingComplete) onProcessingComplete(true);
                        return;
                    }

                    // Proceed to Mapping phase
                    currentPhase = 'mapping';
                    setLogs(prev => [...prev, `--- ĐANG TẠO CẤU TRÚC THƯ MỤC TỪ ${extractedTagsMap.size} TAGS ---`]);

                    // Collect unique tags
                    const allTags = new Set<string>();
                    extractedTagsMap.forEach(tags => tags.forEach(t => allTags.add(t)));
                    const uniqueTags = Array.from(allTags);


                    if (uniqueTags.length > 600) {
                        addDetailedLog('warning', 'Quá nhiều tags', `Hệ thống tìm thấy ${uniqueTags.length} tags duy nhất. Chỉ 600 tags đầu tiên sẽ được dùng để tạo cấu trúc thư mục để đảm bảo hiệu suất.`);
                    }

                    if (uniqueTags.length === 0) {
                        setLogs(prev => [...prev, 'Không tìm thấy tag nào để phân tích.']);
                        setIsProcessing(false);
                        if (onProcessingComplete) onProcessingComplete(true);
                        return;
                    }

                    // Dispatch single worker for mapping
                    const worker = new Worker(new URL('../src/aiWorker.ts', import.meta.url), { type: 'module' });
                    workersRef.current.push(worker);

                    worker.onmessage = async (e) => {
                        const { type, data, error, log, usage } = e.data;
                        if (type === 'log') {
                            setLogs(prev => [...prev, `[Mapping] ${log?.message || data || ''}`]);
                        } else if (type === 'batch_result') {
                            // Track token usage
                            if (usage) {
                                setSessionTokenUsage(prev => ({
                                    promptTokens: prev.promptTokens + (usage.promptTokens || 0),
                                    completionTokens: prev.completionTokens + (usage.completionTokens || 0),
                                    totalTokens: prev.totalTokens + (usage.totalTokens || 0)
                                }));
                            }

                            finalSchema = data;
                            setLogs(prev => [...prev, 'Đã tạo schema thư mục thành công. Đang phân bổ bookmarks...']);

                            // Apply tags to bookmarks
                            const bookmarksWithTags = sourceBookmarks.map(bm => ({
                                ...bm,
                                tags: extractedTagsMap.get(bm.url) || bm.tags || []
                            }));

                            const distributedBookmarks = distributeBookmarksByTagSchema(bookmarksWithTags, finalSchema);

                            // Check for unmapped bookmarks to potentially run a second pass
                            const unmappedCount = distributedBookmarks.filter(bm => bm.path?.[0] === '[Unmapped Tags]').length;
                            if (unmappedCount > 0) {
                                addDetailedLog('info', 'Xử lý bổ sung', `Phát hiện ${unmappedCount} bookmarks không khớp tag-schema. Đã đưa vào thư mục [Unmapped Tags].`);
                            }

                            // Safety net: existing paths
                            const currentValidUrls = new Set(latestBookmarksRef.current.map(bm => bm.url));
                            const validDistributed = distributedBookmarks.filter(bm => currentValidUrls.has(bm.url));

                            const finalFolders = arrayToTree(validDistributed, latestFoldersRef.current);
                            let cleanedFolders = finalFolders;
                            if (autoCleanupEmptyFolders) {
                                cleanedFolders = removeEmptyFolders(finalFolders);
                            }

                            onFoldersUpdate(cleanedFolders);

                            setIsProcessing(false);
                            setProcessedBookmarks(distributedBookmarks);
                            setProgress({ current: sourceBookmarks.length, total: sourceBookmarks.length });
                            addDetailedLog('success', 'Hoàn tất phân loại', 'Phân loại tag-driven thành công.');
                            if (onProcessingComplete) onProcessingComplete(false);
                            worker.terminate();
                            workersRef.current = workersRef.current.filter(w => w !== worker);

                        } else if (type === 'batch_error') {
                            setErrorDetails(`Lỗi tạo thư mục: ${error}`);
                            setIsProcessing(false);
                            if (onProcessingComplete) onProcessingComplete(true);
                            worker.terminate();
                            workersRef.current = workersRef.current.filter(w => w !== worker);
                        }
                    };

                    const currentTree = simplifyFolderStructure(currentFolders);
                    const userInstructionBlock = customInstructions.trim()
                        ? `\n\nUSER'S CUSTOM INSTRUCTIONS:\n- ${customInstructions.trim().replace(/\n/g, '\n- ')}`
                        : '';

                    worker.postMessage({
                        type: 'process_batch',
                        data: {
                            batch: [], // not used for mapping
                            batchIndex: 0,
                            systemPrompt,
                            userInstructionBlock: (overrideBookmarks ? "[PARTIAL MAPPING - FOCUS ON ROOT BOOKMARKS]\n" : "") + userInstructionBlock,
                            apiConfigs: availableKeys,
                            maxRetries,
                            currentTree,
                            taskType: 'map_tags_to_tree',
                            uniqueTags,
                            activeProfile
                        }
                    });
                };

                const startNextTaggingBatch = (worker: Worker) => {
                    if (stopProcessingRef.current || nextBatchToStart >= actualTotalBatches) return;
                    const batchIndex = nextBatchToStart++;
                    activeWorkersRef.current.add(batchIndex);

                    const start = batchIndex * BATCH_SIZE;
                    const end = Math.min(start + BATCH_SIZE, bookmarksNeedingTagging.length);
                    const batch = bookmarksNeedingTagging.slice(start, end);

                    setLogs(prev => [...prev, `[Tagging] Batch ${batchIndex + 1}/${actualTotalBatches}...`]);

                    worker.postMessage({
                        type: 'process_batch',
                        data: {
                            batch,
                            batchIndex,
                            apiConfigs: availableKeys,
                            maxRetries,
                            taskType: 'extract_tags',
                            tagCount,
                            tagLanguage,
                            activeProfile
                        }
                    });
                };

                if (bookmarksNeedingTagging.length === 0) {
                    finalizeTagDrivenProcessing();
                } else {
                    for (let i = 0; i < Math.min(MAX_CONCURRENT_WORKERS, actualTotalBatches); i++) {
                        const worker = new Worker(new URL('../src/aiWorker.ts', import.meta.url), { type: 'module' });
                        workersRef.current.push(worker);

                        worker.onmessage = (e) => {
                            const { type, data, error, batchIndex, log, usage } = e.data;
                            if (type === 'log') {
                                setLogs(prev => [...prev, `[Worker ${batchIndex ?? 'AI'}] ${log?.message || data || ''}`]);
                            } else if (type === 'batch_result') {
                                activeWorkersRef.current.delete(batchIndex);
                                completedBatches++;

                                // Track token usage
                                if (usage) {
                                    setSessionTokenUsage(prev => ({
                                        promptTokens: prev.promptTokens + (usage.promptTokens || 0),
                                        completionTokens: prev.completionTokens + (usage.completionTokens || 0),
                                        totalTokens: prev.totalTokens + (usage.totalTokens || 0)
                                    }));
                                }

                                // Save extracted tags
                                if (Array.isArray(data)) {
                                    const newCategorized: CategorizedBookmark[] = [];
                                    data.forEach(item => {
                                        if (item.url && item.tags) {
                                            extractedTagsMap.set(item.url, item.tags);
                                            const original = sourceBookmarks.find(b => b.url === item.url);
                                            newCategorized.push({
                                                id: original?.id || `tag-${Date.now()}-${Math.random()}`,
                                                url: item.url,
                                                title: original?.title || '',
                                                path: original?.path || [],
                                                tags: item.tags,
                                                parentId: original?.parentId || null
                                            });
                                        }
                                    });

                                    // Batch update processed bookmarks to reduce re-renders
                                    setProcessedBookmarks(prev => {
                                        const existingUrls = new Set(prev.map(p => p.url));
                                        const filteredNew = newCategorized.filter(n => !existingUrls.has(n.url));
                                        return [...prev, ...filteredNew];
                                    });
                                }

                                const taggingProgress = Math.min(
                                    Math.floor((completedBatches / actualTotalBatches) * 90), // Cap tagging at 90%
                                    90
                                );
                                setProgress({
                                    current: Math.floor((taggingProgress / 100) * sourceBookmarks.length),
                                    total: sourceBookmarks.length
                                });

                                if (completedBatches + failedBatches >= actualTotalBatches || (stopProcessingRef.current && activeWorkersRef.current.size === 0)) {
                                    workersRef.current.forEach(w => w.terminate());
                                    workersRef.current = [];
                                    if (!stopProcessingRef.current) finalizeTagDrivenProcessing();
                                } else {
                                    startNextTaggingBatch(worker);
                                }
                            } else if (type === 'batch_error') {
                                activeWorkersRef.current.delete(batchIndex);
                                failedBatches++;
                                setLogs(prev => [...prev, `[Worker] Batch ${batchIndex} thất bại: ${error}`]);

                                if (completedBatches + failedBatches >= actualTotalBatches || (stopProcessingRef.current && activeWorkersRef.current.size === 0)) {
                                    workersRef.current.forEach(w => w.terminate());
                                    workersRef.current = [];
                                    if (!stopProcessingRef.current) finalizeTagDrivenProcessing();
                                } else {
                                    startNextTaggingBatch(worker);
                                }
                            }
                        };
                        startNextTaggingBatch(worker);
                    }
                }
                return true;
            }

            // End Branch for tag_driven mode

            let completedBatches = 0;
            let failedBatches = 0;
            let nextBatchToStart = 0;
            const batchResults: { [key: number]: CategorizedBookmark[] } = {};

            const userInstructionBlock = customInstructions.trim()
                ? `\n\nUSER'S CUSTOM INSTRUCTIONS (Follow these strictly):\n- ${customInstructions.trim().replace(/\n/g, '\n- ')}`
                : '';

            const currentTree = simplifyFolderStructure(currentFolders);

            const updateFolderTree = (allNewResults: CategorizedBookmark[], cleanup: boolean = false, immediate: boolean = false) => {
                if (updateTimerRef.current) {
                    clearTimeout(updateTimerRef.current);
                    updateTimerRef.current = null;
                }

                const runUpdate = () => {
                    const categorizedMap = new Map<string, CategorizedBookmark>(
                        [...initialProcessed, ...allNewResults].map(cb => [cb.url, cb])
                    );

                    // Filter the snapshotted list against current bookmarks to handle deletions during processing
                    const currentValidUrls = new Set(latestBookmarksRef.current.map(bm => bm.url));
                    const validSourceBookmarks = sourceBookmarksRef.current.filter(bm => currentValidUrls.has(bm.url));

                    const finalFolders = arrayToTree(
                        validSourceBookmarks.map(bm => {
                            const categorized = categorizedMap.get(bm.url);
                            // Safety net: If AI skips a bookmark, preserve its existing path and tags instead of resetting to root
                            return {
                                ...bm,
                                path: categorized ? categorized.path : (bm.path || []),
                                tags: categorized ? categorized.tags : (bm.tags || [])
                            };
                        }),
                        latestFoldersRef.current
                    );

                    let cleanedFolders = finalFolders;
                    if (cleanup) {
                        cleanedFolders = removeEmptyFolders(finalFolders);
                    }

                    onFoldersUpdate(cleanedFolders);
                };

                if (immediate) {
                    runUpdate();
                } else {
                    updateTimerRef.current = setTimeout(runUpdate, 2000); // 2s debounce to reduce UI stutter for large libraries
                }
            };

            const finalizeProcessing = (allNewResults: CategorizedBookmark[]) => {
                setIsProcessing(false);
                setProcessedBookmarks(prev => {
                    const existingUrls = new Set(prev.map(b => b.url));
                    const newUnique = allNewResults.filter(b => !existingUrls.has(b.url));
                    return [...prev, ...newUnique];
                });

                updateFolderTree(allNewResults, autoCleanupEmptyFolders, true);

                workersRef.current.forEach(w => w.terminate());
                workersRef.current = [];

                if (failedBatches > 0) {
                    addDetailedLog('warning', 'Hoàn tất với lỗi', `Đã xử lý xong nhưng có ${failedBatches} batch bị lỗi.`);
                    setErrorDetails(`Hoàn tất với ${failedBatches} batch lỗi. Hãy kiểm tra log chi tiết.`);
                } else {
                    addDetailedLog('success', 'Hoàn tất xử lý', `Đã phân loại thành công toàn bộ ${sourceBookmarks.length} bookmarks.`);
                    setLogs(prev => [...prev, '--- HOÀN TẤT QUÁ TRÌNH ---']);
                }

                if (onProcessingComplete) {
                    onProcessingComplete(failedBatches > 0);
                }
            };

            const startNextBatch = (worker: Worker) => {
                if (stopProcessingRef.current || nextBatchToStart >= totalBatches) return;

                const batchIndex = nextBatchToStart++;
                activeWorkersRef.current.add(batchIndex);

                const start = batchIndex * BATCH_SIZE;
                const end = Math.min(start + BATCH_SIZE, bookmarksToProcess.length);
                const batch = bookmarksToProcess.slice(start, end);

                setLogs(prev => [...prev, `Đang gửi batch ${batchIndex + 1}/${totalBatches} (${batch.length} bookmarks) tới Worker...`]);

                worker.postMessage({
                    type: 'process_batch',
                    data: {
                        batch,
                        batchIndex,
                        systemPrompt,
                        userInstructionBlock,
                        apiConfigs: availableKeys,
                        maxRetries,
                        currentTree,
                        activeProfile
                    }
                });
            };

            // Initialize workers
            for (let i = 0; i < Math.min(MAX_CONCURRENT_WORKERS, totalBatches); i++) {
                const worker = new Worker(new URL('../src/aiWorker.ts', import.meta.url), { type: 'module' });
                workersRef.current.push(worker);

                worker.onmessage = (e) => {
                    const { type, data, error, batchIndex, log } = e.data;

                    switch (type) {
                        case 'log':
                            const logMsg = log?.message || data || 'No message';
                            const workerId = batchIndex !== undefined ? batchIndex : 'AI';
                            setLogs(prev => [...prev, `[Worker ${workerId}] ${logMsg}`]);
                            addDetailedLog('info', `Worker ${workerId}`, logMsg);
                            break;

                        case 'detailed_log':
                            addDetailedLog(data.type, data.title, data.content, data.usage);
                            break;

                        case 'batch_result':
                            activeWorkersRef.current.delete(batchIndex);
                            completedBatches++;
                            batchResults[batchIndex] = data;

                            if (data?.usage) {
                                setSessionTokenUsage(prev => ({
                                    promptTokens: prev.promptTokens + (data.usage.promptTokens || 0),
                                    completionTokens: prev.completionTokens + (data.usage.completionTokens || 0),
                                    totalTokens: prev.totalTokens + (data.usage.totalTokens || 0)
                                }));
                            }

                            const allResults = Object.values(batchResults).flat();
                            setProgress({
                                current: currentProcessed.length + allResults.length,
                                total: sourceBookmarks.length
                            });

                            updateFolderTree(allResults);

                            if (completedBatches + failedBatches >= totalBatches || (stopProcessingRef.current && activeWorkersRef.current.size === 0)) {
                                finalizeProcessing(allResults);
                            } else {
                                startNextBatch(worker);
                            }
                            break;

                        case 'batch_error':
                            activeWorkersRef.current.delete(batchIndex);
                            failedBatches++;
                            setLogs(prev => [...prev, `[Worker] Batch ${batchIndex} thất bại: ${error}`]);
                            addDetailedLog('error', `Batch ${batchIndex} Failed`, error);

                            if (completedBatches + failedBatches >= totalBatches || (stopProcessingRef.current && activeWorkersRef.current.size === 0)) {
                                finalizeProcessing(Object.values(batchResults).flat());
                            } else {
                                startNextBatch(worker);
                            }
                            break;
                    }
                };

                startNextBatch(worker);
            }
            return true;
        });
    }, [batchSize, maxRetries, processingMode, tagDrivenMode, tagCount, tagLanguage, systemPrompt, customInstructions, onFoldersUpdate, addDetailedLog, onProcessingComplete, autoCleanupEmptyFolders, activeProfile]);

    const resetProcessingState = useCallback(() => {
        setIsProcessing(false);
        setProgress({ current: 0, total: 0 });
        setLogs([]);
        setDetailedLogs([]);
        setErrorDetails(null);
        setProcessedBookmarks([]);
        setSessionTokenUsage({ promptTokens: 0, completionTokens: 0, totalTokens: 0 });
    }, []);

    return {
        isProcessing,
        progress,
        logs,
        detailedLogs,
        errorDetails,
        sessionTokenUsage,
        processedBookmarks,
        startProcessing,
        stopProcessing,
        forceStop,
        resetProcessingState,
        setLogs,
        setDetailedLogs,
        setErrorDetails,
        setSessionTokenUsage,
        setProcessedBookmarks,
        addDetailedLog
    };
};

