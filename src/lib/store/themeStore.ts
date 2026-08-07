/**
 * themeStore.ts — UI preferences persisted to localStorage.
 *
 * FIX: Dark mode now properly signals ALL layout consumers (sidebar, header, body).
 * Language change uses a registered callback to avoid dynamic import warnings.
 */
import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

export type ColorMode = "light" | "dark"
export type Direction  = "ltr" | "rtl"
export type Language   = "en" | "ar"

let _onLanguageChange: ((lang: Language) => void) | null = null
export function registerLanguageChangeCallback(fn: (lang: Language) => void) {
  _onLanguageChange = fn
}

interface ThemeState {
  colorMode:        ColorMode
  direction:        Direction
  language:         Language
  sidebarCollapsed: boolean

  toggleColorMode:     () => void
  setColorMode:        (m: ColorMode) => void
  setLanguage:         (l: Language) => void
  toggleLanguage:      () => void
  setSidebarCollapsed: (v: boolean) => void
  toggleSidebar:       () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      colorMode:        "light",
      direction:        "ltr",
      language:         "en",
      sidebarCollapsed: false,

      toggleColorMode: () =>
        set(s => ({ colorMode: s.colorMode === "light" ? "dark" : "light" })),

      setColorMode: (colorMode) => set({ colorMode }),

      setLanguage: (language) => {
        const direction: Direction = language === "ar" ? "rtl" : "ltr"
        document.documentElement.dir  = direction
        document.documentElement.lang = language
        set({ language, direction })
        _onLanguageChange?.(language)
      },

      toggleLanguage: () => {
        const next = get().language === "en" ? "ar" : "en"
        get().setLanguage(next)
      },

      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleSidebar:       () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    {
      name:    "le-theme",
      storage: createJSONStorage(() => localStorage),
    }
  )
)
