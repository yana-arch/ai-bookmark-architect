import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { 
    Bookmark, Folder, ApiConfig, AppState as AppStateType, Notification, 
    InstructionPreset, FolderTemplate, SmartClassifyRule, CategorizedBookmark, UserCorrection,
    TemplateSettings, ArchitectureStyle, ApiKeyStatus, AIProfile, PromptModifiers
} from '@/types';

import { useAppData } from '@/src/hooks/useAppData';
import { useAISettings } from '@/src/hooks/useAISettings';
import { useSmartClassify } from '@/src/hooks/useSmartClassify';
import { useApiConfig } from '@/src/hooks/useApiConfig';
import { useInstructionPresets } from '@/src/hooks/useInstructionPresets';
import { useTemplateManagement } from '@/src/hooks/useTemplateManagement';
import { useAIProfiles } from '@/src/hooks/useAIProfiles';
import { removeEmptyFolders } from '@/src/utils/treeUtils';

// --- Data Context (Changes with user data) ---
interface DataContextType {
    bookmarks: Bookmark[];
    setBookmarks: React.Dispatch<React.SetStateAction<Bookmark[]>>;
    folders: (Folder | Bookmark)[];
    setFolders: React.Dispatch<React.SetStateAction<(Folder | Bookmark)[]>>;
    appState: AppStateType;
    setAppState: React.Dispatch<React.SetStateAction<AppStateType>>;
    isLoading: boolean;
    notifications: Notification[];
    setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
    smartClassifyRules: SmartClassifyRule[];
    sessionRules: SmartClassifyRule[];
    setSessionRules: React.Dispatch<React.SetStateAction<SmartClassifyRule[]>>;
    isLoadingRules: boolean;
    handleSaveSmartRule: (rule: SmartClassifyRule) => Promise<void>;
    handleDeleteSmartRule: (id: string) => Promise<void>;
    applySmartClassify: (bookmarksToProcess: Bookmark[], rules: SmartClassifyRule[]) => { classified: CategorizedBookmark[], remaining: Bookmark[] };
    handleClearData: () => Promise<void>;
    handleMoveBookmark: (bookmarkId: string, targetFolderId: string | 'root') => Promise<void>;
    refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// --- Config Context (Stable AI/API settings) ---
interface ConfigContextType {
    apiConfigs: ApiConfig[];
    setApiConfigs: React.Dispatch<React.SetStateAction<ApiConfig[]>>;
    instructionPresets: InstructionPreset[];
    setInstructionPresets: React.Dispatch<React.SetStateAction<InstructionPreset[]>>;
    userCorrections: UserCorrection[];
    setUserCorrections: React.Dispatch<React.SetStateAction<UserCorrection[]>>;
    systemPrompt: string;
    setSystemPrompt: (prompt: string | ((prev: string) => string)) => void;
    customInstructions: string;
    setCustomInstructions: (inst: string) => void;
    aiProfiles: AIProfile[];
    setAiProfiles: React.Dispatch<React.SetStateAction<AIProfile[]>>;
    activeProfile: AIProfile | null;
    activeProfileId: string | null;
    setActiveProfileId: React.Dispatch<React.SetStateAction<string | null>>;
    handleSaveProfile: (profile: AIProfile) => Promise<void>;
    handleDeleteProfile: (id: string) => Promise<void>;
    batchSize: number;
    setBatchSize: (size: number) => void;
    maxRetries: number;
    setMaxRetries: (retries: number) => void;
    processingMode: 'parallel' | 'sequential';
    setProcessingMode: (mode: 'parallel' | 'sequential') => void;
    tagDrivenMode: boolean;
    setTagDrivenMode: (enabled: boolean) => void;
    tagCount: number;
    setTagCount: (count: number) => void;
    tagLanguage: string;
    setTagLanguage: (lang: string) => void;
    promptModifiers: PromptModifiers;
    setPromptModifiers: React.Dispatch<React.SetStateAction<PromptModifiers>>;
    autoCleanupEmptyFolders: boolean;
    setAutoCleanupEmptyFolders: (cleanup: boolean) => void;
    isApiModalOpen: boolean;
    setIsApiModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    handleSaveApiConfig: (config: ApiConfig) => Promise<void>;
    handleDeleteApiConfig: (id: string) => Promise<void>;
    handleToggleApiConfigStatus: (id: string, status: ApiKeyStatus) => Promise<void>;
    isInstructionPresetModalOpen: boolean;
    setIsInstructionPresetModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    selectedPresetId: string | null;
    setSelectedPresetId: React.Dispatch<React.SetStateAction<string | null>>;
    handleSaveInstructionPreset: (preset: InstructionPreset) => Promise<void>;
    handleDeleteInstructionPreset: (id: string) => Promise<void>;
    handleSelectPreset: (id: string | null) => void;
    isFolderTemplateModalOpen: boolean;
    setIsFolderTemplateModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    templateSettings: TemplateSettings;
    setTemplateSettings: React.Dispatch<React.SetStateAction<TemplateSettings>>;
    selectedArchitectureStyle: ArchitectureStyle;
    handleArchitectureStyleChange: (style: ArchitectureStyle) => void;
    handleSaveFolderTemplate: (template: FolderTemplate) => Promise<void>;
    handleDeleteFolderTemplate: (id: string) => Promise<void>;
    handleApplyFolderTemplate: (template: FolderTemplate) => Promise<void>;
    handleTemplateSettingsChange: (settings: Partial<TemplateSettings>) => void;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

// --- UI Context (Local view state) ---
interface UIContextType {
    selectedFolderId: string | null;
    setSelectedFolderId: React.Dispatch<React.SetStateAction<string | null>>;
    isAnalyticsDashboardOpen: boolean;
    setIsAnalyticsDashboardOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isLogModalOpen: boolean;
    setIsLogModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isGlobalSettingsModalOpen: boolean;
    setIsGlobalSettingsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    settingsTab: 'providers' | 'intelligence' | 'templates' | 'data' | 'health' | 'backup' | 'config';
    setSettingsTab: React.Dispatch<React.SetStateAction<'providers' | 'intelligence' | 'templates' | 'data' | 'health' | 'backup' | 'config'>>;
    openSettings: (tab?: 'providers' | 'intelligence' | 'templates' | 'data' | 'health' | 'backup' | 'config') => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const appData = useAppData();
    const aiSettings = useAISettings();
    const smartClassify = useSmartClassify();

