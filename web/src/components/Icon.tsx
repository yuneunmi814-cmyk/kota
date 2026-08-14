// 아이콘 — 인라인 SVG, 색은 currentColor를 따라간다.
//
// 이모지를 쓰지 않는 이유: 기기·OS·폰트마다 다르게 그려져 디자인으로 통제할 수 없고,
// 화면마다 크기·굵기가 제각각이라 '기본값 그대로'라는 인상을 준다.
// 한 파일에 모아 두면 나중에 세트를 갈아도 여기만 고치면 된다.

export type IconName =
  | 'pin'
  | 'globe'
  | 'calendar'
  | 'flame'
  | 'heart'
  | 'heartFilled'
  // 여행 목적 테마 6종 — 이모지를 대체한다
  | 'food'
  | 'nature'
  | 'heritage'
  | 'music'
  | 'family'
  | 'night'

const PATHS: Record<IconName, { d: string; fill?: boolean }> = {
  pin: { d: 'M12 21s7-5.686 7-11a7 7 0 1 0-14 0c0 5.314 7 11 7 11Z M12 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z' },
  globe: { d: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M3.6 9h16.8 M3.6 15h16.8 M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z' },
  calendar: { d: 'M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12Z M8 3v4 M16 3v4 M4 10h16' },
  flame: { d: 'M12 22c3.87 0 7-2.9 7-6.5 0-4.5-4.5-6.2-4-11.5-2.5 1.5-5 4.5-5 7.5 0 1-1 1.5-1.5.8-.6-.8-.9-1.8-.9-2.8C5.6 11.4 5 13.4 5 15.5 5 19.1 8.13 22 12 22Z' },
  heart: { d: 'M12 20.3 4.7 13a4.6 4.6 0 0 1 6.5-6.5l.8.8.8-.8A4.6 4.6 0 1 1 19.3 13L12 20.3Z' },
  heartFilled: { d: 'M12 20.3 4.7 13a4.6 4.6 0 0 1 6.5-6.5l.8.8.8-.8A4.6 4.6 0 1 1 19.3 13L12 20.3Z', fill: true },
  // 먹거리 — 포크와 나이프
  food: { d: 'M7 3v8 M5 3v4a2 2 0 0 0 4 0V3 M7 11v10 M17 3c-1.7 1.2-2.5 3-2.5 5.2 0 1.6.8 2.6 2.5 2.8V3Z M17 11v10' },
  // 꽃·자연 — 잎사귀. 다섯 잎 꽃은 14px에서 뭉개져 십자로 읽혀 교체했다.
  nature: { d: 'M4.5 19.5c0-8.5 5.5-14 15-15 1 9.5-4.5 15-15 15Z M4.5 19.5c3.5-3.5 7-5.5 11-7.5' },
  // 역사·전통 — 한옥 지붕
  heritage: { d: 'M3 9.5 12 4l9 5.5 M5.5 9.5V19 M18.5 9.5V19 M9.5 19v-5.5h5V19 M3 19h18' },
  // 음악·공연 — 음표
  music: { d: 'M9 18V6l10-2v12 M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z M19 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z' },
  // 가족·체험 — 어른과 아이
  family: { d: 'M8.5 8a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z M4.5 20v-5a4 4 0 0 1 8 0v5 M17 11.5a1.9 1.9 0 1 0 0-3.8 1.9 1.9 0 0 0 0 3.8Z M14 20v-3.6a3 3 0 0 1 6 0V20' },
  // 야경·불빛 — 달과 별빛
  night: { d: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z M17.5 3v3.4 M15.8 4.7h3.4' },
}

export default function Icon({
  name,
  size = 16,
  className = '',
  strokeWidth = 1.8,
}: {
  name: IconName
  size?: number
  className?: string
  strokeWidth?: number
}) {
  const { d, fill } = PATHS[name]
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`inline-block shrink-0 ${className}`}
      fill={fill ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {d.split(' M').map((seg, i) => (
        <path key={i} d={i === 0 ? seg : `M${seg}`} />
      ))}
    </svg>
  )
}
