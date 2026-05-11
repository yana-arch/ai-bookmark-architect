import { useState, useCallback } from 'react';
import { useApp } from '../src/context/AppContext';
import { AppState } from '../types';
import { findFolder, getBookmarksInFolder } from '../src/utils/treeUtils';

// Hooks
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
        instructionPresets, setInstructionPresets,
        folderTemplates, setFolderTemplates,
        setNotifications,
        handleClearData,
        systemPrompt, setSystemPrompt,
        customInstructions, setCustomInstructions,
        batchSize, setBatchSize,
        maxRetries, setMaxRetries,
        processingMode, setProcessingMode,
        tagDrivenMode, setTagDrivenMode,
        tagCount, setTagCount,
        tagLanguage, setTagLanguage,
        autoCleanupEmptyFolders, setAutoCleanupEmptyFolders,
        smartClassifyRules, 
        sessionRules, setSessionRules, 
        handleSaveSmartRule, handleDeleteSmartRule, 
        applySmartClassify,
        aiProfiles,
        activeProfile,
        activeProfileId,
        setActiveProfileId,
        handleDeleteProfile,
        promptModifiers,
        userCorrections
    } = context;

    // UI Local State
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>('root');
    const [isAnalyticsDashboardOpen, setIsAnalyticsDashboardOpen] = useState(false);
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [isGlobalSettingsModalOpen, setIsGlobalSettingsModalOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState<'providers' | 'intelligence' | 'templates' | 'data' | 'health' | 'backup' | 'config'>('providers');

    const handleNotificationsAdd = useCallback((n: any) => setNotifications(prev => [...prev, n]), [setNotifications]);
    
    const handleProcessingComplete = useCallback((hasError: boolean) => {
        setAppState(hasError ? AppState.ERROR : AppState.REVIEW);
    }, [setAppState]);

    const processing = useBookmarkProcessing({
        bookmarks, folders, apiConfigs, batchSize, maxRetries, processingMode, tagDrivenMode, tagCount, tagLanguage,
        promptModifiers, systemPrompt, customInstructions, onFoldersUpdate: setFolders, onNotificationsAdd: handleNotificationsAdd,
        onProcessingComplete: handleProcessingComplete, autoCleanupEmptyFolders, activeProfile, userHistory: userCorrections
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

    const openSettings = (tab: typeof settingsTab = 'providers') => {
        setSettingsTab(tab);
        setIsGlobalSettingsModalOpen(true);
    };

    const handleDismissNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, [setNotifications]);

    // View Logic
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
