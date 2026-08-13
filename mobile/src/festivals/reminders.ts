import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getFestivals, isAlwaysOn, type Festival } from './data'
import { wishedKeys } from './wishlist'

// 날짜 알림 — 찜한 축제가 '내일 시작' / '곧 끝남'일 때 알린다.
//
// 왜 지오펜싱만으로 부족한가: 지오펜스는 그 근처에 우연히 가야 울린다.
// 정작 흔한 후회는 "가려고 했는데 끝난 걸 몰랐다"다. 그건 시점 알림만이 막는다.
// (제천살롱의 '접수 임박 3시간 전' 알림과 같은 발상 — 놓치면 안 되는 시점을 미리 준다.
//  축제는 선착순 접수 데이터가 공공 API에 없어, 대신 시작·종료 시점을 쓴다.)
//
// 서버 없이 기기에 예약해 둔다(로컬 알림). 알림 시각은 오전 10시 —
// 새벽에 울리면 앱을 지우고, 저녁이면 다음 날 계획을 세우기 늦다.

const SCHEDULED_KEY = 'kota.reminders.ids.v1'
const HOUR = 10
/** iOS 대기 알림 상한은 64개. 찜 20개 × 2종 = 40개로 여유가 있다 */
const MAX_PENDING = 60

type Scheduled = Record<string, string[]> // externalId → notification ids

async function readScheduled(): Promise<Scheduled> {
  try {
    const raw = await AsyncStorage.getItem(SCHEDULED_KEY)
    return raw ? (JSON.parse(raw) as Scheduled) : {}
  } catch {
    return {}
  }
}

/** 그 지역 시간 기준 특정 날짜 오전 10시 — 이미 지났으면 null */
function at10(dateStr: string, dayOffset: number): Date | null {
  const d = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  d.setDate(d.getDate() + dayOffset)
  d.setHours(HOUR, 0, 0, 0)
  return d.getTime() > Date.now() + 60_000 ? d : null
}

interface Plan { when: Date; title: string; body: string }

/** 축제 하나에 걸 알림 계획 — 시작 하루 전, 그리고 마지막 날 하루 전 */
function planFor(f: Festival): Plan[] {
  if (isAlwaysOn(f)) return [] // 1년 내내 하는 행사에 '곧 끝나요'는 거짓이다
  const plans: Plan[] = []

  const beforeStart = at10(f.startDate, -1)
  if (beforeStart) {
    plans.push({
      when: beforeStart,
      title: `${f.name}`,
      body: `내일 시작해요${f.placeName ? ` · ${f.placeName}` : ''}`,
    })
  }

  // 마지막 날 알림 — 하루짜리 축제는 위 '내일 시작'과 겹치므로 건다는 의미가 없다
  if (f.endDate !== f.startDate) {
    const beforeEnd = at10(f.endDate, -1)
    // 시작 알림과 같은 날이면 중복이라 건너뛴다
    if (beforeEnd && (!beforeStart || beforeEnd.getTime() !== beforeStart.getTime())) {
      plans.push({
        when: beforeEnd,
        title: `${f.name}`,
        body: `내일이 마지막 날이에요${f.placeName ? ` · ${f.placeName}` : ''}`,
      })
    }
  }
  return plans
}

/**
 * 찜 목록에 맞춰 날짜 알림을 다시 건다(멱등).
 * 찜이 바뀔 때·앱이 켜질 때 부르면 된다.
 */
export async function syncReminders(): Promise<{ scheduled: number }> {
  const perm = await Notifications.getPermissionsAsync()
  if (!perm.granted) return { scheduled: 0 }

  // 우리가 걸어둔 것만 지운다 — 지오펜스 즉시 알림까지 날리면 안 된다
  const prev = await readScheduled()
  await Promise.all(
    Object.values(prev)
      .flat()
      .map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})),
  )

  const [keys, festivals] = await Promise.all([wishedKeys(), getFestivals()])
  const wished = festivals.filter((f) => keys.includes(f.externalId))

  const next: Scheduled = {}
  let count = 0
  for (const f of wished) {
    for (const p of planFor(f)) {
      if (count >= MAX_PENDING) break
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: { title: p.title, body: p.body, data: { externalId: f.externalId } },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.when },
        })
        ;(next[f.externalId] ??= []).push(id)
        count += 1
      } catch {
        // 한 건 실패해도 나머지는 건다
      }
    }
  }
  await AsyncStorage.setItem(SCHEDULED_KEY, JSON.stringify(next))
  return { scheduled: count }
}

/** 예약된 날짜 알림 개수 — 설정 화면에 그대로 보여준다 */
export async function pendingReminderCount(): Promise<number> {
  const map = await readScheduled()
  return Object.values(map).flat().length
}
