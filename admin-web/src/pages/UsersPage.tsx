import { useState } from 'react'
import { useResource } from '../api/hooks'
import { api, ApiError } from '../api/client'
import { useToast } from '../components/ui'
import type { AdminUserRow, Paged } from '../api/types'

function statusBadge(s: AdminUserRow['status']) {
  if (s === 'ACTIVE') return <span className="badge green">활성</span>
  if (s === 'SUSPENDED') return <span className="badge red">정지</span>
  return <span className="badge gray">탈퇴</span>
}

export function UsersPage() {
  const toast = useToast()
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const { data, loading, reload } = useResource<Paged<AdminUserRow>>(`/admin/users${query ? `?q=${encodeURIComponent(query)}` : ''}`, [query])

  async function toggleStatus(u: AdminUserRow) {
    const next = u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
    const reason = window.prompt(`${u.nickname} 상태를 ${next === 'SUSPENDED' ? '정지' : '활성화'}합니다. 사유를 입력하세요(감사 로그 기록).`)
    if (!reason) return
    try {
      await api(`/admin/users/${u.id}/status`, { method: 'PATCH', body: { status: next, reason } })
      toast('ok', '상태를 변경했습니다')
      reload()
    } catch (e) {
      toast('err', e instanceof ApiError ? e.message : '변경 실패')
    }
  }

  return (
    <div>
      <div className="page-head"><h2>회원</h2></div>
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="row">
          <input className="input" style={{ maxWidth: 280 }} placeholder="닉네임·이메일 검색"
            value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setQuery(q.trim())} />
          <button className="btn" onClick={() => setQuery(q.trim())}>검색</button>
        </div>
        <div className="hint" style={{ marginTop: 8 }}>이메일은 마스킹되어 표시됩니다. 개인정보 상세 열람은 사유 입력 시 감사 로그에 기록됩니다.</div>
      </div>

      <div className="card">
        {loading ? <div className="empty">불러오는 중…</div>
          : !data || data.items.length === 0 ? <div className="empty">회원이 없습니다</div>
            : (
              <table className="tbl">
                <thead>
                  <tr><th>닉네임</th><th>이메일(마스킹)</th><th>가입</th><th>상태</th><th>최근 로그인</th><th></th></tr>
                </thead>
                <tbody>
                  {data.items.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 500 }}>{u.nickname}</td>
                      <td className="muted">{u.email ?? '—'} <span className="badge gray" style={{ marginLeft: 4 }}>{u.provider}</span></td>
                      <td className="muted">{u.createdAt.slice(0, 10)}</td>
                      <td>{statusBadge(u.status)}</td>
                      <td className="muted">{u.lastLoginAt ? u.lastLoginAt.slice(0, 10) : '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        {u.status !== 'WITHDRAWN' && (
                          <button className={`btn sm ${u.status === 'ACTIVE' ? 'ghost' : 'primary'}`} onClick={() => toggleStatus(u)}>
                            {u.status === 'ACTIVE' ? '정지' : '해제'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
      </div>
    </div>
  )
}
