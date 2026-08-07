import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['icons/icon.svg'],
            manifest: { name: 'LegalEagle LMS', short_name: 'LegalEagle', theme_color: '#0F2744', background_color: '#0F2744', display: 'standalone', start_url: '/dashboard', icons: [{ src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }] },
            workbox: { globPatterns: ['**/*.{js,css,html,svg}'], runtimeCaching: [{ urlPattern: /testapi\.alshamsilegallms\.com/, handler: 'NetworkOnly' }] },
        }),
    ],
    resolve: {
        alias: {
            // Primary alias — use this for everything
            '@': path.resolve(__dirname, './src'),
            // Short aliases for the most-used folders
            '@/components': path.resolve(__dirname, './src/components'),
            '@/api': path.resolve(__dirname, './src/api'),
            '@/store': path.resolve(__dirname, './src/store'),
            '@/data': path.resolve(__dirname, './src/data'),
            '@/config': path.resolve(__dirname, './src/config'),
            '@/types': path.resolve(__dirname, './src/types'),
            '@/lib': path.resolve(__dirname, './src/lib'),
            '@/hooks': path.resolve(__dirname, './src/hooks'),
            '@/providers': path.resolve(__dirname, './src/providers'),
            // Legacy aliases — keep while old pages still import these
            '@components': path.resolve(__dirname, './src/components'),
            '@lib': path.resolve(__dirname, './src/lib'),
            '@hooks': path.resolve(__dirname, './src/hooks'),
            '@config': path.resolve(__dirname, './src/config'),
        },
    },
    server: { port: 3000 },
    build: {
        chunkSizeWarningLimit: 600,
        rollupOptions: {
            output: {
                manualChunks: (id) => {
                    if (id.includes('node_modules/@mui/icons-material'))
                        return 'vendor-mui-icons';
                    if (id.includes('node_modules/@mui/'))
                        return 'vendor-mui';
                    if (id.includes('node_modules/@emotion/'))
                        return 'vendor-emotion';
                    if (id.includes('node_modules/@fullcalendar/'))
                        return 'vendor-fullcalendar';
                    if (id.includes('node_modules/apexcharts') || id.includes('node_modules/react-apexcharts'))
                        return 'vendor-charts';
                    if (id.includes('node_modules/@tanstack/'))
                        return 'vendor-tanstack';
                    if (id.includes('node_modules/react-hook-form') || id.includes('node_modules/@hookform/'))
                        return 'vendor-forms';
                    if (id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next'))
                        return 'vendor-i18n';
                    if (id.includes('node_modules/axios'))
                        return 'vendor-axios';
                    if (id.includes('node_modules/zustand'))
                        return 'vendor-zustand';
                    if (id.includes('node_modules/zod'))
                        return 'vendor-zod';
                    if (id.includes('node_modules/react-router'))
                        return 'vendor-router';
                    if (id.includes('node_modules/'))
                        return 'vendor-misc';
                },
            },
        },
    },
});
