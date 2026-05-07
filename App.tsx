import React, { useState, useCallback, useMemo, lazy, Suspense, useEffect } from 'react';

import { AILogoIcon, ChartIcon, UploadIcon, ImportIcon, EllipsisVerticalIcon, CogIcon } from './components/ui/Icons';
import { AppState, Folder, Bookmark, CategorizedBookmark } from './types';
import Sidebar from './components/layout/Sidebar';
import BookmarkList from './components/features/BookmarkList';
import RestructurePanel from './components/features/RestructurePanel';
import FileDropzone from './components/ui/FileDropzone';
import * as db from './db';
import { searchCache, cacheKeys, generateHash } from './src/cache';
import { perfMonitor } from './src/performance';
import { findFolder, getBookmarksInFolder } from './src/utils';
import { DEFAULT_SYSTEM_PROMPT } from './src/constants';

// Hooks
import { useSmartClassify } from './hooks/useSmartClassify';
import { useBookmarkProcessing } from './hooks/useBookmarkProcessing';
import { useAppData } from './hooks/useAppData';
import { useApiConfig } from './hooks/useApiConfig';
import { useInstructionPresets } from './hooks/useInstructionPresets';
import { useTemplateManagement } from './hooks/useTemplateManagement';
import { useAIPlanning } from './hooks/useAIPlanning';
import { useDuplicates } from './hooks/useDuplicates';
import { useBrokenLinks } from './hooks/useBrokenLinks';
import { useImportExport } from './hooks/useImportExport';
import { useAISettings } from './hooks/useAISettings';

// Lazy load modals for better performance
const NotificationToast = lazy(() => import('./components/ui/NotificationToast'));
const UnifiedSettingsModal = lazy(() => import('./components/modals/UnifiedSettingsModal'));
const LogModal = lazy(() => import('./components/modals/LogModal'));
const AnalyticsDashboard = lazy(() => import('./components/features/AnalyticsDashboard'));

