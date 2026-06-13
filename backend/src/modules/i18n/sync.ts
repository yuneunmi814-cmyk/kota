import { prisma } from '../../lib/prisma.js'
import { Errors } from '../../lib/errors.js'
import { resolveArea } from '../tourapi/regions.js'
import { fetchEngByRegion } from './client.js'

export interface I18nSyncSummary { region: string; engCollected: number; spotsTranslated: number; created: number; updated: number; dryRun: boolean }

const norm = (s: string) => s.replace(/[\s[\]()·,.\-_/]/g, '')

// 영문 title "English Name (한글명)"에서 (영문명, 한글명) 추출 — 마지막 괄호가 한글
export function parseEngTitle(title: string): { en: string; ko: string } | null {
  const m = /\(([^()]*)\)\s*$/.exec(title)
  if (!m) return null
  const ko = m[1]?.trim() ?? ''
  const en = title.slice(0, m.index).trim()
  if (!en || !ko) return null
  return { en, ko }
}

// EngService2는 한글 데이터와 contentId를 공유하지 않으므로, 영문 title의 괄호 속 한글명으로 스팟에 매칭.
export async function syncEnglishForRegion(opts: { regionSlug: string; maxPages?: number; dryRun?: boolean; onProgress?: (m: string) => void }): Promise<I18nSyncSummary> {
  const area = resolveArea(opts.regionSlug)
  if (!area) throw Errors.validation(`알 수 없는 지역 slug: ${opts.regionSlug}`)
  const region = await prisma.region.findUnique({ where: { slug: opts.regionSlug }, select: { id: true, name: true } })
  if (!region) throw Errors.notFound(`지역(slug=${opts.regionSlug})`)
  const maxPages = opts.maxPages ?? 10
  const log = opts.onProgress ?? (() => {})

  // 우리 지역 스팟(정규화 이름)
  const spots = await prisma.spot.findMany({ where: { regionId: region.id, status: 'ACTIVE' }, select: { id: true, name: true } })
  const spotIdx = spots.map((s) => ({ id: s.id, n: norm(s.name) })).filter((s) => s.n.length >= 2)

  const summary: I18nSyncSummary = { region: region.name, engCollected: 0, spotsTranslated: 0, created: 0, updated: 0, dryRun: Boolean(opts.dryRun) }
  const done = new Set<string>()

  for (let page = 1; page <= maxPages; page++) {
    const { items } = await fetchEngByRegion(area.lDongRegnCd, page)
    if (items.length === 0) break
    summary.engCollected += items.length

    for (const it of items) {
      if (!it.title) continue
      const parsed = parseEngTitle(it.title)
      if (!parsed) continue
      const koN = norm(parsed.ko)
      // 한글명이 스팟명을 포함하거나 그 반대(부분일치)
      const hit = spotIdx.find((s) => !done.has(s.id.toString()) && (koN.includes(s.n) || s.n.includes(koN)))
      if (!hit) continue
      done.add(hit.id.toString())
      summary.spotsTranslated += 1
      if (opts.dryRun) { summary.created += 1; continue }
      const existing = await prisma.spotTranslation.findUnique({ where: { spotId_langCode: { spotId: hit.id, langCode: 'en' } }, select: { id: true } })
      if (existing) { await prisma.spotTranslation.update({ where: { id: existing.id }, data: { name: parsed.en } }); summary.updated += 1 }
      else { await prisma.spotTranslation.create({ data: { spotId: hit.id, langCode: 'en', name: parsed.en } }); summary.created += 1 }
    }
    if (items.length < 100) break
  }
  log(`영문 ${summary.engCollected}건 수집, ${summary.spotsTranslated}개 스팟 매칭`)
  return summary
}
