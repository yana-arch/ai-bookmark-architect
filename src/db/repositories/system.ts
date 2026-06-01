import { logStore, backupMetadataStore, oauthTokenStore, dbConnectionStore, clearAllData } from '../local';
import type { DetailedLog, BackupMetadata, OAuthToken, DbConnection } from '@/types';

/**
 * SystemRepository: Deep module for operational metadata and system actions.
 * Leverage: Handles logging, backups, and destructive actions safely.
 */
export class SystemRepository {
    // Logging
    async addLog(log: DetailedLog): Promise<void> {
        await logStore.add(log);
    }

    async getLogs(): Promise<DetailedLog[]> {
        return logStore.getAll();
    }

    async clearLogs(): Promise<void> {
        await logStore.clear();
    }

    // Backups
    async getBackups(): Promise<BackupMetadata[]> {
        return backupMetadataStore.getAll();
    }

    async saveBackup(backup: BackupMetadata): Promise<void> {
        await backupMetadataStore.put(backup);
    }

    // Auth & Connections
    async getOAuthTokens(): Promise<OAuthToken[]> {
        return oauthTokenStore.getAll();
    }

    async getDbConnections(): Promise<DbConnection[]> {
        return dbConnectionStore.getAll();
    }

    /**
     * Wipes all user data while preserving system configuration if needed.
     * Leverage: Centralizes the "Panic Button" logic.
     */
    async factoryReset(): Promise<void> {
        await clearAllData();
    }
}

export const systemRepo = new SystemRepository();