const App: React.FC = () => {
    // 1. Core Data
    const {
        bookmarks, setBookmarks,
        folders, setFolders,
        appState, setAppState,
        isLoading,
        apiConfigs, setApiConfigs,
        instructionPresets, setInstructionPresets,
        folderTemplates, setFolderTemplates,
        notifications, setNotifications,
        handleClearData
    } = useAppData();

    // 2. UI Local State
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>('root');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAnalyticsDashboardOpen, setIsAnalyticsDashboardOpen] = useState(false);
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    
    // Settings State - Persisted
    const {
        systemPrompt, setSystemPrompt,
        customInstructions, setCustomInstructions,
        batchSize, setBatchSize,
        maxRetries, setMaxRetries,
        processingMode, setProcessingMode
    } = useAISettings();

    // 3. Logic Hooks
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
        templateSettings, setTemplateSettings,
        handleSaveFolderTemplate, handleDeleteFolderTemplate, handleApplyFolderTemplate
    } = useTemplateManagement(folderTemplates, setFolderTemplates, setSystemPrompt, setNotifications);

    const {
        proposedStructure,
        planningPrompt, setPlanningPrompt,
        generateStructureSuggestion,
        confirmProposedStructure
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

    const [isGlobalSettingsModalOpen, setIsGlobalSettingsModalOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState<'providers' | 'intelligence' | 'templates' | 'data' | 'health' | 'backup' | 'config'>('providers');
    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);

    const openSettings = (tab: typeof settingsTab = 'providers') => {
        setSettingsTab(tab);
        setIsGlobalSettingsModalOpen(true);
    };

    // 4. Orchestration Logic
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

    // 5. View Logic
    const foldersWithCounts = useMemo(() => {
        const addCounts = (items: (Folder | Bookmark)[]): (Folder | Bookmark)[] => {
            if (!Array.isArray(items)) return [];
            return items.map(item => {
                if ('url' in item) {
                    return item;
                }
                const folder = item as Folder;
                const bookmarkCount = getBookmarksInFolder(folder).length;
                return {
                    ...folder,
                    bookmarkCount,
                    children: addCounts(folder.children),
                };
            });
        };
        return addCounts(folders);
    }, [folders]);

    const [filteredBookmarks, setFilteredBookmarks] = useState<Bookmark[]>([]);

    useEffect(() => {
        let isMounted = true;
        const performSearch = () => {
            if (!searchQuery.trim()) {
                if (isMounted) setFilteredBookmarks([]);
                return;
            }

            // Perform search
            const lowercasedQuery = searchQuery.toLowerCase();
            const results = bookmarks.filter(bm =>
                bm.title.toLowerCase().includes(lowercasedQuery) ||
                bm.url.toLowerCase().includes(lowercasedQuery)
            );

            if (isMounted) {
                setFilteredBookmarks(results);
            }
        };

        performSearch();

        return () => {
            isMounted = false;
        };
    }, [searchQuery, bookmarks]);

    const selectedFolder = selectedFolderId === 'root' 
        ? { id: 'root', name: 'Tất cả Bookmarks', children: [], parentId: null } 
        : findFolder(folders, selectedFolderId);

    const displayedBookmarks = selectedFolderId === 'root'
        ? bookmarks
        : getBookmarksInFolder(selectedFolder);

    if (isLoading) {
        return (
            <div className="flex h-screen w-full bg-[#1E2127] items-center justify-center">
                <p className="text-white text-lg">Đang tải dữ liệu...</p>
            </div>
        );
    }
    
    const isSearching = searchQuery.trim() !== '';
    const bookmarksToDisplay = isSearching ? filteredBookmarks : displayedBookmarks;
    const listTitle = isSearching
        ? `Kết quả tìm kiếm cho "${searchQuery}"`
        : (selectedFolder?.name || 'Tất cả Bookmarks');
    const noBookmarksMessage = isSearching
        ? `Không tìm thấy kết quả nào cho "${searchQuery}".`
        : 'Không có bookmark nào trong thư mục này.';

    return (
        <div className="flex h-screen w-full bg-[#1E2127] text-gray-300 font-sans">
            <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="text-white">Đang tải...</div></div>}>
                {isGlobalSettingsModalOpen && (
                    <UnifiedSettingsModal
                        isOpen={isGlobalSettingsModalOpen}
                        onClose={() => setIsGlobalSettingsModalOpen(false)}
                        initialTab={settingsTab}
                        
                        // AI & Providers
                        apiConfigs={apiConfigs}
                        onSaveApiConfig={handleSaveApiConfig}
                        onDeleteApiConfig={handleDeleteApiConfig}
                        onToggleApiConfigStatus={handleToggleApiConfigStatus}
                        
                        // Intelligence
                        systemPrompt={systemPrompt}
                        onSystemPromptChange={setSystemPrompt}
                        planningPrompt={planningPrompt}
                        onPlanningPromptChange={setPlanningPrompt}
                        customInstructions={customInstructions}
                        onCustomInstructionsChange={setCustomInstructions}
                        instructionPresets={instructionPresets}
                        onSaveInstructionPreset={handleSaveInstructionPreset}
                        onDeleteInstructionPreset={handleDeleteInstructionPreset}
                        smartClassifyRules={smartClassifyRules}
                        onSaveSmartRule={handleSaveSmartRule}
                        onDeleteSmartRule={handleDeleteSmartRule}
                        
                        // Templates
                        folderTemplates={folderTemplates}
                        onSaveFolderTemplate={handleSaveFolderTemplate}
                        onDeleteFolderTemplate={handleDeleteFolderTemplate}
                        onApplyFolderTemplate={handleApplyFolderTemplate}
                        selectedTemplateId={templateSettings.selectedTemplateId}
                        onSelectedTemplateChange={(id) => setTemplateSettings(prev => ({ ...prev, selectedTemplateId: id }))}
                        
                        // Performance
                        batchSize={batchSize}
                        onBatchSizeChange={setBatchSize}
                        maxRetries={maxRetries}
                        onMaxRetriesChange={setMaxRetries}
                        processingMode={processingMode}
                        onProcessingModeChange={setProcessingMode}
                        
                        // Data Management
                        bookmarks={bookmarks}
                        folders={folders}
                        onImport={processImport}
                        onExport={handleExportBookmarks}
                        onClearData={handleClearData}
                        importFile={importFile}
                        previewBookmarks={previewBookmarks}
                        onFileSelect={handleFileSelect}
                        
                        // Health
                        duplicateStats={duplicateStats}
                        onCleanDuplicates={handleCleanDuplicates}
                        brokenLinks={brokenLinks}
                        brokenLinkCheckState={brokenLinkCheckState}
                        brokenLinkCheckProgress={brokenLinkCheckProgress}
                        onStartBrokenLinkCheck={handleStartBrokenLinkCheck}
                        onCleanBrokenLinks={handleCleanBrokenLinks}
                        
                        // Cloud
                        onUploadCloudData={handleUploadData}
                        onImportCloudData={handleImportData}
                    />
                )}
                {isLogModalOpen && (
                    <LogModal
                        logs={detailedLogs}
                        onClose={() => setIsLogModalOpen(false)}
                    />
                )}
                {isAnalyticsDashboardOpen && (
                    <AnalyticsDashboard
                        bookmarks={bookmarks}
                        folders={folders}
                        onClose={() => setIsAnalyticsDashboardOpen(false)}
                    />
                )}


            </Suspense>
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
                        folders={foldersWithCounts as Folder[]}
                        selectedFolderId={selectedFolderId}
                        onSelectFolder={setSelectedFolderId}
                        onClearData={handleClearData}
                        onImport={() => openSettings('data')}
                        onExport={() => openSettings('data')}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        totalBookmarks={bookmarks.length}
                        duplicateCount={duplicateStats.count}
                        onOpenDuplicateModal={() => openSettings('health')}
                        onStartBrokenLinkCheck={handleStartBrokenLinkCheck}
                        brokenLinkCheckState={brokenLinkCheckState}
                        brokenLinkCheckProgress={brokenLinkCheckProgress}
                    />

                    <div className="flex-1 flex flex-col min-w-0">
                        <header className="flex items-center justify-between p-4 border-b border-gray-700/50 flex-shrink-0">
                            <h1 className="text-lg font-bold text-white flex items-center">
                                <AILogoIcon className="w-6 h-6 mr-3 text-emerald-400" />
                                AI Bookmark Architect
                            </h1>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => openSettings('backup')}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
                                    title="Upload dữ liệu"
                                >
                                    <UploadIcon className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => openSettings('data')}
                                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors"
                                    title="Import dữ liệu"
                                >
                                    <ImportIcon className="w-4 h-4" />
                                </button>

                                <button
                                    onClick={() => setIsAnalyticsDashboardOpen(true)}
                                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-md transition-colors"
                                    title="Xem phân tích dữ liệu"
                                >
                                    <ChartIcon className="w-4 h-4" />
                                </button>
                                <button className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600"></button>
                                <button className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600"></button>
                                <button className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600"></button>
                            </div>
                        </header>
                       
                        {appState === AppState.EMPTY && <FileDropzone onFileLoaded={handleFileLoaded} />}

                        {(appState !== AppState.EMPTY) && (
                            <div className="flex flex-1 min-h-0">
                                <BookmarkList
                                    bookmarks={bookmarksToDisplay}
                                    folderName={listTitle}
                                    noBookmarksMessage={noBookmarksMessage}
                                />
                                <RestructurePanel
                                    appState={appState}
                                    progress={{
                                        current: allCategorizedBookmarks.length > 0 ? allCategorizedBookmarks.length : progress.current,
                                        total: bookmarks.length > 0 ? bookmarks.length : progress.total,
                                    }}
                                    logs={logs}
                                    errorDetails={errorDetails}
                                    apiConfigs={apiConfigs}
                                    systemPrompt={systemPrompt}
                                    onSystemPromptChange={setSystemPrompt}
                                    sessionTokenUsage={sessionTokenUsage}
                                    customInstructions={customInstructions}
                                    batchSize={batchSize}
                                    maxRetries={maxRetries}
                                    processingMode={processingMode}
                                    hasPartialResults={allCategorizedBookmarks.length > 0}
                                    folderTemplates={folderTemplates}
                                    selectedTemplateId={templateSettings.selectedTemplateId}
                                    onStart={() => startRestructuring(false)}
                                    onStop={handleStopRestructuring}
                                    onForceStop={handleForceStopWrapper}
                                    onApply={applyChanges}
                                    onDiscard={discardChanges}
                                    onContinue={continueRestructuring}
                                    onOpenApiModal={() => openSettings('providers')}
                                    onOpenLogModal={() => setIsLogModalOpen(true)}
                                    onOpenInstructionPresetModal={() => openSettings('intelligence')}
                                    onOpenFolderTemplateModal={() => openSettings('templates')}
                                    onCustomInstructionsChange={setCustomInstructions}
                                    onBatchSizeChange={setBatchSize}
                                    onMaxRetriesChange={setMaxRetries}
                                    onProcessingModeChange={setProcessingMode}
                                    onApplyFolderTemplate={handleApplyFolderTemplate}
                                    onSelectedTemplateChange={(templateId) => {
                                        setTemplateSettings(prev => ({ ...prev, selectedTemplateId: templateId }));
                                        // If no template selected, revert to default system prompt
                                        if (!templateId) {
                                            setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
                                        }
                                    }}
                                    onSuggestStructure={generateStructureSuggestion}
                                    onConfirmProposedStructure={confirmProposedStructure}
                                    proposedStructure={proposedStructure}
                                    isGeneratingStructure={isGeneratingStructure}
                                    planningPrompt={planningPrompt}
                                    onPlanningPromptChange={setPlanningPrompt}
                                    onOpenAIConfigModal={() => setIsGlobalSettingsModalOpen(true)}
                                    sessionRules={sessionRules}
                                    onSessionRulesChange={setSessionRules}
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
