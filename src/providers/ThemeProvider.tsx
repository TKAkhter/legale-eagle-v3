import { useMemo, useEffect } from 'react'
import { ThemeProvider as MuiThemeProvider, CssBaseline, StyledEngineProvider } from '@mui/material'
import { useThemeStore } from '@lib/store/themeStore'
import { buildBaseTheme, buildDarkTheme } from '@config/theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorMode = useThemeStore((s) => s.colorMode)
  const direction = useThemeStore((s) => s.direction)

  const theme = useMemo(
    () => colorMode === 'dark' ? buildDarkTheme(direction) : buildBaseTheme(direction),
    [colorMode, direction],
  )

  // Sync direction to DOM
  useEffect(() => {
    document.documentElement.dir  = direction
    document.documentElement.lang = direction === 'rtl' ? 'ar' : 'en'
  }, [direction])

  return (
    <StyledEngineProvider injectFirst>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </StyledEngineProvider>
  )
}
