import { useState, useRef, useCallback, useEffect } from 'react';
import { type Bookmark, type Folder, type CategorizedBookmark, type ApiConfig, type DetailedLog } from '../types';
import { arrayToTree } from '../src/utils/treeUtils';
import { perfMonitor } from '../src/performance';
import { saveLog } from '../db';

interface UseBookmarkProcessingProps {
    bookmarks: Bookmark[];
    apiConfigs: ApiConfig[];
    batchSize: number;
    maxRetries: number;
    processingMode: 'single' | 'multi';
    systemPrompt: string;
    customInstructions: string;
    onFoldersUpdate: (folders: (Folder | Bookmark)[]) => void;
    onNotificationsAdd: (notification: { id: string, message: string, type: 'info' | 'error' | 'success' | 'warning' }) => void;
    onProcessingComplete?: (hasError: boolean) => void;
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
    apiConfigs,
    batchSize,
    maxRetries,
    processingMode,
    systemPrompt,
    customInstructions,
    onFoldersUpdate,
    onNotificationsAdd,
    onProcessingComplete
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

    const startProcessing = useCallback(async (
        initialProcessed: CategorizedBookmark[], 
        currentFolders: (Folder | Bookmark)[],
        overrideBookmarks?: Bookmark[]
    ) => {
        const availableKeys = apiConfigs.filter(c => c.status === 'active');
        if (availableKeys.length === 0) {
            const errorMsg = 'Không có API key nào đang hoạt động. Vui lòng thêm hoặc kích hoạt một key hợp lệ.';
            setErrorDetails(errorMsg);
            addDetailedLog('error', 'Không tìm thấy API key', errorMsg);
            return false;
        }

        addDetailedLog('info', 'Khởi tạo xử lý', `Bắt đầu với ${availableKeys.length} API key đang hoạt động: ${availableKeys.map(k => `${k.name} [ID: ${k.id}] (${k.provider})`).join(', ')}`);

        return await perfMonitor.timeAsyncFunction('start_processing', async () => {
            stopProcessingRef.current = false;
            setIsProcessing(true);
            
            const currentProcessed = [...initialProcessed];
            setProcessedBookmarks(currentProcessed);
            
            const sourceBookmarks = overrideBookmarks || bookmarks;
            const bookmarksToProcess = sourceBookmarks.slice(currentProcessed.length);
            const BATCH_SIZE = Math.max(1, batchSize);
            const totalBatches = Math.ceil(bookmarksToProcess.length / BATCH_SIZE);
            const MAX_CONCURRENT_WORKERS = processingMode === 'single' ? 1 : 3;

            let completedBatches = 0;
            let failedBatches = 0;
            let nextBatchToStart = 0;
            const batchResults: { [key: number]: CategorizedBookmark[] } = {};
            
            const userInstructionBlock = customInstructions.trim()
                ? `\n\nUSER'S CUSTOM INSTRUCTIONS (Follow these strictly):\n- ${customInstructions.trim().replace(/\n/g, '\n- ')}`
                : '';

            const currentTree = simplifyFolderStructure(currentFolders);

            const finalizeProcessing = (allNewResults: CategorizedBookmark[]) => {
                setIsProcessing(false);
                setProcessedBookmarks(prev => {
                    const existingUrls = new Set(prev.map(b => b.url));
                    const newUnique = allNewResults.filter(b => !existingUrls.has(b.url));
                    return [...prev, ...newUnique];
                });
                
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
                        currentTree
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

                            const categorizedMap = new Map<string, CategorizedBookmark>(
                                [...currentProcessed, ...allResults].map(cb => [cb.url, cb])
                            );
                            
                            const newFolders = arrayToTree(
                                sourceBookmarks.map(bm => {
                                    const categorized = categorizedMap.get(bm.url);
                                    return { ...bm, path: categorized?.path || [], tags: categorized?.tags || [] };
                                }),
                                currentFolders
                            );
                            onFoldersUpdate(newFolders);

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
    }, [bookmarks, apiConfigs, batchSize, maxRetries, processingMode, systemPrompt, customInstructions, onFoldersUpdate, addDetailedLog, onProcessingComplete]);

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

