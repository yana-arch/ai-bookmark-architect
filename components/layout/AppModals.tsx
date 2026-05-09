import React, { Suspense, lazy } from 'react';
import { useApp } from '../../src/context/AppContext';
import { removeEmptyFolders } from '../../src/utils/treeUtils';
import type {
    ApiConfig,
    ApiKeyStatus,
    InstructionPreset,
    SmartClassifyRule,
    FolderTemplate,
    TemplateSettings,
    ArchitectureStyle,
    DetailedLog,
    Notification,
    DuplicateStats,
    ExportOptions,
    Bookmark
} from '../../types';

const UnifiedSettingsModal = lazy(() => import('../modals/UnifiedSettingsModal'));
const LogModal = lazy(() => import('../modals/LogModal'));
const AnalyticsDashboard = lazy(() => import('../features/AnalyticsDashboard'));

interface AppModalsProps {
    isGlobalSettingsModalOpen: boolean;
    setIsGlobalSettingsModalOpen: (open: boolean) => void;
    settingsTab: 'providers' | 'intelligence' | 'templates' | 'data' | 'health' | 'backup' | 'config';

    // Logic for other modals that might not be in AppContext yet or specific to App UI
    isLogModalOpen: boolean;
    setIsLogModalOpen: (open: boolean) => void;
    detailedLogs: DetailedLog[];
    isAnalyticsDashboardOpen: boolean;
    setIsAnalyticsDashboardOpen: (open: boolean) => void;

    // Callbacks that are specific to App orchestration or not yet in context
    processImport: (mode: 'merge' | 'overwrite') => void;
    handleExportBookmarks: (options: ExportOptions) => void;
    importFile: File | null;
    previewBookmarks: Bookmark[];
    handleFileSelect: (file: File | null) => void;
    duplicateStats: DuplicateStats;
    handleCleanDuplicates: () => void;
    brokenLinks: Bookmark[];

    brokenLinkCheckState: 'idle' | 'checking' | 'completed' | 'error';
    brokenLinkCheckProgress: number;
    handleStartBrokenLinkCheck: () => void;
    handleCleanBrokenLinks: () => void;
    handleUploadData: (key: string) => Promise<void>;
    handleImportData: (key: string) => Promise<void>;
    planningPrompt?: string;
    onPlanningPromptChange?: (prompt: string) => void;
}

const AppModals: React.FC<AppModalsProps> = (props) => {
    const {
        bookmarks,
        folders, setFolders,
        apiConfigs,
        instructionPresets,
        folderTemplates,
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
        handleClearData,
        handleSaveApiConfig,
        handleDeleteApiConfig,
        handleToggleApiConfigStatus,
        handleSaveInstructionPreset,
        handleDeleteInstructionPreset,
        handleSaveSmartRule,
        handleDeleteSmartRule,
        handleSaveFolderTemplate,
        handleDeleteFolderTemplate,
        handleApplyFolderTemplate,
        templateSettings,
        setTemplateSettings,
        selectedArchitectureStyle,
        handleArchitectureStyleChange,
        aiProfiles,
        activeProfileId,
        setActiveProfileId,
        handleSaveProfile,
        handleDeleteProfile
    } = useApp();

    const handleManualCleanup = () => {
        const cleaned = removeEmptyFolders(folders);
        setFolders(cleaned);
    };

    return (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="text-white">Đang tải...</div></div>}>
            {props.isGlobalSettingsModalOpen && (
                <UnifiedSettingsModal
                    isOpen={props.isGlobalSettingsModalOpen}
                    onClose={() => props.setIsGlobalSettingsModalOpen(false)}
                    initialTab={props.settingsTab}

                    // AI & Providers
                    apiConfigs={apiConfigs}
                    onSaveApiConfig={handleSaveApiConfig}
                    onDeleteApiConfig={handleDeleteApiConfig}
                    onToggleApiConfigStatus={handleToggleApiConfigStatus}

                    // Intelligence
                    systemPrompt={systemPrompt}
                    onSystemPromptChange={setSystemPrompt}
                    planningPrompt={props.planningPrompt || ''}
                    onPlanningPromptChange={props.onPlanningPromptChange || (() => { })}
                    customInstructions={customInstructions}
                    onCustomInstructionsChange={setCustomInstructions}
                    instructionPresets={instructionPresets}
                    onSaveInstructionPreset={handleSaveInstructionPreset}
                    onDeleteInstructionPreset={handleDeleteInstructionPreset}
                    smartClassifyRules={smartClassifyRules}
                    onSaveSmartRule={handleSaveSmartRule}
                    onDeleteSmartRule={handleDeleteSmartRule}

                    // AI Profiles
                    aiProfiles={aiProfiles}
                    activeProfileId={activeProfileId}
                    setActiveProfileId={setActiveProfileId}
                    onSaveProfile={handleSaveProfile}
                    onDeleteProfile={handleDeleteProfile}

                    // Templates
                    folderTemplates={folderTemplates}
                    onSaveFolderTemplate={handleSaveFolderTemplate}
                    onDeleteFolderTemplate={handleDeleteFolderTemplate}
                    onApplyFolderTemplate={handleApplyFolderTemplate}
                    selectedTemplateId={templateSettings.selectedTemplateId}
                    onSelectedTemplateChange={(id) => setTemplateSettings((prev: TemplateSettings) => ({ ...prev, selectedTemplateId: id }))}

                    // Performance
                    batchSize={batchSize}
                    onBatchSizeChange={setBatchSize}
                    maxRetries={maxRetries}
                    onMaxRetriesChange={setMaxRetries}
                    processingMode={processingMode}
                    onProcessingModeChange={setProcessingMode}
                    tagDrivenMode={tagDrivenMode}
                    onTagDrivenModeChange={setTagDrivenMode}
                    tagCount={tagCount}
                    onTagCountChange={setTagCount}
                    tagLanguage={tagLanguage}
                    onTagLanguageChange={setTagLanguage}
                    autoCleanupEmptyFolders={autoCleanupEmptyFolders}
                    onAutoCleanupChange={setAutoCleanupEmptyFolders}
                    onCleanupEmptyFolders={handleManualCleanup}

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
                    selectedArchitectureStyle={selectedArchitectureStyle}
                    onArchitectureStyleChange={handleArchitectureStyleChange}

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
