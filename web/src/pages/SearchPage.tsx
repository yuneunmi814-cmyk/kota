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
    <div className="min-h-screen bg-paper text-navy pb-20">
      <Header />
      <main className="max-w-4xl mx-auto pt-12 px-4">
        <h1 className="text-3xl font-black mb-8">{t('search.title')}</h1>

        <form onSubmit={onSubmit} className="relative w-full shadow-lg rounded-sm border-2 border-gold mb-12">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('home.searchPlaceholder')}
            className="w-full pl-5 pr-24 py-4 focus:outline-none text-lg bg-paper text-navy placeholder-navy/50"
            autoFocus
          />
          <button type="submit" className="absolute right-2 top-2 bottom-2 bg-navy text-gold px-6 rounded-sm font-bold hover:bg-navy-2 transition-colors">
            {t('home.searchButton')}
          </button>
        </form>

        {state === 'loading' && <p className="text-navy/60">{t('search.loading')}</p>}
        {state === 'error' && <p className="text-navy/60">{t('search.error')}</p>}
        {empty && <p className="text-navy/60">{t('search.empty')}</p>}

        {result && result.regions.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4 border-b border-hanji pb-2">{t('search.regions')}</h2>
            <div className="flex flex-wrap gap-3">
              {result.regions.map((r) => (
                <span key={r.id} className="px-4 py-2 bg-paper-2 border border-hanji rounded-sm text-[15px] font-medium">
                  {r.name}
                </span>
              ))}
            </div>
          </section>
        )}

        {result && result.courses.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4 border-b border-hanji pb-2">{t('search.courses')}</h2>
            <ul className="space-y-3">
              {result.courses.map((c) => (
                <li key={c.id} className="p-4 bg-white border border-hanji rounded-sm shadow-sm">
                  <div className="font-bold text-[17px]">{c.title}</div>
                  {c.summary && <div className="text-[14px] text-navy/70 mt-1">{c.summary}</div>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {result && result.spots.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4 border-b border-hanji pb-2">{t('search.spots')}</h2>
            <ul className="space-y-3">
              {result.spots.map((s) => (
                <li key={s.id} className="p-4 bg-white border border-hanji rounded-sm shadow-sm flex justify-between items-center gap-4">
                  <div>
                    <div className="font-bold text-[17px]">{s.name}</div>
                    <div className="text-[14px] text-navy/70 mt-1">{s.address ?? s.region}</div>
                  </div>
                  <span className="shrink-0 text-[12px] bg-paper-2 border border-hanji px-2 py-1 rounded-sm">{s.category}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  )
}
