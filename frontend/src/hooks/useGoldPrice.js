import { useState, useEffect, useCallback } from 'react'
import { fetchPrice } from '../services/api'

export function useGoldPrice() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      const result = await fetchPrice()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 60_000) // refresh every minute
    return () => clearInterval(interval)
  }, [load])

  return { data, loading, error, refetch: load }
}
