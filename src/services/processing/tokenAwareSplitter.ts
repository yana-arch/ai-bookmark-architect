export interface SplitterOptions<T, R> {
    batch: T[];
    tokenLimit: number;
    calculateTokens: (subBatch: T[]) => number;
    executeTask: (subBatch: T[]) => Promise<R[]>;
    onLog?: (message: string) => void;
    sequential?: boolean;
    signal?: AbortSignal;
}

export class TokenAwareSplitter {
    /**
     * Recursively splits a batch of items if the calculated tokens exceed the limit.
     */
    static async splitAndExecute<T, R>(options: SplitterOptions<T, R>): Promise<R[]> {
        const { batch, tokenLimit, calculateTokens, executeTask, onLog, sequential, signal } = options;

        const processSubBatch = async (subBatch: T[]): Promise<R[]> => {
            if (signal?.aborted) {
                throw new Error('Processing was aborted during splitting.');
            }

            if (subBatch.length === 0) return [];

            const totalTokens = calculateTokens(subBatch);

            if (totalTokens > tokenLimit && subBatch.length > 1) {
                const mid = Math.floor(subBatch.length / 2);
                const left = subBatch.slice(0, mid);
                const right = subBatch.slice(mid);
                
                if (onLog) {
                    onLog(`Token count (${totalTokens}) exceeds limit (${tokenLimit}). Splitting batch of ${subBatch.length} into ${left.length} and ${right.length}.`);
                }

                let leftResults: R[];
                let rightResults: R[];

                if (sequential) {
                    leftResults = await processSubBatch(left);
                    rightResults = await processSubBatch(right);
                } else {
                    [leftResults, rightResults] = await Promise.all([
                        processSubBatch(left),
                        processSubBatch(right)
                    ]);
                }
                return [...leftResults, ...rightResults];
            }

            return await executeTask(subBatch);
        };

        return processSubBatch(batch);
    }
}
