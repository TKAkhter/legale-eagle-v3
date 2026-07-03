import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import HttpBackend from 'i18next-http-backend'
import { featureFlags } from '@config/featureFlags'
import { env } from '@config/featureFlags'

/**
 * i18n.ts — i18next initialisation
 *
 * Supports:
 *   - English (en) — default
 *   - Arabic (ar) — RTL, Tolgee-translated
 *
 * Translation workflow:
 *   - Source strings live in /src/lib/i18n/locales/en/
 *   - Translators fill Arabic strings via Tolgee UI
 *   - Tolgee CLI exports to /src/lib/i18n/locales/ar/
 *   - Missing keys fall back to English
 *
 * Namespaces (one file per domain — keeps files small):
 *   common, nav, auth, leads, clients, matters, activities,
 *   billing, lfa, reports, tasks, users, settings, errors
 *
 * Next.js migration:
 *   - Replace HttpBackend with next-i18next or i18next-resources-to-backend
 *   - App Router: use i18next directly in Server Components (no initReactI18next)
 */

const NAMESPACES = [
  'common',
  'nav',
  'auth',
  'leads',
  'clients',
  'matters',
  'activities',
  'billing',
  'lfa',
  'reports',
  'tasks',
  'users',
  'settings',
  'errors',
]

const SUPPORTED_LANGUAGES = ['en', 'ar']

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // Languages
    supportedLngs:  SUPPORTED_LANGUAGES,
    fallbackLng:    'en',
    defaultNS:      'common',
    ns:             NAMESPACES,

    // Detection order — check localStorage first, then browser
    detection: {
      order:  ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },

    // Load translation files from /public/locales/{lang}/{ns}.json
    // OR from Tolgee CDN if configured
    backend: featureFlags.hasTolgee
      ? {
          loadPath: `${env.VITE_TOLGEE_API_URL}/v2/projects/export/jsonflat?ak=${env.VITE_TOLGEE_API_KEY}&languages={{lng}}&namespaces={{ns}}`,
        }
      : {
          loadPath: '/locales/{{lng}}/{{ns}}.json',
        },

    interpolation: {
      escapeValue: false, // React already escapes
    },

    // Formats for dates, numbers — used with i18n.t('key', { val, formatParams })
    react: {
      useSuspense: true,
    },

    // Missing key handling
    saveMissing: featureFlags.isDevelopment,
    missingKeyHandler: featureFlags.isDevelopment
      ? (lngs, ns, key) => {
          console.warn(`[i18n] Missing key: ${ns}:${key} for [${lngs.join(', ')}]`)
        }
      : undefined,
  })

export default i18n

// ─── Type-safe translation helper ────────────────────────────────────────────
// Re-export typed t function for use outside React components

export { i18n }
