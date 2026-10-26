import { useState, useEffect, useCallback } from 'react'

function extractData(response) {
  if (!response) return null
  const body = response.data
  if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
    return body.data
  }
  return body
}

function extractError(err) {
  const body = err?.response?.data
  if (body && typeof body === 'object') {
    if (body.error) return body.error
    if (body.message) return body.message
  }
  return err?.message || 'Request failed'
}

export function useFetch(fetchFn, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const execute = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchFn()
      setData(extractData(response))
    } catch (err) {
      setError(extractError(err))
    } finally {
      setLoading(false)
    }
  }, deps)

  useEffect(() => {
    execute()
  }, [execute])

  return { data, loading, error, refetch: execute }
}