import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import { useResource } from '../api/hooks'
import { useToast } from '../components/ui'
import type { Region, SpotDetail } from '../api/types'

interface Form {
  name: string; regionId: string; category: string; address: string
  lat: string; lng: string; summary: string; description: string; tips: string
  admissionFee: string; avgStayMinutes: string; phone: string; checkinRadiusM: string
  imageUrl: string; imageCredit: string
}

const EMPTY: Form = {
  name: '', regionId: '', category: '', address: '', lat: '', lng: '',
  summary: '', description: '', tips: '', admissionFee: '', avgStayMinutes: '',
  phone: '', checkinRadiusM: '', imageUrl: '', imageCredit: '',
}

export function SpotFormPage() {
  const { id } = useParams()
  const editing = Boolean(id)
  const nav = useNavigate()
  const toast = useToast()
  const { data: regionsData } = useResource<{ regions: Region[] }>('/regions')
  const { data: spot } = useResource<SpotDetail>(editing ? `/admin/spots/${id}` : null, [id])
  const [f, setF] = useState<Form>(EMPTY)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!spot) return
    const img = spot.images[0]
    setF({
      name: spot.name, regionId: spot.regionId, category: spot.category, address: spot.address ?? '',
      lat: String(spot.lat), lng: String(spot.lng), summary: spot.summary ?? '',
      description: spot.description ?? '', tips: spot.tips ?? '', admissionFee: spot.admissionFee ?? '',
      avgStayMinutes: spot.avgStayMinutes != null ? String(spot.avgStayMinutes) : '',
      phone: spot.phone ?? '', checkinRadiusM: spot.checkinRadiusM != null ? String(spot.checkinRadiusM) : '',
      imageUrl: img?.url ?? '', imageCredit: img?.sourceCredit ?? '',
    })
  }, [spot])

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!f.regionId) { toast('err', '지역을 선택하세요'); return }
    const lat = Number(f.lat), lng = Number(f.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) { toast('err', '좌표를 올바르게 입력하세요'); return }

    const body = {
      name: f.name, regionId: f.regionId, category: f.category,
      address: f.address || undefined, lat, lng,
      summary: f.summary || undefined, description: f.description || undefined, tips: f.tips || undefined,
      admissionFee: f.admissionFee || undefined,
      avgStayMinutes: f.avgStayMinutes ? Number(f.avgStayMinutes) : undefined,
      phone: f.phone || undefined,
      checkinRadiusM: f.checkinRadiusM ? Number(f.checkinRadiusM) : undefined,
      images: f.imageUrl ? [{ url: f.imageUrl, credit: f.imageCredit || undefined }] : undefined,
    }

    setBusy(true)
    try {
      if (editing) await api(`/admin/spots/${id}`, { method: 'PUT', body })
      else await api('/admin/spots', { method: 'POST', body })
      toast('ok', editing ? '수정했습니다' : '등록했습니다')
      nav('/spots')
    } catch (err) {
      toast('err', err instanceof ApiError ? err.message : '저장 실패')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="page-head"><h2>{editing ? '관광지 수정' : '관광지 등록'}</h2></div>
      <form className="card card-pad" onSubmit={submit} style={{ maxWidth: 760 }}>
        <div className="grid2">
          <div className="field">
            <label>이름 <span className="req">*</span></label>
            <input className="input" value={f.name} onChange={set('name')} required />
          </div>
          <div className="field">
            <label>지역 <span className="req">*</span></label>
            <select className="select" value={f.regionId} onChange={set('regionId')} required>
              <option value="">선택</option>
              {regionsData?.regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>분류 <span className="req">*</span></label>
            <input className="input" value={f.category} onChange={set('category')} placeholder="자연 · 해변 · 박물관 …" required />
          </div>
          <div className="field">
            <label>전화</label>
            <input className="input" value={f.phone} onChange={set('phone')} />
          </div>
          <div className="field">
            <label>위도 (lat) <span className="req">*</span></label>
            <input className="input" value={f.lat} onChange={set('lat')} placeholder="33.4587" required />
          </div>
          <div className="field">
            <label>경도 (lng) <span className="req">*</span></label>
            <input className="input" value={f.lng} onChange={set('lng')} placeholder="126.9425" required />
          </div>
          <div className="field">
            <label>평균 체류(분)</label>
            <input className="input" inputMode="numeric" value={f.avgStayMinutes} onChange={set('avgStayMinutes')} />
          </div>
          <div className="field">
            <label>체크인 반경(m)</label>
            <input className="input" inputMode="numeric" value={f.checkinRadiusM} onChange={set('checkinRadiusM')} placeholder="비우면 카테고리 기본값" />
          </div>
          <div className="field">
            <label>입장료</label>
            <input className="input" value={f.admissionFee} onChange={set('admissionFee')} placeholder="성인 5,000원" />
          </div>
          <div className="field">
            <label>주소</label>
            <input className="input" value={f.address} onChange={set('address')} />
          </div>
        </div>

        <div className="field">
          <label>한 줄 요약</label>
          <input className="input" value={f.summary} onChange={set('summary')} maxLength={200} />
        </div>
        <div className="field">
          <label>에디터 꿀팁</label>
          <textarea className="textarea" value={f.tips} onChange={set('tips')} maxLength={1000} />
        </div>
        <div className="field">
          <label>상세 소개</label>
          <textarea className="textarea" value={f.description} onChange={set('description')} maxLength={5000} />
        </div>
        <div className="grid2">
          <div className="field">
            <label>대표 이미지 URL</label>
            <input className="input" value={f.imageUrl} onChange={set('imageUrl')} placeholder="https://…" />
          </div>
          <div className="field">
            <label>이미지 출처(저작권 표기)</label>
            <input className="input" value={f.imageCredit} onChange={set('imageCredit')} placeholder="한국관광공사" />
          </div>
        </div>

        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" className="btn" onClick={() => nav('/spots')}>취소</button>
          <button className="btn primary" disabled={busy}>{busy ? '저장 중…' : '저장'}</button>
        </div>
      </form>
    </div>
  )
}