    const apiConfig = useApiConfig(appData.apiConfigs, appData.setApiConfigs);
    const instructionPresets = useInstructionPresets(appData.instructionPresets, appData.setInstructionPresets, aiSettings.setCustomInstructions);
    const templateManagement = useTemplateManagement(
        appData.folderTemplates,
        appData.setFolderTemplates,
        aiSettings.setSystemPrompt,
        appData.setNotifications,
        aiSettings.tagDrivenMode
    );

    const aiProfilesLogic = useAIProfiles(appData.aiProfiles, appData.setAiProfiles, appData.setNotifications);

    // UI state lifted into context so App.tsx stays thin
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>('root');
    const [isAnalyticsDashboardOpen, setIsAnalyticsDashboardOpen] = useState(false);
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [isGlobalSettingsModalOpen, setIsGlobalSettingsModalOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState<UIContextType['settingsTab']>('providers');

    const openSettings = useCallback((tab: UIContextType['settingsTab'] = 'providers') => {
        setSettingsTab(tab);
        setIsGlobalSettingsModalOpen(true);
    }, []);

    useEffect(() => {
        if (aiSettings.autoCleanupEmptyFolders && appData.folders.length > 0) {
            appData.setFolders(prev => removeEmptyFolders(prev));
        }
    }, [aiSettings.autoCleanupEmptyFolders, appData.folders, appData.setFolders]);

    const dataValue: DataContextType = {
        bookmarks: appData.bookmarks,
        setBookmarks: appData.setBookmarks,
        folders: appData.folders,
        setFolders: appData.setFolders,
        appState: appData.appState,
        setAppState: appData.setAppState,
        isLoading: appData.isLoading,
        notifications: appData.notifications,
        setNotifications: appData.setNotifications,
        smartClassifyRules: smartClassify.smartClassifyRules,
        sessionRules: smartClassify.sessionRules,
        setSessionRules: smartClassify.setSessionRules,
        isLoadingRules: smartClassify.isLoadingRules,
        handleSaveSmartRule: smartClassify.saveRule,
        handleDeleteSmartRule: smartClassify.deleteRule,
        applySmartClassify: smartClassify.applySmartClassify,
        handleClearData: appData.handleClearData,
        handleMoveBookmark: appData.handleMoveBookmark,
        refreshData: appData.refreshData,
    };

    const configValue: ConfigContextType = {
        apiConfigs: appData.apiConfigs,
        setApiConfigs: appData.setApiConfigs,
        instructionPresets: appData.instructionPresets,
        setInstructionPresets: appData.setInstructionPresets,
        userCorrections: appData.userCorrections,
        setUserCorrections: appData.setUserCorrections,
        ...aiSettings,
        aiProfiles: appData.aiProfiles,
        setAiProfiles: appData.setAiProfiles,
        activeProfile: aiProfilesLogic.activeProfile,
        activeProfileId: aiProfilesLogic.activeProfileId,
        setActiveProfileId: aiProfilesLogic.setActiveProfileId,
        handleSaveProfile: aiProfilesLogic.handleSaveProfile,
        handleDeleteProfile: aiProfilesLogic.handleDeleteProfile,
        isApiModalOpen: apiConfig.isApiModalOpen,
        setIsApiModalOpen: apiConfig.setIsApiModalOpen,
        handleSaveApiConfig: apiConfig.handleSaveApiConfig,
        handleDeleteApiConfig: apiConfig.handleDeleteApiConfig,
        handleToggleApiConfigStatus: apiConfig.handleToggleApiConfigStatus,
        isInstructionPresetModalOpen: instructionPresets.isInstructionPresetModalOpen,
        setIsInstructionPresetModalOpen: instructionPresets.setIsInstructionPresetModalOpen,
        selectedPresetId: instructionPresets.selectedPresetId,
        setSelectedPresetId: instructionPresets.setSelectedPresetId,
        handleSaveInstructionPreset: instructionPresets.handleSaveInstructionPreset,
        handleDeleteInstructionPreset: instructionPresets.handleDeleteInstructionPreset,
        handleSelectPreset: instructionPresets.handleSelectPreset,
        isFolderTemplateModalOpen: templateManagement.isFolderTemplateModalOpen,
        setIsFolderTemplateModalOpen: templateManagement.setIsFolderTemplateModalOpen,
        templateSettings: templateManagement.templateSettings,
        setTemplateSettings: templateManagement.setTemplateSettings,
        selectedArchitectureStyle: templateManagement.selectedArchitectureStyle,
        handleArchitectureStyleChange: templateManagement.handleArchitectureStyleChange,
        handleSaveFolderTemplate: templateManagement.handleSaveFolderTemplate,
        handleDeleteFolderTemplate: templateManagement.handleDeleteFolderTemplate,
        handleApplyFolderTemplate: templateManagement.handleApplyFolderTemplate,
        handleTemplateSettingsChange: templateManagement.handleTemplateSettingsChange,
    };

    const uiValue: UIContextType = {
        selectedFolderId, setSelectedFolderId,
        isAnalyticsDashboardOpen, setIsAnalyticsDashboardOpen,
        isLogModalOpen, setIsLogModalOpen,
        isGlobalSettingsModalOpen, setIsGlobalSettingsModalOpen,
        settingsTab, setSettingsTab,
        openSettings,
    };

    return (
        <ConfigContext.Provider value={configValue}>
            <DataContext.Provider value={dataValue}>
                <UIContext.Provider value={uiValue}>
                    {children}
                </UIContext.Provider>
            </DataContext.Provider>
        </ConfigContext.Provider>
    );
};

export const useAppDataContext = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error('useAppDataContext must be used within an AppProvider');
    return context;
};

export const useAppConfig = () => {
    const context = useContext(ConfigContext);
    if (!context) throw new Error('useAppConfig must be used within an AppProvider');
    return context;
};

export const useAppUI = () => {
    const context = useContext(UIContext);
    if (!context) throw new Error('useAppUI must be used within an AppProvider');
    return context;
};

// Legacy support with warning-less combination
export const useApp = () => {
    const data = useAppDataContext();
    const config = useAppConfig();
    const ui = useAppUI();
    return { ...data, ...config, ...ui };
};
