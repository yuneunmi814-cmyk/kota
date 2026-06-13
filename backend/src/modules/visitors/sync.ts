import { prisma } from '../../lib/prisma.js'
import { REGION_AREA } from '../tourapi/regions.js'
import { fetchMetcoVisitors } from './client.js'

export interface VisitorSyncSummary {
  period: { startYmd: string; endYmd: string }
  updated: { slug: string; name: string; visitorScore: number }[]
  dryRun: boolean
}

function ymd(d: Date): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`
}

// 외지인(2)+외국인(3) 방문자 합을 지역 인기 점수로. (현지인 제외 — 관광 수요 신호)
export async function syncRegionVisitors(opts: { now: Date; days?: number; dryRun?: boolean } = { now: new Date() }): Promise<VisitorSyncSummary> {
  const days = opts.days ?? 30
  const end = new Date(opts.now.getTime() - 7 * 86400_000)   // 데이터 지연 고려, 7일 전까지
  const start = new Date(end.getTime() - days * 86400_000)
  const startYmd = ymd(start), endYmd = ymd(end)

  const rows = await fetchMetcoVisitors(startYmd, endYmd)
  // 시도명별 외지인+외국인 합산
  const bySido = new Map<string, number>()
  for (const r of rows) {
    if (r.touDivCd !== '2' && r.touDivCd !== '3') continue
    const n = Number(r.touNum)
    if (!r.areaNm || !Number.isFinite(n)) continue
    bySido.set(r.areaNm, (bySido.get(r.areaNm) ?? 0) + n)
  }

  const summary: VisitorSyncSummary = { period: { startYmd, endYmd }, updated: [], dryRun: Boolean(opts.dryRun) }
  for (const [slug, area] of Object.entries(REGION_AREA)) {
    let total = 0
    for (const [areaNm, sum] of bySido) if (areaNm.includes(area.sidoKey)) total += sum
    const visitorScore = Math.round(total)
    const region = await prisma.region.findUnique({ where: { slug }, select: { id: true, name: true } })
    if (!region) continue
    if (!opts.dryRun) await prisma.region.update({ where: { id: region.id }, data: { visitorScore } })
    summary.updated.push({ slug, name: region.name, visitorScore })
  }
  return summary
}
