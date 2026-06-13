const BASE = '/api/v1'

const ACCESS = 'tp_admin_access'
const REFRESH = 'tp_admin_refresh'
const ROLE = 'tp_admin_role'

export const tokenStore = {
  get access() { return localStorage.getItem(ACCESS) },
  get refresh() { return localStorage.getItem(REFRESH) },
  get role() { return localStorage.getItem(ROLE) },
  set(access: string, refresh: string, role: string) {
    localStorage.setItem(ACCESS, access)
    localStorage.setItem(REFRESH, refresh)
    localStorage.setItem(ROLE, role)
  },
  clear() {
    localStorage.removeItem(ACCESS)
    localStorage.removeItem(REFRESH)
    localStorage.removeItem(ROLE)
  },
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message)
  }
}

let onAuthLost: (() => void) | null = null
export function setAuthLostHandler(fn: () => void) { onAuthLost = fn }

async function refreshTokens(): Promise<boolean> {
  const refresh = tokenStore.refresh
  if (!refresh) return false
  const res = await fetch(`${BASE}/admin/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken: refresh }),
  })
  if (!res.ok) return false
  const body = await res.json()
  if (!body.success) return false
  tokenStore.set(body.data.accessToken, body.data.refreshToken, tokenStore.role ?? '')
  return true
}

interface ReqOptions {
  method?: string
  body?: unknown
  auth?: boolean
  retry?: boolean
}

export async function api<T = unknown>(path: string, opts: ReqOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, retry = true } = opts
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['content-type'] = 'application/json'
  if (auth && tokenStore.access) headers.authorization = `Bearer ${tokenStore.access}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401 && auth && retry) {
    if (await refreshTokens()) return api<T>(path, { ...opts, retry: false })
    tokenStore.clear()
    onAuthLost?.()
    throw new ApiError(401, 'AUTH_REQUIRED', '세션이 만료되었습니다')
  }

  if (res.status === 204) return undefined as T

  const json = await res.json().catch(() => null)
  if (!res.ok || !json?.success) {
    const err = json?.error ?? { code: 'UNKNOWN', message: `요청 실패 (${res.status})` }
    throw new ApiError(res.status, err.code, err.message, err.details)
  }
  return json.data as T
}
