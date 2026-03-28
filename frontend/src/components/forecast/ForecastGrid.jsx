import { useState } from 'react'
import ForecastCard from './ForecastCard'
import { useLanguage } from '../../i18n/LanguageContext'

export default function ForecastGrid({ forecasts, loading, generatedAt }) {
  const { t } = useLanguage()
  const [showBreakdown, setShowBreakdown] = useState(false)

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-dark-800 border border-dark-600 rounded-xl p-4 space-y-2">
            <div className="skeleton h-3 w-16" />
            <div className="skeleton h-7 w-24" />
            <div className="skeleton h-4 w-20" />
            <div className="skeleton h-2 w-full mt-2" />
          </div>
        ))}
      </div>
    )
  }

  if (!forecasts?.length) return null

  return (
    <section aria-label={t('forecastGrid.ariaLabel')}>
      <h2 className="text-gray-900 font-semibold text-base mb-1">
        {t('forecastGrid.title')}
        <span className="text-gray-500 font-normal text-sm ml-2">
          {showBreakdown ? t('forecastGrid.hideBreakdown') : t('forecastGrid.showBreakdown')}
        </span>
      </h2>
      {generatedAt && (
        <time dateTime={generatedAt} className="text-gray-400 text-xs block mb-3">
          {t('forecastGrid.updated', { time: new Date(generatedAt).toLocaleString() })}
        </time>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {forecasts.map((f) => (
          <ForecastCard
            key={f.timeframe}
            forecast={f}
            showBreakdown={showBreakdown}
            onClick={() => setShowBreakdown((v) => !v)}
          />
        ))}
      </div>
    </section>
  )
}
