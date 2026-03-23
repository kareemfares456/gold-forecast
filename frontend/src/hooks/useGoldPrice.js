import { useState, useEffect, useCallback } from 'react'
import { fetchPrice } from '../services/api'

export function useGoldPrice() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)

  const load = useCallback(async () => {
    try {
      const result = await fetchPrice()
      setData(result)
      setError(null)
      // Record HH:MM of the successful fetch in local time
      setLastUpdatedAt(
        new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      )
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

  return { data, loading, error, refetch: load, lastUpdatedAt }
}
