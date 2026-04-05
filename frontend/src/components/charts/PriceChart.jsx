import { useState, useRef, useEffect } from 'react'
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { formatPct, pctColor } from '../../utils/formatters'
import { useLanguage } from '../../i18n/LanguageContext'
import { translations } from '../../i18n/translations'

// Gold chart color
const TV_TEAL = '#eab308'

// Golden gradient per forecast point — medium gold (near-term) → deepest (long-term)
const FORECAST_COLORS = [
  '#F59E0B', // Tomorrow  — amber
  '#D97706', // 3 Days    — deep amber
  '#B45309', // 1 Week    — rich bronze
  '#92400E', // 1 Month   — dark bronze
  '#78350F', // 6 Months  — deep brown
  '#451A03', // 1 Year    — darkest brown
]

const PERIODS = ['1M', '3M', '6M', '1Y']

function filterHistory(history, period) {
  if (!history?.length) return history || []
  if (period === 'All') return history
  const today = new Date()
  let cutoff
  switch (period) {
    case '1D': cutoff = new Date(today); cutoff.setDate(cutoff.getDate() - 1); break
    case '5D': cutoff = new Date(today); cutoff.setDate(cutoff.getDate() - 5); break
    case '1M': cutoff = new Date(today); cutoff.setMonth(cutoff.getMonth() - 1); break
    case '3M': cutoff = new Date(today); cutoff.setMonth(cutoff.getMonth() - 3); break
    case '6M': cutoff = new Date(today); cutoff.setMonth(cutoff.getMonth() - 6); break
    case '1Y': cutoff = new Date(today); cutoff.setFullYear(cutoff.getFullYear() - 1); break
    default: return history
  }
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  const filtered = history.filter((p) => p.date >= cutoffStr)
  return filtered.length > 1 ? filtered : history.slice(-2)
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const relevant = payload.filter((p) => p.value != null)
  if (!relevant.length) return null
  const fmt = (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm shadow-xl">
      <p className="text-gray-500 mb-1">{label}</p>
      {relevant.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }} className="font-mono">
          {entry.name}: {fmt(entry.value)}
        </p>
      ))}
    </div>
  )
}

// Stagger heights so annotation boxes don't overlap on desktop
const LABEL_OFFSETS = [
  { dx: -38, dy: -30 },
  { dx: -38, dy: -80 },
  { dx: -38, dy: -30 },
  { dx: -38, dy: -80 },
  { dx: -38, dy: -30 },
]

const ForecastDot = (props) => {
  const { cx, cy, payload, isMobile } = props
  if (payload.forecast == null || cx == null) return null

  const color = FORECAST_COLORS[payload.colorIndex % FORECAST_COLORS.length]

  if (isMobile) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={10} fill={color} fillOpacity={0.15} />
        <circle cx={cx} cy={cy} r={5} fill={color} stroke="#F8F9FA" strokeWidth={2} />
      </g>
    )
  }

  const fmt = (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const label = payload.displayLabel ?? payload.date.replace('+', '')
  const price = fmt(payload.forecast)
  const offset = LABEL_OFFSETS[payload.colorIndex % LABEL_OFFSETS.length] || { dx: -38, dy: -30 }

  const boxW = 80
  const boxH = 34
  const boxX = cx + offset.dx
  const boxY = cy + offset.dy - 17
  const connX = boxX + boxW / 2
  const connY = boxY + boxH

  return (
    <g>
      <line x1={cx} y1={cy} x2={connX} y2={connY} stroke={color} strokeWidth={1} strokeOpacity={0.4} strokeDasharray="2 2" />
      <circle cx={cx} cy={cy} r={12} fill={color} fillOpacity={0.15} />
      <circle cx={cx} cy={cy} r={7} fill={color} stroke="#F8F9FA" strokeWidth={2} />
      <rect x={boxX} y={boxY} width={boxW} height={boxH} rx={5} fill="#FFFFFF" stroke={color} strokeWidth={1} strokeOpacity={0.7} />
      <text x={boxX + boxW / 2} y={boxY + 12} textAnchor="middle" fill="#6B7280" fontSize={9} fontWeight="600" letterSpacing="0.06em">
        {label.toUpperCase()}
      </text>
      <text x={boxX + boxW / 2} y={boxY + 26} textAnchor="middle" fill={color} fontSize={11} fontWeight="700">
        {price}
      </text>
    </g>
  )
}

