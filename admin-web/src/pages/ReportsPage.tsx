import { useState } from 'react'
import { useResource } from '../api/hooks'
import { api, ApiError } from '../api/client'
import { useToast } from '../components/ui'
import type { Paged, ReportRow } from '../api/types'

export function ReportsPage() {
  const toast = useToast()
  const [status, setStatus] = useState('PENDING')
  const { data, loading, reload } = useResource<Paged<ReportRow>>(`/admin/reports?status=${status}`, [status])

  async function act(r: ReportRow, action: 'HIDE' | 'REJECT') {
    try {
      await api(`/admin/reports/${r.id}`, { method: 'PATCH', body: { action } })
      toast('ok', action === 'HIDE' ? '리뷰를 숨겼습니다' : '신고를 기각했습니다')
      reload()
    } catch (e) {
      toast('err', e instanceof ApiError ? e.message : '처리 실패')
    }
  }

  return (
    <div>
      <div className="page-head"><h2>신고</h2></div>
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="row">
          {[['PENDING', '대기'], ['ACCEPTED', '숨김'], ['REJECTED', '기각']].map(([v, l]) => (
            <button key={v} className={`btn sm ${status === v ? 'navy' : 'ghost'}`} onClick={() => setStatus(v)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="card">
        {loading ? <div className="empty">불러오는 중…</div>
          : !data || data.items.length === 0 ? <div className="empty">신고가 없습니다</div>
            : (
              <table className="tbl">
                <thead>
                  <tr><th>리뷰 내용</th><th>작성자</th><th>신고자</th><th>사유</th><th>일시</th>{status === 'PENDING' && <th></th>}</tr>
                </thead>
                <tbody>
                  {data.items.map((r) => (
                    <tr key={r.id}>
                      <td style={{ maxWidth: 320 }}>{r.review.content}</td>
                      <td className="muted">{r.review.author.nickname}</td>
                      <td className="muted">{r.reporter.nickname}</td>
                      <td><span className="badge warn">{r.reasonCode}</span></td>
                      <td className="muted">{r.createdAt.slice(0, 10)}</td>
                      {status === 'PENDING' && (
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button className="btn sm ghost" onClick={() => act(r, 'REJECT')}>기각</button>{' '}
                          <button className="btn sm danger" onClick={() => act(r, 'HIDE')}>숨김</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
      </div>
    </div>
  )
}
