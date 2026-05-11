import { useCallback, useState } from 'react';
import { useApp } from '../src/context/AppContext';
import { AppState, type CategorizedBookmark, type Folder, type Bookmark } from '../types';
import * as db from '@db';
import { perfMonitor } from '../src/performance';

interface OrchestrationProps {
    processedBookmarks: CategorizedBookmark[];
    startProcessing: (initialProcessed: CategorizedBookmark[], currentFolders: any[], overrideBookmarks?: Bookmark[]) => void;
    resetProcessingState: () => void;
    setLogs: (updater: (prev: string[]) => string[]) => void;
    setSelectedFolderId: (id: string | null) => void;
    setProcessedBookmarks: (bookmarks: CategorizedBookmark[]) => void;
}

export const useAppOrchestration = ({
    processedBookmarks,
    startProcessing,
    resetProcessingState,
    setLogs,
    setSelectedFolderId,
    setProcessedBookmarks
}: OrchestrationProps) => {
    const {
        bookmarks, setBookmarks,
        folders, setFolders,
        appState, setAppState,
        smartClassifyRules,
        sessionRules, setSessionRules,
        applySmartClassify,
        tagDrivenMode
    } = useApp();

    const [foldersSnapshot, setFoldersSnapshot] = useState<(Folder | Bookmark)[]>([]);

    const handleStartRestructuring = useCallback(async (isContinuation = false) => {
        let initialProcessed: CategorizedBookmark[] = [];
        let bookmarksToProcessList: Bookmark[] | undefined = undefined;

        if (isContinuation) {
            initialProcessed = processedBookmarks;
        } else {
            setFoldersSnapshot(folders);
            
            const { classified, remaining } = applySmartClassify(bookmarks, [...smartClassifyRules, ...sessionRules]);
            
            if (classified.length > 0) {
                initialProcessed = classified;
                const reorderedBookmarks = [...classified, ...remaining];
                setBookmarks(reorderedBookmarks); 
                bookmarksToProcessList = reorderedBookmarks;
                setLogs(prev => [...prev, `Smart Classify: Đã tự động phân loại ${classified.length} bookmark.`]);
            } else {
                resetProcessingState();
                setLogs(() => ['Bắt đầu quá trình tái cấu trúc đa luồng...']);
            }
            
            setAppState(AppState.PROCESSING);
        }

        startProcessing(initialProcessed, folders, bookmarksToProcessList);
    }, [processedBookmarks, folders, applySmartClassify, bookmarks, smartClassifyRules, sessionRules, setBookmarks, setLogs, resetProcessingState, setAppState, startProcessing]);

    const handleApplyChanges = useCallback(async () => {
        await perfMonitor.timeAsyncFunction('apply_changes', async () => {
            const categorizedMap = new Map<string, CategorizedBookmark>(processedBookmarks.map(cb => [cb.url, cb]));
            const finalBookmarks = bookmarks.map(bm => {
                const categorized = categorizedMap.get(bm.url);
                return categorized ? { ...bm, path: categorized.path, tags: categorized.tags } : bm;
            });

            await db.saveBookmarks(finalBookmarks);
            await db.saveFolders(folders);
            
            setBookmarks(finalBookmarks);
            setAppState(AppState.STRUCTURED);
            setSessionRules([]);
            resetProcessingState();
            setSelectedFolderId('root');
        });
    }, [processedBookmarks, bookmarks, folders, setBookmarks, setAppState, setSessionRules, resetProcessingState, setSelectedFolderId]);

    const handleDiscardChanges = useCallback(() => {
        setFolders(foldersSnapshot);
        setAppState(AppState.LOADED);
        setSessionRules([]);
        resetProcessingState();
    }, [setFolders, foldersSnapshot, setAppState, setSessionRules, resetProcessingState]);
    
    const handleContinueRestructuring = useCallback(() => {
        handleStartRestructuring(true);
    }, [handleStartRestructuring]);

    const handleRestructureMissing = useCallback(async () => {
        const missingBookmarks = bookmarks.filter(bm => !bm.path || bm.path.length === 0);
        
        if (missingBookmarks.length === 0) {
            setLogs(prev => [...prev, 'Không tìm thấy bookmark nào ở thư mục gốc cần xử lý.']);
            return;
        }

        setFoldersSnapshot(folders);
        
        const { classified, remaining } = applySmartClassify(missingBookmarks, [...smartClassifyRules, ...sessionRules]);
        
        let initialProcessed: CategorizedBookmark[] = [];
        let overrideBookmarks: Bookmark[] | undefined = undefined;

        if (classified.length > 0) {
            initialProcessed = classified;
            overrideBookmarks = [...classified, ...remaining];
            setLogs(prev => [...prev, `Smart Classify: Đã tự động phân loại ${classified.length} bookmark ở root.`]);
        } else {
            const modeText = tagDrivenMode ? 'chế độ Tag-driven' : 'gom batch';
            setLogs(prev => [...prev, `Phát hiện ${missingBookmarks.length} bookmark ở thư mục gốc. Bắt đầu xử lý theo ${modeText}...`]);
        }
        
        setAppState(AppState.PROCESSING);
        startProcessing(initialProcessed, folders, overrideBookmarks || missingBookmarks);
    }, [bookmarks, folders, setLogs, setAppState, startProcessing, applySmartClassify, smartClassifyRules, sessionRules, tagDrivenMode]);

    return {
        startRestructuring: handleStartRestructuring,
        applyChanges: handleApplyChanges,
        discardChanges: handleDiscardChanges,
        continueRestructuring: handleContinueRestructuring,
        restructureMissingBookmarks: handleRestructureMissing
    };
};
