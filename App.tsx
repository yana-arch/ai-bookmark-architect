import React from 'react';

import { AppState } from './types';
import Sidebar from './src/components/layout/Sidebar';
import BookmarkList from './src/components/features/BookmarkList';
import RestructurePanel from './src/components/features/RestructurePanel';
import FileDropzone from './src/components/ui/FileDropzone';
import Header from './src/components/layout/Header';
import AppModals from './src/components/layout/AppModals';
import NotificationToast from './src/components/ui/NotificationToast';
import { ErrorBoundary } from './src/components/features/ErrorBoundary';

import { useAppLogic } from './src/hooks/useAppLogic';
import { useAuth } from './src/hooks/useAuth';

const App: React.FC = () => {
    const {
        context,
        ui,
        processing,
        planning,
        duplicates,
        brokenLinks,
        importExport,
        stats,
        orchestration
    } = useAppLogic();

    const { isLoading: isAuthLoading } = useAuth();

    if (context.isLoading || isAuthLoading) {
        return (
            <div className="flex h-screen w-full bg-[#1E2127] items-center justify-center">
                <div className="flex flex-col items-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400"></div>
                    <p className="text-gray-400 text-lg font-medium animate-pulse">Initializing Architecture...</p>
                </div>
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <div className="flex h-screen w-full bg-[#1E2127] text-gray-300 font-sans">
                <AppModals 
                isGlobalSettingsModalOpen={ui.isGlobalSettingsModalOpen}
                setIsGlobalSettingsModalOpen={ui.setIsGlobalSettingsModalOpen}
                isAuthModalOpen={ui.isAuthModalOpen}
                setIsAuthModalOpen={ui.setIsAuthModalOpen}
                settingsTab={ui.settingsTab}
                processImport={importExport.processImport}
                handleExportBookmarks={importExport.handleExportBookmarks}
                importFile={importExport.importFile}
                previewBookmarks={importExport.previewBookmarks}
                handleFileSelect={importExport.handleFileSelect}
                duplicateStats={duplicates.duplicateStats}
                handleCleanDuplicates={duplicates.handleCleanDuplicates}
                brokenLinks={brokenLinks.brokenLinks}
                brokenLinkCheckState={brokenLinks.brokenLinkCheckState}
                brokenLinkCheckProgress={brokenLinks.brokenLinkCheckProgress}
                handleStartBrokenLinkCheck={brokenLinks.handleStartBrokenLinkCheck}
                handleCleanBrokenLinks={brokenLinks.handleCleanBrokenLinks}
                handleUploadData={importExport.handleUploadData}
                handleImportData={importExport.handleImportData}
                handleDeleteBackup={importExport.handleDeleteBackup}
                isLogModalOpen={ui.isLogModalOpen}
                setIsLogModalOpen={ui.setIsLogModalOpen}
                detailedLogs={processing.detailedLogs}
                isAnalyticsDashboardOpen={ui.isAnalyticsDashboardOpen}
                setIsAnalyticsDashboardOpen={ui.setIsAnalyticsDashboardOpen}
                planningPrompt={planning.planningPrompt}
                onPlanningPromptChange={planning.setPlanningPrompt}
            />
            
            <div className="fixed bottom-4 right-4 z-50 space-y-2">
                {context.notifications.map((notification, index) => (
                    <NotificationToast
                        key={notification.id}
                        id={notification.id}
                        message={notification.message}
                        type={notification.type}
                        duration={notification.duration}
                        action={notification.action}
                        index={index}
                        onDismiss={ui.handleDismissNotification}
                    />
                ))}
            </div>
            
            <div className="w-full max-w-10xl mx-auto flex h-full p-4">
                <main className="flex flex-1 bg-[#282C34] rounded-xl shadow-2xl overflow-hidden">
                    <Sidebar
                        selectedFolderId={ui.selectedFolderId}
                        onSelectFolder={ui.setSelectedFolderId}
                        onImport={() => ui.openSettings('data')}
                        onExport={() => ui.openSettings('data')}
                        duplicateCount={duplicates.duplicateStats.count}
                        onOpenDuplicateModal={() => ui.openSettings('health')}
                        onStartBrokenLinkCheck={brokenLinks.handleStartBrokenLinkCheck}
                        brokenLinkCheckState={brokenLinks.brokenLinkCheckState}
                        brokenLinkCheckProgress={brokenLinks.brokenLinkCheckProgress}
                    />

                    <div className="flex-1 flex flex-col min-w-0">
                        <Header 
                            onOpenBackup={() => ui.openSettings('backup')}
                            onOpenData={() => ui.openSettings('data')}
                            onOpenAnalytics={() => ui.setIsAnalyticsDashboardOpen(true)}
                            onOpenSettings={() => ui.setIsGlobalSettingsModalOpen(true)}
                            onOpenAuth={() => ui.setIsAuthModalOpen(true)}
                        />
                       
                        {context.appState === AppState.EMPTY && <FileDropzone onFileLoaded={importExport.handleFileLoaded} />}

                        {(context.appState !== AppState.EMPTY) && (
                            <div className="flex flex-1 min-h-0">
                                <BookmarkList
                                    bookmarks={ui.bookmarksToDisplay}
                                    folderName={ui.listTitle}
                                    noBookmarksMessage={ui.bookmarksToDisplay.length === 0 ? 'Không có bookmark nào.' : ''}
                                />
                                <RestructurePanel
                                    onStart={() => orchestration.startRestructuring(false)}
                                    onStop={processing.stopProcessing}
                                    onForceStop={processing.forceStop}
                                    onApply={orchestration.applyChanges}
                                    onDiscard={orchestration.discardChanges}
                                    onContinue={orchestration.continueRestructuring}
                                    onOpenLogModal={() => ui.setIsLogModalOpen(true)}
                                    onSuggestStructure={planning.generateStructureSuggestion}
                                    onConfirmProposedStructure={planning.confirmProposedStructure}
                                    proposedStructure={planning.proposedStructure}
                                    isGeneratingStructure={processing.isProcessing}
                                    onOpenAIConfigModal={() => ui.openSettings('providers')}
                                    onRestructureMissing={orchestration.restructureMissingBookmarks}
                                    sessionRules={context.sessionRules}
                                    onSessionRulesChange={context.setSessionRules}
                                    progress={{
                                        current: processing.processedBookmarks.length > 0 ? processing.processedBookmarks.length : processing.progress.current,
                                        total: context.bookmarks.length > 0 ? context.bookmarks.length : processing.progress.total,
                                    }}
                                    logs={processing.logs}
                                    errorDetails={processing.errorDetails}
                                    sessionTokenUsage={processing.sessionTokenUsage}
                                    hasPartialResults={processing.processedBookmarks.length > 0}
                                />
                            </div>
                        )}
                    </div>
                </main>
                </div>
            </div>
        </ErrorBoundary>
    );
};

export default App;
