import { useMemo } from 'react'
import { useLanguage } from '../../i18n/LanguageContext'

export default function FAQSection() {
  const { t } = useLanguage()

  const faqs = useMemo(
    () => [
      { question: t('faq.q1'), answer: t('faq.a1') },
      { question: t('faq.q2'), answer: t('faq.a2') },
      { question: t('faq.q3'), answer: t('faq.a3') },
      { question: t('faq.q4'), answer: t('faq.a4') },
      { question: t('faq.q5'), answer: t('faq.a5') },
    ],
    [t]
  )

  const faqSchema = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    }),
    [faqs]
  )

  return (
    <section
      id="faq"
      aria-label={t('faq.title')}
      className="bg-white rounded-2xl border border-gray-200 p-6"
    >
      <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('faq.title')}</h2>
      <div className="space-y-3">
        {faqs.map((faq, idx) => (
          <details key={idx} className="group border border-gray-200 rounded-xl p-4">
            <summary className="cursor-pointer font-medium text-gray-900 list-none">
              {faq.question}
            </summary>
            <p className="text-sm text-gray-600 mt-3 leading-relaxed">{faq.answer}</p>
          </details>
        ))}
      </div>
      <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
    </section>
  )
}
