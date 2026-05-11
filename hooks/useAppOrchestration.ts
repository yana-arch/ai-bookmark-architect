import { useCallback, useState } from 'react';
import { useApp } from '../src/context/AppContext';
import { AppState, type CategorizedBookmark, type Folder, type Bookmark } from '../types';
import * as db from '@db';
import { perfMonitor } from '../src/performance';

interface OrchestrationProps {
    allCategorizedBookmarks: CategorizedBookmark[];
    startProcessing: (initialProcessed: CategorizedBookmark[], currentFolders: any[], bookmarksToProcessList: any[]) => void;
    resetProcessingState: () => void;
    setLogs: (updater: (prev: string[]) => string[]) => void;
    setSelectedFolderId: (id: string | null) => void;
}

export const useAppOrchestration = ({
    allCategorizedBookmarks,
    startProcessing,
    resetProcessingState,
    setLogs,
    setSelectedFolderId
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

    const startRestructuring = useCallback(async (isContinuation = false) => {
        let initialProcessed: CategorizedBookmark[] = [];
        let bookmarksToProcessList = bookmarks;

        if (isContinuation) {
            initialProcessed = allCategorizedBookmarks;
        } else {
            // Snapshot current folders before starting a new process
            setFoldersSnapshot(folders);
            
            // Apply Smart Classify rules
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
    }, [
        bookmarks, allCategorizedBookmarks, applySmartClassify, smartClassifyRules, 
        sessionRules, setBookmarks, setLogs, resetProcessingState, setAppState, 
        startProcessing, folders
    ]);

    const applyChanges = useCallback(async () => {
        await perfMonitor.timeAsyncFunction('apply_changes', async () => {
            const categorizedMap = new Map<string, CategorizedBookmark>(allCategorizedBookmarks.map(cb => [cb.url, cb]));
            const finalBookmarks = bookmarks.map(bm => {
                const categorized = categorizedMap.get(bm.url);
                if (categorized) {
                    return { ...bm, path: categorized.path, tags: categorized.tags };
                }
                return bm;
            });
            await db.saveBookmarks(finalBookmarks);
            await db.saveFolders(folders);
            setBookmarks(finalBookmarks);
            setAppState(AppState.STRUCTURED);
            setSessionRules([]);
            resetProcessingState();
            setSelectedFolderId('root');
        });
    }, [allCategorizedBookmarks, bookmarks, folders, setBookmarks, setAppState, setSessionRules, resetProcessingState, setSelectedFolderId]);

    const discardChanges = useCallback(() => {
        setFolders(foldersSnapshot);
        setAppState(AppState.LOADED);
        setSessionRules([]);
        resetProcessingState();
    }, [setFolders, foldersSnapshot, setAppState, setSessionRules, resetProcessingState]);
    
    const continueRestructuring = useCallback(() => {
        startRestructuring(true);
    }, [startRestructuring]);

    const restructureMissingBookmarks = useCallback(async () => {
        // Find bookmarks that are at the root (no path or empty path)
        const missingBookmarks = bookmarks.filter(bm => !bm.path || bm.path.length === 0);
        
        if (missingBookmarks.length === 0) {
            setLogs(prev => [...prev, 'Không tìm thấy bookmark nào ở thư mục gốc cần xử lý.']);
            return;
        }

        setFoldersSnapshot(folders);
        
        // Apply Smart Classify rules to missing bookmarks
        const { classified, remaining } = applySmartClassify(missingBookmarks, [...smartClassifyRules, ...sessionRules]);
        
        let initialProcessed: CategorizedBookmark[] = [];
        let bookmarksToProcessList = missingBookmarks;

        if (classified.length > 0) {
            initialProcessed = classified;
            bookmarksToProcessList = [...classified, ...remaining];
            setLogs(prev => [...prev, `Smart Classify: Đã tự động phân loại ${classified.length} bookmark ở root.`]);
        } else {
            const modeText = tagDrivenMode ? 'chế độ Tag-driven' : 'gom batch';
            setLogs(prev => [...prev, `Phát hiện ${missingBookmarks.length} bookmark ở thư mục gốc. Bắt đầu xử lý theo ${modeText}...`]);
        }
        
        setAppState(AppState.PROCESSING);
        
        // Start processing specifically these missing bookmarks
        startProcessing(initialProcessed, folders, bookmarksToProcessList);
    }, [bookmarks, folders, setLogs, setAppState, startProcessing, applySmartClassify, smartClassifyRules, sessionRules]);

    return {
        startRestructuring,
        applyChanges,
        discardChanges,
        continueRestructuring,
        restructureMissingBookmarks
    };
};
