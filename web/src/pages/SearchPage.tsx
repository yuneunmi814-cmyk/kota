import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Header from '../components/Header'
import { apiGet, type SearchResult } from '../api'
import { useT } from '../i18n'

// 통합 검색 — GET /api/v1/search?q= (코스·관광지·지역)
export default function SearchPage() {
  const t = useT()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const q = params.get('q') ?? ''
  const [input, setInput] = useState(q)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')

  useEffect(() => {
    setInput(q)
    if (!q) {
      setResult(null)
      setState('idle')
      return
    }
    setState('loading')
    apiGet<SearchResult>(`/search?q=${encodeURIComponent(q)}`)
      .then((d) => {
        setResult(d)
        setState('idle')
      })
      .catch(() => setState('error'))
  }, [q])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (input.trim()) navigate(`/search?q=${encodeURIComponent(input.trim())}`)
  }

  const empty = result && result.courses.length === 0 && result.spots.length === 0 && result.regions.length === 0

  return (
    <div className="min-h-screen bg-white text-green pb-20">
      <Header />
      <main className="max-w-4xl mx-auto pt-12 px-4">
        <h1 className="text-3xl font-black mb-8">{t('search.title')}</h1>

        <form onSubmit={onSubmit} className="relative w-full shadow-lg rounded-full border-2 border-gray-300 mb-12">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('home.searchPlaceholder')}
            className="w-full pl-5 pr-24 py-4 focus:outline-none text-lg bg-white text-green placeholder-gray-400"
            autoFocus
          />
          <button type="submit" className="absolute right-2 top-2 bottom-2 bg-green text-white px-6 rounded-full font-bold hover:opacity-90 transition-colors">
            {t('home.searchButton')}
          </button>
        </form>

        {state === 'loading' && <p className="text-gray-500">{t('search.loading')}</p>}
        {state === 'error' && <p className="text-gray-500">{t('search.error')}</p>}
        {empty && <p className="text-gray-500">{t('search.empty')}</p>}

        {result && result.regions.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4 border-b border-gray-200 pb-2">{t('search.regions')}</h2>
            <div className="flex flex-wrap gap-3">
              {result.regions.map((r) => (
                <span key={r.id} className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[15px] font-medium">
                  {r.name}
                </span>
              ))}
            </div>
          </section>
        )}

        {result && result.courses.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4 border-b border-gray-200 pb-2">{t('search.courses')}</h2>
            <ul className="space-y-3">
              {result.courses.map((c) => (
                <li key={c.id} className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                  <div className="font-bold text-[17px]">{c.title}</div>
                  {c.summary && <div className="text-[14px] text-gray-500 mt-1">{c.summary}</div>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {result && result.spots.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4 border-b border-gray-200 pb-2">{t('search.spots')}</h2>
            <ul className="space-y-3">
              {result.spots.map((s) => (
                <li key={s.id} className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm flex justify-between items-center gap-4">
                  <div>
                    <div className="font-bold text-[17px]">{s.name}</div>
                    <div className="text-[14px] text-gray-500 mt-1">{s.address ?? s.region}</div>
                  </div>
                  <span className="shrink-0 text-[12px] bg-gray-50 border border-gray-200 px-2 py-1 rounded-xl">{s.category}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  )
}
