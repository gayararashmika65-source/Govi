'use client'
import { useApp } from '@/lib/store'
import { translate, type Lang } from '@/lib/i18n'

// Returns a translation function bound to the current language.
// Usage: const t = useT(); <span>{t('nav.home')}</span>
export function useT() {
  const lang = useApp((s) => s.lang)
  return (key: string) => translate(lang, key)
}

// Returns the current language + setter (for the switcher UI)
export function useLang(): { lang: Lang; setLang: (l: Lang) => void } {
  const lang = useApp((s) => s.lang)
  const setLang = useApp((s) => s.setLang)
  return { lang, setLang }
}
