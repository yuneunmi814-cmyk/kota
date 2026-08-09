import { useEffect, useMemo, useState } from 'react'
import { apiGet, type Sido } from '../api'
import { staticSidos } from '../staticData'
import { useLang, useT } from '../i18n'
import { sidoLabel } from '../sidoI18n'
import { REGION_GROUPS, groupLabel, groupOfSido, type RegionGroup } from '../regionGroups'

// 선택 상태 — 전국 / 권역 / 단일 시·도
export type RegionSel = { type: 'all' } | { type: 'group'; key: string } | { type: 'sido'; name: string }

// 지역 배너 — QA A-3(2026-08-06): 시·도 17개 가로 스크롤을 **권역 7개(1단) + 하위 시·도(2단)** 로 축소.
// 1단은 한 줄에 들어가 모바일에서도 스크롤·화살표가 불필요(A-5도 함께 해소).
export default function RegionBanner({ selected, onChange }: { selected: RegionSel; onChange: (s: RegionSel) => void }) {
  const t = useT()
  const { lang } = useLang()
  const [counts, setCounts] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    const toMap = (sidos: Sido[]) => new Map(sidos.map((s) => [s.name, s.count]))
    apiGet<{ sidos: Sido[] }>('/festivals/sidos')
      .then((d) => setCounts(toMap(d.sidos)))
      .catch(() => staticSidos().then((s) => setCounts(toMap(s))).catch(() => setCounts(new Map())))
  }, [])

  const total = useMemo(() => [...counts.values()].reduce((a, b) => a + b, 0), [counts])
  const groupCount = (g: RegionGroup) => g.sidos.reduce((a, s) => a + (counts.get(s) ?? 0), 0)

  // 펼칠 권역: 선택이 권역이면 그것, 단일 시·도면 그 시·도가 속한 권역
  const expandedKey =
    selected.type === 'group' ? selected.key : selected.type === 'sido' ? groupOfSido(selected.name)?.key ?? null : null
  const expanded = REGION_GROUPS.find((g) => g.key === expandedKey) ?? null

  const chip = (label: string, count: number | null, active: boolean, onClick: () => void) => (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 px-4 py-2 rounded-full border text-[14px] font-bold transition flex items-center gap-1.5 ${
        active ? 'bg-green border-green text-white shadow-sm' : 'bg-white border-gray-300 text-green hover:border-green'
      }`}
    >
      {label}
      {count !== null && count > 0 && (
        <span className={`text-[11px] font-semibold tabular-nums ${active ? 'text-white/70' : 'text-gray-400'}`}>{count}</span>
      )}
    </button>
  )

  return (
    <section className="w-full bg-white pt-4 pb-2 mb-4">
      <div className="max-w-3xl mx-auto px-4 flex flex-col items-center gap-3">
        {/* 1단 — 전국 + 권역 6개 (한 줄, 모바일에서도 줄바꿈만) */}
        <div className="flex flex-wrap justify-center gap-2">
          {chip(t('region.all'), total || null, selected.type === 'all', () => onChange({ type: 'all' }))}
          {REGION_GROUPS.map((g) =>
            chip(
              groupLabel(g, lang),
              groupCount(g) || null,
              expandedKey === g.key,
              () => onChange({ type: 'group', key: g.key }),
            ),
          )}
        </div>

        {/* 2단 — 선택한 권역의 하위 시·도 (권역에 시·도가 2개 이상일 때만) */}
        {expanded && expanded.sidos.length > 1 && (
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            {chip(
              `${groupLabel(expanded, lang)} · ${t('region.allGroup')}`,
              null,
              selected.type === 'group',
              () => onChange({ type: 'group', key: expanded.key }),
            )}
            {expanded.sidos.map((s) =>
              chip(
                sidoLabel(s, lang),
                counts.get(s) ?? null,
                selected.type === 'sido' && selected.name === s,
                () => onChange({ type: 'sido', name: s }),
              ),
            )}
          </div>
        )}
      </div>
    </section>
  )
}
