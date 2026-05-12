import { AIClient } from '../aiClient';
import type { ApiConfig, AIProfile } from '@/types';

export interface ExecutionOptions {
    apiConfigs: ApiConfig[];
    maxRetries: number;
    activeProfile?: AIProfile | null;
    onLog: (message: string) => void;
}

export class AIExecutionManager {
    /**
     * Executes a task with automatic retries and failover across multiple API configurations.
     */
    static async executeWithRetry<T>(
        taskName: string,
        task: (client: AIClient) => Promise<T>,
        options: ExecutionOptions
    ): Promise<T> {
        const { apiConfigs, maxRetries, activeProfile, onLog } = options;
        const availableConfigs = apiConfigs.filter(c => c.status === 'active');

        if (availableConfigs.length === 0) {
            throw new Error('No active API key found.');
        }

        let currentConfigIndex = Math.floor(Math.random() * availableConfigs.length);
        let attempts = 0;

        while (attempts <= maxRetries) {
            const activeConfig = availableConfigs[currentConfigIndex];
            const client = new AIClient(activeConfig, activeProfile || undefined);
            
            try {
                attempts++;
                onLog(`${taskName}: Attempt ${attempts}/${maxRetries + 1} using [${activeConfig.name}]`);
                return await task(client);
            } catch (error: any) {
                console.error(`${taskName} attempt ${attempts} failed with [${activeConfig.name}]:`, error);
                
                if (attempts > maxRetries) {
                    throw error;
                }

                // Failover to next config
                currentConfigIndex = (currentConfigIndex + 1) % availableConfigs.length;
                
                // Exponential backoff
                const delay = 1000 * Math.pow(2, attempts - 1);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        throw new Error(`${taskName} failed after ${maxRetries + 1} attempts.`);
    }
}
