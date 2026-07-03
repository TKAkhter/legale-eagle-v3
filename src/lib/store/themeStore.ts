import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ColorMode, Direction, Language } from '@/types/common.types'

/**
 * themeStore.ts
 *
 * Persists to localStorage so theme preference survives page refresh.
 * On language change: updates document.dir and html lang attribute.
 *
 * Next.js migration: read initial state from a cookie in layout.tsx
 * to prevent flash of wrong theme on SSR. Cookie key: 'le-theme'.
 */

interface ThemeState {
  colorMode:        ColorMode
  direction:        Direction
  language:         Language
  sidebarCollapsed: boolean
  sidebarTheme:     'dark' | 'light'
}

interface ThemeActions {
  setColorMode:       (mode: ColorMode) => void
  toggleColorMode:    () => void
  setLanguage:        (lang: Language) => void
  toggleLanguage:     () => void
  setSidebarCollapsed:(collapsed: boolean) => void
  toggleSidebar:      () => void
  setSidebarTheme:    (theme: 'dark' | 'light') => void
}

type ThemeStore = ThemeState & ThemeActions

const DEFAULT_STATE: ThemeState = {
  colorMode:        'light',
  direction:        'ltr',
  language:         'en',
  sidebarCollapsed: false,
  sidebarTheme:     'dark',
}

/** Apply direction/language to the DOM — called on every language change */
function applyDirectionToDom(lang: Language) {
  const dir: Direction = lang === 'ar' ? 'rtl' : 'ltr'
  document.documentElement.dir  = dir
  document.documentElement.lang = lang
  return dir
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,

      setColorMode: (colorMode) => set({ colorMode }),

      toggleColorMode: () =>
        set((s) => ({ colorMode: s.colorMode === 'light' ? 'dark' : 'light' })),

      setLanguage: (language) => {
        const direction = applyDirectionToDom(language)
        set({ language, direction })
        // Notify i18n — imported lazily to avoid circular dep
        import('@lib/i18n/i18n').then(({ default: i18n }) => {
          i18n.changeLanguage(language)
        })
      },

      toggleLanguage: () => {
        const next = get().language === 'en' ? 'ar' : 'en'
        get().setLanguage(next)
      },

      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      setSidebarTheme: (sidebarTheme) => set({ sidebarTheme }),
    }),
    {
      name:    'le-theme',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectColorMode        = (s: ThemeStore) => s.colorMode
export const selectDirection        = (s: ThemeStore) => s.direction
export const selectLanguage         = (s: ThemeStore) => s.language
export const selectSidebarCollapsed = (s: ThemeStore) => s.sidebarCollapsed
export const selectIsDark           = (s: ThemeStore) => s.colorMode === 'dark'
export const selectIsRTL            = (s: ThemeStore) => s.direction === 'rtl'
