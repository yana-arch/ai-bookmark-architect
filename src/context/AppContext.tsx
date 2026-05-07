import React, { createContext, useContext, useState, useCallback } from 'react';
import type { 
    Bookmark, Folder, ApiConfig, AppState as AppStateType, Notification, 
    InstructionPreset, FolderTemplate, SmartClassifyRule 
} from '../../types';

import { useAppData } from '../../hooks/useAppData';
import { useAISettings } from '../../hooks/useAISettings';

interface AppContextType {
    // Data
    bookmarks: Bookmark[];
    setBookmarks: React.Dispatch<React.SetStateAction<Bookmark[]>>;
    folders: (Folder | Bookmark)[];
    setFolders: React.Dispatch<React.SetStateAction<(Folder | Bookmark)[]>>;
    appState: AppStateType;
    setAppState: React.Dispatch<React.SetStateAction<AppStateType>>;
    isLoading: boolean;
    
    // Config
    apiConfigs: ApiConfig[];
    setApiConfigs: React.Dispatch<React.SetStateAction<ApiConfig[]>>;
    instructionPresets: InstructionPreset[];
    folderTemplates: FolderTemplate[];
    
    // Notifications
    notifications: Notification[];
    setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
    
    // AI Settings
    systemPrompt: string;
    setSystemPrompt: (prompt: string) => void;
    customInstructions: string;
    setCustomInstructions: (inst: string) => void;
    batchSize: number;
    setBatchSize: (size: number) => void;
    maxRetries: number;
    setMaxRetries: (retries: number) => void;
    processingMode: 'parallel' | 'sequential';
    setProcessingMode: (mode: 'parallel' | 'sequential') => void;

    // Actions
    handleClearData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const appData = useAppData();
    const aiSettings = useAISettings();

    const value: AppContextType = {
        ...appData,
        ...aiSettings,
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};

// Provider component will be implemented in the next step
