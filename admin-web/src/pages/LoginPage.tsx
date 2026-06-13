import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ApiError } from '../api/client'
import { useToast } from '../components/ui'

export function LoginPage() {
  const { login, verifyMfa } = useAuth()
  const nav = useNavigate()
  const toast = useToast()
  const [email, setEmail] = useState('editor@travelpack.app')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [mfa, setMfa] = useState<{ tempToken: string } | null>(null)
  const [otp, setOtp] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const r = await login(email, password)
      if (r.mfaRequired) setMfa({ tempToken: r.tempToken! })
      else nav('/', { replace: true })
    } catch (err) {
      toast('err', err instanceof ApiError ? err.message : '로그인 실패')
    } finally {
      setBusy(false)
    }
  }

  async function submitMfa(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await verifyMfa(mfa!.tempToken, otp)
      nav('/', { replace: true })
    } catch (err) {
      toast('err', err instanceof ApiError ? err.message : '인증 실패')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="logo">
          <svg width="44" height="51" viewBox="0 0 120 140" aria-hidden="true">
            <rect x="18" y="10" width="84" height="120" rx="16" fill="#FF6B35" />
            <line x1="34" y1="29" x2="86" y2="29" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".85" />
            <line x1="34" y1="40" x2="86" y2="40" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".85" />
            <rect x="32" y="54" width="56" height="62" rx="8" fill="#fff" />
            <path d="M60,63 c-10,0 -16,7 -16,15 0,10 16,24 16,24 s16,-14 16,-24 c0,-8 -6,-15 -16,-15 z" fill="#1D3557" />
            <circle cx="60" cy="78" r="5" fill="#fff" />
          </svg>
          <b>TravelPack 관리자</b>
          <span>{mfa ? '2단계 인증 코드를 입력하세요' : 'CMS 콘솔에 로그인'}</span>
        </div>

        {!mfa ? (
          <form onSubmit={submit}>
            <div className="field">
              <label>이메일</label>
              <input className="input" type="email" value={email} autoComplete="username"
                onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label>비밀번호</label>
              <input className="input" type="password" value={password} autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>
              {busy ? '확인 중…' : '로그인'}
            </button>
          </form>
        ) : (
          <form onSubmit={submitMfa}>
            <div className="field">
              <label>OTP 6자리</label>
              <input className="input" inputMode="numeric" maxLength={6} value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} required autoFocus />
            </div>
            <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }} disabled={busy || otp.length !== 6}>
              {busy ? '확인 중…' : '인증'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
