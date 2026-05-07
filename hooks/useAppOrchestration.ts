import { useCallback } from 'react';
import { useApp } from '../src/context/AppContext';
import { AppState, type CategorizedBookmark } from '../types';
import * as db from '../db';
import { perfMonitor } from '../src/performance';

interface OrchestrationProps {
    allCategorizedBookmarks: CategorizedBookmark[];
    smartClassifyRules: any[];
    sessionRules: any[];
    setSessionRules: (rules: any[]) => void;
    applySmartClassify: (bookmarks: any[], rules: any[]) => { classified: any[], remaining: any[] };
    startProcessing: (initialProcessed: CategorizedBookmark[], currentFolders: any[], bookmarksToProcessList: any[]) => void;
    resetProcessingState: () => void;
    setLogs: (updater: (prev: string[]) => string[]) => void;
    setSelectedFolderId: (id: string | null) => void;
}

export const useAppOrchestration = ({
    allCategorizedBookmarks,
    smartClassifyRules,
    sessionRules,
    setSessionRules,
    applySmartClassify,
    startProcessing,
    resetProcessingState,
    setLogs,
    setSelectedFolderId
}: OrchestrationProps) => {
    const {
        bookmarks, setBookmarks,
        folders, setFolders,
        setAppState
    } = useApp();

    const startRestructuring = useCallback(async (isContinuation = false) => {
        let initialProcessed: CategorizedBookmark[] = [];
        let bookmarksToProcessList = bookmarks;

        if (isContinuation) {
            initialProcessed = allCategorizedBookmarks;
        } else {
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
        setFolders([]);
        setAppState(AppState.LOADED);
        setSessionRules([]);
        resetProcessingState();
    }, [setFolders, setAppState, setSessionRules, resetProcessingState]);
    
    const continueRestructuring = useCallback(() => {
        startRestructuring(true);
    }, [startRestructuring]);

    return {
        startRestructuring,
        applyChanges,
        discardChanges,
        continueRestructuring
    };
};
