import { useState } from 'react'
import { useResource } from '../api/hooks'
import { api, ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Confirm, useToast } from '../components/ui'
import type { BannerRow } from '../api/types'

const todayPlus = (days: number) => new Date(Date.now() + days * 86400_000).toISOString().slice(0, 10)

export function BannersPage() {
  const { role } = useAuth()
  const toast = useToast()
  const canEdit = role === 'SUPER_ADMIN' || role === 'MARKETER'
  const { data, loading, reload } = useResource<{ items: BannerRow[] }>('/admin/banners')
  const [creating, setCreating] = useState(false)
  const [del, setDel] = useState<BannerRow | null>(null)
  const [form, setForm] = useState({ title: '', imageUrl: '', linkType: 'COURSE', linkTarget: '', startAt: todayPlus(0), endAt: todayPlus(30) })
  const [busy, setBusy] = useState(false)

  async function create() {
    if (!form.title || !form.imageUrl) { toast('err', '제목과 이미지 URL은 필수입니다'); return }
    setBusy(true)
    try {
      await api('/admin/banners', {
        method: 'POST',
        body: {
          title: form.title, imageUrl: form.imageUrl, linkType: form.linkType,
          linkTarget: form.linkTarget || undefined,
          startAt: new Date(form.startAt).toISOString(), endAt: new Date(form.endAt).toISOString(),
          sortOrder: 0, isActive: true,
        },
      })
      toast('ok', '배너를 등록했습니다')
      setCreating(false)
      setForm({ title: '', imageUrl: '', linkType: 'COURSE', linkTarget: '', startAt: todayPlus(0), endAt: todayPlus(30) })
      reload()
    } catch (e) {
      toast('err', e instanceof ApiError ? e.message : '등록 실패')
    } finally {
      setBusy(false)
    }
  }

  async function doDelete() {
    if (!del) return
    try {
      await api(`/admin/banners/${del.id}`, { method: 'DELETE' })
      toast('ok', '삭제했습니다')
    } catch (e) {
      toast('err', e instanceof ApiError ? e.message : '삭제 실패')
    } finally {
      setDel(null); reload()
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }))

  return (
    <div>
      <div className="page-head">
        <h2>배너</h2>
        {canEdit && <button className="btn primary" onClick={() => setCreating((v) => !v)}>{creating ? '닫기' : '+ 배너 등록'}</button>}
      </div>

      {creating && (
        <div className="card card-pad" style={{ marginBottom: 16, maxWidth: 720 }}>
          <div className="grid2">
            <div className="field"><label>제목 <span className="req">*</span></label><input className="input" value={form.title} onChange={set('title')} /></div>
            <div className="field"><label>이미지 URL <span className="req">*</span></label><input className="input" value={form.imageUrl} onChange={set('imageUrl')} placeholder="https://…" /></div>
            <div className="field"><label>링크 유형</label>
              <select className="select" value={form.linkType} onChange={set('linkType')}><option value="COURSE">코스</option><option value="URL">URL</option></select>
            </div>
            <div className="field"><label>링크 대상</label><input className="input" value={form.linkTarget} onChange={set('linkTarget')} placeholder="코스 ID 또는 URL" /></div>
            <div className="field"><label>시작일</label><input className="input" type="date" value={form.startAt} onChange={set('startAt')} /></div>
            <div className="field"><label>종료일</label><input className="input" type="date" value={form.endAt} onChange={set('endAt')} /></div>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn primary" disabled={busy} onClick={create}>{busy ? '등록 중…' : '등록'}</button>
          </div>
        </div>
      )}

      <div className="card">
        {loading ? <div className="empty">불러오는 중…</div>
          : !data || data.items.length === 0 ? <div className="empty">배너가 없습니다</div>
            : (
              <table className="tbl">
                <thead><tr><th>제목</th><th>링크</th><th>노출 기간</th><th>상태</th>{canEdit && <th></th>}</tr></thead>
                <tbody>
                  {data.items.map((b) => {
                    const now = Date.now()
                    const live = b.isActive && new Date(b.startAt).getTime() <= now && new Date(b.endAt).getTime() >= now
                    return (
                      <tr key={b.id}>
                        <td style={{ fontWeight: 500 }}>{b.title}</td>
                        <td className="muted">{b.linkType} {b.linkTarget ? `· ${b.linkTarget}` : ''}</td>
                        <td className="muted">{b.startAt.slice(0, 10)} ~ {b.endAt.slice(0, 10)}</td>
                        <td>{live ? <span className="badge green">노출중</span> : <span className="badge gray">비노출</span>}</td>
                        {canEdit && <td style={{ textAlign: 'right' }}><button className="btn sm danger" onClick={() => setDel(b)}>삭제</button></td>}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
      </div>

      <Confirm open={Boolean(del)} title="배너 삭제" body={`"${del?.title}" 배너를 삭제합니다.`} confirmLabel="삭제" danger
        onConfirm={doDelete} onCancel={() => setDel(null)} />
    </div>
  )
}
