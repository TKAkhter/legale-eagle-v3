import { Suspense, useEffect } from 'react'
import { I18nextProvider } from 'react-i18next'
import i18n from '@lib/i18n/i18n'
import { useThemeStore, registerLanguageChangeCallback } from '@lib/store/themeStore'
import type { Language } from '@/types/common.types'

function I18nSync() {
  const language = useThemeStore(s => s.language)
  useEffect(() => { i18n.changeLanguage(language) }, [language])
  return null
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Register the callback ONCE so themeStore.setLanguage() can call
  // i18n.changeLanguage() without dynamically importing the module.
  useEffect(() => {
    registerLanguageChangeCallback((lang: Language) => {
      i18n.changeLanguage(lang)
    })
  }, [])

  return (
    <I18nextProvider i18n={i18n}>
      <I18nSync />
      <Suspense fallback={null}>{children}</Suspense>
    </I18nextProvider>
  )
}
