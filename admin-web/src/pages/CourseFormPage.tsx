import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import { useResource } from '../api/hooks'
import { CourseStatusBadge, useToast } from '../components/ui'
import type { ContentStatus, CourseDetail, Paged, Region, SpotListItem, Theme, Transport } from '../api/types'

interface ItemRow {
  key: string; dayNo: number; spotId: string
  stayMinutes: string; transport: '' | Transport; transportMinutes: string; note: string
}

const TRANSPORTS: { v: Transport; label: string }[] = [
  { v: 'WALK', label: '도보' }, { v: 'BUS', label: '버스' }, { v: 'TAXI', label: '택시' }, { v: 'CAR', label: '자동차' },
]

let seq = 0
const newKey = () => `r${seq++}`

export function CourseFormPage() {
  const { id } = useParams()
  const editing = Boolean(id)
  const nav = useNavigate()
  const toast = useToast()

  const { data: regionsData } = useResource<{ regions: Region[] }>('/regions')
  const { data: themesData } = useResource<{ themes: Theme[] }>('/themes')
  const { data: spotsData } = useResource<Paged<SpotListItem>>('/admin/spots?status=ACTIVE&limit=50')
  const { data: course, reload } = useResource<CourseDetail>(editing ? `/admin/courses/${id}` : null, [id])

  const [title, setTitle] = useState('')
  const [regionId, setRegionId] = useState('')
  const [summary, setSummary] = useState('')
  const [durationDays, setDurationDays] = useState(2)
  const [estCost, setEstCost] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [themeIds, setThemeIds] = useState<string[]>([])
  const [items, setItems] = useState<ItemRow[]>([])
  const [busy, setBusy] = useState(false)
  const [reject, setReject] = useState(false)
  const [rejectComment, setRejectComment] = useState('')

  const status: ContentStatus = course?.status ?? 'DRAFT'
  const locked = editing && (status === 'PUBLISHED' || status === 'IN_REVIEW')

  useEffect(() => {
    if (!course) return
    setTitle(course.title)
    setRegionId(course.regionId)
    setSummary(course.summary ?? '')
    setDurationDays(course.durationDays)
    setEstCost(course.estCost != null ? String(course.estCost) : '')
    setCoverImage(course.coverImageUrl ?? '')
    setThemeIds(course.themes.map((t) => t.theme.id))
    setItems(course.items.map((it) => ({
      key: newKey(), dayNo: it.dayNo, spotId: it.spotId,
      stayMinutes: it.stayMinutes != null ? String(it.stayMinutes) : '',
      transport: it.transportToNext ?? '', transportMinutes: it.transportMinutes != null ? String(it.transportMinutes) : '',
      note: it.note ?? '',
    })))
  }, [course])

  const spots = spotsData?.items ?? []
  const days = Array.from({ length: durationDays }, (_, i) => i + 1)

  function addItem(day: number) {
    const firstSpot = spots[0]?.id ?? ''
    setItems((p) => [...p, { key: newKey(), dayNo: day, spotId: firstSpot, stayMinutes: '', transport: '', transportMinutes: '', note: '' }])
  }
  function updateItem(key: string, patch: Partial<ItemRow>) {
    setItems((p) => p.map((it) => (it.key === key ? { ...it, ...patch } : it)))
  }
  function removeItem(key: string) { setItems((p) => p.filter((it) => it.key !== key)) }
  function move(key: string, dir: -1 | 1) {
    setItems((p) => {
      const arr = [...p]
      const i = arr.findIndex((x) => x.key === key)
      const j = i + dir
      if (i < 0 || j < 0 || j >= arr.length || arr[i]!.dayNo !== arr[j]!.dayNo) return p
      ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
      return arr
    })
  }

  function toggleTheme(tid: string) {
    setThemeIds((p) => (p.includes(tid) ? p.filter((x) => x !== tid) : [...p, tid]))
  }

  async function save() {
    if (!regionId) { toast('err', '지역을 선택하세요'); return }
    if (items.length === 0) { toast('err', '코스 스팟을 1개 이상 추가하세요'); return }
    if (items.some((it) => !it.spotId)) { toast('err', '스팟이 선택되지 않은 항목이 있습니다'); return }

    const byDay = new Map<number, ItemRow[]>()
    for (const it of items) { if (!byDay.has(it.dayNo)) byDay.set(it.dayNo, []); byDay.get(it.dayNo)!.push(it) }
    const apiItems = items.map((it) => ({
      dayNo: it.dayNo,
      order: byDay.get(it.dayNo)!.indexOf(it) + 1,
      spotId: it.spotId,
      stayMinutes: it.stayMinutes ? Number(it.stayMinutes) : undefined,
      transport: it.transport || undefined,
      transportMinutes: it.transportMinutes ? Number(it.transportMinutes) : undefined,
      note: it.note || undefined,
    }))

    const body = {
      title, regionId, summary: summary || undefined, durationDays,
      estCost: estCost ? Number(estCost) : undefined,
      coverImage: coverImage || undefined,
      themeIds: themeIds.length ? themeIds : undefined,
      items: apiItems,
    }

    setBusy(true)
    try {
      if (editing) await api(`/admin/courses/${id}`, { method: 'PUT', body })
      else {
        const r = await api<{ courseId: string }>('/admin/courses', { method: 'POST', body })
        toast('ok', '코스를 저장했습니다')
        nav(`/courses/${r.courseId}`)
        return
      }
      toast('ok', '코스를 저장했습니다')
      reload()
    } catch (err) {
      toast('err', err instanceof ApiError ? err.message : '저장 실패')
    } finally {
      setBusy(false)
    }
  }

  async function workflow(action: 'submit' | 'publish' | 'unpublish', okMsg: string) {
    setBusy(true)
    try {
      await api(`/admin/courses/${id}/${action}`, { method: 'POST' })
      toast('ok', okMsg)
      reload()
    } catch (err) {
      toast('err', err instanceof ApiError ? err.message : '처리 실패')
    } finally {
      setBusy(false)
    }
  }

  async function doReject() {
    setBusy(true)
    try {
      await api(`/admin/courses/${id}/reject`, { method: 'POST', body: { comment: rejectComment } })
      toast('ok', '반려했습니다')
      setReject(false); setRejectComment(''); reload()
    } catch (err) {
      toast('err', err instanceof ApiError ? err.message : '반려 실패')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="page-head">
        <div className="row">
          <h2>{editing ? '코스 수정' : '코스 등록'}</h2>
          {editing && <CourseStatusBadge status={status} />}
        </div>
        <div className="row">
          {status === 'DRAFT' && editing && <button className="btn navy" disabled={busy} onClick={() => workflow('submit', '검수 요청했습니다')}>검수 요청</button>}
          {status === 'IN_REVIEW' && (
            <>
              <button className="btn" disabled={busy} onClick={() => setReject(true)}>반려</button>
              <button className="btn primary" disabled={busy} onClick={() => workflow('publish', '발행했습니다')}>발행 승인</button>
            </>
          )}
          {status === 'PUBLISHED' && <button className="btn danger" disabled={busy} onClick={() => workflow('unpublish', '회수했습니다')}>발행 회수</button>}
        </div>
      </div>

      {status === 'IN_REVIEW' && (
        <div className="card card-pad" style={{ marginBottom: 16, background: 'var(--warn-weak)', borderColor: '#F2C879' }}>
          <b>검수 대기 중</b> — 발행 승인은 <b>작성자 본인이 아닌 다른 콘텐츠 매니저</b>만 가능합니다 (4-eyes). 본인이 작성한 코스라면 발행 시 거부됩니다.
        </div>
      )}
      {locked && (
        <div className="hint" style={{ marginBottom: 12 }}>발행/검수 중인 코스는 수정할 수 없습니다. 수정하려면 회수(또는 반려) 후 작성중 상태로 되돌리세요.</div>
      )}

      <fieldset disabled={locked} style={{ border: 'none', padding: 0, margin: 0 }}>
        <div className="card card-pad" style={{ maxWidth: 860 }}>
          <div className="grid2">
            <div className="field">
              <label>제목 <span className="req">*</span></label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="field">
              <label>지역 <span className="req">*</span></label>
              <select className="select" value={regionId} onChange={(e) => setRegionId(e.target.value)}>
                <option value="">선택</option>
                {regionsData?.regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>여행 일수 <span className="req">*</span></label>
              <select className="select" value={durationDays} onChange={(e) => setDurationDays(Number(e.target.value))}>
                {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>{d}일</option>)}
              </select>
            </div>
            <div className="field">
              <label>예상 경비(원)</label>
              <input className="input" inputMode="numeric" value={estCost} onChange={(e) => setEstCost(e.target.value)} placeholder="120000" />
            </div>
          </div>
          <div className="field">
            <label>한 줄 요약</label>
            <input className="input" value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={200} />
          </div>
          <div className="field">
            <label>커버 이미지 URL</label>
            <input className="input" value={coverImage} onChange={(e) => setCoverImage(e.target.value)} placeholder="https://…" />
          </div>
          <div className="field">
            <label>테마</label>
            <div className="row wrap">
              {themesData?.themes.map((t) => (
                <button type="button" key={t.id}
                  className={`btn sm ${themeIds.includes(t.id) ? 'primary' : 'ghost'}`}
                  onClick={() => toggleTheme(t.id)}>{t.name}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="card card-pad" style={{ maxWidth: 860, marginTop: 16 }}>
          <h3 style={{ fontSize: 15, marginBottom: 12 }}>코스 타임라인</h3>
          {spots.length === 0 && <div className="hint" style={{ marginBottom: 10 }}>등록된 활성 관광지가 없습니다. 먼저 관광지를 등록하세요.</div>}
          {days.map((day) => {
            const dayItems = items.filter((it) => it.dayNo === day)
            return (
              <div key={day} className="daygroup">
                <div className="dayhead">Day {day}</div>
                {dayItems.map((it) => (
                  <div key={it.key} className="timeline-item">
                    <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                      <select className="select" style={{ flex: 2 }} value={it.spotId} onChange={(e) => updateItem(it.key, { spotId: e.target.value })}>
                        {spots.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.region})</option>)}
                      </select>
                      <button type="button" className="btn sm ghost" onClick={() => move(it.key, -1)} title="위로">↑</button>
                      <button type="button" className="btn sm ghost" onClick={() => move(it.key, 1)} title="아래로">↓</button>
                      <button type="button" className="btn sm danger" onClick={() => removeItem(it.key)}>삭제</button>
                    </div>
                    <div className="row wrap" style={{ gap: 8 }}>
                      <input className="input" style={{ maxWidth: 130 }} inputMode="numeric" placeholder="체류(분)"
                        value={it.stayMinutes} onChange={(e) => updateItem(it.key, { stayMinutes: e.target.value })} />
                      <select className="select" style={{ maxWidth: 140 }} value={it.transport}
                        onChange={(e) => updateItem(it.key, { transport: e.target.value as Transport | '' })}>
                        <option value="">다음 이동수단</option>
                        {TRANSPORTS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
                      </select>
                      <input className="input" style={{ maxWidth: 130 }} inputMode="numeric" placeholder="이동(분)"
                        value={it.transportMinutes} onChange={(e) => updateItem(it.key, { transportMinutes: e.target.value })} />
                      <input className="input" style={{ flex: 1, minWidth: 140 }} placeholder="메모"
                        value={it.note} onChange={(e) => updateItem(it.key, { note: e.target.value })} />
                    </div>
                  </div>
                ))}
                <button type="button" className="btn sm" disabled={spots.length === 0} onClick={() => addItem(day)}>+ Day {day} 스팟 추가</button>
              </div>
            )
          })}
        </div>

        {!locked && (
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16, maxWidth: 860 }}>
            <button type="button" className="btn" onClick={() => nav('/courses')}>목록</button>
            <button type="button" className="btn primary" disabled={busy} onClick={save}>{busy ? '저장 중…' : '저장'}</button>
          </div>
        )}
      </fieldset>

      {reject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="card card-pad" style={{ width: 400 }}>
            <h3 style={{ fontSize: 16, marginBottom: 8 }}>검수 반려</h3>
            <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>반려 사유는 필수이며 작성자에게 전달됩니다.</p>
            <textarea className="textarea" placeholder="반려 사유" value={rejectComment} autoFocus
              onChange={(e) => setRejectComment(e.target.value)} />
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
              <button className="btn" onClick={() => { setReject(false); setRejectComment('') }}>취소</button>
              <button className="btn primary" disabled={busy}
                onClick={() => { if (!rejectComment.trim()) { toast('err', '사유를 입력하세요'); return } doReject() }}>반려</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
