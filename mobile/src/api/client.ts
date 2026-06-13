import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_BASE } from '../config'

const ACCESS = 'tp_access'
const REFRESH = 'tp_refresh'

let accessToken: string | null = null
let refreshToken: string | null = null

export async function loadTokens(): Promise<void> {
  accessToken = await AsyncStorage.getItem(ACCESS)
  refreshToken = await AsyncStorage.getItem(REFRESH)
}
export async function setTokens(access: string, refresh: string): Promise<void> {
  accessToken = access
  refreshToken = refresh
  await AsyncStorage.multiSet([[ACCESS, access], [REFRESH, refresh]])
}
export async function clearTokens(): Promise<void> {
  accessToken = null
  refreshToken = null
  await AsyncStorage.multiRemove([ACCESS, REFRESH])
}
export function hasSession(): boolean {
  return Boolean(accessToken)
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message)
  }
}

let onAuthLost: (() => void) | null = null
export function setAuthLostHandler(fn: () => void): void { onAuthLost = fn }

async function refresh(): Promise<boolean> {
  if (!refreshToken) return false
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    const json = await res.json()
    if (!res.ok || !json.success) return false
    await setTokens(json.data.accessToken, json.data.refreshToken)
    return true
  } catch {
    return false
  }
}

interface Opts { method?: string; body?: unknown; auth?: boolean; retry?: boolean }

export async function api<T = unknown>(path: string, opts: Opts = {}): Promise<T> {
  const { method = 'GET', body, auth = false, retry = true } = opts
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['content-type'] = 'application/json'
  if (accessToken) headers.authorization = `Bearer ${accessToken}`

  const res = await fetch(`${API_BASE}${path}`, {
    method, headers, body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401 && auth && retry && refreshToken) {
    if (await refresh()) return api<T>(path, { ...opts, retry: false })
    await clearTokens()
    onAuthLost?.()
    throw new ApiError(401, 'AUTH_REQUIRED', '로그인이 필요합니다')
  }
  if (res.status === 204) return undefined as T

  const json = await res.json().catch(() => null)
  if (!res.ok || !json?.success) {
    const err = json?.error ?? { code: 'UNKNOWN', message: `요청 실패 (${res.status})` }
    throw new ApiError(res.status, err.code, err.message, err.details)
  }
  return json.data as T
}
