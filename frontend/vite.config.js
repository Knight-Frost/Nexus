import { defineConfig } from 'vite';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

// Backend origin for the dev proxy. Override with VITE_API_PROXY if the Laravel
// server runs somewhere other than http://localhost:8000.
const API_PROXY_TARGET = process.env.VITE_API_PROXY || 'http://localhost:8000';

export default defineConfig({
    plugins: [
        // The React and Tailwind plugins are both required for Make, even if
        // Tailwind is not being actively used – do not remove them
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            // Alias @ to the src directory
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 5173,
        // Proxy API calls to the Laravel backend during development so the SPA
        // can use same-origin relative URLs (no CORS in dev).
        proxy: {
            '/api': { target: API_PROXY_TARGET, changeOrigin: true },
        },
    },
    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],
});
