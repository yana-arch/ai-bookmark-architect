import { useState, useCallback } from 'react';
import { ApiConfig, ApiKeyStatus } from '../types';
import * as db from '../db';

export const useApiConfig = (
    apiConfigs: ApiConfig[],
    setApiConfigs: (configs: ApiConfig[] | ((prev: ApiConfig[]) => ApiConfig[])) => void
) => {
    const [isApiModalOpen, setIsApiModalOpen] = useState(false);

    const handleSaveApiConfig = useCallback(async (config: ApiConfig) => {
        await db.saveApiConfig(config);
        setApiConfigs(prev => {
            const existingIndex = prev.findIndex(c => c.id === config.id);
            if (existingIndex > -1) {
                const newConfigs = [...prev];
                newConfigs[existingIndex] = config;
                return newConfigs;
            }
            return [...prev, config];
        });
    }, [setApiConfigs]);

    const handleDeleteApiConfig = useCallback(async (id: string) => {
        await db.deleteApiConfig(id);
        setApiConfigs(prev => prev.filter(c => c.id !== id));
    }, [setApiConfigs]);

    const handleToggleApiConfigStatus = useCallback(async (id: string, status: ApiKeyStatus) => {
        const config = apiConfigs.find(c => c.id === id);
        if (config) {
            await handleSaveApiConfig({ ...config, status });
        }
    }, [apiConfigs, handleSaveApiConfig]);

    return {
        isApiModalOpen,
        setIsApiModalOpen,
        handleSaveApiConfig,
        handleDeleteApiConfig,
        handleToggleApiConfigStatus
    };
};
