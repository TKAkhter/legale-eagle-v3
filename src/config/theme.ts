import { createTheme, type Theme } from '@mui/material/styles'

/**
 * theme.ts — Design tokens for LegalEagle
 *
 * Theme source: Ocean Depths (theme-factory) + Fuse "Navy Teal" preset
 * Ocean Depths: professional maritime palette for legal/financial contexts
 *   Deep Navy #1a2332, Teal #2d8b8b, Seafoam #a8dadc, Cream #f1faee
 * Fuse Navy Teal: primary #0F3C6E, secondary #00B4A6
 *
 * Design principles (web-artifacts-builder):
 *   - No excessive uniform rounded corners (mix sharp tables with subtly rounded cards)
 *   - No purple/indigo gradients (replaced with navy/teal)
 *   - IBM Plex Sans (not Inter) — already correct
 *   - Left-aligned content, not everything centered
 *   - Sidebar: dark charcoal, not bright purple
 */

// ─── Brand tokens (Ocean Depths + Navy Teal) ─────────────────────────────────
export const brandTokens = {
  primary: {
    main:         '#0F3C6E',   // Deep navy — authority, trust
    light:        '#365E92',
    dark:         '#08254A',
    contrastText: '#ffffff',
  },
  secondary: {
    main:         '#00B4A6',   // Teal — action, highlight
    light:        '#33C7BB',
    dark:         '#00867B',
    contrastText: '#ffffff',
  },
  // Semantic palette — consistent across light/dark
  success: { main: '#22C55E', light: '#4ADE80', dark: '#15803D', contrastText: '#0F1115' },
  warning: { main: '#F59E0B', light: '#FBBF24', dark: '#B45309', contrastText: '#0F1115' },
  error:   { main: '#EF4444', light: '#F87171', dark: '#B91C1C', contrastText: '#ffffff' },
  info:    { main: '#3B82F6', light: '#60A5FA', dark: '#1D4ED8', contrastText: '#ffffff' },
}

// ─── Common component overrides ───────────────────────────────────────────────
const componentOverrides = {
  MuiButton: {
    defaultProps: { disableElevation: true },
    styleOverrides: {
      root: {
        textTransform: 'none' as const,
        fontWeight: 500,
        borderRadius: 6,   // slightly rounded, not pill-shaped
        letterSpacing: '0.01em',
      },
      sizeLarge: { padding: '10px 24px', fontSize: '0.9375rem' },
    },
  },
  MuiTextField:  { defaultProps: { size: 'small' as const } },
  MuiSelect:     { defaultProps: { size: 'small' as const } },
  MuiOutlinedInput: {
    styleOverrides: {
      root: { borderRadius: 6 },
    },
  },
  // Cards — subtly rounded, not perfectly circular
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)',
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      rounded: { borderRadius: 8 },
    },
  },
  // Tables — sharp (no radius). Tables are data, not decoration.
  MuiTableContainer: {
    styleOverrides: {
      root: { borderRadius: 8 },
    },
  },
  MuiTableHead: {
    styleOverrides: {
      root: {
        '& .MuiTableCell-head': {
          backgroundColor: '#F1F5F9',
          fontWeight: 600,
          fontSize: '0.7rem',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.07em',
          color: '#475569',
          borderBottom: '1px solid #E2E8F0',
        },
      },
    },
  },
  MuiTableRow: {
    styleOverrides: {
      root: {
        '&:last-child td': { borderBottom: 0 },
        '&.MuiTableRow-hover:hover': { backgroundColor: '#F8FAFC' },
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: { borderRadius: 5, fontWeight: 500 },  // sharp-ish chips
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: { borderRadius: 6 },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: 'none' as const,
        fontWeight: 500,
        fontSize: '0.875rem',
        minHeight: 44,
      },
    },
  },
  MuiDialogTitle: {
    styleOverrides: {
      root: { fontSize: '1rem', fontWeight: 600, padding: '20px 24px 12px' },
    },
  },
  MuiCssBaseline: {
    styleOverrides: `
      *, *::before, *::after { box-sizing: border-box; }
      body { margin: 0; }
      #root { min-height: 100vh; }
      a { color: inherit; text-decoration: none; }
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 3px; }
      ::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
    `,
  },
}

