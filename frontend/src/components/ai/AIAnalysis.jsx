import { useLanguage } from '../../i18n/LanguageContext'

const sentimentColors = {
  bullish: 'bg-green-50 text-green-700 border-green-200',
  bearish: 'bg-red-50 text-red-700 border-red-200',
  neutral: 'bg-gray-100 text-gray-600 border-gray-200',
}

export default function AIAnalysis({ data, loading }) {
  const { t, tLabel } = useLanguage()

  if (loading) {
    return (
      <div className="bg-dark-800 border border-dark-600 rounded-xl p-4">
        <div className="skeleton h-5 w-48 mb-4" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-4" style={{ width: `${70 + i * 4}%` }} />
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  const { available, analysis, sentiment, error } = data

  if (!available) {
    return (
      <div className="bg-dark-800 border border-dark-600 rounded-xl p-4 text-center shadow-sm">
        <p className="text-gray-500 text-sm">{t('ai.unavailable')}</p>
        {error && <p className="text-gray-400 text-xs mt-1">{error}</p>}
      </div>
    )
  }

  return (
    <div className="bg-dark-800 border border-dark-600 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-gray-900 font-semibold text-base">
          {t('ai.title')}
        </h2>
        {sentiment && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded border uppercase ${sentimentColors[sentiment] || sentimentColors.neutral}`}>
            {sentiment}
          </span>
        )}
      </div>

      {Array.isArray(analysis) && analysis.length > 0 && (
        <ul className="space-y-3">
          {analysis.map((bullet, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-gray-700 leading-relaxed">
              <span className="text-gold-600 font-semibold text-xs mt-0.5 w-20 flex-shrink-0">
                {tLabel(bullet.label ?? bullet)}
              </span>
              <span>{bullet.text ?? ''}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
