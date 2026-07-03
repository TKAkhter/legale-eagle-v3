import { createTheme, type Theme } from '@mui/material/styles'

/**
 * Design tokens for LegalEagle.
 * Fuse-style per-section theming: MainLayout, Sidebar, Toolbar each have
 * their own palette so they can be styled independently.
 *
 * To use as a boilerplate: swap these tokens for your brand colors.
 */

export const brandTokens = {
  primary: {
    main:    '#4f46e5',
    light:   '#818cf8',
    dark:    '#3730a3',
    contrastText: '#ffffff',
  },
  secondary: {
    main:    '#0ea5e9',
    light:   '#38bdf8',
    dark:    '#0369a1',
    contrastText: '#ffffff',
  },
}

// ─── Base theme (shared across sections) ─────────────────────────────────────
function buildBaseTheme(direction: 'ltr' | 'rtl' = 'ltr'): Theme {
  return createTheme({
    direction,
    palette: {
      primary:   brandTokens.primary,
      secondary: brandTokens.secondary,
      background: {
        default: '#f8fafc',
        paper:   '#ffffff',
      },
    },
    typography: {
      fontFamily: direction === 'rtl'
        ? '"IBM Plex Sans Arabic", "IBM Plex Sans", system-ui, sans-serif'
        : '"IBM Plex Sans", system-ui, sans-serif',
      h1: { fontSize: '2rem',    fontWeight: 600, lineHeight: 1.2 },
      h2: { fontSize: '1.5rem',  fontWeight: 600, lineHeight: 1.3 },
      h3: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.4 },
      h4: { fontSize: '1.125rem',fontWeight: 500, lineHeight: 1.4 },
      h5: { fontSize: '1rem',    fontWeight: 500, lineHeight: 1.5 },
      h6: { fontSize: '0.875rem',fontWeight: 500, lineHeight: 1.5 },
      body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
      body2: { fontSize: '0.875rem',  lineHeight: 1.6 },
      caption: { fontSize: '0.75rem', lineHeight: 1.5 },
    },
    shape: { borderRadius: 10 },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 500, borderRadius: 8 },
        },
      },
      MuiTextField: {
        defaultProps: { size: 'small' },
      },
      MuiSelect: {
        defaultProps: { size: 'small' },
      },
      MuiCard: {
        styleOverrides: {
          root: { boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)' },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              backgroundColor: '#f1f5f9',
              fontWeight: 600,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#64748b',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 6 },
        },
      },
      // Disable CssBaseline's body reset — Tailwind Preflight is disabled
      // so we manually set only what we need
      MuiCssBaseline: {
        styleOverrides: `
          *, *::before, *::after { box-sizing: border-box; }
          body { margin: 0; background-color: #f8fafc; }
          a { color: inherit; text-decoration: none; }
          #root { min-height: 100vh; }
        `,
      },
    },
  })
}

// ─── Dark theme ───────────────────────────────────────────────────────────────
function buildDarkTheme(direction: 'ltr' | 'rtl' = 'ltr'): Theme {
  const base = buildBaseTheme(direction)
  return createTheme(base, {
    palette: {
      mode: 'dark',
      primary:   brandTokens.primary,
      secondary: brandTokens.secondary,
      background: {
        default: '#0f172a',
        paper:   '#1e293b',
      },
      text: {
        primary:   '#f1f5f9',
        secondary: '#94a3b8',
      },
    },
    components: {
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              backgroundColor: '#1e293b',
              color: '#94a3b8',
            },
          },
        },
      },
      MuiCssBaseline: {
        styleOverrides: `
          *, *::before, *::after { box-sizing: border-box; }
          body { margin: 0; background-color: #0f172a; }
          a { color: inherit; text-decoration: none; }
          #root { min-height: 100vh; }
        `,
      },
    },
  })
}

// ─── Sidebar theme (dark by default regardless of app theme) ─────────────────
export const sidebarTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: brandTokens.primary,
    background: {
      default: '#1e1b4b',
      paper:   '#2e2a6e',
    },
    text: {
      primary:   '#e0e7ff',
      secondary: '#a5b4fc',
    },
  },
  typography: {
    fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
  },
})

// ─── Toolbar theme ────────────────────────────────────────────────────────────
export const toolbarTheme = createTheme({
  palette: {
    mode: 'light',
    primary: brandTokens.primary,
    background: {
      default: '#ffffff',
      paper:   '#ffffff',
    },
  },
  typography: {
    fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
  },
})

// ─── Exports ─────────────────────────────────────────────────────────────────
export { buildBaseTheme, buildDarkTheme }
export type { Theme }
