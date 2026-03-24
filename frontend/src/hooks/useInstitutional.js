import { useState, useEffect } from 'react'
import { fetchInstitutional } from '../services/api'
import { useLanguage } from '../i18n/LanguageContext'

export function useInstitutional() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { lang } = useLanguage()

  useEffect(() => {
    setLoading(true)
    fetchInstitutional(lang)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [lang])

  return { data, loading, error }
}
