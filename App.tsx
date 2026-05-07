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
import { useSmartClassify } from './hooks/useSmartClassify';
import { useBookmarkProcessing } from './hooks/useBookmarkProcessing';
import { useApiConfig } from './hooks/useApiConfig';
import { useInstructionPresets } from './hooks/useInstructionPresets';
import { useTemplateManagement } from './hooks/useTemplateManagement';
import { useAIPlanning } from './hooks/useAIPlanning';
import { useDuplicates } from './hooks/useDuplicates';
import { useBrokenLinks } from './hooks/useBrokenLinks';
import { useImportExport } from './hooks/useImportExport';
import { useSearch } from './hooks/useSearch';
import { useFolderStats } from './hooks/useFolderStats';

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
        processingMode, setProcessingMode
    } = useApp();

    // UI Local State
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>('root');
    const [isAnalyticsDashboardOpen, setIsAnalyticsDashboardOpen] = useState(false);
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    
    // Logic Hooks (These still need the context values or can be moved to context too)
    // For now, let's keep them here but consume context values
    const { 
        smartClassifyRules, 
        sessionRules, 
        setSessionRules, 
        saveRule: handleSaveSmartRule, 
        deleteRule: handleDeleteSmartRule, 
        applySmartClassify 
    } = useSmartClassify();

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
        apiConfigs,
        batchSize,
        maxRetries,
        processingMode,
        systemPrompt,
        customInstructions,
        onFoldersUpdate: setFolders,
        onNotificationsAdd: (n) => setNotifications(prev => [...prev, n]),
        onProcessingComplete: (hasError) => {
            if (hasError) {
                setAppState(AppState.ERROR);
            } else {
                setAppState(AppState.REVIEW);
            }
        }
    });

    const handleForceStopWrapper = useCallback(() => {
        handleForceStopRestructuring();
        setAppState(AppState.ERROR);
    }, [handleForceStopRestructuring, setAppState]);

    const {
        isApiModalOpen, setIsApiModalOpen,
        handleSaveApiConfig, handleDeleteApiConfig, handleToggleApiConfigStatus
    } = useApiConfig(apiConfigs, setApiConfigs);

    const {
        isInstructionPresetModalOpen, setIsInstructionPresetModalOpen,
        handleSaveInstructionPreset, handleDeleteInstructionPreset
    } = useInstructionPresets(instructionPresets, setInstructionPresets, setCustomInstructions);

    const {
        isFolderTemplateModalOpen, setIsFolderTemplateModalOpen,
        templateSettings,
        setTemplateSettings,
        selectedArchitectureStyle,
        handleArchitectureStyleChange,
        handleSaveFolderTemplate,
        handleDeleteFolderTemplate,
        handleApplyFolderTemplate,
        handleTemplateSettingsChange
    } = useTemplateManagement(folderTemplates, setFolderTemplates, setSystemPrompt, setNotifications);

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

    // Orchestration Logic
    const startRestructuring = async (isContinuation = false) => {
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
                setLogs(['Bắt đầu quá trình tái cấu trúc đa luồng...']);
            }
            
            setAppState(AppState.PROCESSING);
        }

        startProcessing(initialProcessed, folders, bookmarksToProcessList);
    };

    const applyChanges = async () => {
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
    };

    const discardChanges = () => {
        setFolders([]);
        setAppState(AppState.LOADED);
        setSessionRules([]);
        resetProcessingState();
    };
    
    const continueRestructuring = () => {
        startRestructuring(true);
    };

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
                handleSaveApiConfig={handleSaveApiConfig}
                handleDeleteApiConfig={handleDeleteApiConfig}
                handleToggleApiConfigStatus={handleToggleApiConfigStatus}
                handleSaveInstructionPreset={handleSaveInstructionPreset}
                handleDeleteInstructionPreset={handleDeleteInstructionPreset}
                handleSaveSmartRule={handleSaveSmartRule}
                handleDeleteSmartRule={handleDeleteSmartRule}
                handleSaveFolderTemplate={handleSaveFolderTemplate}
                handleDeleteFolderTemplate={handleDeleteFolderTemplate}
                handleApplyFolderTemplate={handleApplyFolderTemplate}
                templateSettings={templateSettings}
                setTemplateSettings={setTemplateSettings}
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
                selectedArchitectureStyle={selectedArchitectureStyle}
                handleArchitectureStyleChange={handleArchitectureStyleChange}
                handleUploadData={handleUploadData}
                handleImportData={handleImportData}
                isLogModalOpen={isLogModalOpen}
                setIsLogModalOpen={setIsLogModalOpen}
                detailedLogs={detailedLogs}
                isAnalyticsDashboardOpen={isAnalyticsDashboardOpen}
                setIsAnalyticsDashboardOpen={setIsAnalyticsDashboardOpen}
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
