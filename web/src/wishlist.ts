import type { Festival } from './api'
import { trackEvent } from './analytics'

// 찜(북마크) — 8/12 팀 결정("찜한 축제 알람" 1단계). 비로그인 원칙 유지: localStorage 보관.
// 키는 externalId(환경 불변) — 숫자 id는 베이크마다 바뀌어 찜이 유실된다.
// 알림(푸시)은 앱 단계 과제로, 웹에서는 찜 + 캘린더 등록(.ics)으로 같은 니즈를 채운다.
const KEY = 'kota.wish'
const EVENT = 'kota:wish-change'

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

export function wishKey(f: Pick<Festival, 'id' | 'externalId'>): string {
  return f.externalId ?? `id:${f.id}`
}

export function isWished(f: Pick<Festival, 'id' | 'externalId'>): boolean {
  return load().has(wishKey(f))
}

export function wishedKeys(): Set<string> {
  return load()
}

export function toggleWish(f: Pick<Festival, 'id' | 'externalId' | 'name'>): boolean {
  const set = load()
  const k = wishKey(f)
  const nowWished = !set.has(k)
  if (nowWished) set.add(k)
  else set.delete(k)
  localStorage.setItem(KEY, JSON.stringify([...set]))
  window.dispatchEvent(new CustomEvent(EVENT))
  trackEvent(nowWished ? 'wish_add' : 'wish_remove', { festival_name: f.name })
  return nowWished
}

/** 찜 변경 구독 — 카드·필터가 동기화되도록 */
export function onWishChange(cb: () => void): () => void {
  window.addEventListener(EVENT, cb)
  window.addEventListener('storage', cb) // 다른 탭 동기화
  return () => {
    window.removeEventListener(EVENT, cb)
    window.removeEventListener('storage', cb)
  }
}

// ── 캘린더 등록("날짜 세팅해두면 달력이랑 같이" — 8/12 팀 채팅) ──────────────
const ymd = (d: string) => d.replace(/-/g, '')
const nextDay = (d: string) => {
  const t = new Date(`${d}T00:00:00Z`)
  t.setUTCDate(t.getUTCDate() + 1)
  return t.toISOString().slice(0, 10)
}

/** 구글 캘린더 등록 URL (종일 일정 — 종료일은 exclusive라 +1일) */
export function googleCalUrl(f: Pick<Festival, 'name' | 'startDate' | 'endDate' | 'address'>): string {
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: f.name,
    dates: `${ymd(f.startDate)}/${ymd(nextDay(f.endDate))}`,
    ...(f.address ? { location: f.address } : {}),
    details: 'KOTA — Korea Festa',
  })
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}

/** .ics 파일 다운로드 (애플/아웃룩 등 — 서버 불필요) */
export function downloadIcs(f: Pick<Festival, 'name' | 'startDate' | 'endDate' | 'address' | 'externalId' | 'id'>) {
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,')
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//KOTA//Korea Festa//KO',
    'BEGIN:VEVENT',
    `UID:${wishKey(f)}@kota`,
    `DTSTART;VALUE=DATE:${ymd(f.startDate)}`,
    `DTEND;VALUE=DATE:${ymd(nextDay(f.endDate))}`,
    `SUMMARY:${esc(f.name)}`,
    ...(f.address ? [`LOCATION:${esc(f.address)}`] : []),
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${f.name}.ics`
  a.click()
  URL.revokeObjectURL(url)
}
