import { generateKeyPairSync } from 'node:crypto'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

export function ensureKeys(privatePath: string, publicPath: string): void {
  if (existsSync(privatePath) && existsSync(publicPath)) return
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  })
  mkdirSync(dirname(resolve(privatePath)), { recursive: true })
  writeFileSync(privatePath, privateKey, { mode: 0o600 })
  writeFileSync(publicPath, publicKey)
  console.log(`RS256 키 생성 완료: ${privatePath}, ${publicPath}`)
}

if (process.argv[1]?.endsWith('generate-keys.ts')) {
  ensureKeys('keys/private.pem', 'keys/public.pem')
}
