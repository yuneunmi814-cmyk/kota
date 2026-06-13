import { useState } from 'react'
import { useResource } from '../api/hooks'
import { api, ApiError } from '../api/client'
import { useToast } from '../components/ui'
import type { Theme } from '../api/types'

interface SendResult { recipients: number; tokens: number; push: { configured: boolean; sent: number }; status: string; scheduledAt: string | null }

export function PushPage() {
  const toast = useToast()
  const { data: themesData } = useResource<{ themes: Theme[] }>('/themes')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [target, setTarget] = useState<'ALL' | 'THEME'>('ALL')
  const [themeId, setThemeId] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<SendResult | null>(null)

  async function send() {
    if (!title.trim() || !body.trim()) { toast('err', '제목과 본문을 입력하세요'); return }
    if (target === 'THEME' && !themeId) { toast('err', '테마를 선택하세요'); return }
    setBusy(true)
    setResult(null)
    try {
      const res = await api<SendResult>('/admin/push-campaigns', {
        method: 'POST',
        body: {
          title, body, target,
          themeId: target === 'THEME' ? themeId : undefined,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        },
      })
      setResult(res)
      toast('ok', res.status === 'SCHEDULED' ? '예약되었습니다' : '발송 처리되었습니다')
    } catch (e) {
      toast('err', e instanceof ApiError ? e.message : '발송 실패')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="page-head"><h2>푸시 캠페인</h2></div>

      <div className="card card-pad" style={{ maxWidth: 640 }}>
        <div className="field">
          <label>제목 <span className="req">*</span></label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="여름 제주 특가 오픈!" />
        </div>
        <div className="field">
          <label>본문 <span className="req">*</span></label>
          <textarea className="textarea" value={body} onChange={(e) => setBody(e.target.value)} maxLength={500} placeholder="지금 확인하고 떠나보세요" />
        </div>
        <div className="grid2">
          <div className="field">
            <label>대상</label>
            <select className="select" value={target} onChange={(e) => setTarget(e.target.value as 'ALL' | 'THEME')}>
              <option value="ALL">전체 (마케팅 동의자)</option>
              <option value="THEME">관심 테마</option>
            </select>
          </div>
          {target === 'THEME' && (
            <div className="field">
              <label>테마 <span className="req">*</span></label>
              <select className="select" value={themeId} onChange={(e) => setThemeId(e.target.value)}>
                <option value="">선택</option>
                {themesData?.themes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="field">
          <label>예약 발송 (선택)</label>
          <input className="input" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          <span className="hint">비우면 즉시 발송. 야간(21~08시)에는 발송이 차단됩니다. 마케팅 미동의자는 자동 제외됩니다.</span>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn primary" disabled={busy} onClick={send}>{busy ? '처리 중…' : '발송'}</button>
        </div>
      </div>

      {result && (
        <div className="card card-pad" style={{ maxWidth: 640, marginTop: 16 }}>
          <div className="row" style={{ gap: 16 }}>
            <span className={`badge ${result.status === 'SCHEDULED' ? 'navy' : 'green'}`}>{result.status === 'SCHEDULED' ? '예약됨' : '발송됨'}</span>
            <span>수신자 <b>{result.recipients.toLocaleString()}</b>명 · 토큰 {result.tokens.toLocaleString()}개</span>
          </div>
          {!result.push.configured && (
            <div className="hint" style={{ marginTop: 8 }}>FCM 미설정 상태 — 실제 발송 없이 수신자 집계만 수행했습니다 (FCM_PROJECT_ID 연결 시 실발송).</div>
          )}
        </div>
      )}
    </div>
  )
}
