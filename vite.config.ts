import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@':            path.resolve(__dirname, './src'),
      '@app':         path.resolve(__dirname, './src/app'),
      '@components':  path.resolve(__dirname, './src/components'),
      '@lib':         path.resolve(__dirname, './src/lib'),
      '@hooks':       path.resolve(__dirname, './src/hooks'),
      '@providers':   path.resolve(__dirname, './src/providers'),
      '@config':      path.resolve(__dirname, './src/config'),
    },
  },

  server: { port: 3001 },

  build: {
    // Raise the reporting threshold so only genuinely huge chunks warn
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          // ── Vendor chunks — split by library family ───────────────────────
          if (id.includes('node_modules/@mui/icons-material')) return 'vendor-mui-icons'
          if (id.includes('node_modules/@mui/'))               return 'vendor-mui'
          if (id.includes('node_modules/@emotion/'))           return 'vendor-emotion'
          if (id.includes('node_modules/@fullcalendar/'))      return 'vendor-fullcalendar'
          if (id.includes('node_modules/apexcharts') ||
              id.includes('node_modules/react-apexcharts'))    return 'vendor-apexcharts'
          if (id.includes('node_modules/@tanstack/'))          return 'vendor-tanstack'
          if (id.includes('node_modules/react-hook-form') ||
              id.includes('node_modules/@hookform/'))          return 'vendor-forms'
          if (id.includes('node_modules/i18next') ||
              id.includes('node_modules/react-i18next'))       return 'vendor-i18n'
          if (id.includes('node_modules/axios'))               return 'vendor-axios'
          if (id.includes('node_modules/zustand'))             return 'vendor-zustand'
          if (id.includes('node_modules/zod'))                 return 'vendor-zod'
          if (id.includes('node_modules/dayjs'))               return 'vendor-dayjs'
          if (id.includes('node_modules/@azure/'))             return 'vendor-msal'
          if (id.includes('node_modules/react-router'))        return 'vendor-router'
          // All other node_modules in one catch-all vendor chunk
          if (id.includes('node_modules/'))                    return 'vendor-misc'
        },
      },
    },
  },
})
