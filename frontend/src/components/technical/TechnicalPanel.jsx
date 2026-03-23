import { useState } from 'react'
import { formatCompact } from '../../utils/formatters'

const InfoTooltip = ({ text }) => {
  const [visible, setVisible] = useState(false)
  return (
    <span className="relative inline-flex items-center ml-1">
      <button
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        className="text-gray-600 hover:text-gray-400 transition-colors leading-none"
        aria-label="More info"
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor">
          <circle cx="6.5" cy="6.5" r="6" stroke="currentColor" strokeWidth="1" fill="none"/>
          <text x="6.5" y="9.8" textAnchor="middle" fontSize="8" fontWeight="700" fill="currentColor">i</text>
        </svg>
      </button>
      {visible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-dark-700 border border-dark-500 rounded-lg p-2.5 text-xs text-gray-300 shadow-xl z-50 pointer-events-none">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-dark-500" />
        </div>
      )}
    </span>
  )
}

const SignalBadge = ({ signal }) => {
  const colors = {
    bullish: 'bg-green-900 text-green-400 border-green-800',
    bearish: 'bg-red-900 text-red-400 border-red-800',
    buy: 'bg-green-900 text-green-400 border-green-800',
    sell: 'bg-red-900 text-red-400 border-red-800',
    overbought: 'bg-orange-900 text-orange-400 border-orange-800',
    oversold: 'bg-blue-900 text-blue-400 border-blue-800',
    neutral: 'bg-dark-600 text-gray-400 border-dark-500',
    squeeze: 'bg-yellow-900 text-yellow-400 border-yellow-800',
    expansion: 'bg-purple-900 text-purple-400 border-purple-800',
  }
  const cls = colors[signal?.toLowerCase()] || colors.neutral
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded border uppercase ${cls}`}>
      {signal || 'N/A'}
    </span>
  )
}

const RSIGauge = ({ value }) => {
  if (value == null) return <div className="text-gray-500 text-sm">N/A</div>
  const pct = Math.min(100, Math.max(0, value))
  const color = value > 70 ? '#f97316' : value < 30 ? '#60a5fa' : '#4ade80'
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>Oversold 30</span>
        <span className="font-bold" style={{ color }}>{value.toFixed(1)}</span>
        <span>70 Overbought</span>
      </div>
      <div className="h-2 bg-dark-600 rounded-full overflow-hidden relative">
        {/* Zones */}
        <div className="absolute inset-0 flex">
          <div className="w-[30%] bg-blue-900 opacity-40" />
          <div className="w-[40%] bg-green-900 opacity-20" />
          <div className="w-[30%] bg-orange-900 opacity-40" />
        </div>
        {/* Needle */}
        <div
          className="absolute top-0 h-full w-1 rounded-full"
          style={{ left: `${pct}%`, backgroundColor: color, transform: 'translateX(-50%)' }}
        />
      </div>
    </div>
  )
}

export default function TechnicalPanel({ data, loading }) {
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
    bullish: 'text-green-400',
    bearish: 'text-red-400',
    neutral: 'text-gray-400',
  }

  return (
    <div className="bg-dark-800 border border-dark-600 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold text-base flex items-center">
          Technical Analysis
          <InfoTooltip text="Price-based indicators that help gauge trend direction, momentum, and whether gold may be overbought or oversold. All signals are combined into the overall rating." />
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs">Overall:</span>
          <span className={`font-bold uppercase text-sm ${overallColors[signals?.overall] || 'text-gray-400'}`}>
            {signals?.overall || '—'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Moving Averages */}
        <div>
          <p className="text-gray-500 text-xs font-medium tracking-wider mb-2 flex items-center">
            Moving Averages
            <InfoTooltip text="The average price over a given number of days. Price above the average suggests an uptrend; below suggests a downtrend. EMA reacts faster by weighting recent prices more." />
          </p>
          <div className="space-y-1.5">
            {maEntries.map(({ label, val }) => {
              if (val == null) return null
              const above = current_price > val
              return (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">{label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300 font-mono text-sm">{formatCompact(val)}</span>
                    <span className={`text-xs font-medium ${above ? 'text-green-400' : 'text-red-400'}`}>
                      {above ? 'Above ▲' : 'Below ▼'}
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
            RSI (14)
            <InfoTooltip text="Measures momentum on a 0–100 scale. Below 30 means oversold — price may bounce. Above 70 means overbought — price may pull back. Between 30–70 is neutral." />
          </p>
          <RSIGauge value={rsi?.value} />
          <div className="mt-2 flex justify-end">
            <SignalBadge signal={rsi?.signal} />
          </div>
        </div>

        {/* MACD */}
        <div>
          <p className="text-gray-500 text-xs font-medium tracking-wider mb-2 flex items-center">
            MACD (12, 26, 9)
            <InfoTooltip text="Tracks momentum by comparing two moving averages. When the histogram turns positive, it signals building upward momentum. Negative means downward pressure." />
          </p>
          <div className="space-y-1.5">
            {[
              { label: 'MACD Line', val: macd?.macd_line },
              { label: 'Signal Line', val: macd?.signal_line },
              { label: 'Histogram', val: macd?.histogram },
            ].map(({ label, val }) => (
              <div key={label} className="flex justify-between">
                <span className="text-gray-400 text-sm">{label}</span>
                <span className={`font-mono text-sm ${val != null && val > 0 ? 'text-green-400' : 'text-red-400'}`}>
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
            Bollinger Bands (20, 2)
            <InfoTooltip text="Volatility bands around a 20-day average. Price near the upper band may be stretched; near the lower band may be cheap. %B shows where price sits between the two bands." />
          </p>
          <div className="space-y-1.5">
            {[
              { label: 'Upper', val: bb?.upper, color: 'text-red-400' },
              { label: 'Middle (MA20)', val: bb?.middle, color: 'text-gray-300' },
              { label: 'Lower', val: bb?.lower, color: 'text-green-400' },
            ].map(({ label, val, color }) => (
              <div key={label} className="flex justify-between">
                <span className="text-gray-400 text-sm">{label}</span>
                <span className={`font-mono text-sm ${color}`}>
                  {val != null ? formatCompact(val) : '—'}
                </span>
              </div>
            ))}
            {bb?.percent_b != null && (
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">%B</span>
                <span className="font-mono text-sm text-gray-300">
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
