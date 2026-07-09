import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@/features': path.resolve(__dirname, './src/features'),
            '@/ui': path.resolve(__dirname, './src/ui'),
            '@/infrastructure': path.resolve(__dirname, './src/infrastructure'),
            '@/config': path.resolve(__dirname, './src/config'),
            '@/types': path.resolve(__dirname, './src/types'),
            '@/providers': path.resolve(__dirname, './src/providers'),
            '@/mocks': path.resolve(__dirname, './src/mocks'),
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
                manualChunks: function (id) {
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
