import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, tokenStore, setAuthLostHandler } from '../api/client'
import type { AdminRole } from '../api/types'

interface LoginResult {
  mfaRequired: boolean
  tempToken?: string
}

interface AuthState {
  role: AdminRole | null
  isAuthed: boolean
  login: (email: string, password: string) => Promise<LoginResult>
  verifyMfa: (tempToken: string, otpCode: string) => Promise<void>
  logout: () => void
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<AdminRole | null>((tokenStore.role as AdminRole) || null)

  useEffect(() => {
    setAuthLostHandler(() => setRole(null))
  }, [])

  const value = useMemo<AuthState>(() => ({
    role,
    isAuthed: Boolean(role && tokenStore.access),
    async login(email, password) {
      const data = await api<{ mfaRequired: boolean; tempToken?: string; accessToken?: string; refreshToken?: string; role?: AdminRole }>(
        '/admin/auth/login',
        { method: 'POST', body: { email, password }, auth: false },
      )
      if (data.mfaRequired) return { mfaRequired: true, tempToken: data.tempToken }
      tokenStore.set(data.accessToken!, data.refreshToken!, data.role!)
      setRole(data.role!)
      return { mfaRequired: false }
    },
    async verifyMfa(tempToken, otpCode) {
      const data = await api<{ accessToken: string; refreshToken: string; role: AdminRole }>('/admin/auth/mfa', {
        method: 'POST', body: { tempToken, otpCode }, auth: false,
      })
      tokenStore.set(data.accessToken, data.refreshToken, data.role)
      setRole(data.role)
    },
    logout() {
      tokenStore.clear()
      setRole(null)
    },
  }), [role])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
