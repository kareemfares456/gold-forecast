import { useState, useEffect, useCallback } from 'react'
import { fetchInstitutional } from '../services/api'
import { useLanguage } from '../i18n/LanguageContext'

export function useInstitutional() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { lang } = useLanguage()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchInstitutional(lang)
      setData(result)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [lang])

  useEffect(() => { load() }, [load])

  return { data, loading, error }
}
