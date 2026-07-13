import { createApp } from './app.js'
import { env } from './config/env.js'
import { usingRedis } from './lib/kv.js'

const app = createApp()
app.listen(env.PORT, () => {
  console.log(`KOTA API listening on :${env.PORT} (${env.NODE_ENV})`)
  if (!usingRedis) console.warn('REDIS_URL 미설정 — 인메모리 KV로 동작 중 (개발 전용, 재시작 시 세션 소실)')
})
