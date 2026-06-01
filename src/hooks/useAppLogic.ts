import { useCallback } from 'react';
import { useApp } from '@/src/context/AppContext';
import { AppState, type Bookmark, type Notification } from '@/types';
import { findFolder, getBookmarksInFolder } from '@/src/utils/treeUtils';

import { useBookmarkProcessing } from './useBookmarkProcessing';
import { useAIPlanning } from './useAIPlanning';
import { useDuplicates } from './useDuplicates';
import { useBrokenLinks } from './useBrokenLinks';
import { useImportExport } from './useImportExport';
import { useSearch } from './useSearch';
import { useFolderStats } from './useFolderStats';
import { useAppOrchestration } from './useAppOrchestration';

export const useAppLogic = () => {
    const context = useApp();
    const {
        bookmarks, setBookmarks,
        folders, setFolders,
        appState, setAppState,
        apiConfigs,
        setNotifications,
        systemPrompt, setSystemPrompt,
        customInstructions,
        batchSize, maxRetries, processingMode,
        tagDrivenMode, tagCount, tagLanguage,
        autoCleanupEmptyFolders,
        smartClassifyRules,
        sessionRules, setSessionRules,
        applySmartClassify,
        activeProfile,
        promptModifiers,
        userCorrections,
        // UI state from context
        selectedFolderId, setSelectedFolderId,
        isAnalyticsDashboardOpen, setIsAnalyticsDashboardOpen,
        isLogModalOpen, setIsLogModalOpen,
        isGlobalSettingsModalOpen, setIsGlobalSettingsModalOpen,
        settingsTab, setSettingsTab,
        openSettings,
    } = context;

    const handleNotificationsAdd = useCallback((n: Notification) => setNotifications(prev => [...prev, n]), [setNotifications]);

    const handleProcessingComplete = useCallback((hasError: boolean) => {
        setAppState(hasError ? AppState.ERROR : AppState.REVIEW);
    }, [setAppState]);

    const processing = useBookmarkProcessing({
        bookmarks, folders, apiConfigs, batchSize, maxRetries, processingMode, tagDrivenMode, tagCount, tagLanguage,
        promptModifiers, systemPrompt, customInstructions, onFoldersUpdate: setFolders,
        onNotificationsAdd: handleNotificationsAdd, onProcessingComplete: handleProcessingComplete,
        autoCleanupEmptyFolders, activeProfile, userHistory: userCorrections
    });

    const planning = useAIPlanning(
        bookmarks, apiConfigs, setFolders, setSystemPrompt, setAppState,
        processing.setProcessedBookmarks, processing.setLogs, processing.setErrorDetails, setNotifications,
        applySmartClassify, sessionRules
    );

    const duplicates = useDuplicates(bookmarks, setBookmarks, appState, setFolders, setAppState);
    const brokenLinks = useBrokenLinks(bookmarks, setBookmarks, appState, setFolders, setAppState);
    const importExport = useImportExport(bookmarks, folders, setBookmarks, setFolders, setAppState, setNotifications);
    const search = useSearch(bookmarks);
    const stats = useFolderStats(folders);

    const orchestration = useAppOrchestration({
        processedBookmarks: processing.processedBookmarks,
        startProcessing: processing.startProcessing,
        resetProcessingState: processing.resetProcessingState,
        setLogs: processing.setLogs,
        setSelectedFolderId,
        setProcessedBookmarks: processing.setProcessedBookmarks
    });

    const handleDismissNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, [setNotifications]);

    // View logic
    const selectedFolder = selectedFolderId === 'root'
        ? { id: 'root', name: 'Tất cả Bookmarks', children: [], parentId: null }
        : findFolder(folders, selectedFolderId);

    const displayedBookmarks = selectedFolderId === 'root' ? bookmarks : getBookmarksInFolder(selectedFolder);
    const bookmarksToDisplay = search.isSearching ? search.filteredBookmarks : displayedBookmarks;

    const listTitle = search.isSearching
        ? `Kết quả tìm kiếm cho "${search.searchQuery}"`
        : (selectedFolder?.name || 'Tất cả Bookmarks');

    return {
        context,
        ui: {
            selectedFolderId, setSelectedFolderId,
            isAnalyticsDashboardOpen, setIsAnalyticsDashboardOpen,
            isLogModalOpen, setIsLogModalOpen,
            isGlobalSettingsModalOpen, setIsGlobalSettingsModalOpen,
            settingsTab, setSettingsTab,
            openSettings,
            handleDismissNotification,
            listTitle,
            bookmarksToDisplay
        },
        processing,
        planning,
        duplicates,
        brokenLinks,
        importExport,
        search,
        stats,
        orchestration
    };
};
