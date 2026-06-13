import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import type { ContentStatus, SpotStatus } from '../api/types'

/* ── Toast ─────────────────────────────────────────── */
interface Toast { id: number; kind: 'ok' | 'err' | 'info'; msg: string }
const ToastCtx = createContext<(kind: Toast['kind'], msg: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((kind: Toast['kind'], msg: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, kind, msg }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => <div key={t.id} className={`toast ${t.kind}`}>{t.msg}</div>)}
      </div>
    </ToastCtx.Provider>
  )
}
export function useToast() { return useContext(ToastCtx) }

/* ── Status badges ─────────────────────────────────── */
const COURSE_BADGE: Record<ContentStatus, { cls: string; label: string }> = {
  DRAFT: { cls: 'gray', label: '작성중' },
  IN_REVIEW: { cls: 'warn', label: '검수중' },
  PUBLISHED: { cls: 'green', label: '발행됨' },
  ARCHIVED: { cls: 'navy', label: '보관됨' },
}
export function CourseStatusBadge({ status }: { status: ContentStatus }) {
  const b = COURSE_BADGE[status]
  return <span className={`badge ${b.cls}`}>{b.label}</span>
}

export function SpotStatusBadge({ status }: { status: SpotStatus }) {
  return status === 'ACTIVE'
    ? <span className="badge green">운영중</span>
    : <span className="badge gray">비활성</span>
}

/* ── Confirm dialog (faux-viewport overlay) ────────── */
export function Confirm({ open, title, body, confirmLabel = '확인', danger, onConfirm, onCancel }: {
  open: boolean; title: string; body?: string; confirmLabel?: string; danger?: boolean
  onConfirm: () => void; onCancel: () => void
}) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div className="card card-pad" style={{ width: 380 }}>
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>{title}</h3>
        {body && <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.6, marginBottom: 16 }}>{body}</p>}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onCancel}>취소</button>
          <button className={`btn ${danger ? 'danger' : 'primary'}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
