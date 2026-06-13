import { useResource } from '../api/hooks'
import type { DashboardStats } from '../api/types'

const STATS: { key: keyof Pick<DashboardStats, 'activeUsers' | 'signups' | 'tripStarts' | 'checkIns'>; label: string }[] = [
  { key: 'activeUsers', label: '활성 사용자' },
  { key: 'signups', label: '신규 가입' },
  { key: 'tripStarts', label: '여행 시작' },
  { key: 'checkIns', label: '체크인' },
]

export function DashboardPage() {
  const { data, loading, error } = useResource<DashboardStats>('/admin/stats/dashboard')

  if (loading) return <div className="empty">불러오는 중…</div>
  if (error) return <div className="empty">{error}</div>
  if (!data) return null

  const period = `${data.from.slice(0, 10)} ~ ${data.to.slice(0, 10)}`

  return (
    <div>
      <div className="page-head">
        <h2>대시보드</h2>
        <span className="muted">최근 7일 · {period}</span>
      </div>

      <div className="stat-grid">
        {STATS.map((s) => (
          <div key={s.key} className="card stat">
            <div className="label">{s.label}</div>
            <div className="value">{data[s.key].toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 22 }}>
        <div className="card-pad" style={{ borderBottom: '1px solid var(--line)' }}>
          <h3 style={{ fontSize: 15 }}>인기 코스 TOP 10</h3>
        </div>
        {data.topCourses.length === 0 ? (
          <div className="empty">발행된 코스가 없습니다</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th style={{ width: 44 }}>#</th><th>코스</th><th className="num">저장</th><th className="num">조회</th></tr>
            </thead>
            <tbody>
              {data.topCourses.map((c, i) => (
                <tr key={c.id}>
                  <td className="muted">{i + 1}</td>
                  <td>{c.title}</td>
                  <td className="num">{c.saveCount.toLocaleString()}</td>
                  <td className="num">{c.viewCount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
