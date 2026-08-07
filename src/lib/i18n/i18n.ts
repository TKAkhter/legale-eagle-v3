import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

/**
 * i18n.ts
 *
 * Single namespace: "common" — one file per language.
 *   src/lib/i18n/locales/en/common.json  (English)
 *   src/lib/i18n/locales/ar/common.json  (Arabic / RTL)
 *
 * Resources are bundled directly (no HTTP backend needed).
 * Next.js migration: replace initReactI18next with next-i18next.
 */
import enCommon from './locales/en/common.json'
import arCommon from './locales/ar/common.json'

const resources = {
  en: { common: enCommon },
  ar: { common: arCommon },
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('le-lang') ?? 'en',
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common'],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  })

export default i18n
export { i18n }

/** Change language and persist preference */
export function changeLanguage(lang: 'en' | 'ar') {
  localStorage.setItem('le-lang', lang)
  document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr'
  document.documentElement.lang = lang
  return i18n.changeLanguage(lang)
}
