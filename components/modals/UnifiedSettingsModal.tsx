import React, { useState, useEffect } from 'react';
import type {
    FolderTemplate,
    ApiConfig,
    SmartClassifyRule,
    ApiKeyStatus,
    Bookmark,
    Folder,
    InstructionPreset,
    BackupMetadata,
    ArchitectureStyle,
    ApiProvider,
    DuplicateStats,
    ExportOptions,
    Notification,
    AIProfile
} from '@/types';
import {
    CogIcon, XIcon, AILogoIcon, TerminalIcon, LayersIcon,
    CloudIcon, DatabaseIcon, ShieldCheckIcon, ChipIcon
} from '../ui/Icons';
import { postgresqlService } from '../../src/services/postgresqlService';

// Sub-components
import { ProvidersTab } from './settings/ProvidersTab';
import { IntelligenceTab } from './settings/IntelligenceTab';
import { TemplatesTab } from './settings/TemplatesTab';
import { DataTab } from './settings/DataTab';
import { HealthTab } from './settings/HealthTab';
import { BackupTab } from './settings/BackupTab';
import { ConfigTab } from './settings/ConfigTab';

interface UnifiedSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;

    // AI & Providers
    apiConfigs: ApiConfig[];
    onSaveApiConfig: (config: ApiConfig) => Promise<void> | void;
    onDeleteApiConfig: (id: string) => Promise<void> | void;
    onToggleApiConfigStatus: (id: string, status: ApiKeyStatus) => Promise<void> | void;

    // Intelligence (Prompts & Rules)
    systemPrompt: string;
    onSystemPromptChange: (prompt: string) => void;
    planningPrompt: string;
    onPlanningPromptChange: (prompt: string) => void;
    customInstructions: string;
    onCustomInstructionsChange: (instructions: string) => void;
    instructionPresets: InstructionPreset[];
    onSaveInstructionPreset: (preset: InstructionPreset) => Promise<void> | void;
    onDeleteInstructionPreset: (id: string) => Promise<void> | void;
    smartClassifyRules: SmartClassifyRule[];
    onSaveSmartRule: (rule: SmartClassifyRule) => Promise<void> | void;
    onDeleteSmartRule: (id: string) => Promise<void> | void;

    // AI Profiles
    aiProfiles: AIProfile[];
    activeProfileId: string | null;
    setActiveProfileId: (id: string | null) => void;
    onSaveProfile: (profile: AIProfile) => Promise<void> | void;
    onDeleteProfile: (id: string) => Promise<void> | void;

    // Architecture
    selectedArchitectureStyle: ArchitectureStyle;
    onArchitectureStyleChange: (styleId: ArchitectureStyle) => void;

    // Templates
    folderTemplates: FolderTemplate[];
    onSaveFolderTemplate: (template: FolderTemplate) => Promise<void> | void;
    onDeleteFolderTemplate: (id: string) => Promise<void> | void;
    onApplyFolderTemplate: (template: FolderTemplate) => Promise<void> | void;
    selectedTemplateId: string | null;
    onSelectedTemplateChange: (id: string | null) => void;

    // Performance & Config
    batchSize: number;
    onBatchSizeChange: (size: number) => void;
    maxRetries: number;
    onMaxRetriesChange: (retries: number) => void;
    processingMode: 'parallel' | 'sequential';
    onProcessingModeChange: (mode: 'parallel' | 'sequential') => void;
    tagDrivenMode: boolean;
    onTagDrivenModeChange: (enabled: boolean) => void;
    tagCount: number;
    onTagCountChange: (count: number) => void;
    tagLanguage: string;
    onTagLanguageChange: (lang: string) => void;
    autoCleanupEmptyFolders?: boolean;
    onAutoCleanupChange?: (cleanup: boolean) => void;
    onCleanupEmptyFolders?: () => void;

    // Data Management
    bookmarks: Bookmark[];
    folders: (Folder | Bookmark)[];
    onImport: (mode: 'merge' | 'overwrite') => void;
    onExport: (options: ExportOptions) => void;
    onClearData: () => void;
    importFile: File | null;
    previewBookmarks: Bookmark[];
    onFileSelect: (file: File | null) => void;

    // Maintenance (Health)
    duplicateStats: DuplicateStats;
    onCleanDuplicates: () => void;
    brokenLinks: Bookmark[];
    brokenLinkCheckState: 'idle' | 'checking' | 'completed' | 'error';
    brokenLinkCheckProgress: number;
    onStartBrokenLinkCheck: () => void;
    onCleanBrokenLinks: () => void;

    // Cloud & Backup
    onRestoreSuccess?: () => void;
    onUploadCloudData?: (key: string) => Promise<void>;
    onImportCloudData?: (key: string) => Promise<void>;
    initialTab?: TabType;
}

type TabType = 'providers' | 'intelligence' | 'templates' | 'data' | 'health' | 'backup' | 'config';

