import React, { Suspense, lazy } from 'react';
import { useApp } from '../../src/context/AppContext';

const UnifiedSettingsModal = lazy(() => import('../modals/UnifiedSettingsModal'));
const LogModal = lazy(() => import('../modals/LogModal'));
const AnalyticsDashboard = lazy(() => import('../features/AnalyticsDashboard'));

interface AppModalsProps {
    isGlobalSettingsModalOpen: boolean;
    setIsGlobalSettingsModalOpen: (open: boolean) => void;
    settingsTab: any;
    
    // Logic for other modals that might not be in AppContext yet or specific to App UI
    isLogModalOpen: boolean;
    setIsLogModalOpen: (open: boolean) => void;
    detailedLogs: any[];
    isAnalyticsDashboardOpen: boolean;
    setIsAnalyticsDashboardOpen: (open: boolean) => void;

    // Callbacks that might be specific to App orchestration
    handleSaveApiConfig: any;
    handleDeleteApiConfig: any;
    handleToggleApiConfigStatus: any;
    handleSaveInstructionPreset: any;
    handleDeleteInstructionPreset: any;
    handleSaveSmartRule: any;
    handleDeleteSmartRule: any;
    handleSaveFolderTemplate: any;
    handleDeleteFolderTemplate: any;
    handleApplyFolderTemplate: any;
    templateSettings: any;
    setTemplateSettings: any;
    processImport: any;
    handleExportBookmarks: any;
    importFile: any;
    previewBookmarks: any;
    handleFileSelect: any;
    duplicateStats: any;
    handleCleanDuplicates: any;
    brokenLinks: any;
    brokenLinkCheckState: any;
    brokenLinkCheckProgress: any;
    handleStartBrokenLinkCheck: any;
    handleCleanBrokenLinks: any;
    selectedArchitectureStyle: any;
    handleArchitectureStyleChange: any;
    handleUploadData: any;
    handleImportData: any;
}

const AppModals: React.FC<AppModalsProps> = (props) => {
    const {
        bookmarks,
        folders,
        apiConfigs,
        instructionPresets,
        folderTemplates,
        systemPrompt, setSystemPrompt,
        planningPrompt, // Not in context yet, but let's assume it's passed or in another context
        customInstructions, setCustomInstructions,
        batchSize, setBatchSize,
        maxRetries, setMaxRetries,
        processingMode, setProcessingMode,
        handleClearData
    } = useApp();

    return (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="text-white">Đang tải...</div></div>}>
            {props.isGlobalSettingsModalOpen && (
                <UnifiedSettingsModal
                    isOpen={props.isGlobalSettingsModalOpen}
                    onClose={() => props.setIsGlobalSettingsModalOpen(false)}
                    initialTab={props.settingsTab}
                    
                    // AI & Providers
                    apiConfigs={apiConfigs}
                    onSaveApiConfig={props.handleSaveApiConfig}
                    onDeleteApiConfig={props.handleDeleteApiConfig}
                    onToggleApiConfigStatus={props.handleToggleApiConfigStatus}
                    
                    // Intelligence
                    systemPrompt={systemPrompt}
                    onSystemPromptChange={setSystemPrompt}
                    planningPrompt={props.planningPrompt || ''} // Fallback if not provided
                    onPlanningPromptChange={() => {}} // Placeholder or pass from props
                    customInstructions={customInstructions}
                    onCustomInstructionsChange={setCustomInstructions}
                    instructionPresets={instructionPresets}
                    onSaveInstructionPreset={props.handleSaveInstructionPreset}
                    onDeleteInstructionPreset={props.handleDeleteInstructionPreset}
                    smartClassifyRules={[]} // smartClassifyRules not in context yet
                    onSaveSmartRule={props.handleSaveSmartRule}
                    onDeleteSmartRule={props.handleDeleteSmartRule}
                    
                    // Templates
                    folderTemplates={folderTemplates}
                    onSaveFolderTemplate={props.handleSaveFolderTemplate}
                    onDeleteFolderTemplate={props.handleDeleteFolderTemplate}
                    onApplyFolderTemplate={props.handleApplyFolderTemplate}
                    selectedTemplateId={props.templateSettings.selectedTemplateId}
                    onSelectedTemplateChange={(id) => props.setTemplateSettings((prev: any) => ({ ...prev, selectedTemplateId: id }))}
                    
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
                    onImport={props.processImport}
                    onExport={props.handleExportBookmarks}
                    onClearData={handleClearData}
                    importFile={props.importFile}
                    previewBookmarks={props.previewBookmarks}
                    onFileSelect={props.handleFileSelect}
                    
                    // Health
                    duplicateStats={props.duplicateStats}
                    onCleanDuplicates={props.handleCleanDuplicates}
                    brokenLinks={props.brokenLinks}
                    brokenLinkCheckState={props.brokenLinkCheckState}
                    brokenLinkCheckProgress={props.brokenLinkCheckProgress}
                    onStartBrokenLinkCheck={props.handleStartBrokenLinkCheck}
                    onCleanBrokenLinks={props.handleCleanBrokenLinks}
                    
                    // Architecture
                    selectedArchitectureStyle={props.selectedArchitectureStyle}
                    onArchitectureStyleChange={props.handleArchitectureStyleChange}
                    
                    // Cloud
                    onUploadCloudData={props.handleUploadData}
                    onImportCloudData={props.handleImportData}
                />
            )}
            {props.isLogModalOpen && (
                <LogModal
                    logs={props.detailedLogs}
                    onClose={() => props.setIsLogModalOpen(false)}
                />
            )}
            {props.isAnalyticsDashboardOpen && (
                <AnalyticsDashboard
                    bookmarks={bookmarks}
                    folders={folders}
                    onClose={() => props.setIsAnalyticsDashboardOpen(false)}
                />
            )}
        </Suspense>
    );
};

export default AppModals;
