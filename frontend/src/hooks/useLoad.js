import { useCallback, useEffect, useRef, useState } from 'react'
import { getErrorMessage } from '../api/client'

/** Load data on mount (and when deps change) with loading/error state and manual reload. */
export function useLoad(fn, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const fnRef = useRef(fn)
  fnRef.current = fn
  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try { setData(await fnRef.current()) } catch (e) { setError(getErrorMessage(e)) } finally { setLoading(false) }
  }, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload() }, deps)
  return { data, loading, error, reload, setData }
}
