import { prisma } from '../../lib/prisma.js'
import { Errors } from '../../lib/errors.js'
import { fetchPhotosByKeyword, type GalleryPhoto } from './client.js'

export interface PhotoSyncOptions {
  regionSlug: string
  perSpotMax?: number
  dryRun?: boolean
  onProgress?: (msg: string) => void
}
export interface PhotoSyncSummary { region: string; spotsScanned: number; spotsMatched: number; created: number; updated: number; dryRun: boolean }

// 스팟명이 사진의 제목/키워드에 들어가야 채택 — 오매칭 방지
function relevant(p: GalleryPhoto, spotName: string): boolean {
  const t = (p.galTitle ?? '').replace(/\s/g, '')
  const k = (p.galSearchKeyword ?? '').replace(/\s/g, '')
  const n = spotName.replace(/\s/g, '')
  return Boolean(p.galWebImageUrl) && (t.includes(n) || k.includes(n))
}

export async function syncPhotosForRegion(opts: PhotoSyncOptions): Promise<PhotoSyncSummary> {
  const region = await prisma.region.findUnique({ where: { slug: opts.regionSlug }, select: { id: true, name: true } })
  if (!region) throw Errors.notFound(`지역(slug=${opts.regionSlug})`)
  const perSpotMax = opts.perSpotMax ?? 6
  const log = opts.onProgress ?? (() => {})

  const spots = await prisma.spot.findMany({ where: { regionId: region.id, status: 'ACTIVE' }, select: { id: true, name: true } })
  const summary: PhotoSyncSummary = { region: region.name, spotsScanned: spots.length, spotsMatched: 0, created: 0, updated: 0, dryRun: Boolean(opts.dryRun) }

  for (const spot of spots) {
    let photos: GalleryPhoto[] = []
    try { photos = await fetchPhotosByKeyword(spot.name, 20) } catch { continue }
    const picked = photos.filter((p) => relevant(p, spot.name)).slice(0, perSpotMax)
    if (picked.length === 0) continue
    summary.spotsMatched += 1

    // 기존 PHOTO 출처 이미지의 다음 정렬 순서(에디터/TourAPI 대표 이미지 뒤에 붙임)
    const base = await prisma.spotImage.count({ where: { spotId: spot.id } })
    for (let i = 0; i < picked.length; i++) {
      const p = picked[i]!
      const data = {
        spotId: spot.id, url: p.galWebImageUrl!, source: 'PHOTO',
        sourceId: p.galContentId ?? `${spot.id}-${i}`,
        sourceCredit: p.galPhotographer?.trim() || '한국관광공사 관광사진',
        sortOrder: base + i,
      }
      if (opts.dryRun) { summary.created += 1; continue }
      const existing = await prisma.spotImage.findUnique({ where: { spotId_sourceId: { spotId: spot.id, sourceId: data.sourceId } }, select: { id: true } })
      if (existing) { await prisma.spotImage.update({ where: { id: existing.id }, data }); summary.updated += 1 }
      else { await prisma.spotImage.create({ data }); summary.created += 1 }
    }
    log(`${spot.name} ← 사진 ${picked.length}장`)
  }
  return summary
}
