import { useState, useRef, useCallback } from 'react';
import { type Bookmark, type Folder, type CategorizedBookmark, type ApiConfig, type DetailedLog } from '../types';
import { arrayToTree } from '../src/utils';
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
}

export const useBookmarkProcessing = ({
    bookmarks,
    apiConfigs,
    batchSize,
    maxRetries,
    processingMode,
    systemPrompt,
    customInstructions,
    onFoldersUpdate,
    onNotificationsAdd
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

    // Helper to add logs
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
            onNotificationsAdd({ id: newLog.id, message: `${newLog.title}: ${typeof newLog.content === 'string' ? newLog.content.substring(0, 100) : ''}...`, type: newLog.type === 'error' ? 'error' : 'success' });
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


    // Helper to simplify folder structure for AI context (removes IDs and Bookmarks)
    const simplifyFolderStructure = (folders: (Folder | Bookmark)[]): any[] => {
        return folders
            .filter(item => !('url' in item)) // Filter out bookmarks at this level
            .map(item => {
                const folder = item as Folder;
                return {
                    name: folder.name,
                    children: simplifyFolderStructure(folder.children)
                };
            });
    };

    const startProcessing = useCallback(async (
        initialProcessed: CategorizedBookmark[], 
        currentFolders: (Folder | Bookmark)[],
        overrideBookmarks?: Bookmark[]
    ) => {
        const availableKeys = apiConfigs.filter(c => c.status === 'active');
        if (availableKeys.length === 0) {
            setErrorDetails('Không có API key nào đang hoạt động. Vui lòng thêm hoặc kích hoạt một key hợp lệ.');
            addDetailedLog('error', 'Không tìm thấy API key', 'Không có API key nào được cấu hình hoặc đang hoạt động.');
            return false;
        }

        await perfMonitor.timeAsyncFunction('start_processing', async () => {
            stopProcessingRef.current = false;
            setIsProcessing(true);
            
            // Note: processedBookmarks state update is async, so we use a local variable for logic
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

            // Prepare the simplified tree once
            const currentTree = simplifyFolderStructure(currentFolders);

            const finalizeProcessing = (allNewResults: CategorizedBookmark[]) => {
                setIsProcessing(false);
                // Update processed bookmarks state one last time
                setProcessedBookmarks(prev => {
                    // Avoid duplicates if needed, but logic implies appending
                    // Actually, let's just use what we have tracked
                    return [...currentProcessed, ...allNewResults]; 
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
            };

            const startNextBatch = (specificWorker?: Worker, specificWorkerIndex?: number) => {
                if (stopProcessingRef.current) return;
                if (nextBatchToStart >= totalBatches) return;

                const batchIndex = nextBatchToStart++;
                // If specific worker provided (reusing), use it. Otherwise assign round-robin (initial)
                // Actually round robin logic needs care. simpler:
                // If specific worker provided, use it. If not (initial loop), push to array.
                
                let worker: Worker;
                
                if (specificWorker) {
                    worker = specificWorker;
                } else {
                    // Should not happen in this logic flow
                    return;
                }

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
                        systemPrompt, // Pass raw system prompt
                        userInstructionBlock, // Pass user instructions separately
                        apiConfigs: availableKeys,
                        maxRetries,
                        currentTree // Pass the current folder structure
                    }
                });
            };

            // Initialize workers
            for (let i = 0; i < MAX_CONCURRENT_WORKERS; i++) {
                if (nextBatchToStart >= totalBatches) break;

                const worker = new Worker(new URL('../src/aiWorker.ts', import.meta.url), { type: 'module' });
                workersRef.current.push(worker);

                worker.onmessage = (e) => {
                    const { type, data, error, batchIndex } = e.data;

                    if (type === 'log') {
                        setLogs(prev => [...prev, `[Worker ${batchIndex}] ${data}`]);
                        addDetailedLog('info', `Worker ${batchIndex}`, data);
                    } else if (type === 'detailed_log') {
                        // Forward detailed logs from worker
                        addDetailedLog(data.type, data.title, data.content, data.usage);
                    } else if (type === 'batch_result') {
                        // Graceful stop: Process the result, but don't start new batches
                        
                        activeWorkersRef.current.delete(batchIndex);
                        completedBatches++;
                        batchResults[batchIndex] = data.categorizedBatch;

                        if (data.usage) {
                            setSessionTokenUsage(prev => ({
                                promptTokens: prev.promptTokens + (data.usage.promptTokens || 0),
                                completionTokens: prev.completionTokens + (data.usage.completionTokens || 0),
                                totalTokens: prev.totalTokens + (data.usage.totalTokens || 0)
                            }));
                        }

                        // Update progress
                        const allResults = Object.values(batchResults).flat();
                        const currentProgress = currentProcessed.length + allResults.length;
                        setProgress({ current: currentProgress, total: sourceBookmarks.length });

                        // Update folders realtime
                        const newFolders = arrayToTree(
                            sourceBookmarks.map(bm => {
                                const categorized = [...currentProcessed, ...allResults].find(cb => cb.url === bm.url);
                                return { ...bm, path: categorized?.path || [], tags: categorized?.tags || [] };
                            }),
                            currentFolders
                        );
                        onFoldersUpdate(newFolders);

                        // Check completion OR Graceful Stop completion
                        const isFinished = completedBatches + failedBatches >= totalBatches;
                        const isGracefulStopFinished = stopProcessingRef.current && activeWorkersRef.current.size === 0;

                        if (isFinished || isGracefulStopFinished) {
                            finalizeProcessing(allResults);
                        } else {
                            // Reuse this worker for next batch (startNextBatch handles stopProcessingRef check)
                            startNextBatch(worker);
                        }
                    } else if (type === 'batch_error') {
                        activeWorkersRef.current.delete(batchIndex);
                        failedBatches++;
                        setLogs(prev => [...prev, `[Worker] Batch ${batchIndex} thất bại: ${error}`]);
                        addDetailedLog('error', `Batch ${batchIndex} Failed`, error);
                        
                        const isFinished = completedBatches + failedBatches >= totalBatches;
                        const isGracefulStopFinished = stopProcessingRef.current && activeWorkersRef.current.size === 0;

                        if (isFinished || isGracefulStopFinished) {
                            finalizeProcessing(Object.values(batchResults).flat());
                        } else {
                            startNextBatch(worker);
                        }
                    }
                };

                // Start first task for this worker
                startNextBatch(worker);
            }
        });
        
        return true;
    }, [bookmarks, apiConfigs, batchSize, maxRetries, processingMode, systemPrompt, customInstructions, onFoldersUpdate, addDetailedLog]);

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