const UnifiedSettingsModal: React.FC<UnifiedSettingsModalProps> = (props) => {
    const {
        isOpen, onClose,
        apiConfigs, onSaveApiConfig, onDeleteApiConfig, onToggleApiConfigStatus,
        systemPrompt, onSystemPromptChange, planningPrompt, onPlanningPromptChange,
        customInstructions, onCustomInstructionsChange, instructionPresets,
        smartClassifyRules, onSaveSmartRule, onDeleteSmartRule,
        aiProfiles, activeProfileId, setActiveProfileId, onSaveProfile, onDeleteProfile,
        selectedArchitectureStyle, onArchitectureStyleChange,
        folderTemplates, onApplyFolderTemplate, onSaveFolderTemplate,
        batchSize, onBatchSizeChange, maxRetries, onMaxRetriesChange, 
        processingMode, onProcessingModeChange,
        tagDrivenMode, onTagDrivenModeChange, tagCount, onTagCountChange, tagLanguage, onTagLanguageChange,
        autoCleanupEmptyFolders, onAutoCleanupChange,
        bookmarks, folders, onImport, onExport, onClearData,
        duplicateStats, onCleanDuplicates, brokenLinkCheckState, brokenLinkCheckProgress, onStartBrokenLinkCheck,
        onUploadCloudData, onImportCloudData,
        initialTab = 'providers',
        importFile, previewBookmarks, onFileSelect
    } = props;

    const [activeTab, setActiveTab] = useState<TabType>(initialTab);

    // Internal States for Forms
    const [apiName, setApiName] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [apiProvider, setApiProvider] = useState<ApiProvider>('gemini');
    const [apiModel, setApiModel] = useState('');
    const [apiUrl, setApiUrl] = useState('');
    const [apiEditingId, setApiEditingId] = useState<string | null>(null);

    // Intelligence state
    const [isAddingRule, setIsAddingRule] = useState(false);
    const [newRulePattern, setNewRulePattern] = useState('');
    const [newRuleType, setNewRuleType] = useState<'tag' | 'link'>('tag');
    const [newRulePath, setNewRulePath] = useState('');

    // Backup state
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [backups, setBackups] = useState<BackupMetadata[]>([]);
    const [cloudKey, setCloudKey] = useState('');
    const [showKeyInput, setShowKeyInput] = useState(false);

    useEffect(() => {
        if (isOpen && activeTab === 'backup') {
            checkCloudAuth();
        }
    }, [isOpen, activeTab]);

    const checkCloudAuth = async () => {
        try {
            await postgresqlService.initialize();
            const auth = await postgresqlService.isSignedIn();
            setIsAuthenticated(auth);
            if (auth) {
                const list = await postgresqlService.listBackups();
                setBackups(list);
            }
        } catch (e) {
            console.error('Cloud auth error:', e);
        }
    };

    const handleEditApiConfig = (config: ApiConfig) => {
        setApiEditingId(config.id);
        setApiName(config.name);
        setApiKey(config.apiKey);
        setApiProvider(config.provider);
        setApiModel(config.model || '');
        setApiUrl(config.apiUrl || '');
    };

    const handleAddApiKey = (e: React.FormEvent) => {
        e.preventDefault();
        onSaveApiConfig({
            id: apiEditingId || `key-${Date.now()}`,
            name: apiName,
            provider: apiProvider,
            apiKey,
            apiUrl: apiProvider.includes('custom') ? apiUrl : undefined,
            model: apiModel || (apiProvider.includes('gemini') ? 'gemini-1.5-flash' : 'gpt-4o'),
            status: 'active'
        });
        resetApiForm();
    };

    const resetApiForm = () => {
        setApiEditingId(null);
        setApiName('');
        setApiKey('');
        setApiModel('');
        setApiUrl('');
        setApiProvider('gemini');
    };

    if (!isOpen) return null;

    const navItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
        { id: 'providers', label: 'AI Providers', icon: <TerminalIcon className="w-4 h-4" /> },
        { id: 'intelligence', label: 'Intelligence', icon: <AILogoIcon className="w-4 h-4" /> },
        { id: 'templates', label: 'Templates', icon: <LayersIcon className="w-4 h-4" /> },
        { id: 'data', label: 'Data & Export', icon: <DatabaseIcon className="w-4 h-4" /> },
        { id: 'health', label: 'Data Health', icon: <ShieldCheckIcon className="w-4 h-4" /> },
        { id: 'backup', label: 'Cloud & Sync', icon: <CloudIcon className="w-4 h-4" /> },
        { id: 'config', label: 'System Config', icon: <CogIcon className="w-4 h-4" /> },
    ];

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] backdrop-blur-sm animate-fadeIn">
            <div className="bg-[#1a1d23]/95 border border-white/10 rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex overflow-hidden glass-effect">
                {/* Sidebar */}
                <div className="w-64 border-r border-white/5 bg-black/20 p-6 flex flex-col">
                    <div className="flex items-center mb-8 px-2">
                        <CogIcon className="w-6 h-6 text-emerald-400 mr-3" />
                        <h2 className="text-lg font-bold text-white tracking-tight">Settings</h2>
                    </div>

                    <nav className="flex-1 space-y-1">
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === item.id
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                                        : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                                    }`}
                            >
                                <span className="mr-3">{item.icon}</span>
                                {item.label}
                            </button>
                        ))}
                    </nav>

                    <button
                        onClick={onClose}
                        className="mt-auto flex items-center px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20"
                    >
                        <XIcon className="w-4 h-4 mr-3" />
                        Close Settings
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col bg-transparent overflow-hidden">
                    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">

                        {activeTab === 'providers' && (
                            <ProvidersTab
                                apiConfigs={apiConfigs}
                                onSaveApiConfig={onSaveApiConfig}
                                onDeleteApiConfig={onDeleteApiConfig}
                                onToggleApiConfigStatus={onToggleApiConfigStatus}
                                apiName={apiName}
                                setApiName={setApiName}
                                apiKey={apiKey}
                                setApiKey={setApiKey}
                                apiProvider={apiProvider}
                                setApiProvider={setApiProvider}
                                apiModel={apiModel}
                                setApiModel={setApiModel}
                                apiUrl={apiUrl}
                                setApiUrl={setApiUrl}
                                apiEditingId={apiEditingId}
                                handleAddApiKey={handleAddApiKey}
                                onEditApiConfig={handleEditApiConfig}
                            />
                        )}

                        {activeTab === 'intelligence' && (
                            <IntelligenceTab
                                instructionPresets={instructionPresets}
                                onCustomInstructionsChange={onCustomInstructionsChange}
                                systemPrompt={systemPrompt}
                                onSystemPromptChange={onSystemPromptChange}
                                customInstructions={customInstructions}
                                smartClassifyRules={smartClassifyRules}
                                onSaveSmartRule={onSaveSmartRule}
                                onDeleteSmartRule={onDeleteSmartRule}
                                aiProfiles={aiProfiles}
                                activeProfileId={activeProfileId}
                                setActiveProfileId={setActiveProfileId}
                                handleSaveProfile={onSaveProfile}
                                handleDeleteProfile={onDeleteProfile}
                                apiConfigs={apiConfigs}
                                currentTree={folders as Folder[]}
                                selectedStyle={selectedArchitectureStyle}
                                onStyleChange={onArchitectureStyleChange}
                                tagDrivenMode={tagDrivenMode}
                                onTagDrivenModeChange={onTagDrivenModeChange}
                                tagCount={tagCount}
                                onTagCountChange={onTagCountChange}
                                tagLanguage={tagLanguage}
                                onTagLanguageChange={onTagLanguageChange}
                                isAddingRule={isAddingRule}
                                setIsAddingRule={setIsAddingRule}
                                newRulePattern={newRulePattern}
                                setNewRulePattern={setNewRulePattern}
                                newRuleType={newRuleType}
                                setNewRuleType={setNewRuleType}
                                newRulePath={newRulePath}
                                setNewRulePath={setNewRulePath}
                            />
                        )}

                        {activeTab === 'templates' && (
                            <TemplatesTab
                                folderTemplates={folderTemplates}
                                onApplyFolderTemplate={onApplyFolderTemplate}
                                onSaveFolderTemplate={onSaveFolderTemplate}
                            />
                        )}

                        {activeTab === 'health' && (
                            <HealthTab
                                duplicateStats={duplicateStats}
                                onCleanDuplicates={onCleanDuplicates}
                                brokenLinkCheckState={brokenLinkCheckState}
                                brokenLinkCheckProgress={brokenLinkCheckProgress}
                                onStartBrokenLinkCheck={onStartBrokenLinkCheck}
                            />
                        )}

                        {activeTab === 'backup' && (
                            <BackupTab
                                isAuthenticated={isAuthenticated}
                                showKeyInput={showKeyInput}
                                setShowKeyInput={setShowKeyInput}
                                cloudKey={cloudKey}
                                setCloudKey={setCloudKey}
                                backups={backups}
                                onImportCloudData={onImportCloudData}
                                onUploadCloudData={onUploadCloudData}
                            />
                        )}

                        {activeTab === 'config' && (
                            <ConfigTab
                                batchSize={batchSize}
                                onBatchSizeChange={onBatchSizeChange}
                                maxRetries={maxRetries}
                                onMaxRetriesChange={onMaxRetriesChange}
                                processingMode={processingMode}
                                onProcessingModeChange={onProcessingModeChange}
                                tagDrivenMode={tagDrivenMode}
                                onTagDrivenModeChange={onTagDrivenModeChange}
                                autoCleanupEmptyFolders={autoCleanupEmptyFolders}
                                onAutoCleanupChange={onAutoCleanupChange}
                                onClearData={onClearData}
                                onCleanupEmptyFolders={props.onCleanupEmptyFolders}
                            />
                        )}

                        {activeTab === 'data' && (
                            <DataTab
                                bookmarks={bookmarks}
                                folders={folders}
                                onExport={onExport}
                                importFile={importFile}
                                previewBookmarks={previewBookmarks}
                                onFileSelect={onFileSelect}
                                onImport={onImport}
                            />
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};

export default UnifiedSettingsModal;

