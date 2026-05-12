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
    AIProfile,
    PromptModifiers
} from '@/types';
import {
    CogIcon, XIcon, AILogoIcon, TerminalIcon, LayersIcon,
    CloudIcon, DatabaseIcon, ShieldCheckIcon, ChipIcon
} from '@/src/components/ui/Icons';
import { postgresqlService } from '@/src/services/postgresqlService';

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
    promptModifiers: PromptModifiers;
    onPromptModifierChange: (key: keyof PromptModifiers, value: boolean | number) => void;
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
        promptModifiers, onPromptModifierChange,
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-md animate-fadeIn transition-all duration-500">
            <div className="bg-[#121418]/90 border border-white/10 rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] w-full max-w-6xl h-[85vh] flex overflow-hidden glass-effect animate-slideUp relative">
                {/* Global Glow */}
                <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"></div>
                <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>

                {/* Sidebar */}
                <div className="w-72 border-r border-white/5 bg-[#0a0c10]/80 backdrop-blur-xl p-8 flex flex-col relative overflow-hidden">
                    {/* Decorative element */}
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.02]">
                        <div className="absolute -top-24 -left-24 w-64 h-64 bg-emerald-500 rounded-full blur-[80px]"></div>
                        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500 rounded-full blur-[80px]"></div>
                    </div>

                    <div className="flex items-center mb-12 px-2 relative z-10">
                        <div className="p-2.5 bg-gradient-to-br from-emerald-500/20 to-blue-500/10 rounded-2xl border border-white/10 shadow-inner mr-4">
                            <CogIcon className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight uppercase">Settings</h2>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-0.5">Control Center</p>
                        </div>
                    </div>

                    <nav className="flex-1 space-y-2 relative z-10">
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-500 group relative ${activeTab === item.id
                                        ? 'bg-white/5 text-white border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
                                        : 'text-gray-500 hover:bg-white/[0.02] hover:text-gray-300'
                                    }`}
                            >
                                <span className={`mr-4 transition-all duration-500 ${activeTab === item.id ? 'text-emerald-400 scale-110' : 'text-gray-600 group-hover:text-gray-400'}`}>
                                    {item.icon}
                                </span>
                                {item.label}
                                
                                {activeTab === item.id && (
                                    <div className="absolute left-0 w-1 h-6 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.8)]"></div>
                                )}
                            </button>
                        ))}
                    </nav>

                    <div className="mt-8 pt-8 border-t border-white/5 relative z-10">
                        <button
                            onClick={onClose}
                            className="w-full flex items-center px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-all border border-transparent hover:border-red-500/10 active:scale-95"
                        >
                            <XIcon className="w-4 h-4 mr-4" />
                            Exit Terminal
                        </button>
                    </div>
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
                                promptModifiers={promptModifiers}
                                onPromptModifierChange={onPromptModifierChange}
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

