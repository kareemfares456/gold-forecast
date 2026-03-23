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

export default function App() {
  const { data: priceData, loading: priceLoading, refetch: refetchPrice, lastUpdatedAt } = useGoldPrice()
  const { data: forecastData, loading: forecastLoading, refetch: refetchForecast } = useForecast()
  const { data: technicalData, loading: technicalLoading } = useTechnical()
  const { data: institutionalData, loading: institutionalLoading } = useInstitutional()

  return (
    <div className="min-h-screen bg-dark-900">
      <Header data={priceData} loading={priceLoading} onRefresh={refetchPrice} lastUpdatedAt={lastUpdatedAt} />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Price chart */}
        <PriceChart
          history={priceData?.history}
          forecasts={forecastData?.forecasts}
        />

        {/* Forecast cards */}
        <ForecastGrid
          forecasts={forecastData?.forecasts}
          loading={forecastLoading}
        />

        {/* Technical + AI side by side on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TechnicalPanel data={technicalData} loading={technicalLoading} />
          <AIAnalysis
            data={forecastData?.ai_analysis}
            loading={forecastLoading}
          />
        </div>

        {/* Institutional forecasts — full width */}
        <InstitutionalPanel data={institutionalData} loading={institutionalLoading} />

        {/* Refetch forecast button */}
        <div className="text-center">
          <button
            onClick={refetchForecast}
            disabled={forecastLoading}
            className="bg-wix hover:bg-wix-dark disabled:opacity-50 text-white text-sm font-medium px-8 py-2.5 rounded-full transition-colors shadow-sm"
          >
            {forecastLoading ? 'Refreshing forecasts...' : 'Refresh Forecasts'}
          </button>
          {forecastData?.generated_at && (
            <p className="text-gray-400 text-xs mt-1">
              Last generated: {new Date(forecastData.generated_at).toLocaleString()}
            </p>
          )}
        </div>

        {/* Disclaimer */}
        <Disclaimer text={forecastData?.disclaimer} />
      </main>
    </div>
  )
}
