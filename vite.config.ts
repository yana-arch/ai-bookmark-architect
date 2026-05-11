import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isProduction = mode === 'production';

    return {
        server: {
            port: 3000,
            host: '0.0.0.0',
        },
        plugins: [react(), tailwind()],
        define: {
            'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
            'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.'),
                '@db': path.resolve(__dirname, 'src/db/index.ts'),
            }
        },
        build: {
        // Enable code splitting for better loading performance
            rollupOptions: {
                output: {
                    manualChunks: {
                        // Separate vendor chunks for better caching
                        'react-vendor': ['react', 'react-dom'],
                        'ai-vendor': ['@google/genai'],
                        'db-vendor': ['idb'],
                    },
                },
            },
            // Optimize chunk size
            chunkSizeWarningLimit: 1000,
            // Enable source maps for debugging in production
            sourcemap: !isProduction,
            // Minify for production
            minify: isProduction,
            // Optimize CSS
            cssCodeSplit: true,
            // Target modern browsers for better performance
            target: 'esnext',
        },
        // Optimize dependencies
        optimizeDeps: {
            include: ['react', 'react-dom', '@google/genai', 'idb'],
        },
        // Enable compression in preview mode
        preview: {
            port: 3001,
            host: '0.0.0.0',
        },
    };
});