// ─── Light theme ──────────────────────────────────────────────────────────────
export function buildBaseTheme(direction: 'ltr' | 'rtl' = 'ltr'): Theme {
  return createTheme({
    direction,
    palette: {
      mode:      'light',
      primary:   brandTokens.primary,
      secondary: brandTokens.secondary,
      success:   brandTokens.success,
      warning:   brandTokens.warning,
      error:     brandTokens.error,
      info:      brandTokens.info,
      background: { default: '#F6F8FA', paper: '#FFFFFF' },
      text:       { primary: '#0F3C6E', secondary: '#475569', disabled: '#94A3B8' },
      divider:    '#E2E8F0',
      action: {
        hover:              '#F1F5F9',
        selected:           '#E2E8F0',
        disabledBackground: '#F8FAFC',
      },
    },
    typography: {
      fontFamily: direction === 'rtl'
        ? '"IBM Plex Sans Arabic", "IBM Plex Sans", system-ui, sans-serif'
        : '"IBM Plex Sans", system-ui, sans-serif',
      h1: { fontSize: '2rem',     fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em' },
      h2: { fontSize: '1.5rem',   fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.01em' },
      h3: { fontSize: '1.25rem',  fontWeight: 600, lineHeight: 1.4 },
      h4: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.4 },
      h5: { fontSize: '1rem',     fontWeight: 600, lineHeight: 1.5 },
      h6: { fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.5 },
      body1:   { fontSize: '0.9375rem', lineHeight: 1.65 },
      body2:   { fontSize: '0.875rem',  lineHeight: 1.65 },
      caption: { fontSize: '0.75rem',   lineHeight: 1.5, letterSpacing: '0.02em' },
      overline:{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const },
      button:  { fontSize: '0.875rem',  fontWeight: 500, letterSpacing: '0.01em' },
    },
    shape: { borderRadius: 8 },
    components: componentOverrides as typeof componentOverrides,
  })
}

// ─── Dark theme ───────────────────────────────────────────────────────────────
export function buildDarkTheme(direction: 'ltr' | 'rtl' = 'ltr'): Theme {
  const base = buildBaseTheme(direction)
  return createTheme(base, {
    palette: {
      mode: 'dark',
      primary:   brandTokens.primary,
      secondary: brandTokens.secondary,
      background: { default: '#0D1B2A', paper: '#152238' },
      text:       { primary: '#E2E8F0', secondary: '#94A3B8', disabled: '#64748B' },
      divider:    '#1E3A5F',
      action: {
        hover:              'rgba(255,255,255,0.06)',
        selected:           'rgba(255,255,255,0.12)',
        disabledBackground: 'rgba(255,255,255,0.08)',
      },
    },
    components: {
      ...componentOverrides,
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              backgroundColor: '#152238',
              color: '#94A3B8',
              borderBottom: '1px solid #1E3A5F',
            },
          },
        },
      },
      MuiCssBaseline: {
        styleOverrides: `
          *, *::before, *::after { box-sizing: border-box; }
          body { margin: 0; background-color: #0D1B2A; }
          #root { min-height: 100vh; }
          a { color: inherit; text-decoration: none; }
          ::-webkit-scrollbar { width: 6px; height: 6px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: #1E3A5F; border-radius: 3px; }
          ::-webkit-scrollbar-thumb:hover { background: #2D5A8E; }
        `,
      },
    } as typeof componentOverrides,
  })
}

// ─── Sidebar theme (dark charcoal, not purple) ────────────────────────────────
// Ocean Depths: Deep Navy sidebar with teal accents
export const sidebarTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#00B4A6', light: '#33C7BB', dark: '#00867B', contrastText: '#fff' },
    background: { default: '#0F2744', paper: '#1a3a5c' },
    text:       { primary: '#E2E8F0', secondary: '#94A3B8' },
    action: {
      hover:    'rgba(0, 180, 166, 0.08)',
      selected: 'rgba(0, 180, 166, 0.16)',
    },
    divider: 'rgba(255,255,255,0.08)',
  },
  typography: {
    fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
  },
  shape: { borderRadius: 6 },
  components: {
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          '&.Mui-selected': {
            backgroundColor: 'rgba(0, 180, 166, 0.18)',
            color: '#33C7BB',
            '&:hover': { backgroundColor: 'rgba(0, 180, 166, 0.24)' },
            '& .MuiListItemIcon-root': { color: '#33C7BB' },
          },
          '&:hover': { backgroundColor: 'rgba(255,255,255,0.06)' },
        },
      },
    },
  },
})

// ─── Toolbar theme (white with navy text) ─────────────────────────────────────
export const toolbarTheme = createTheme({
  palette: {
    mode:      'light',
    primary:   brandTokens.primary,
    secondary: brandTokens.secondary,
    background: { default: '#ffffff', paper: '#ffffff' },
    text:       { primary: '#0F3C6E', secondary: '#475569' },
    divider:    '#E2E8F0',
  },
  typography: { fontFamily: '"IBM Plex Sans", system-ui, sans-serif' },
})

export type { Theme }
