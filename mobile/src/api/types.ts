export type Transport = 'WALK' | 'BUS' | 'TAXI' | 'CAR'
export type TripStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELED'
export type VisitStatus = 'PENDING' | 'DONE' | 'SKIPPED'

export interface Region { id: string; name: string; slug: string; thumbnailUrl?: string | null; courseCount?: number; visitorScore?: number; trending?: boolean }
export interface Theme { id: string; name: string; icon?: string | null }

export interface CourseCard {
  id: string
  title: string
  summary: string | null
  cover: string | null
  region: string
  durationDays: number
  spotCount: number
  estCost: number | null
  themes: string[]
  saveCount: number
}

export interface Banner { id: string; title: string; imageUrl: string; linkType: string; linkTarget: string | null }

export interface HomeFeed {
  banners: Banner[]
  recommendedCourses: CourseCard[]
  popularRegions: Region[]
  themeSections: { theme: { id: string; name: string }; courses: CourseCard[] }[]
}

export interface SpotSummary {
  id: string
  name: string
  category: string
  summary: string | null
  lat: number
  lng: number
  thumbnail: string | null
}

export interface CourseItem {
  id: string
  order: number
  stayMinutes: number | null
  transportToNext: Transport | null
  transportMinutes: number | null
  note: string | null
  spot: SpotSummary
}

export interface CourseDay { dayNo: number; items: CourseItem[] }

export interface CourseDetail {
  id: string
  title: string
  summary: string | null
  cover: string | null
  region: { id: string; name: string }
  durationDays: number
  estCost: number | null
  themes: { id: string; name: string }[]
  spotCount: number
  saveCount: number
  days: CourseDay[]
  reviewSummary: { avg: number | null; count: number }
  isBookmarked: boolean | null
}

export interface AudioGuide {
  id: string
  title: string
  audioTitle: string | null
  script: string | null
  audioUrl: string | null
  playTime: number | null
  langCode: string
  source: string
}

export interface SpotDetail {
  id: string
  name: string
  category: string
  region: { id: string; name: string }
  summary: string | null
  description: string | null
  tips: string | null
  address: string | null
  lat: number
  lng: number
  phone: string | null
  todayOpen: boolean | null
  todayHours: string | null
  admissionFee: string | null
  avgStayMinutes: number | null
  images: { url: string; credit: string | null }[]
  reviewSummary: { avg: number | null; count: number }
  nearbySpots: { id: string; name: string; category: string; distanceM: number }[]
  isBookmarked: boolean | null
  audioGuides: AudioGuide[]
}

export interface TripVisit {
  id: string
  status: VisitStatus
  checkedInAt: string | null
  checkinType: 'VERIFIED' | 'MANUAL' | null
  dayNo: number
  order: number
  stayMinutes: number | null
  transportToNext: Transport | null
  transportMinutes: number | null
  spot: { id: string; name: string; category: string; lat: number; lng: number }
}

export interface Trip {
  id: string
  status: TripStatus
  startDate: string
  endDate: string
  course: { id: string; title: string; cover: string | null; region: string; durationDays: number }
  progress: { done: number; skipped: number; total: number }
  visits: TripVisit[]
  nextVisit?: TripVisit | null
}

export interface CheckInResult {
  visit: TripVisit
  progress: { done: number; skipped: number; total: number }
  nextVisit: TripVisit | null
  tripStatus: TripStatus
}

export interface Me { id: string; email: string | null; nickname: string; profileImageUrl: string | null; interests: Theme[] }

export interface Paged<T> { items: T[]; nextCursor: string | null }
