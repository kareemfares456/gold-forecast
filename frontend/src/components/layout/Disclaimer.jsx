import { useLanguage } from '../../i18n/LanguageContext'

export default function Disclaimer({ text }) {
  const { t } = useLanguage()
  return (
    <aside role="note" className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 text-center">
      ⚠️ {text || t('disclaimer')}
    </aside>
  )
}
