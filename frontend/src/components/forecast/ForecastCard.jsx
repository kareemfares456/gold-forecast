import { formatCompact, formatPct, directionColor } from '../../utils/formatters'
import { useLanguage } from '../../i18n/LanguageContext'

export default function ForecastCard({ forecast, showBreakdown, onClick }) {
  const { t, tLabel } = useLanguage()
  const {
    label,
    predicted_price,
    price_change,
    price_change_pct,
    confidence_low,
    confidence_high,
    direction,
    model_contributions,
  } = forecast

  const arrow = direction === 'up' ? '▲' : direction === 'down' ? '▼' : '—'
  const rangeSpan = confidence_high - confidence_low
  const rangeCenter = predicted_price - confidence_low
  const fillPct = rangeSpan > 0 ? Math.min(100, (rangeCenter / rangeSpan) * 100) : 50

  const models = model_contributions ? Object.entries(model_contributions) : []

  return (
    <article
      className={`bg-dark-800 border rounded-xl p-4 cursor-pointer transition-colors ${
        showBreakdown ? 'border-gold-500' : 'border-dark-600 hover:border-gold-700'
      }`}
      onClick={onClick}
      aria-label={`Gold price forecast: ${label}`}
    >
      <div className="text-gray-600 text-xs font-medium uppercase tracking-wider mb-2">{tLabel(label)}</div>

      <div className="text-gold-600 font-bold text-lg sm:text-2xl font-mono leading-none mb-1 truncate">
        {formatCompact(predicted_price)}
      </div>

      <div className={`text-xs sm:text-sm font-medium flex items-center gap-1 flex-wrap ${directionColor(direction)}`}>
        <span>{arrow}</span>
        <span className="truncate">{formatCompact(Math.abs(price_change))}</span>
        <span className="text-gray-500">({formatPct(price_change_pct)})</span>
      </div>

      <div className="mt-3">
        <div className="flex justify-between text-gray-400 text-xs mb-1 gap-1">
          <span className="truncate">{formatCompact(confidence_low)}</span>
          <span className="truncate text-right">{formatCompact(confidence_high)}</span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-gold-600 rounded-full" style={{ width: `${fillPct}%` }} />
        </div>
        <p className="text-gray-400 text-xs mt-1 text-center">{t('forecastCard.confidence')}</p>
      </div>

      {showBreakdown && models.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
          {models.map(([model, data]) => (
            <div key={model} className="flex justify-between items-center">
              <span className="text-gray-600 text-xs">
                {t(`models.${model}`) || model}
                <span className="text-gray-400 ml-1">
                  {(data.weight * 100).toFixed(0)}%
                </span>
              </span>
              <span className="text-gray-700 font-mono text-xs">{formatCompact(data.price)}</span>
            </div>
          ))}
          <div className="flex justify-between items-center pt-1 border-t border-gray-200">
            <span className="text-gray-600 text-xs font-semibold">{t('forecastCard.blended')}</span>
            <span className="text-gold-600 font-mono text-xs font-bold">{formatCompact(predicted_price)}</span>
          </div>
        </div>
      )}
    </article>
  )
}
