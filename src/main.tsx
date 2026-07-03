import React from 'react'
import ReactDOM from 'react-dom/client'
import './lib/i18n/i18n'
import './index.css'
import { QueryProvider } from './providers/QueryProvider'
import { ThemeProvider } from './providers/ThemeProvider'
import { I18nProvider } from './providers/I18nProvider'
import { AuthProvider } from './providers/AuthProvider'
import { AppRouter } from './router'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryProvider>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryProvider>
  </React.StrictMode>
)
