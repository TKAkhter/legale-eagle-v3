/**
 * ThemeProvider.tsx
 *
 * FIX: passes colorMode into BOTH the app theme AND toolbar theme,
 * so header background correctly switches in dark mode.
 *
 * Sidebar always uses buildSidebarTheme (always dark).
 */
import { useMemo } from "react"
import { ThemeProvider as MuiThemeProvider, CssBaseline } from "@mui/material"
import { buildTheme } from "@/config/theme"
import { useThemeStore } from "@lib/store/themeStore"
import { I18nProvider } from "./I18nProvider"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorMode = useThemeStore((s) => s.colorMode)
  const direction = useThemeStore((s) => s.direction)

  const theme = useMemo(() => buildTheme(colorMode, direction), [colorMode, direction])

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <I18nProvider>
        {children}
      </I18nProvider>
    </MuiThemeProvider>
  )
}
