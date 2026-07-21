import { env } from '../../config/env.js'
import { Errors } from '../../lib/errors.js'

// 한국관광공사 TourAPI 4.0 — 국문 관광정보 서비스 (KorService2)
// 공공데이터포털 발급 serviceKey는 TOURAPI_SERVICE_KEY 환경변수에서 읽는다(코드에 박지 않음).
const BASE = 'https://apis.data.go.kr/B551011/KorService2'
const MOBILE_OS = 'ETC'
const MOBILE_APP = 'KOTA'

export interface TourApiRawItem {
  contentid: string
  contenttypeid: string
  title: string
  addr1?: string
  addr2?: string
  areacode?: string
  sigungucode?: string
  cat1?: string
  cat2?: string
  cat3?: string
  firstimage?: string
  firstimage2?: string
  mapx?: string // 경도 lng
  mapy?: string // 위도 lat
  tel?: string
  zipcode?: string
  modifiedtime?: string
}

export interface AreaBasedResult {
  items: TourApiRawItem[]
  totalCount: number
  pageNo: number
  numOfRows: number
}

export interface AreaBasedParams {
  areaCode: number
  sigunguCode?: number
  contentTypeId: number
  pageNo?: number
  numOfRows?: number
}

// 테스트 주입 지점 — 실제 HTTP 대신 가짜 응답을 넣을 수 있다
export type TourApiTransport = (url: string) => Promise<unknown>
let transport: TourApiTransport = async (url) => {
  const res = await fetch(url)
  const text = await res.text()
  // data.go.kr는 키 오류 등에서 XML(OpenAPI_ServiceResponse)을 반환하기도 한다
  if (text.trimStart().startsWith('<')) {
    const code = /<returnReasonCode>(\d+)<\/returnReasonCode>/.exec(text)?.[1]
    throw Errors.conflict('TOURAPI_ERROR', `TourAPI 오류 응답${code ? ` (코드 ${code})` : ''} — serviceKey/쿼터를 확인하세요`)
  }
  return JSON.parse(text)
}
export function setTourApiTransportForTest(fn: TourApiTransport): void { transport = fn }

function serviceKey(): string {
  if (!env.TOURAPI_SERVICE_KEY) throw Errors.notConfigured('TourAPI serviceKey(TOURAPI_SERVICE_KEY)')
  return env.TOURAPI_SERVICE_KEY
}

function buildUrl(operation: string, params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams()
  sp.set('serviceKey', serviceKey()) // 디코딩된 키 → URLSearchParams가 안전하게 인코딩
  sp.set('MobileOS', MOBILE_OS)
  sp.set('MobileApp', MOBILE_APP)
  sp.set('_type', 'json')
  for (const [k, v] of Object.entries(params)) if (v !== undefined) sp.set(k, String(v))
  return `${BASE}/${operation}?${sp.toString()}`
}

interface Envelope<T> {
  response?: {
    header?: { resultCode?: string; resultMsg?: string }
    body?: { totalCount?: number; pageNo?: number; numOfRows?: number; items?: '' | { item?: T | T[] } }
  }
}

function unwrap<T>(json: unknown): { items: T[]; totalCount: number; pageNo: number; numOfRows: number } {
  const env_ = json as Envelope<T>
  const header = env_.response?.header
  if (header && header.resultCode && header.resultCode !== '0000') {
    throw Errors.conflict('TOURAPI_ERROR', `TourAPI: ${header.resultMsg ?? header.resultCode}`)
  }
  const body = env_.response?.body
  const rawItems = body?.items
  const item = rawItems ? rawItems.item : undefined
  const items = item ? (Array.isArray(item) ? item : [item]) : []
  return { items, totalCount: body?.totalCount ?? items.length, pageNo: body?.pageNo ?? 1, numOfRows: body?.numOfRows ?? items.length }
}

export async function fetchAreaBased(params: AreaBasedParams): Promise<AreaBasedResult> {
  const url = buildUrl('areaBasedList2', {
    areaCode: params.areaCode,
    sigunguCode: params.sigunguCode,
    contentTypeId: params.contentTypeId,
    pageNo: params.pageNo ?? 1,
    numOfRows: params.numOfRows ?? 50,
    arrange: 'C', // 수정일순(최신 변경 우선)
  })
  return unwrap<TourApiRawItem>(await transport(url))
}

// searchFestival2 (contentTypeId=15) — 기간 조건 축제 목록. eventStartDate 필수(해당 일 이후 개최·진행 축제).
export interface TourApiFestivalItem extends TourApiRawItem {
  eventstartdate?: string // YYYYMMDD
  eventenddate?: string   // YYYYMMDD
}

// 지역 필터는 반드시 신형 법정동 코드(lDongRegnCd/lDongSignguCd) 사용 —
// 구형 areaCode는 searchFestival2에서 결과가 크게 누락됨(서울 2건 vs lDong 99건, 2026-07-15 확인)
export interface FestivalSearchParams {
  eventStartDate: string // YYYYMMDD
  eventEndDate?: string
  lDongRegnCd?: string
  lDongSignguCd?: string
  pageNo?: number
  numOfRows?: number
}

export async function fetchFestivals(params: FestivalSearchParams): Promise<{ items: TourApiFestivalItem[]; totalCount: number }> {
  const url = buildUrl('searchFestival2', {
    eventStartDate: params.eventStartDate,
    eventEndDate: params.eventEndDate,
    lDongRegnCd: params.lDongRegnCd,
    lDongSignguCd: params.lDongSignguCd,
    pageNo: params.pageNo ?? 1,
    numOfRows: params.numOfRows ?? 50,
    arrange: 'C', // 수정일순
  })
  const { items, totalCount } = unwrap<TourApiFestivalItem>(await transport(url))
  return { items, totalCount }
}

// detailCommon2 — 단일 콘텐츠 상세(좌표·주소·이미지·개요 포함)
export interface TourApiPoi {
  contentid: string
  contenttypeid: string
  title?: string
  addr1?: string
  addr2?: string
  mapx?: string
  mapy?: string
  firstimage?: string
  firstimage2?: string
  tel?: string
  overview?: string
}

export async function fetchDetailCommon(contentId: string): Promise<TourApiPoi | null> {
  // KorService2 detailCommon2는 consolidated 레코드를 반환 — KorService1의 YN 파라미터(mapinfoYN 등)는 제거됨(넣으면 에러)
  const url = buildUrl('detailCommon2', { contentId })
  const { items } = unwrap<TourApiPoi>(await transport(url))
  return items[0] ?? null
}

// detailInfo2 (contentTypeId=25) — 여행코스 경유지 목록
export interface CourseLeg {
  subnum?: string
  subcontentid?: string
  subname?: string
  subdetailoverview?: string
  subdetailimg?: string
}

export async function fetchCourseLegs(contentId: string): Promise<CourseLeg[]> {
  const url = buildUrl('detailInfo2', { contentId, contentTypeId: 25, numOfRows: 30, pageNo: 1 })
  const { items } = unwrap<CourseLeg>(await transport(url))
  return items
    .filter((l) => l.subcontentid)
    .sort((a, b) => Number(a.subnum ?? 0) - Number(b.subnum ?? 0))
}
