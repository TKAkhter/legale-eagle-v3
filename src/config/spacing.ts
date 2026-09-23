/**
 * Shared spacing tokens — keep page edge inset consistent with card rhythm.
 * Use PAGE_GUTTER for main content / toolbar padding on every breakpoint.
 */
export const PAGE_GUTTER = {
  xs: 2,    // 16px — matches typical card inset
  sm: 2.5,  // 20px
  md: 3,    // 24px
} as const

/** Vertical gap between major page sections / stacked cards */
export const SECTION_GAP = {
  xs: 2,
  sm: 2,
  md: 2.5,
} as const

/**
 * Persistent sidebar vs overlay drawer cutoff.
 * Must match Sidebar / MainLayout / Toolbar media queries — not MUI `lg` (1200).
 */
export const DESKTOP_MIN_WIDTH = 1024
export const DESKTOP_MEDIA_QUERY = `(min-width:${DESKTOP_MIN_WIDTH}px)`