const PERIOD_LABELS = { '1M': '1 month', '3M': '3 months', '6M': '6 months', '1Y': '1 year' }

export default function PriceChart({ history, forecasts, priceData, onRefresh, loading }) {
  const { t, lang } = useLanguage()
  const labelMap = translations[lang]?.labels ?? {}
  const containerRef = useRef(null)
  const [containerWidth, setContainerWidth] = useState(800)
  const [period, setPeriod] = useState('1M')

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const isMobile = containerWidth < 580

  const filteredHistory = filterHistory(history, period)
  const historyData = (filteredHistory || []).map((p) => ({ date: p.date, close: p.close }))

  const forecastPoints = (forecasts || []).map((f, i) => ({
    date: `+${f.label}`,
    displayLabel: labelMap[f.label] ?? f.label,
    forecast: f.predicted_price,
    colorIndex: i,
  }))

  const historyLen = historyData.length
  const forecastSlots = Math.round((historyLen * 40) / 60)
  const slotSize = forecastPoints.length ? Math.max(1, Math.floor(forecastSlots / forecastPoints.length)) : 1
  const gap = Math.max(1, Math.floor(slotSize * 0.4))

  const paddedForecast = []
  let spacerIdx = 0
  for (let i = 0; i < gap; i++) paddedForecast.push({ date: `__s${spacerIdx++}`, forecast: null })
  forecastPoints.forEach((fp, i) => {
    paddedForecast.push(fp)
    if (i < forecastPoints.length - 1) {
      const spacers = slotSize - 1
      for (let j = 0; j < spacers; j++) paddedForecast.push({ date: `__s${spacerIdx++}`, forecast: null })
    }
  })

  const combined = [...historyData, ...paddedForecast]

  const allPrices = [
    ...historyData.map((d) => d.close),
    ...forecastPoints.map((d) => d.forecast),
  ].filter((v) => v != null && v > 0)

  const minY = allPrices.length ? Math.floor(Math.min(...allPrices) * 0.97) : 0
  const maxY = allPrices.length ? Math.ceil(Math.max(...allPrices) * 1.09) : 10000

  const todayDate = historyData[historyData.length - 1]?.date

  const DotWithMobile = (props) => <ForecastDot {...props} isMobile={isMobile} />

  // Price header data
  const price = priceData?.current_price
  const change = priceData?.change
  const changePct = priceData?.change_pct
  const firstPrice = filteredHistory?.[0]?.close
  const periodChangeAbs = price != null && firstPrice != null ? price - firstPrice : null
  const periodChangePct = periodChangeAbs != null && firstPrice ? (periodChangeAbs / firstPrice) * 100 : null

  const formatBigPrice = (p) =>
    p != null ? Number(p).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : '—'

  const fmtChange = (v) =>
    v != null ? `${v >= 0 ? '+' : ''}${Math.abs(v).toFixed(3)}` : '—'

  return (
    <figure className="bg-dark-800 border border-dark-600 rounded-xl p-4 sm:p-6 shadow-sm" ref={containerRef}>
      <figcaption className="sr-only">{t('chart.srCaption')}</figcaption>

      {/* ── Price header (TradingView-style) ── */}
      <div className="mb-4 sm:mb-6">
        {/* Title row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            {/* Gold coin icon */}
            <div className="w-9 h-9 rounded-full bg-gold-500 flex items-center justify-center flex-shrink-0 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9h18v3H3V9zm0 5h18v3H3v-3zm3-8h12v3H6V6z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-800 font-bold text-sm leading-tight">GOLD (US$/OZ)</p>
              <p className="text-gray-400 text-xs leading-tight">XAU/USD · TVC</p>
            </div>
          </div>

          {/* Refresh button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              title={t('header.refreshPrice')}
              className="p-1.5 rounded-md text-gray-400 hover:text-gold-600 hover:bg-gold-50 disabled:opacity-40 transition-colors"
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
          )}
        </div>

        {/* Big price */}
        {loading && !price ? (
          <div className="space-y-2">
            <div className="skeleton h-12 w-56" />
            <div className="skeleton h-4 w-40" />
            <div className="skeleton h-4 w-48" />
          </div>
        ) : price ? (
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-gray-900 font-bold text-4xl sm:text-5xl font-mono tracking-tight leading-none">
                {formatBigPrice(price)}
              </span>
              <span className="text-gray-400 text-lg font-medium">USD</span>
            </div>

            {/* Day change */}
            <p className={`text-sm font-semibold mt-1.5 ${pctColor(changePct)}`}>
              {fmtChange(change)}&nbsp;&nbsp;{formatPct(changePct)}&nbsp;
              <span className="font-normal text-gray-400">at close</span>
            </p>

            {/* Period change */}
            {periodChangeAbs != null && (
              <p className={`text-sm font-semibold mt-0.5 ${pctColor(periodChangePct)}`}>
                {fmtChange(periodChangeAbs)}&nbsp;&nbsp;{formatPct(periodChangePct)}&nbsp;
                <span className="font-normal text-gray-400">past {PERIOD_LABELS[period] ?? period}</span>
              </p>
            )}
          </div>
        ) : null}
      </div>

      {/* ── Chart ── */}
      <div role="img" aria-label={t('chart.srLabel')}>
        <ResponsiveContainer width="100%" height={isMobile ? 280 : 400}>
          <ComposedChart
            data={combined}
            margin={
              isMobile
                ? { top: 20, right: 16, bottom: 5, left: 0 }
                : { top: 100, right: 50, bottom: 5, left: 10 }
            }
          >
            <defs>
              <linearGradient id="tvGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={TV_TEAL} stopOpacity={0.3} />
                <stop offset="95%" stopColor={TV_TEAL} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E9ECEF" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6b7280', fontSize: isMobile ? 9 : 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              tickFormatter={(v) => {
                if (v?.startsWith?.('__s')) return ''
                if (v?.startsWith?.('+') && isMobile) return ''
                return v || ''
              }}
            />
            <YAxis
              domain={[minY, maxY]}
              tick={{ fill: '#6b7280', fontSize: isMobile ? 9 : 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${v.toLocaleString()}`}
              width={isMobile ? 62 : 80}
            />
            <Tooltip content={<CustomTooltip />} />
            {todayDate && (
              <ReferenceLine
                x={todayDate}
                stroke="#D1D5DB"
                strokeDasharray="4 2"
                label={{ value: t('chart.today'), fill: '#6b7280', fontSize: 10, position: 'insideTopLeft' }}
              />
            )}
            <Area
              type="monotone"
              dataKey="close"
              stroke={TV_TEAL}
              strokeWidth={2}
              fill="url(#tvGradient)"
              dot={false}
              activeDot={{ r: 4, fill: TV_TEAL }}
              name={t('chart.close')}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={<DotWithMobile />}
              activeDot={{ r: 8, fill: '#fbbf24', stroke: '#F8F9FA', strokeWidth: 2 }}
              name={t('chart.forecast')}
              connectNulls={true}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Period selector — TradingView style */}
      <div className="flex items-center justify-center gap-0.5 mt-3 pt-3 border-t border-gray-100">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={period === p ? { backgroundColor: TV_TEAL, color: '#fff' } : {}}
            className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
              period === p
                ? ''
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Mobile forecast legend */}
      {isMobile && forecastPoints.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex justify-between gap-x-4 gap-y-2">
            {forecastPoints.slice(0, 4).map((fp, i) => {
              const color = FORECAST_COLORS[i % FORECAST_COLORS.length]
              const fmt = (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              return (
                <div key={fp.date} className="flex flex-col items-center">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <p className="text-gray-500 text-xs leading-tight whitespace-nowrap">
                      {fp.displayLabel ?? fp.date.replace('+', '')}
                    </p>
                  </div>
                  <p className="font-mono text-xs font-bold whitespace-nowrap" style={{ color }}>
                    {fmt(fp.forecast)}
                  </p>
                </div>
              )
            })}
          </div>
          {forecastPoints.length > 4 && (
            <div className="flex justify-center gap-x-8 mt-2">
              {forecastPoints.slice(4).map((fp, i) => {
                const color = FORECAST_COLORS[(i + 4) % FORECAST_COLORS.length]
                const fmt = (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                return (
                  <div key={fp.date} className="flex flex-col items-center">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <p className="text-gray-500 text-xs leading-tight whitespace-nowrap">
                        {fp.displayLabel ?? fp.date.replace('+', '')}
                      </p>
                    </div>
                    <p className="font-mono text-xs font-bold whitespace-nowrap" style={{ color }}>
                      {fmt(fp.forecast)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </figure>
  )
}
