import { useState, useEffect } from 'react';
import { DEFAULT_SYSTEM_PROMPT } from '../src/constants';

const STORAGE_KEYS = {
    SYSTEM_PROMPT: 'ai_system_prompt',
    CUSTOM_INSTRUCTIONS: 'ai_custom_instructions',
    BATCH_SIZE: 'ai_batch_size',
    MAX_RETRIES: 'ai_max_retries',
    PROCESSING_MODE: 'ai_processing_mode',
    AUTO_CLEANUP_EMPTY_FOLDERS: 'ai_auto_cleanup_empty_folders',
    TAG_DRIVEN_MODE: 'ai_tag_driven_mode',
    TAG_COUNT: 'ai_tag_count',
    TAG_LANGUAGE: 'ai_tag_language',
    PROMPT_MODIFIERS: 'ai_prompt_modifiers'
};

import type { PromptModifiers } from '../types';

export const useAISettings = () => {
    // 1. System Prompt
    const [systemPrompt, setSystemPrompt] = useState<string>(() => {
        return localStorage.getItem(STORAGE_KEYS.SYSTEM_PROMPT) || DEFAULT_SYSTEM_PROMPT;
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.SYSTEM_PROMPT, systemPrompt);
    }, [systemPrompt]);

    // 2. Custom Instructions
    const [customInstructions, setCustomInstructions] = useState<string>(() => {
        return localStorage.getItem(STORAGE_KEYS.CUSTOM_INSTRUCTIONS) || '';
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_INSTRUCTIONS, customInstructions);
    }, [customInstructions]);

    // 3. Batch Size
    const [batchSize, setBatchSize] = useState<number>(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.BATCH_SIZE);
        return saved ? parseInt(saved, 10) : 5;
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.BATCH_SIZE, batchSize.toString());
    }, [batchSize]);

    // 4. Max Retries
    const [maxRetries, setMaxRetries] = useState<number>(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.MAX_RETRIES);
        return saved ? parseInt(saved, 10) : 2;
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.MAX_RETRIES, maxRetries.toString());
    }, [maxRetries]);

    // 5. Processing Mode
    const [processingMode, setProcessingMode] = useState<'parallel' | 'sequential'>(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.PROCESSING_MODE);
        if (saved === 'tag_driven') return 'parallel';
        return (saved === 'parallel' || saved === 'sequential') ? saved : 'parallel';
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.PROCESSING_MODE, processingMode);
    }, [processingMode]);
    
    // 6. Auto Cleanup Empty Folders
    const [autoCleanupEmptyFolders, setAutoCleanupEmptyFolders] = useState<boolean>(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.AUTO_CLEANUP_EMPTY_FOLDERS);
        return saved === 'true'; // Default to false
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.AUTO_CLEANUP_EMPTY_FOLDERS, autoCleanupEmptyFolders.toString());
    }, [autoCleanupEmptyFolders]);

    // 7. Tag Driven Mode
    const [tagDrivenMode, setTagDrivenMode] = useState<boolean>(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.TAG_DRIVEN_MODE);
        if (saved === null) {
            // Migration check: was it the old processing mode?
            const oldMode = localStorage.getItem(STORAGE_KEYS.PROCESSING_MODE);
            if (oldMode === 'tag_driven') return true;
            return true; // Default to true as requested/implied
        }
        return saved === 'true';
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.TAG_DRIVEN_MODE, tagDrivenMode.toString());
    }, [tagDrivenMode]);

    // 8. Tag Count
    const [tagCount, setTagCount] = useState<number>(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.TAG_COUNT);
        return saved ? parseInt(saved, 10) : 3;
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.TAG_COUNT, tagCount.toString());
    }, [tagCount]);

    // 9. Tag Language
    const [tagLanguage, setTagLanguage] = useState<string>(() => {
        return localStorage.getItem(STORAGE_KEYS.TAG_LANGUAGE) || 'Vietnamese and Technical Terms';
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.TAG_LANGUAGE, tagLanguage);
    }, [tagLanguage]);

    // 10. Prompt Modifiers
    const [promptModifiers, setPromptModifiers] = useState<PromptModifiers>(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.PROMPT_MODIFIERS);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse promptModifiers", e);
            }
        }
        return {
            maxFolderDepth: 2,
            groupByDomain: false,
            useEmojis: false,
            strictTechnical: false,
            groupByPurpose: false,
            shortFolderNames: false,
            maintainContext: true,
            includeHierarchy: false
        };
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.PROMPT_MODIFIERS, JSON.stringify(promptModifiers));
    }, [promptModifiers]);

    return {
        systemPrompt, setSystemPrompt,
        customInstructions, setCustomInstructions,
        batchSize, setBatchSize,
        maxRetries, setMaxRetries,
        processingMode, setProcessingMode,
        autoCleanupEmptyFolders, setAutoCleanupEmptyFolders,
        tagDrivenMode, setTagDrivenMode,
        tagCount, setTagCount,
        tagLanguage, setTagLanguage,
        promptModifiers, setPromptModifiers
    };
};
