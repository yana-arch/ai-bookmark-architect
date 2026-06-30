import { DEFAULT_SYSTEM_PROMPT } from '@/src/constants';
import type { PromptModifiers } from '@/types';
import {
    booleanSerializer,
    jsonSerializer,
    numberSerializer,
    stringSerializer,
    usePersistedState,
} from '@/src/hooks/usePersistedState';

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
    PROMPT_MODIFIERS: 'ai_prompt_modifiers',
};

const DEFAULT_PROMPT_MODIFIERS: PromptModifiers = {
    maxFolderDepth: 2,
    groupByDomain: false,
    useEmojis: false,
    strictTechnical: false,
    groupByPurpose: false,
    shortFolderNames: false,
    maintainContext: true,
    includeHierarchy: false,
};

const processingModeSerializer = {
    serialize: (value: 'parallel' | 'sequential') => value,
    deserialize: (raw: string): 'parallel' | 'sequential' => {
        if (raw === 'tag_driven') return 'parallel';
        return raw === 'parallel' || raw === 'sequential' ? raw : 'parallel';
    },
};

function getInitialTagDrivenMode(): boolean {
    const saved = localStorage.getItem(STORAGE_KEYS.TAG_DRIVEN_MODE);
    if (saved === null) {
        const oldMode = localStorage.getItem(STORAGE_KEYS.PROCESSING_MODE);
        if (oldMode === 'tag_driven') return true;
        return true;
    }
    return saved === 'true';
}

const promptModifiersSerializer = {
    serialize: jsonSerializer<PromptModifiers>().serialize,
    deserialize: (raw: string): PromptModifiers => {
        try {
            return JSON.parse(raw) as PromptModifiers;
        } catch (e) {
            console.error('Failed to parse promptModifiers', e);
            return DEFAULT_PROMPT_MODIFIERS;
        }
    },
};

export const useAISettings = () => {
    const [systemPrompt, setSystemPrompt] = usePersistedState(
        STORAGE_KEYS.SYSTEM_PROMPT,
        DEFAULT_SYSTEM_PROMPT,
        stringSerializer
    );

    const [customInstructions, setCustomInstructions] = usePersistedState(
        STORAGE_KEYS.CUSTOM_INSTRUCTIONS,
        '',
        stringSerializer
    );

    const [batchSize, setBatchSize] = usePersistedState(
        STORAGE_KEYS.BATCH_SIZE,
        5,
        numberSerializer
    );

    const [maxRetries, setMaxRetries] = usePersistedState(
        STORAGE_KEYS.MAX_RETRIES,
        2,
        numberSerializer
    );

    const [processingMode, setProcessingMode] = usePersistedState<'parallel' | 'sequential'>(
        STORAGE_KEYS.PROCESSING_MODE,
        'parallel',
        processingModeSerializer
    );

    const [autoCleanupEmptyFolders, setAutoCleanupEmptyFolders] = usePersistedState(
        STORAGE_KEYS.AUTO_CLEANUP_EMPTY_FOLDERS,
        false,
        booleanSerializer
    );

    const [tagDrivenMode, setTagDrivenMode] = usePersistedState(
        STORAGE_KEYS.TAG_DRIVEN_MODE,
        getInitialTagDrivenMode(),
        booleanSerializer
    );

    const [tagCount, setTagCount] = usePersistedState(
        STORAGE_KEYS.TAG_COUNT,
        3,
        numberSerializer
    );

    const [tagLanguage, setTagLanguage] = usePersistedState(
        STORAGE_KEYS.TAG_LANGUAGE,
        'Vietnamese and Technical Terms',
        stringSerializer
    );

    const [promptModifiers, setPromptModifiers] = usePersistedState(
        STORAGE_KEYS.PROMPT_MODIFIERS,
        DEFAULT_PROMPT_MODIFIERS,
        promptModifiersSerializer
    );

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
        promptModifiers, setPromptModifiers,
    };
};