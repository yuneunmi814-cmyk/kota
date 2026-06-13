import { Redis } from 'ioredis'
import { env } from '../config/env.js'

// Refresh Token(RTR)·캐시·Rate Limit용 키-값 저장소.
// REDIS_URL이 없으면 인메모리로 동작한다(개발·테스트 전용 — 운영은 Redis 필수).
export interface KeyValueStore {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlSec?: number): Promise<void>
  del(...keys: string[]): Promise<void>
  sAdd(key: string, member: string, ttlSec?: number): Promise<void>
  sMembers(key: string): Promise<string[]>
  incrWithTtl(key: string, ttlSec: number): Promise<number>
}

class MemoryStore implements KeyValueStore {
  private vals = new Map<string, { v: string; exp?: number }>()
  private sets = new Map<string, { v: Set<string>; exp?: number }>()

  private alive<T extends { exp?: number }>(map: Map<string, T>, key: string): T | undefined {
    const e = map.get(key)
    if (!e) return undefined
    if (e.exp && e.exp < Date.now()) {
      map.delete(key)
      return undefined
    }
    return e
  }

  async get(key: string) {
    return this.alive(this.vals, key)?.v ?? null
  }
  async set(key: string, value: string, ttlSec?: number) {
    this.vals.set(key, { v: value, exp: ttlSec ? Date.now() + ttlSec * 1000 : undefined })
  }
  async del(...keys: string[]) {
    for (const k of keys) {
      this.vals.delete(k)
      this.sets.delete(k)
    }
  }
  async sAdd(key: string, member: string, ttlSec?: number) {
    const e = this.alive(this.sets, key) ?? { v: new Set<string>(), exp: ttlSec ? Date.now() + ttlSec * 1000 : undefined }
    e.v.add(member)
    this.sets.set(key, e)
  }
  async sMembers(key: string) {
    return [...(this.alive(this.sets, key)?.v ?? [])]
  }
  async incrWithTtl(key: string, ttlSec: number) {
    const cur = Number((await this.get(key)) ?? '0') + 1
    const e = this.vals.get(key)
    await this.set(key, String(cur))
    const entry = this.vals.get(key)!
    entry.exp = e?.exp ?? Date.now() + ttlSec * 1000
    return cur
  }
}

class RedisStore implements KeyValueStore {
  private r: Redis
  constructor(url: string) {
    this.r = new Redis(url, { maxRetriesPerRequest: 2 })
  }
  async get(key: string) {
    return this.r.get(key)
  }
  async set(key: string, value: string, ttlSec?: number) {
    if (ttlSec) await this.r.set(key, value, 'EX', ttlSec)
    else await this.r.set(key, value)
  }
  async del(...keys: string[]) {
    if (keys.length) await this.r.del(...keys)
  }
  async sAdd(key: string, member: string, ttlSec?: number) {
    await this.r.sadd(key, member)
    if (ttlSec) await this.r.expire(key, ttlSec)
  }
  async sMembers(key: string) {
    return this.r.smembers(key)
  }
  async incrWithTtl(key: string, ttlSec: number) {
    const n = await this.r.incr(key)
    if (n === 1) await this.r.expire(key, ttlSec)
    return n
  }
}

export const kv: KeyValueStore = env.REDIS_URL ? new RedisStore(env.REDIS_URL) : new MemoryStore()
export const usingRedis = Boolean(env.REDIS_URL)
