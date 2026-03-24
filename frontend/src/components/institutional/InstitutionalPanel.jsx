import { useLanguage } from '../../i18n/LanguageContext'

const StanceBadge = ({ stance }) => {
  const styles = {
    bullish: 'bg-green-50 text-green-700 border-green-200',
    bearish: 'bg-red-50 text-red-700 border-red-200',
    neutral: 'bg-gray-100 text-gray-600 border-gray-200',
  }
  const cls = styles[stance?.toLowerCase()] || styles.neutral
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded border uppercase ${cls}`}>
      {stance || 'N/A'}
    </span>
  )
}

const SkeletonRow = () => (
  <div className="flex items-start justify-between gap-3 py-3 border-b border-gray-100">
    <div className="flex-1 space-y-1.5">
      <div className="skeleton h-4 w-32" />
      <div className="skeleton h-3 w-full" />
    </div>
    <div className="skeleton h-5 w-16 rounded" />
  </div>
)

export default function InstitutionalPanel({ data, loading }) {
  const { t } = useLanguage()

  if (loading) {
    return (
      <div className="bg-dark-800 border border-dark-600 rounded-xl p-4 shadow-sm">
        <div className="skeleton h-5 w-56 mb-4" />
        {[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}
      </div>
    )
  }

  if (!data?.available) {
    return (
      <div className="bg-dark-800 border border-dark-600 rounded-xl p-4 shadow-sm">
        <h2 className="text-gray-900 font-semibold text-base mb-3">{t('institutional.title')}</h2>
        <p className="text-gray-500 text-sm">{t('institutional.unavailable')}</p>
      </div>
    )
  }

  const institutions = data.institutions || []

  const bullish = institutions.filter((i) => i.stance?.toLowerCase() === 'bullish').length
  const bearish = institutions.filter((i) => i.stance?.toLowerCase() === 'bearish').length
  const neutral = institutions.filter((i) => i.stance?.toLowerCase() === 'neutral').length

  return (
    <div className="bg-dark-800 border border-dark-600 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-gray-900 font-semibold text-base">{t('institutional.title')}</h2>
        <div className="flex items-center gap-2 text-xs">
          {bullish > 0 && <span className="text-green-600">{t('institutional.bullish', { n: bullish })}</span>}
          {neutral > 0 && <span className="text-gray-500">{t('institutional.neutral', { n: neutral })}</span>}
          {bearish > 0 && <span className="text-red-500">{t('institutional.bearish', { n: bearish })}</span>}
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {institutions.map((inst, i) => (
          <div key={i} className="flex items-start justify-between gap-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 text-sm font-semibold leading-tight">{inst.institution}</p>
              {inst.target && (
                <p className="text-amber-500 font-mono text-xs mt-0.5 mb-1">{inst.target}</p>
              )}
              <p className="text-gray-600 text-xs leading-relaxed">{inst.rationale}</p>
            </div>
            <div className="flex-shrink-0 pt-0.5">
              <StanceBadge stance={inst.stance} />
            </div>
          </div>
        ))}
      </div>

      {data.note && (
        <p className="text-gray-500 text-xs mt-3 pt-3 border-t border-gray-100">{data.note}</p>
      )}
    </div>
  )
}
