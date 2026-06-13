// open_hours JSONB: { "mon": {"open":"07:00","close":"19:00"}, ..., "holiday": ["tue"] }
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

export function todayOpenStatus(openHours: unknown, now = new Date()): { open: boolean | null; today: string | null } {
  if (!openHours || typeof openHours !== 'object') return { open: null, today: null }
  const oh = openHours as Record<string, { open?: string; close?: string } | string[] | undefined>
  const day = DAYS[now.getDay()]!
  const holidays = Array.isArray(oh.holiday) ? oh.holiday : []
  if (holidays.includes(day)) return { open: false, today: '오늘 휴무' }
  const slot = oh[day]
  if (!slot || Array.isArray(slot) || !slot.open || !slot.close) return { open: null, today: null }
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const open = hhmm >= slot.open && hhmm <= slot.close
  return { open, today: `${slot.open}~${slot.close}` }
}
