import { AIClient } from '../aiClient';
import type { ApiConfig, AIProfile } from '@/types';

export interface ExecutionOptions {
    apiConfigs: ApiConfig[];
    maxRetries: number;
    activeProfile?: AIProfile | null;
    onLog: (message: string) => void;
    signal?: AbortSignal;
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
        const { apiConfigs, maxRetries, activeProfile, onLog, signal } = options;
        const availableConfigs = apiConfigs.filter(c => c.status === 'active');

        if (availableConfigs.length === 0) {
            throw new Error('No active API key found.');
        }

        let currentConfigIndex = Math.floor(Math.random() * availableConfigs.length);
        let attempts = 0;

        const totalAttempts = Math.max(maxRetries + 1, availableConfigs.length);
        
        while (attempts < totalAttempts) {
            if (signal?.aborted) {
                throw new Error(`Task ${taskName} was aborted.`);
            }

            const activeConfig = availableConfigs[currentConfigIndex];
            const client = new AIClient(activeConfig, activeProfile || undefined);
            
            try {
                attempts++;
                onLog(`${taskName}: Attempt ${attempts}/${totalAttempts} using [${activeConfig.name}]`);
                return await task(client);
            } catch (error: any) {
                if (signal?.aborted) {
                    throw new Error(`Task ${taskName} was aborted during execution.`);
                }

                console.error(`${taskName} attempt ${attempts} failed with [${activeConfig.name}]:`, error);
                
                if (attempts >= totalAttempts) {
                    throw error;
                }

                // Failover to next config
                currentConfigIndex = (currentConfigIndex + 1) % availableConfigs.length;
                
                // Exponential backoff with abort support
                const delay = 1000 * Math.pow(2, attempts - 1);
                onLog(`${taskName}: Retrying in ${delay}ms...`);
                
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(resolve, delay);
                    signal?.addEventListener('abort', () => {
                        clearTimeout(timeout);
                        reject(new Error(`Task ${taskName} aborted during backoff delay.`));
                    }, { once: true });
                });
            }
        }

        throw new Error(`${taskName} failed after ${attempts} attempts.`);
    }
}
