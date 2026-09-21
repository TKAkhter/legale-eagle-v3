import { VitePWA }      from 'vite-plugin-pwa'
import { defineConfig } from 'vite'
import react            from '@vitejs/plugin-react'
import path             from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType:   'autoUpdate',
      includeAssets:  ['icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'robots.txt'],
      manifest: false,  // use public/manifest.json instead
      workbox: {
        globPatterns:   ['**/*.{js,css,html,svg,png,ico}'],
        cleanupOutdatedCaches: true,
        navigateFallback: '/offline.html',
        runtimeCaching: [
          {
            // Never cache API calls — always go to network
            urlPattern: /testapi\.alshamsilegallms\.com|\/api\//,
            handler:    'NetworkOnly',
          },
          {
            // Cache Google Fonts
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
            handler:    'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],

  resolve: {
    alias: {
      '@':             path.resolve(__dirname, './src'),
      '@/components':  path.resolve(__dirname, './src/components'),
      '@/api':         path.resolve(__dirname, './src/api'),
      '@/store':       path.resolve(__dirname, './src/store'),
      '@/data':        path.resolve(__dirname, './src/data'),
      '@/config':      path.resolve(__dirname, './src/config'),
      '@/types':       path.resolve(__dirname, './src/types'),
      '@/lib':         path.resolve(__dirname, './src/lib'),
      '@/hooks':       path.resolve(__dirname, './src/hooks'),
      '@/providers':   path.resolve(__dirname, './src/providers'),
      '@components':   path.resolve(__dirname, './src/components'),
      '@lib':          path.resolve(__dirname, './src/lib'),
      '@hooks':        path.resolve(__dirname, './src/hooks'),
      '@config':       path.resolve(__dirname, './src/config'),
    },
  },

  server: {
    port: 3000,
    // Proxy API calls to avoid CORS in development
    proxy: {
      '/api': {
        target: 'https://testapi.alshamsilegallms.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },

  build: {
    // Increase warning threshold — our chunks are intentionally larger
    chunkSizeWarningLimit: 800,
    // Source maps for production debugging (disable if not needed)
    sourcemap: false,
    // Target modern browsers only
    target: ['es2020', 'chrome90', 'firefox88', 'safari14'],
    rollupOptions: {
      output: {
        // Deterministic chunk names for better caching
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        manualChunks: (id: string) => {
          // MUI icons are huge — split separately
          if (id.includes('node_modules/@mui/icons-material'))      return 'vendor-mui-icons'
          if (id.includes('node_modules/@mui/'))                     return 'vendor-mui'
          if (id.includes('node_modules/@emotion/'))                 return 'vendor-emotion'
          // Heavy chart library
          if (id.includes('node_modules/apexcharts') ||
              id.includes('node_modules/react-apexcharts'))          return 'vendor-charts'
          // Calendar library
          if (id.includes('node_modules/@fullcalendar/'))            return 'vendor-fullcalendar'
          // TipTap editor
          if (id.includes('node_modules/@tiptap/'))                  return 'vendor-tiptap'
          // TanStack
          if (id.includes('node_modules/@tanstack/'))                return 'vendor-tanstack'
          // Form handling
          if (id.includes('node_modules/react-hook-form') ||
              id.includes('node_modules/@hookform/'))                return 'vendor-forms'
          // i18n
          if (id.includes('node_modules/i18next') ||
              id.includes('node_modules/react-i18next'))             return 'vendor-i18n'
          // Small utilities — group together
          if (id.includes('node_modules/axios'))                     return 'vendor-axios'
          if (id.includes('node_modules/zustand'))                   return 'vendor-zustand'
          if (id.includes('node_modules/zod'))                       return 'vendor-zod'
          if (id.includes('node_modules/react-router'))              return 'vendor-router'
          if (id.includes('node_modules/date-fns'))                  return 'vendor-date'
          if (id.includes('node_modules/'))                          return 'vendor-misc'
        },
      },
    },
  },
})
