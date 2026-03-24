import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { translations } from './translations'

const LanguageContext = createContext(null)

/** Resolve a dot-separated key like "header.title" from a nested object */
function resolve(obj, key) {
  return key.split('.').reduce((o, k) => o?.[k], obj)
}

/** Replace {{placeholder}} tokens in a string */
function interpolate(str, vars) {
  if (!vars || typeof str !== 'string') return str
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`)
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'en')

  const isRTL = lang === 'ar'

  useEffect(() => {
    localStorage.setItem('lang', lang)
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr')
    document.documentElement.setAttribute('lang', lang)
  }, [lang, isRTL])

  const toggleLang = useCallback(() => {
    setLang((l) => (l === 'en' ? 'ar' : 'en'))
  }, [])

  const t = useCallback(
    (key, vars) => {
      const str = resolve(translations[lang], key) ?? resolve(translations.en, key) ?? key
      return interpolate(str, vars)
    },
    [lang]
  )

  /** Translate a dynamic API string (e.g. signal names, forecast labels) */
  const tLabel = useCallback(
    (str) => {
      if (!str) return str
      return translations[lang]?.labels?.[str] ?? str
    },
    [lang]
  )

  return (
    <LanguageContext.Provider value={{ lang, isRTL, toggleLang, t, tLabel }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
