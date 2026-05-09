import React, { useState, useCallback, Suspense, useEffect } from 'react';

import { AppState, Folder, CategorizedBookmark } from './types';
import Sidebar from './components/layout/Sidebar';
import BookmarkList from './components/features/BookmarkList';
import RestructurePanel from './components/features/RestructurePanel';
import FileDropzone from './components/ui/FileDropzone';
import Header from './components/layout/Header';
import AppModals from './components/layout/AppModals';
import NotificationToast from './components/ui/NotificationToast';

import * as db from './db';
import { perfMonitor } from './src/performance';
import { findFolder, getBookmarksInFolder } from './src/utils/treeUtils';
import { DEFAULT_SYSTEM_PROMPT } from './src/constants';
import { useApp } from './src/context/AppContext';

// Hooks
import { useBookmarkProcessing } from './hooks/useBookmarkProcessing';
import { useAIPlanning } from './hooks/useAIPlanning';
import { useDuplicates } from './hooks/useDuplicates';
import { useBrokenLinks } from './hooks/useBrokenLinks';
import { useImportExport } from './hooks/useImportExport';
import { useSearch } from './hooks/useSearch';
import { useFolderStats } from './hooks/useFolderStats';
import { useAppOrchestration } from './hooks/useAppOrchestration';

const App: React.FC = () => {
    const {
        // Data
        bookmarks, setBookmarks,
        folders, setFolders,
        appState, setAppState,
        isLoading,
        apiConfigs, setApiConfigs,
        instructionPresets, setInstructionPresets,
        folderTemplates, setFolderTemplates,
        notifications, setNotifications,
        handleClearData,

        // AI Settings
        systemPrompt, setSystemPrompt,
        customInstructions, setCustomInstructions,
        batchSize, setBatchSize,
        maxRetries, setMaxRetries,
        processingMode, setProcessingMode,
        tagDrivenMode, setTagDrivenMode,
        tagCount, setTagCount,
        tagLanguage, setTagLanguage,
        autoCleanupEmptyFolders, setAutoCleanupEmptyFolders,

        // Smart Classify
        smartClassifyRules, 
        sessionRules, setSessionRules, 
        handleSaveSmartRule, handleDeleteSmartRule, 
        applySmartClassify,
        
        // AI Profiles
        aiProfiles,
        activeProfile,
        activeProfileId,
        setActiveProfileId,
        handleDeleteProfile,
        promptModifiers,
        userCorrections
    } = useApp();

    // UI Local State
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>('root');
    const [isAnalyticsDashboardOpen, setIsAnalyticsDashboardOpen] = useState(false);
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    
    // Logic Hooks (These still need the context values or can be moved to context too)

    const handleNotificationsAdd = useCallback((n: any) => setNotifications(prev => [...prev, n]), [setNotifications]);
    const handleProcessingComplete = useCallback((hasError: boolean) => {
        if (hasError) {
            setAppState(AppState.ERROR);
        } else {
            setAppState(AppState.REVIEW);
        }
    }, [setAppState]);

    const {
        isProcessing: isGeneratingStructure,
        progress,
        logs,
        detailedLogs,
        errorDetails,
        sessionTokenUsage,
        processedBookmarks: allCategorizedBookmarks,
        startProcessing,
        stopProcessing: handleStopRestructuring,
        forceStop: handleForceStopRestructuring,
        resetProcessingState,
        setLogs,
        setErrorDetails,
        setProcessedBookmarks: setAllCategorizedBookmarks,
    } = useBookmarkProcessing({
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
        onFoldersUpdate: setFolders,
        onNotificationsAdd: handleNotificationsAdd,
        onProcessingComplete: handleProcessingComplete,
        autoCleanupEmptyFolders,
        activeProfile,
        userHistory: userCorrections
    });

    const handleForceStopWrapper = useCallback(() => {
        handleForceStopRestructuring();
        setAppState(AppState.ERROR);
    }, [handleForceStopRestructuring, setAppState]);

    const {
        isApiModalOpen, setIsApiModalOpen,
        handleSaveApiConfig, handleDeleteApiConfig, handleToggleApiConfigStatus,
        isInstructionPresetModalOpen, setIsInstructionPresetModalOpen,
        handleSaveInstructionPreset, handleDeleteInstructionPreset,
        isFolderTemplateModalOpen, setIsFolderTemplateModalOpen,
        templateSettings,
        setTemplateSettings,
        selectedArchitectureStyle,
        handleArchitectureStyleChange,
        handleSaveFolderTemplate,
        handleDeleteFolderTemplate,
        handleApplyFolderTemplate,
        handleTemplateSettingsChange
    } = useApp();

    const {
        proposedStructure,
        planningPrompt, setPlanningPrompt,
        generateStructureSuggestion: handleSuggestStructure,
        confirmProposedStructure: handleConfirmProposedStructure
    } = useAIPlanning(
        bookmarks, apiConfigs, setFolders, setSystemPrompt, setAppState, 
        setAllCategorizedBookmarks, setLogs, setErrorDetails, setNotifications,
        applySmartClassify, sessionRules
    );

    const {
        duplicateStats, isDuplicateModalOpen, setIsDuplicateModalOpen, handleCleanDuplicates
    } = useDuplicates(bookmarks, setBookmarks, appState, setFolders, setAppState);

    const {
        brokenLinks, brokenLinkCheckState, brokenLinkCheckProgress, isBrokenLinkModalOpen, setIsBrokenLinkModalOpen,
        handleStartBrokenLinkCheck, handleCleanBrokenLinks
    } = useBrokenLinks(bookmarks, setBookmarks, appState, setFolders, setAppState);

    const {
        showImportModal, setShowImportModal,
        importFileName, setImportFileName,
        previewBookmarks, setPreviewBookmarks,
        isExportModalOpen, setIsExportModalOpen,
        isKeyInputModalOpen, setIsKeyInputModalOpen,
        keyInputMode, setKeyInputMode,
        handleImportClick, processImport, handleExportBookmarks, handleUploadData, handleImportData,
        handleFileLoaded, importFile, handleFileSelect
    } = useImportExport(bookmarks, folders, setBookmarks, setFolders, setAppState, setNotifications);

    const { searchQuery, setSearchQuery, filteredBookmarks, isSearching } = useSearch(bookmarks);
    const { foldersWithCounts } = useFolderStats(folders);

    const [isGlobalSettingsModalOpen, setIsGlobalSettingsModalOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState<'providers' | 'intelligence' | 'templates' | 'data' | 'health' | 'backup' | 'config'>('providers');

    const openSettings = (tab: typeof settingsTab = 'providers') => {
        setSettingsTab(tab);
        setIsGlobalSettingsModalOpen(true);
    };

    const {
        startRestructuring,
        applyChanges,
        discardChanges,
        continueRestructuring,
        restructureMissingBookmarks
    } = useAppOrchestration({
        allCategorizedBookmarks,
        startProcessing,
        resetProcessingState,
        setLogs,
        setSelectedFolderId
    });

    const handleDismissNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, [setNotifications]);


    // View Logic
    const selectedFolder = selectedFolderId === 'root' 
        ? { id: 'root', name: 'Tất cả Bookmarks', children: [], parentId: null } 
        : findFolder(folders, selectedFolderId);

    const displayedBookmarks = selectedFolderId === 'root'
        ? bookmarks
        : getBookmarksInFolder(selectedFolder);

    const bookmarksToDisplay = isSearching ? filteredBookmarks : displayedBookmarks;
    const listTitle = isSearching
        ? `Kết quả tìm kiếm cho "${searchQuery}"`
        : (selectedFolder?.name || 'Tất cả Bookmarks');
    const noBookmarksMessage = isSearching
        ? `Không tìm thấy kết quả nào cho "${searchQuery}".`
        : 'Không có bookmark nào trong thư mục này.';

    if (isLoading) {
        return (
            <div className="flex h-screen w-full bg-[#1E2127] items-center justify-center">
                <p className="text-white text-lg">Đang tải dữ liệu...</p>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full bg-[#1E2127] text-gray-300 font-sans">
            <AppModals 
                isGlobalSettingsModalOpen={isGlobalSettingsModalOpen}
                setIsGlobalSettingsModalOpen={setIsGlobalSettingsModalOpen}
                settingsTab={settingsTab}
                processImport={processImport}
                handleExportBookmarks={handleExportBookmarks}
                importFile={importFile}
                previewBookmarks={previewBookmarks}
                handleFileSelect={handleFileSelect}
                duplicateStats={duplicateStats}
                handleCleanDuplicates={handleCleanDuplicates}
                brokenLinks={brokenLinks}
                brokenLinkCheckState={brokenLinkCheckState}
                brokenLinkCheckProgress={brokenLinkCheckProgress}
                handleStartBrokenLinkCheck={handleStartBrokenLinkCheck}
                handleCleanBrokenLinks={handleCleanBrokenLinks}
                handleUploadData={handleUploadData}
                handleImportData={handleImportData}
                isLogModalOpen={isLogModalOpen}
                setIsLogModalOpen={setIsLogModalOpen}
                detailedLogs={detailedLogs}
                isAnalyticsDashboardOpen={isAnalyticsDashboardOpen}
                setIsAnalyticsDashboardOpen={setIsAnalyticsDashboardOpen}
                planningPrompt={planningPrompt}
                onPlanningPromptChange={setPlanningPrompt}
            />
            
            <div className="fixed bottom-4 right-4 z-50 space-y-2">
                {notifications.map((notification, index) => (
                    <NotificationToast
                        key={notification.id}
                        id={notification.id}
                        message={notification.message}
                        type={notification.type}
                        duration={notification.duration}
                        action={notification.action}
                        index={index}
                        onDismiss={handleDismissNotification}
                    />
                ))}
            </div>
            <div className="w-full max-w-10xl mx-auto flex h-full p-4">
                <main className="flex flex-1 bg-[#282C34] rounded-xl shadow-2xl overflow-hidden">
                    <Sidebar
                        selectedFolderId={selectedFolderId}
                        onSelectFolder={setSelectedFolderId}
                        onImport={() => openSettings('data')}
                        onExport={() => openSettings('data')}
                        duplicateCount={duplicateStats.count}
                        onOpenDuplicateModal={() => openSettings('health')}
                        onStartBrokenLinkCheck={handleStartBrokenLinkCheck}
                        brokenLinkCheckState={brokenLinkCheckState}
                        brokenLinkCheckProgress={brokenLinkCheckProgress}
                    />

                    <div className="flex-1 flex flex-col min-w-0">
                        <Header 
                            onOpenBackup={() => openSettings('backup')}
                            onOpenData={() => openSettings('data')}
                            onOpenAnalytics={() => setIsAnalyticsDashboardOpen(true)}
                        />
                       
                        {appState === AppState.EMPTY && <FileDropzone onFileLoaded={handleFileLoaded} />}

                        {(appState !== AppState.EMPTY) && (
                            <div className="flex flex-1 min-h-0">
                                <BookmarkList
                                    bookmarks={bookmarksToDisplay}
                                    folderName={listTitle}
                                    noBookmarksMessage={noBookmarksMessage}
                                />
                                <RestructurePanel
                                    onStart={() => startRestructuring(false)}
                                    onStop={handleStopRestructuring}
                                    onForceStop={handleForceStopWrapper}
                                    onApply={applyChanges}
                                    onDiscard={discardChanges}
                                    onContinue={continueRestructuring}
                                    onOpenLogModal={() => setIsLogModalOpen(true)}
                                    onSuggestStructure={handleSuggestStructure}
                    onConfirmProposedStructure={handleConfirmProposedStructure}
                    proposedStructure={proposedStructure}
                    isGeneratingStructure={isGeneratingStructure}
                    onOpenAIConfigModal={() => openSettings('providers')}
                    onRestructureMissing={restructureMissingBookmarks}
                    sessionRules={sessionRules}
                                    onSessionRulesChange={setSessionRules}
                                    progress={{
                                        current: allCategorizedBookmarks.length > 0 ? allCategorizedBookmarks.length : progress.current,
                                        total: bookmarks.length > 0 ? bookmarks.length : progress.total,
                                    }}
                                    logs={logs}
                                    errorDetails={errorDetails}
                                    sessionTokenUsage={sessionTokenUsage}
                                    hasPartialResults={allCategorizedBookmarks.length > 0}
                                />
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default App;
