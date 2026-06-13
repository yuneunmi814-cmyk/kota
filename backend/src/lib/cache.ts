import { kv } from './kv.js'
import { isTest } from '../config/env.js'

// 탐색 캐시 — Redis 5분 TTL (기획설계서 2.1절). 발행/회수 시 버전 범프로 일괄 무효화
const VERSION_KEY = 'cachever:explore'
const TTL_SEC = 300

async function version(): Promise<string> {
  return (await kv.get(VERSION_KEY)) ?? '1'
}

export async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (isTest) return fn()
  const fullKey = `cache:v${await version()}:${key}`
  const hit = await kv.get(fullKey)
  if (hit) return JSON.parse(hit) as T
  const value = await fn()
  await kv.set(fullKey, JSON.stringify(value), TTL_SEC)
  return value
}

export async function invalidateExploreCache(): Promise<void> {
  const next = Number(await version()) + 1
  await kv.set(VERSION_KEY, String(next))
}
