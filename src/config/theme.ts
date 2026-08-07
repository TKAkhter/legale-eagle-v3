import { createTheme, type Theme } from "@mui/material/styles"
import type { ColorMode, Direction } from "../lib/store/themeStore"

const NAVY  = "#0F3C6E"
const TEAL  = "#00B4A6"
const NAVY_DARK  = "#08254A"
const TEAL_DARK  = "#00867B"
const SIDEBAR_BG = "#0F2744"

const SHAPE  = { borderRadius: 8 }
const FONT   = (dir: Direction) => dir === "rtl"
  ? '"IBM Plex Sans Arabic","IBM Plex Sans",system-ui,sans-serif'
  : '"IBM Plex Sans",system-ui,sans-serif'

const COMPONENTS = {
  MuiButton: {
    defaultProps: { disableElevation: true },
    styleOverrides: { root: { textTransform: "none" as const, fontWeight: 500, borderRadius: 6 } },
  },
  MuiTextField:  { defaultProps: { size: "small" as const } },
  MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 6 } } },
  MuiChip:       { styleOverrides: { root: { borderRadius: 5, fontWeight: 500 } } },
  MuiTab:        { styleOverrides: { root: { textTransform: "none" as const, fontWeight: 500 } } },
  MuiCssBaseline: {
    styleOverrides: `
      *, *::before, *::after { box-sizing: border-box; }
      body { margin: 0; }
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 3px; }
      ::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
    `,
  },
}

export function buildTheme(colorMode: ColorMode, direction: Direction = "ltr"): Theme {
  const dark = colorMode === "dark"
  return createTheme({
    direction,
    palette: {
      mode: colorMode,
      primary:   { main: NAVY,  light: "#365E92", dark: NAVY_DARK, contrastText: "#fff" },
      secondary: { main: TEAL,  light: "#33C7BB", dark: TEAL_DARK, contrastText: "#fff" },
      success:   { main: "#22C55E", dark: "#15803D", contrastText: "#fff" },
      warning:   { main: "#F59E0B", dark: "#B45309", contrastText: "#fff" },
      error:     { main: "#EF4444", dark: "#B91C1C", contrastText: "#fff" },
      background: dark
        ? { default: "#111827", paper: "#1F2937" }
        : { default: "#F6F8FA", paper: "#FFFFFF" },
      text: dark
        ? { primary: "#F1F5F9", secondary: "#94A3B8", disabled: "#64748B" }
        : { primary: "#0F3C6E", secondary: "#475569", disabled: "#94A3B8" },
      divider: dark ? "#1E3A5F" : "#E2E8F0",
      action: dark
        ? { hover: "rgba(255,255,255,0.06)", selected: "rgba(255,255,255,0.12)" }
        : { hover: "#F1F5F9", selected: "#E2E8F0" },
    },
    typography: {
      fontFamily: FONT(direction),
      h5: { fontWeight: 700, letterSpacing: "-0.01em" },
      h6: { fontWeight: 600 },
    },
    shape: SHAPE,
    components: COMPONENTS as typeof COMPONENTS,
  })
}

/** Sidebar always dark regardless of app theme mode */
export function buildSidebarTheme(direction: Direction = "ltr"): Theme {
  return createTheme({
    direction,
    palette: {
      mode: "dark",
      primary:    { main: TEAL,  light: "#33C7BB", dark: TEAL_DARK, contrastText: "#fff" },
      background: { default: SIDEBAR_BG, paper: "#1a3a5c" },
      text:       { primary: "#E2E8F0", secondary: "#94A3B8" },
      divider:    "rgba(255,255,255,0.08)",
      action: {
        hover:    "rgba(0,180,166,0.10)",
        selected: "rgba(0,180,166,0.18)",
      },
    },
    typography: { fontFamily: FONT(direction) },
    shape: SHAPE,
    components: {
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            "&.Mui-selected": {
              backgroundColor: "rgba(0,180,166,0.18)",
              color: "#33C7BB",
              "&:hover": { backgroundColor: "rgba(0,180,166,0.26)" },
              "& .MuiListItemIcon-root": { color: "#33C7BB" },
            },
            "&:hover": { backgroundColor: "rgba(255,255,255,0.06)" },
          },
        },
      },
    },
  })
}

/** Toolbar theme — always matches app mode, never inherits sidebar dark */
export function buildToolbarTheme(colorMode: ColorMode, direction: Direction = "ltr"): Theme {
  const dark = colorMode === "dark"
  return createTheme({
    direction,
    palette: {
      mode: colorMode,
      primary:    { main: NAVY, contrastText: "#fff" },
      secondary:  { main: TEAL, contrastText: "#fff" },
      background: dark ? { default: "#1F2937", paper: "#1F2937" } : { default: "#fff", paper: "#fff" },
      text:       dark ? { primary: "#E2E8F0", secondary: "#94A3B8" } : { primary: "#0F3C6E", secondary: "#475569" },
      divider:    dark ? "#1E3A5F" : "#E2E8F0",
    },
    typography: { fontFamily: FONT(direction) },
  })
}
