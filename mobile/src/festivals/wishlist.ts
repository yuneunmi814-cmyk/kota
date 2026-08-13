import AsyncStorage from '@react-native-async-storage/async-storage'

// 찜(♥) — 웹과 같은 키(externalId)를 쓴다. DB의 숫자 id는 환경마다 달라지므로
// 로컬/운영이 갈리면 같은 축제가 다른 축제로 보인다(웹에서 실제로 겪은 버그).
//
// 앱에서 찜은 단순한 즐겨찾기가 아니라 **지오펜스 등록 대상**이다.
// iOS는 앱당 감시 영역이 20개로 제한돼 있어, 전국 718개에 다 걸 수 없다.
// "관심 있다고 표시한 것만 알려준다"는 규칙이 그 제약과 정확히 맞아떨어진다.

const KEY = 'kota.wishlist.v1'

type Listener = (keys: string[]) => void
const listeners = new Set<Listener>()
let cache: string[] | null = null

async function read(): Promise<string[]> {
  if (cache) return cache
  try {
    const raw = await AsyncStorage.getItem(KEY)
    cache = raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    cache = []
  }
  return cache
}

async function write(keys: string[]) {
  cache = keys
  await AsyncStorage.setItem(KEY, JSON.stringify(keys))
  listeners.forEach((fn) => fn(keys))
}

export const wishKey = (f: { externalId: string }) => f.externalId

export async function wishedKeys(): Promise<string[]> {
  return [...(await read())]
}

export async function isWished(key: string): Promise<boolean> {
  return (await read()).includes(key)
}

/** 찜 토글. 새 상태(찜됨 여부)를 돌려준다 */
export async function toggleWish(key: string): Promise<boolean> {
  const keys = await read()
  const has = keys.includes(key)
  await write(has ? keys.filter((k) => k !== key) : [key, ...keys])
  return !has
}

/** 찜 변경 구독 — 지오펜스 재등록 트리거로 쓴다 */
export function onWishChange(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
