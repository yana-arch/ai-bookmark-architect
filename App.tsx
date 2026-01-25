import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';

import { AILogoIcon, ChartIcon, UploadIcon, ImportIcon } from './components/Icons';
import { AppState, Folder, Bookmark, CategorizedBookmark } from './types';
import Sidebar from './components/Sidebar';
import BookmarkList from './components/BookmarkList';
import RestructurePanel from './components/RestructurePanel';
import FileDropzone from './components/FileDropzone';
import * as db from './db';
import { searchCache, cacheKeys, generateHash } from './src/cache';
import { perfMonitor } from './src/performance';
import { findFolder, getBookmarksInFolder } from './src/utils';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_PLANNING_PROMPT } from './src/constants';

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

// Lazy load modals for better performance
const ImportModal = lazy(() => import('./components/ImportModal'));
const ExportModal = lazy(() => import('./components/ExportModal'));
const ApiConfigModal = lazy(() => import('./components/ApiConfigModal'));
const LogModal = lazy(() => import('./components/LogModal'));
const DuplicateModal = lazy(() => import('./components/DuplicateModal'));
const BrokenLinkModal = lazy(() => import('./components/BrokenLinkModal'));
const InstructionPresetModal = lazy(() => import('./components/InstructionPresetModal'));
const FolderTemplateModal = lazy(() => import('./components/FolderTemplateModal'));
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));
const KeyInputModal = lazy(() => import('./components/KeyInputModal'));
const NotificationToast = lazy(() => import('./components/NotificationToast'));
const AIConfigSettingsModal = lazy(() => import('./components/AIConfigSettingsModal'));

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
    
    // Settings State
    const [systemPrompt, setSystemPrompt] = useState<string>(DEFAULT_SYSTEM_PROMPT);
    const [customInstructions, setCustomInstructions] = useState<string>('');
    const [batchSize, setBatchSize] = useState(5);
    const [maxRetries, setMaxRetries] = useState(2);
    const [processingMode, setProcessingMode] = useState<'single' | 'multi'>('multi');

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
        onNotificationsAdd: (n) => setNotifications(prev => [...prev, n])
    });

    const {
        isApiModalOpen, setIsApiModalOpen,
        handleSaveApiConfig, handleDeleteApiConfig, handleToggleApiConfigStatus
    } = useApiConfig(apiConfigs, setApiConfigs);

    const {
        isInstructionPresetModalOpen, setIsInstructionPresetModalOpen,
        handleSaveInstructionPreset, handleDeleteInstructionPreset, handleSelectPreset
    } = useInstructionPresets(instructionPresets, setInstructionPresets, setCustomInstructions);

    const {
        isFolderTemplateModalOpen, setIsFolderTemplateModalOpen,
        templateSettings, setTemplateSettings,
        handleSaveFolderTemplate, handleDeleteFolderTemplate, handleApplyFolderTemplate
    } = useTemplateManagement(folderTemplates, setFolderTemplates, setSystemPrompt, setNotifications);

    const {
        isPlanning,
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
        handleFileLoaded
    } = useImportExport(bookmarks, folders, setBookmarks, setFolders, setAppState, setNotifications);

    const [isAIConfigModalOpen, setIsAIConfigModalOpen] = useState(false);

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
           const finalBookmarks = bookmarks.map(bm => {
           const categorized = allCategorizedBookmarks.find(cb => cb.url === bm.url);
           return { ...bm, ...categorized }; // merge path and tags
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

    const filteredBookmarks = useMemo(() => {
        if (!searchQuery.trim()) {
            return [];
        }

        const bookmarksHash = generateHash(bookmarks);
        const cacheKey = cacheKeys.searchResults(searchQuery, bookmarksHash);

        // Try to get from cache first
        const cached = searchCache.get(cacheKey);
        if (cached) {
            return cached;
        }

        // Perform search
        const lowercasedQuery = searchQuery.toLowerCase();
        const results = bookmarks.filter(bm =>
            bm.title.toLowerCase().includes(lowercasedQuery) ||
            bm.url.toLowerCase().includes(lowercasedQuery)
        );

        // Cache the results
        searchCache.set(cacheKey, results, 10 * 60 * 1000); // Cache for 10 minutes

        return results;
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
        : (selectedFolder?.name || "Tất cả Bookmarks");
    const noBookmarksMessage = isSearching
        ? `Không tìm thấy kết quả nào cho "${searchQuery}".`
        : "Không có bookmark nào trong thư mục này.";

    return (
        <div className="flex h-screen w-full bg-[#1E2127] text-gray-300 font-sans">
            <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="text-white">Đang tải...</div></div>}>
                {showImportModal && (
                    <ImportModal
                        fileName={importFileName}
                        previewBookmarks={previewBookmarks}
                        existingBookmarks={bookmarks}
                        onImport={processImport}
                        onCancel={() => {
                            setShowImportModal(false);
                            setImportFileName('');
                            setPreviewBookmarks([]);
                        }}
                    />
                )}
                {isApiModalOpen && (
                    <ApiConfigModal
                        onClose={() => setIsApiModalOpen(false)}
                        apiConfigs={apiConfigs}
                        onSaveApiConfig={handleSaveApiConfig}
                        onDeleteApiConfig={handleDeleteApiConfig}
                        onToggleApiConfigStatus={handleToggleApiConfigStatus}
                    />
                )}
                {isLogModalOpen && (
                    <LogModal
                        logs={detailedLogs}
                        onClose={() => setIsLogModalOpen(false)}
                    />
                )}
                {isDuplicateModalOpen && (
                    <DuplicateModal
                        stats={duplicateStats}
                        onClose={() => setIsDuplicateModalOpen(false)}
                        onClean={handleCleanDuplicates}
                    />
                )}
                {isBrokenLinkModalOpen && (
                    <BrokenLinkModal
                        brokenLinks={brokenLinks}
                        onClose={() => setIsBrokenLinkModalOpen(false)}
                        onClean={handleCleanBrokenLinks}
                    />
                )}
                {isInstructionPresetModalOpen && (
                    <InstructionPresetModal
                        isOpen={isInstructionPresetModalOpen}
                        onClose={() => setIsInstructionPresetModalOpen(false)}
                        onSave={handleSaveInstructionPreset}
                        onDelete={handleDeleteInstructionPreset}
                        presets={instructionPresets}
                    />
                )}
                {isFolderTemplateModalOpen && (
                    <FolderTemplateModal
                        isOpen={isFolderTemplateModalOpen}
                        onClose={() => setIsFolderTemplateModalOpen(false)}
                        templates={folderTemplates}
                        onSaveTemplate={handleSaveFolderTemplate}
                        onDeleteTemplate={handleDeleteFolderTemplate}
                        onApplyFolderTemplate={handleApplyFolderTemplate}
                        apiConfigs={apiConfigs}
                    />
                )}
                {isExportModalOpen && (
                    <ExportModal
                        folders={folders}
                        bookmarks={bookmarks}
                        onExport={handleExportBookmarks}
                        onCancel={() => setIsExportModalOpen(false)}
                    />
                )}
                {isAnalyticsDashboardOpen && (
                    <AnalyticsDashboard
                        bookmarks={bookmarks}
                        folders={folders}
                        onClose={() => setIsAnalyticsDashboardOpen(false)}
                    />
                )}
                {isKeyInputModalOpen && (
                    <KeyInputModal
                        isOpen={isKeyInputModalOpen}
                        onClose={() => setIsKeyInputModalOpen(false)}
                        mode={keyInputMode}
                        onSubmit={async (key) => {
                            if (keyInputMode === 'upload') {
                                // Handle upload
                                await handleUploadData(key);
                            } else {
                                // Handle import
                                await handleImportData(key);
                            }
                        }}
                    />
                )}
                {isAIConfigModalOpen && (
                    <AIConfigSettingsModal
                        isOpen={isAIConfigModalOpen}
                        onClose={() => setIsAIConfigModalOpen(false)}
                        systemPrompt={systemPrompt}
                        onSystemPromptChange={setSystemPrompt}
                        planningPrompt={planningPrompt}
                        onPlanningPromptChange={setPlanningPrompt}
                        customInstructions={customInstructions}
                        onCustomInstructionsChange={setCustomInstructions}
                        batchSize={batchSize}
                        onBatchSizeChange={setBatchSize}
                        maxRetries={maxRetries}
                        onMaxRetriesChange={setMaxRetries}
                        processingMode={processingMode}
                        onProcessingModeChange={setProcessingMode}
                        folderTemplates={folderTemplates}
                        selectedTemplateId={templateSettings.selectedTemplateId}
                        onSelectedTemplateChange={(id) => setTemplateSettings(prev => ({ ...prev, selectedTemplateId: id }))}
                        onOpenFolderTemplateModal={() => setIsFolderTemplateModalOpen(true)}
                        onOpenInstructionPresetModal={() => setIsInstructionPresetModalOpen(true)}
                        onApplyFolderTemplate={handleApplyFolderTemplate}
                        smartClassifyRules={smartClassifyRules}
                        onSaveSmartRule={handleSaveSmartRule}
                        onDeleteSmartRule={handleDeleteSmartRule}
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
                        onImport={handleImportClick}
                        onExport={() => setIsExportModalOpen(true)}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        totalBookmarks={bookmarks.length}
                        duplicateCount={duplicateStats.count}
                        onOpenDuplicateModal={() => setIsDuplicateModalOpen(true)}
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
                                    onClick={() => {
                                        setKeyInputMode('upload');
                                        setIsKeyInputModalOpen(true);
                                    }}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
                                    title="Upload dữ liệu"
                                >
                                    <UploadIcon className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        setKeyInputMode('import');
                                        setIsKeyInputModalOpen(true);
                                    }}
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
                                    onForceStop={handleForceStopRestructuring}
                                    onApply={applyChanges}
                                    onDiscard={discardChanges}
                                    onContinue={continueRestructuring}
                                    onOpenApiModal={() => setIsApiModalOpen(true)}
                                    onOpenLogModal={() => setIsLogModalOpen(true)}
                                    onOpenInstructionPresetModal={() => setIsInstructionPresetModalOpen(true)}
                                    onOpenFolderTemplateModal={() => setIsFolderTemplateModalOpen(true)}
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
                                    onOpenAIConfigModal={() => setIsAIConfigModalOpen(true)}
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
