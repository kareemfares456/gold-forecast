import { useState } from 'react'
import { formatCompact } from '../../utils/formatters'
import { useLanguage } from '../../i18n/LanguageContext'

const InfoTooltip = ({ text }) => {
  const { t } = useLanguage()
  const [visible, setVisible] = useState(false)
  return (
    <span className="relative inline-flex items-center ml-1">
      <button
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        className="text-gray-400 hover:text-gray-600 transition-colors leading-none"
        aria-label={t('technical.moreInfo')}
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor">
          <circle cx="6.5" cy="6.5" r="6" stroke="currentColor" strokeWidth="1" fill="none"/>
          <text x="6.5" y="9.8" textAnchor="middle" fontSize="8" fontWeight="700" fill="currentColor">i</text>
        </svg>
      </button>
      {visible && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-700 shadow-lg z-50 pointer-events-none" style={{ right: 'auto', maxWidth: 'min(14rem, calc(100vw - 1rem))' }}>
          <div className="absolute bottom-full left-3 border-4 border-transparent border-b-gray-200" />
          {text}
        </div>
      )}
    </span>
  )
}

const SignalBadge = ({ signal }) => {
  const colors = {
    bullish: 'bg-green-50 text-green-700 border-green-200',
    bearish: 'bg-red-50 text-red-700 border-red-200',
    buy: 'bg-green-50 text-green-700 border-green-200',
    sell: 'bg-red-50 text-red-700 border-red-200',
    overbought: 'bg-orange-50 text-orange-700 border-orange-200',
    oversold: 'bg-blue-50 text-blue-700 border-blue-200',
    neutral: 'bg-gray-100 text-gray-600 border-gray-200',
    squeeze: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    expansion: 'bg-purple-50 text-purple-700 border-purple-200',
  }
  const cls = colors[signal?.toLowerCase()] || colors.neutral
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded border uppercase ${cls}`}>
      {signal || 'N/A'}
    </span>
  )
}

const RSIGauge = ({ value }) => {
  const { t } = useLanguage()
  if (value == null) return <div className="text-gray-500 text-sm">N/A</div>
  const pct = Math.min(100, Math.max(0, value))
  const color = value > 70 ? '#f97316' : value < 30 ? '#3b82f6' : '#16a34a'
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{t('technical.oversold')}</span>
        <span className="font-bold" style={{ color }}>{value.toFixed(1)}</span>
        <span>{t('technical.overbought')}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden relative">
        <div className="absolute inset-0 flex">
          <div className="w-[30%] bg-blue-200 opacity-50" />
          <div className="w-[40%] bg-green-100 opacity-50" />
          <div className="w-[30%] bg-orange-200 opacity-50" />
        </div>
        <div
          className="absolute top-0 h-full w-1 rounded-full"
          style={{ left: `${pct}%`, backgroundColor: color, transform: 'translateX(-50%)' }}
        />
      </div>
    </div>
  )
}

export default function TechnicalPanel({ data, loading }) {
  const { t } = useLanguage()

  if (loading) {
    return (
      <div className="bg-dark-800 border border-dark-600 rounded-xl p-4 space-y-3">
        <div className="skeleton h-5 w-40" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton h-10 w-full" />
        ))}
      </div>
    )
  }

  if (!data) return null

  const { moving_averages: ma, rsi, macd, bollinger_bands: bb, signals, current_price } = data

  const maEntries = [
    { label: 'MA 20', val: ma?.ma_20 },
    { label: 'MA 50', val: ma?.ma_50 },
    { label: 'MA 200', val: ma?.ma_200 },
    { label: 'EMA 12', val: ma?.ema_12 },
    { label: 'EMA 26', val: ma?.ema_26 },
  ]

  const overallColors = {
    bullish: 'text-green-600',
    bearish: 'text-red-600',
    neutral: 'text-gray-500',
  }

  return (
    <div className="bg-dark-800 border border-dark-600 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-gray-900 font-semibold text-base flex items-center">
          {t('technical.title')}
          <InfoTooltip text={t('technical.titleTooltip')} />
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs">{t('technical.overall')}</span>
          <span className={`font-bold uppercase text-sm ${overallColors[signals?.overall] || 'text-gray-500'}`}>
            {signals?.overall || '—'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Moving Averages */}
        <div>
          <p className="text-gray-500 text-xs font-medium tracking-wider mb-2 flex items-center">
            {t('technical.movingAverages')}
            <InfoTooltip text={t('technical.movingAveragesTooltip')} />
          </p>
          <div className="space-y-1.5">
            {maEntries.map(({ label, val }) => {
              if (val == null) return null
              const above = current_price > val
              return (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm">{label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-700 font-mono text-sm">{formatCompact(val)}</span>
                    <span className={`text-xs font-medium ${above ? 'text-green-600' : 'text-red-500'}`}>
                      {above ? t('technical.above') : t('technical.below')}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* RSI */}
        <div>
          <p className="text-gray-500 text-xs font-medium tracking-wider mb-2 flex items-center">
            {t('technical.rsi')}
            <InfoTooltip text={t('technical.rsiTooltip')} />
          </p>
          <RSIGauge value={rsi?.value} />
          <div className="mt-2 flex justify-end">
            <SignalBadge signal={rsi?.signal} />
          </div>
        </div>

        {/* MACD */}
        <div>
          <p className="text-gray-500 text-xs font-medium tracking-wider mb-2 flex items-center">
            {t('technical.macd')}
            <InfoTooltip text={t('technical.macdTooltip')} />
          </p>
          <div className="space-y-1.5">
            {[
              { key: 'macdLine', val: macd?.macd_line },
              { key: 'signalLine', val: macd?.signal_line },
              { key: 'histogram', val: macd?.histogram },
            ].map(({ key, val }) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-600 text-sm">{t(`technical.${key}`)}</span>
                <span className={`font-mono text-sm ${val != null && val > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {val != null ? val.toFixed(2) : '—'}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-end">
            <SignalBadge signal={macd?.crossover_signal} />
          </div>
        </div>

        {/* Bollinger Bands */}
        <div>
          <p className="text-gray-500 text-xs font-medium tracking-wider mb-2 flex items-center">
            {t('technical.bollingerBands')}
            <InfoTooltip text={t('technical.bollingerTooltip')} />
          </p>
          <div className="space-y-1.5">
            {[
              { key: 'upper', val: bb?.upper, color: 'text-red-500' },
              { key: 'middle', val: bb?.middle, color: 'text-gray-700' },
              { key: 'lower', val: bb?.lower, color: 'text-green-600' },
            ].map(({ key, val, color }) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-600 text-sm">{t(`technical.${key}`)}</span>
                <span className={`font-mono text-sm ${color}`}>
                  {val != null ? formatCompact(val) : '—'}
                </span>
              </div>
            ))}
            {bb?.percent_b != null && (
              <div className="flex justify-between">
                <span className="text-gray-600 text-sm">%B</span>
                <span className="font-mono text-sm text-gray-700">
                  {(bb.percent_b * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          <div className="mt-2 flex justify-end">
            <SignalBadge signal={bb?.signal} />
          </div>
        </div>
      </div>
    </div>
  )
}
