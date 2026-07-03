import { Suspense, useEffect } from 'react'
import { I18nextProvider } from 'react-i18next'
import i18n from '@lib/i18n/i18n'
import { useThemeStore } from '@lib/store/themeStore'

function I18nSync() {
  const language = useThemeStore((s) => s.language)
  useEffect(() => { i18n.changeLanguage(language) }, [language])
  return null
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <I18nSync />
      <Suspense fallback={null}>{children}</Suspense>
    </I18nextProvider>
  )
}
