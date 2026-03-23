export default function Disclaimer({ text }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 text-center">
      ⚠️ {text || 'All forecasts are speculative and not financial advice.'}
    </div>
  )
}
