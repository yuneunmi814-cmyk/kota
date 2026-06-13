import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useResource } from '../api/hooks'
import { api, ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Confirm, SpotStatusBadge, useToast } from '../components/ui'
import type { Paged, SpotListItem } from '../api/types'

export function SpotsListPage() {
  const { role } = useAuth()
  const nav = useNavigate()
  const toast = useToast()
  const canEdit = role === 'SUPER_ADMIN' || role === 'CONTENT_MANAGER'
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')
  const { data, loading, reload } = useResource<Paged<SpotListItem>>(`/admin/spots?${query}`, [query])
  const [deactivate, setDeactivate] = useState<SpotListItem | null>(null)

  function applyFilter() {
    const p = new URLSearchParams()
    if (q.trim()) p.set('q', q.trim())
    if (status) p.set('status', status)
    setQuery(p.toString())
  }

  async function doDeactivate() {
    if (!deactivate) return
    try {
      await api(`/admin/spots/${deactivate.id}`, { method: 'DELETE' })
      toast('ok', '비활성화했습니다')
    } catch (e) {
      // 코스에 포함된 스팟은 409지만 서버가 이미 비활성화 처리함
      toast('info', e instanceof ApiError ? e.message : '처리됨')
    } finally {
      setDeactivate(null)
      reload()
    }
  }

  return (
    <div>
      <div className="page-head">
        <h2>관광지</h2>
        {canEdit && <Link to="/spots/new" className="btn primary">+ 관광지 등록</Link>}
      </div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="row wrap">
          <input className="input" style={{ maxWidth: 240 }} placeholder="이름 검색"
            value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyFilter()} />
          <select className="select" style={{ maxWidth: 150 }} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">전체 상태</option>
            <option value="ACTIVE">운영중</option>
            <option value="INACTIVE">비활성</option>
          </select>
          <button className="btn" onClick={applyFilter}>검색</button>
        </div>
      </div>

      <div className="card">
        {loading ? <div className="empty">불러오는 중…</div>
          : !data || data.items.length === 0 ? <div className="empty">관광지가 없습니다</div>
            : (
              <table className="tbl">
                <thead>
                  <tr><th>이름</th><th>지역</th><th>분류</th><th>상태</th><th>출처</th><th className="num">코스 사용</th>{canEdit && <th></th>}</tr>
                </thead>
                <tbody>
                  {data.items.map((s) => (
                    <tr key={s.id} style={{ cursor: canEdit ? 'pointer' : 'default' }} onClick={() => canEdit && nav(`/spots/${s.id}`)}>
                      <td style={{ fontWeight: 500 }}>{s.name}</td>
                      <td className="muted">{s.region}</td>
                      <td className="muted">{s.category}</td>
                      <td><SpotStatusBadge status={s.status} /></td>
                      <td><span className="badge gray">{s.source}</span></td>
                      <td className="num">{s.usedInCourses}</td>
                      {canEdit && (
                        <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'right' }}>
                          {s.status === 'ACTIVE' && (
                            <button className="btn sm ghost" onClick={() => setDeactivate(s)}>비활성화</button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
      </div>

      <Confirm
        open={Boolean(deactivate)}
        title="관광지 비활성화"
        body={`"${deactivate?.name}"을(를) 앱에서 숨깁니다. 코스에 포함된 경우 삭제 대신 비활성화로 처리됩니다.`}
        confirmLabel="비활성화" danger
        onConfirm={doDeactivate} onCancel={() => setDeactivate(null)}
      />
    </div>
  )
}
