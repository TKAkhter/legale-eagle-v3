import type { Preview } from '@storybook/react'
import { initialize, mswLoader } from 'msw-storybook-addon'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { buildBaseTheme } from '../src/config/theme'
import { handlers } from '../src/mocks/handlers'
import React from 'react'

// Start MSW with all mock handlers
initialize({ onUnhandledRequest: 'bypass' })

const lightTheme = buildBaseTheme('ltr')

function makeQC() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  })
}

const preview: Preview = {
  loaders: [mswLoader],

  parameters: {
    msw: { handlers },
    layout: 'fullscreen',
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light',    value: '#F6F8FA' },
        { name: 'dark',     value: '#0D1B2A' },
        { name: 'white',    value: '#FFFFFF' },
        { name: 'sidebar',  value: '#0F2744' },
      ],
    },
  },

  globalTypes: {
    direction: {
      description: 'Text direction',
      defaultValue: 'ltr',
      toolbar: { title: 'Direction', items: ['ltr', 'rtl'] },
    },
  },

  decorators: [
    (Story, ctx) => {
      const dir = (ctx.globals.direction ?? 'ltr') as 'ltr' | 'rtl'
      const theme = buildBaseTheme(dir)
      const qc = makeQC()
      return (
        <QueryClientProvider client={qc}>
          <MemoryRouter>
            <ThemeProvider theme={theme}>
              <CssBaseline />
              <div style={{ direction: dir }}>
                <Story />
              </div>
            </ThemeProvider>
          </MemoryRouter>
        </QueryClientProvider>
      )
    },
  ],
}

export default preview
