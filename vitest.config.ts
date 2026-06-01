import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '.'),
            '@db': path.resolve(__dirname, 'src/db/index.ts'),
        }
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: [],
        include: ['src/__tests__/**/*.{test,spec}.{ts,tsx}'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.ts', 'src/**/*.tsx'],
            exclude: ['src/__tests__/**', 'src/performance.ts', 'src/db/index.ts', 'src/db/local.ts', 'src/db/cloud.ts', 'src/db/schema.ts'],
        }
    },
});
