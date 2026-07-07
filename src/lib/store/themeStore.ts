import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ColorMode, Direction, Language } from '@/types/common.types'

/**
 * themeStore.ts
 *
 * Persists to localStorage so theme preference survives page refresh.
 * Language change: updates document.dir/lang AND notifies i18n via a
 * registered callback — no dynamic import needed (avoids the
 * "ineffective dynamic import" Vite warning caused by mixing static
 * and dynamic imports of the same module).
 *
 * Next.js migration: read initial state from a cookie in layout.tsx.
 */

// ─── i18n callback registration ───────────────────────────────────────────────
// AuthProvider / I18nProvider registers this once after i18n is initialised.
// Avoids circular-ish dynamic imports while keeping the store pure.
let _onLanguageChange: ((lang: Language) => void) | null = null

export function registerLanguageChangeCallback(fn: (lang: Language) => void) {
  _onLanguageChange = fn
}

// ─── State ────────────────────────────────────────────────────────────────────
interface ThemeState {
  colorMode:        ColorMode
  direction:        Direction
  language:         Language
  sidebarCollapsed: boolean
  sidebarTheme:     'dark' | 'light'
}

interface ThemeActions {
  setColorMode:        (mode: ColorMode) => void
  toggleColorMode:     () => void
  setLanguage:         (lang: Language) => void
  toggleLanguage:      () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar:       () => void
  setSidebarTheme:     (theme: 'dark' | 'light') => void
}

type ThemeStore = ThemeState & ThemeActions

const DEFAULT_STATE: ThemeState = {
  colorMode:        'light',
  direction:        'ltr',
  language:         'en',
  sidebarCollapsed: false,
  sidebarTheme:     'dark',
}

function applyDirectionToDom(lang: Language): Direction {
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
        // Notify i18n via registered callback — no dynamic import needed
        _onLanguageChange?.(language)
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
