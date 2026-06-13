import { prisma } from '../../lib/prisma.js'
import { Errors } from '../../lib/errors.js'
import { sanitizeText } from '../../lib/util.js'
import { fetchStoriesNearby, type LangCode, type OdiiStory } from './client.js'

export interface AudioSyncOptions {
  regionSlug: string
  langCodes?: LangCode[]
  radiusM?: number
  perSpotMax?: number
  dryRun?: boolean
  onProgress?: (msg: string) => void
}

export interface AudioSyncSummary {
  region: string
  spotsScanned: number
  spotsMatched: number
  created: number
  updated: number
  withAudio: number
  dryRun: boolean
}

function toGuide(spotId: bigint, langCode: string, s: OdiiStory) {
  const playTime = s.playTime != null && Number.isFinite(Number(s.playTime)) ? Number(s.playTime) : null
  return {
    spotId,
    source: 'ODII',
    odiiThemeId: s.tid ?? '',
    odiiStoryId: s.stid ?? '',
    langCode,
    title: (s.title ?? '').trim(),
    audioTitle: s.audioTitle?.trim() || null,
    script: s.script ? sanitizeText(s.script).slice(0, 8000) : null,
    audioUrl: s.audioUrl?.trim() || null,
    imageUrl: s.imageUrl?.trim() || null,
    playTime,
    lat: s.mapY ? Number(s.mapY) : null,
    lng: s.mapX ? Number(s.mapX) : null,
  }
}

export async function syncAudioGuidesForRegion(opts: AudioSyncOptions): Promise<AudioSyncSummary> {
  const region = await prisma.region.findUnique({ where: { slug: opts.regionSlug }, select: { id: true, name: true } })
  if (!region) throw Errors.notFound(`지역(slug=${opts.regionSlug})`)

  const langCodes = opts.langCodes?.length ? opts.langCodes : (['ko'] as LangCode[])
  const radiusM = opts.radiusM ?? 1000
  const perSpotMax = opts.perSpotMax ?? 10
  const log = opts.onProgress ?? (() => {})

  const spots = await prisma.spot.findMany({ where: { regionId: region.id, status: 'ACTIVE' }, select: { id: true, name: true, lat: true, lng: true } })
  const summary: AudioSyncSummary = { region: region.name, spotsScanned: spots.length, spotsMatched: 0, created: 0, updated: 0, withAudio: 0, dryRun: Boolean(opts.dryRun) }

  for (const spot of spots) {
    let matchedThisSpot = false
    for (const lang of langCodes) {
      let stories: OdiiStory[] = []
      try { stories = await fetchStoriesNearby({ lng: spot.lng, lat: spot.lat, radiusM, langCode: lang, rows: perSpotMax }) }
      catch { continue }

      // 대본이나 오디오 중 하나라도 있는 것만, 오디오 우선
      const useful = stories
        .filter((s) => s.stid && (s.audioUrl?.trim() || s.script?.trim()))
        .slice(0, perSpotMax)

      for (const s of useful) {
        const data = toGuide(spot.id, lang, s)
        if (!data.odiiStoryId || !data.title) continue
        matchedThisSpot = true
        if (data.audioUrl) summary.withAudio += 1
        if (opts.dryRun) { summary.created += 1; continue }
        const existing = await prisma.audioGuide.findUnique({
          where: { spotId_odiiStoryId_langCode: { spotId: spot.id, odiiStoryId: data.odiiStoryId, langCode: lang } },
          select: { id: true },
        })
        if (existing) { await prisma.audioGuide.update({ where: { id: existing.id }, data }); summary.updated += 1 }
        else { await prisma.audioGuide.create({ data }); summary.created += 1 }
      }
    }
    if (matchedThisSpot) {
      summary.spotsMatched += 1
      log(`${spot.name} ← 오디오 스토리 매칭`)
    }
  }
  return summary
}
