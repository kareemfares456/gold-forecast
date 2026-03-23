export default function Disclaimer({ text }) {
  return (
    <div className="bg-dark-700 border border-dark-500 rounded-lg p-3 text-xs text-gray-500 text-center">
      ⚠️ {text || 'All forecasts are speculative and not financial advice.'}
    </div>
  )
}
