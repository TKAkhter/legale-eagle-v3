/**
 * ThemeProvider.tsx
 *
 * Passes colorMode into the app theme and wraps Emotion RTL cache so
 * language switch (ar ↔ en) actually flips MUI logical CSS.
 */
import { useMemo } from "react"
import { ThemeProvider as MuiThemeProvider, CssBaseline } from "@mui/material"
import { buildTheme } from "@/config/theme"
import { useThemeStore } from "@lib/store/themeStore"
import { I18nProvider } from "./I18nProvider"
import { RtlCacheProvider } from "./RtlCacheProvider"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorMode = useThemeStore((s) => s.colorMode)
  const direction = useThemeStore((s) => s.direction)

  const theme = useMemo(() => buildTheme(colorMode, direction), [colorMode, direction])

  return (
    <RtlCacheProvider>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <I18nProvider>
          {children}
        </I18nProvider>
      </MuiThemeProvider>
    </RtlCacheProvider>
  )
}
