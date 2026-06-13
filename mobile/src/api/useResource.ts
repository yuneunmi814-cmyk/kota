import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from './client'

export function useResource<T>(path: string | null, opts: { auth?: boolean; deps?: unknown[] } = {}) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(Boolean(path))
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(() => {
    if (!path) { setLoading(false); return }
    setLoading(true)
    setError(null)
    api<T>(path, { auth: opts.auth })
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : '불러오기 실패'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, opts.auth, ...(opts.deps ?? [])])

  useEffect(() => { reload() }, [reload])
  return { data, loading, error, reload, setData }
}
