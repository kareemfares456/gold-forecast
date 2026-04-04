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
import { formatCompact } from '../../utils/formatters'
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
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm shadow-xl">
      <p className="text-gray-500 mb-1">{label}</p>
      {relevant.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }} className="font-mono">
          {entry.name}: {formatCompact(entry.value)}
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

  const label = payload.displayLabel ?? payload.date.replace('+', '')
  const price = formatCompact(payload.forecast)
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

export default function PriceChart({ history, forecasts }) {
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

  return (
    <figure className="bg-dark-800 border border-dark-600 rounded-xl p-4 shadow-sm" ref={containerRef}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-gray-900 font-semibold text-base">
          {t('chart.title')}
          <span className="text-gray-500 font-normal text-sm ml-2">{t('chart.subtitle')}</span>
        </h2>
      </div>
      <figcaption className="sr-only">{t('chart.srCaption')}</figcaption>

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
              return (
                <div key={fp.date} className="flex flex-col items-center">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <p className="text-gray-500 text-xs leading-tight whitespace-nowrap">
                      {fp.displayLabel ?? fp.date.replace('+', '')}
                    </p>
                  </div>
                  <p className="font-mono text-xs font-bold whitespace-nowrap" style={{ color }}>
                    {formatCompact(fp.forecast)}
                  </p>
                </div>
              )
            })}
          </div>
          {forecastPoints.length > 4 && (
            <div className="flex justify-center gap-x-8 mt-2">
              {forecastPoints.slice(4).map((fp, i) => {
                const color = FORECAST_COLORS[(i + 4) % FORECAST_COLORS.length]
                return (
                  <div key={fp.date} className="flex flex-col items-center">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <p className="text-gray-500 text-xs leading-tight whitespace-nowrap">
                        {fp.displayLabel ?? fp.date.replace('+', '')}
                      </p>
                    </div>
                    <p className="font-mono text-xs font-bold whitespace-nowrap" style={{ color }}>
                      {formatCompact(fp.forecast)}
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
