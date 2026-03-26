import { useState, useRef, useEffect } from 'react'
import { formatCompact, formatPct, pctColor } from '../../utils/formatters'
import { useLanguage } from '../../i18n/LanguageContext'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'عربي' },
]

export default function Header({ data, loading, onRefresh, lastUpdatedAt }) {
  const { lang, setLang, t } = useLanguage()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  const price = data?.current_price
  const changePct = data?.change_pct
  const change = data?.change

  return (
    <header className="bg-dark-800 border-b border-dark-600 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gold-500 flex items-center justify-center text-white font-bold text-sm">
            Au
          </div>
          <div className="min-w-0">
            <h1 className="text-gray-900 font-bold text-base sm:text-lg leading-none">{t('header.title')}</h1>
            <p className="text-gray-500 text-xs hidden sm:block">{t('header.subtitle')}</p>
            <p className="text-gray-500 text-xs sm:hidden">{t('header.subtitleShort')}</p>
          </div>
        </div>

        {/* Live Price + controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Language dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border border-gray-300 text-gray-600 hover:border-gold-500 hover:text-gold-600 transition-colors"
            >
              {/* Earth icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
              </svg>
              <span>{LANGUAGES.find((l) => l.code === lang)?.label}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {open && (
              <div className="absolute end-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => { setLang(l.code); setOpen(false) }}
                    className={`w-full text-start px-3 py-2 text-xs font-medium transition-colors hover:bg-gold-50 hover:text-gold-600 ${lang === l.code ? 'bg-gold-50 text-gold-600' : 'text-gray-700'}`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {loading && !price ? (
            <div className="text-right">
              <div className="skeleton h-5 w-24 mb-1" />
              <div className="skeleton h-3 w-16" />
            </div>
          ) : price ? (
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="text-gold-600 font-bold text-xl sm:text-2xl font-mono tracking-tight">
                  {formatCompact(price)}
                </div>
                <div className={`text-xs sm:text-sm font-medium ${pctColor(changePct)}`}>
                  {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)} ({formatPct(changePct)})
                </div>
                {lastUpdatedAt && (
                  <div className="text-gray-400 text-xs mt-0.5">
                    {t('header.updated', { time: lastUpdatedAt })}
                  </div>
                )}
              </div>

              {/* Refresh button */}
              <button
                onClick={onRefresh}
                disabled={loading}
                title={t('header.refreshPrice')}
                className="ml-1 p-1.5 rounded-md text-gray-400 hover:text-wix hover:bg-gray-100 disabled:opacity-40 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
