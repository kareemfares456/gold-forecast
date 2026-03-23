const StanceBadge = ({ stance }) => {
  const styles = {
    bullish: 'bg-green-900 text-green-400 border-green-800',
    bearish: 'bg-red-900 text-red-400 border-red-800',
    neutral: 'bg-dark-600 text-gray-400 border-dark-500',
  }
  const cls = styles[stance?.toLowerCase()] || styles.neutral
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded border uppercase ${cls}`}>
      {stance || 'N/A'}
    </span>
  )
}

const SkeletonRow = () => (
  <div className="flex items-start justify-between gap-3 py-3 border-b border-dark-700">
    <div className="flex-1 space-y-1.5">
      <div className="skeleton h-4 w-32" />
      <div className="skeleton h-3 w-full" />
    </div>
    <div className="skeleton h-5 w-16 rounded" />
  </div>
)

export default function InstitutionalPanel({ data, loading }) {
  if (loading) {
    return (
      <div className="bg-dark-800 border border-dark-600 rounded-xl p-4">
        <div className="skeleton h-5 w-56 mb-4" />
        {[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}
      </div>
    )
  }

  if (!data?.available) {
    return (
      <div className="bg-dark-800 border border-dark-600 rounded-xl p-4">
        <h2 className="text-white font-semibold text-base mb-3">Institutional Forecasts</h2>
        <p className="text-gray-500 text-sm">
          AI-powered institutional analysis unavailable — ANTHROPIC_API_KEY not configured.
        </p>
      </div>
    )
  }

  const institutions = data.institutions || []

  const bullish = institutions.filter((i) => i.stance?.toLowerCase() === 'bullish').length
  const bearish = institutions.filter((i) => i.stance?.toLowerCase() === 'bearish').length
  const neutral = institutions.filter((i) => i.stance?.toLowerCase() === 'neutral').length

  return (
    <div className="bg-dark-800 border border-dark-600 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold text-base">Institutional Forecasts</h2>
        <div className="flex items-center gap-2 text-xs">
          {bullish > 0 && <span className="text-green-400">{bullish} bullish</span>}
          {neutral > 0 && <span className="text-gray-400">{neutral} neutral</span>}
          {bearish > 0 && <span className="text-red-400">{bearish} bearish</span>}
        </div>
      </div>

      <div className="divide-y divide-dark-700">
        {institutions.map((inst, i) => (
          <div key={i} className="flex items-start justify-between gap-4 py-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white text-sm font-medium">{inst.institution}</span>
                {inst.target && (
                  <span className="text-amber-400 font-mono text-xs">{inst.target}</span>
                )}
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">{inst.rationale}</p>
            </div>
            <div className="flex-shrink-0 pt-0.5">
              <StanceBadge stance={inst.stance} />
            </div>
          </div>
        ))}
      </div>

      {data.note && (
        <p className="text-gray-600 text-xs mt-3 pt-3 border-t border-dark-700">{data.note}</p>
      )}
    </div>
  )
}
