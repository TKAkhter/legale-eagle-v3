/**
 * Emotion RTL/LTR cache — mirrors OLD App.js CacheProvider + stylis-plugin-rtl.
 * Without this, theme.direction alone does not flip MUI logical CSS.
 */
import { useMemo } from "react"
import createCache from "@emotion/cache"
import { CacheProvider } from "@emotion/react"
import rtlPlugin from "stylis-plugin-rtl"
import { useThemeStore } from "@lib/store/themeStore"

export function RtlCacheProvider({ children }: { children: React.ReactNode }) {
  const direction = useThemeStore(s => s.direction)

  const cache = useMemo(() => {
    if (direction === "rtl") {
      return createCache({
        key: "muirtl",
        stylisPlugins: [rtlPlugin],
      })
    }
    return createCache({ key: "muiltr" })
  }, [direction])

  return <CacheProvider value={cache}>{children}</CacheProvider>
}
