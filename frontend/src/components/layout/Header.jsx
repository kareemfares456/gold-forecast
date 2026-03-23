import { formatCompact, formatPct, pctColor } from '../../utils/formatters'

export default function Header({ data, loading }) {
  const price = data?.current_price
  const changePct = data?.change_pct
  const change = data?.change
  const lastUpdated = data?.last_updated

  return (
    <header className="bg-dark-800 border-b border-dark-600 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gold-500 flex items-center justify-center text-dark-900 font-bold text-sm">
            Au
          </div>
          <div className="min-w-0">
            <h1 className="text-white font-bold text-base sm:text-lg leading-none">Gold Forecaster</h1>
            <p className="text-gray-500 text-xs hidden sm:block">XAU/USD · Gold Futures (GC=F)</p>
            <p className="text-gray-500 text-xs sm:hidden">XAU/USD</p>
          </div>
        </div>

        {/* Live Price */}
        {loading ? (
          <div className="text-right flex-shrink-0">
            <div className="skeleton h-5 w-24 mb-1" />
            <div className="skeleton h-3 w-16" />
          </div>
        ) : price ? (
          <div className="text-right flex-shrink-0">
            <div className="text-gold-400 font-bold text-xl sm:text-2xl font-mono tracking-tight">
              {formatCompact(price)}
            </div>
            <div className={`text-xs sm:text-sm font-medium ${pctColor(changePct)}`}>
              {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)} ({formatPct(changePct)})
            </div>
            {lastUpdated && (
              <div className="text-gray-600 text-xs mt-0.5 hidden sm:block">Updated {lastUpdated}</div>
            )}
          </div>
        ) : null}
      </div>
    </header>
  )
}
