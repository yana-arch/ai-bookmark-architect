import { useState, useEffect } from 'react';
import { DEFAULT_SYSTEM_PROMPT } from '../src/constants';

const STORAGE_KEYS = {
    SYSTEM_PROMPT: 'ai_system_prompt',
    CUSTOM_INSTRUCTIONS: 'ai_custom_instructions',
    BATCH_SIZE: 'ai_batch_size',
    MAX_RETRIES: 'ai_max_retries',
    PROCESSING_MODE: 'ai_processing_mode'
};

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
    const [processingMode, setProcessingMode] = useState<'single' | 'multi'>(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.PROCESSING_MODE);
        return (saved === 'single' || saved === 'multi') ? saved : 'multi';
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.PROCESSING_MODE, processingMode);
    }, [processingMode]);

    return {
        systemPrompt, setSystemPrompt,
        customInstructions, setCustomInstructions,
        batchSize, setBatchSize,
        maxRetries, setMaxRetries,
        processingMode, setProcessingMode
    };
};
