import './index.css'
import Header from './components/layout/Header'
import Disclaimer from './components/layout/Disclaimer'
import PriceChart from './components/charts/PriceChart'
import ForecastGrid from './components/forecast/ForecastGrid'
import TechnicalPanel from './components/technical/TechnicalPanel'
import AIAnalysis from './components/ai/AIAnalysis'
import InstitutionalPanel from './components/institutional/InstitutionalPanel'
import { useGoldPrice } from './hooks/useGoldPrice'
import { useForecast } from './hooks/useForecast'
import { useTechnical } from './hooks/useTechnical'
import { useInstitutional } from './hooks/useInstitutional'
import { useLanguage } from './i18n/LanguageContext'

export default function App() {
  const { data: priceData, loading: priceLoading, refetch: refetchPrice, lastUpdatedAt } = useGoldPrice()
  const { data: forecastData, loading: forecastLoading, refetch: refetchForecast } = useForecast()
  const { data: technicalData, loading: technicalLoading } = useTechnical()
  const { data: institutionalData, loading: institutionalLoading } = useInstitutional()
  const { t } = useLanguage()

  return (
    <div className="min-h-screen bg-dark-900">
      <Header data={priceData} loading={priceLoading} onRefresh={refetchPrice} lastUpdatedAt={lastUpdatedAt} />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Price chart */}
        <section id="chart" aria-label={t('app.priceChart')}>
          <PriceChart
            history={priceData?.history}
            forecasts={forecastData?.forecasts}
          />
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
          <AIAnalysis
            data={forecastData?.ai_analysis}
            loading={forecastLoading}
          />
          <div id="technical">
            <TechnicalPanel data={technicalData} loading={technicalLoading} />
          </div>
        </section>

        {/* Institutional forecasts — full width */}
        <section id="institutional" aria-label={t('app.institutionalForecasts')}>
          <InstitutionalPanel data={institutionalData} loading={institutionalLoading} />
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

        {/* Disclaimer */}
        <Disclaimer text={forecastData?.disclaimer} />
      </main>
    </div>
  )
}
