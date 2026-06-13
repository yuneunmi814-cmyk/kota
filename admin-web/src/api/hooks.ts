import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from './client'

// 간단한 데이터 패칭 훅 — 로딩/에러/리로드
export function useResource<T>(path: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(Boolean(path))
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(() => {
    if (!path) return
    setLoading(true)
    setError(null)
    api<T>(path)
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : '불러오기 실패'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps])

  useEffect(() => { reload() }, [reload])
  return { data, loading, error, reload, setData }
}
