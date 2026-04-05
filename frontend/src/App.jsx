import { lazy, Suspense } from 'react'
import './index.css'
import Header from './components/layout/Header'
import Disclaimer from './components/layout/Disclaimer'
import FAQSection from './components/layout/FAQSection'
import ForecastGrid from './components/forecast/ForecastGrid'
import { useGoldPrice } from './hooks/useGoldPrice'
import { useForecast } from './hooks/useForecast'
import { useTechnical } from './hooks/useTechnical'
import { useInstitutional } from './hooks/useInstitutional'
import { useLanguage } from './i18n/LanguageContext'

// Heavy components loaded lazily — recharts + complex UI deferred until after initial paint
const PriceChart         = lazy(() => import('./components/charts/PriceChart'))
const TechnicalPanel     = lazy(() => import('./components/technical/TechnicalPanel'))
const AIAnalysis         = lazy(() => import('./components/ai/AIAnalysis'))
const InstitutionalPanel = lazy(() => import('./components/institutional/InstitutionalPanel'))
// Shared skeleton placeholder while lazy chunks load
function PanelSkeleton({ className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 animate-pulse ${className}`}>
      <div className="p-6 space-y-3">
        <div className="h-4 bg-gray-100 rounded w-1/3" />
        <div className="h-4 bg-gray-100 rounded w-2/3" />
        <div className="h-4 bg-gray-100 rounded w-1/2" />
      </div>
    </div>
  )
}

export default function App() {
  const { data: priceData, loading: priceLoading, refetch: refetchPrice, lastUpdatedAt } = useGoldPrice()
  const { data: forecastData, loading: forecastLoading, refetch: refetchForecast } = useForecast()
  const { data: technicalData, loading: technicalLoading } = useTechnical()
  const { data: institutionalData, loading: institutionalLoading } = useInstitutional()
  const { t } = useLanguage()

  return (
    <div className="min-h-screen bg-dark-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Price chart — lazy (recharts chunk) */}
        <section id="chart" aria-label={t('app.priceChart')}>
          <Suspense fallback={<PanelSkeleton className="h-80" />}>
            <PriceChart
              history={priceData?.history}
              forecasts={forecastData?.forecasts}
              priceData={priceData}
              onRefresh={refetchPrice}
              loading={priceLoading}
            />
          </Suspense>
        </section>

        {/* Forecast cards */}
        <div id="forecast-grid">
          <ForecastGrid
            forecasts={forecastData?.forecasts}
            loading={forecastLoading}
            generatedAt={forecastData?.generated_at}
          />
        </div>

        {/* AI + Technical side by side on large screens */}
        <section id="ai-analysis" aria-label={t('app.marketAnalysis')} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Suspense fallback={<PanelSkeleton />}>
            <AIAnalysis
              data={forecastData?.ai_analysis}
              loading={forecastLoading}
            />
          </Suspense>
          <div id="technical">
            <Suspense fallback={<PanelSkeleton />}>
              <TechnicalPanel data={technicalData} loading={technicalLoading} />
            </Suspense>
          </div>
        </section>

        {/* Institutional forecasts — full width */}
        <section id="institutional" aria-label={t('app.institutionalForecasts')}>
          <Suspense fallback={<PanelSkeleton />}>
            <InstitutionalPanel data={institutionalData} loading={institutionalLoading} />
          </Suspense>
        </section>

        {/* Refetch forecast button */}
        <div className="text-center">
          <button
            onClick={refetchForecast}
            disabled={forecastLoading}
            className="bg-wix hover:bg-wix-dark disabled:opacity-50 text-white text-sm font-medium px-8 py-2.5 rounded-full transition-colors shadow-sm"
          >
            {forecastLoading ? t('app.refreshing') : t('app.refresh')}
          </button>
          {forecastData?.generated_at && (
            <p className="text-gray-400 text-xs mt-1">
              {t('app.lastGenerated', { time: new Date(forecastData.generated_at).toLocaleString() })}
            </p>
          )}
        </div>

        {/* SEO FAQ */}
        <FAQSection />

        {/* Disclaimer */}
        <Disclaimer text={forecastData?.disclaimer} />
      </main>
    </div>
  )
}
