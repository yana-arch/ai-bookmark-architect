import { aiProfileStore, apiConfigStore, instructionPresetStore, folderTemplateStore } from '../local';
import type { AIProfile, ApiConfig, InstructionPreset, FolderTemplate } from '@/types';

/**
 * SettingsRepository: Deep module for app & AI configuration.
 * Leverage: Concentrates knowledge of config state and defaults.
 */
export class SettingsRepository {
    // AI Profiles
    async getProfiles(): Promise<AIProfile[]> {
        return aiProfileStore.getAll();
    }

    async getActiveProfile(): Promise<AIProfile | undefined> {
        const profiles = await this.getProfiles();
        return profiles.find(p => p.isDefault) || profiles[0];
    }

    async saveProfile(profile: AIProfile): Promise<void> {
        await aiProfileStore.put(profile);
    }

    async deleteProfile(id: string): Promise<void> {
        await aiProfileStore.delete(id);
    }

    // API Configurations
    async getApiConfigs(): Promise<ApiConfig[]> {
        return apiConfigStore.getAll();
    }

    async getActiveConfigs(): Promise<ApiConfig[]> {
        const configs = await this.getApiConfigs();
        return configs.filter(c => c.status === 'active');
    }

    async saveApiConfig(config: ApiConfig): Promise<void> {
        await apiConfigStore.put(config);
    }

    async deleteApiConfig(id: string): Promise<void> {
        await apiConfigStore.delete(id);
    }

    // Templates & Presets
    async getTemplates(): Promise<FolderTemplate[]> {
        return folderTemplateStore.getAll();
    }

    async saveTemplate(template: FolderTemplate): Promise<void> {
        await folderTemplateStore.put(template);
    }

    async getPresets(): Promise<InstructionPreset[]> {
        return instructionPresetStore.getAll();
    }
}

export const settingsRepo = new SettingsRepository();
