import { formatCompact, formatPct, pctColor } from '../../utils/formatters'
import { useLanguage } from '../../i18n/LanguageContext'

export default function Header({ data, loading, onRefresh, lastUpdatedAt }) {
  const { t, toggleLang } = useLanguage()
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
          {/* Language toggle */}
          <button
            onClick={toggleLang}
            className="text-xs font-semibold px-2.5 py-1 rounded-full border border-gray-300 text-gray-600 hover:border-gold-500 hover:text-gold-600 transition-colors"
          >
            {t('switchLang')}
          </button>

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
