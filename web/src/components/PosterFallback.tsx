// 포스터가 없는 축제의 자리 채움.
//
// 왜 만들었나: 718건 중 463건은 공공 API에 이미지가 없다. 그동안 전부 🎪 하나로
// 채웠는데, 목록을 스크롤하면 같은 이모지가 수백 번 지나가 '만들다 만 화면'으로 읽혔다.
// (이모지는 기기·OS마다 다르게 그려져 디자인으로 통제되지도 않는다.)
//
// 대신 축제명 첫 글자를 브랜드 색으로 크게 놓는다. 카드마다 글자가 달라 목록에 리듬이 생기고,
// 배경 농도만 이름 해시로 4단계 중 하나를 골라 같은 팔레트 안에서 변주한다.
// '엉뚱한 사진을 갖다 붙이지 않는다'는 기존 원칙은 그대로 지킨다.

// 브랜드 초록(#004027)은 매우 어두워 옅게 깔면 회색으로 보인다.
// 배경은 아주 얕게만 변주하고, 대신 글자를 확실히 초록으로 세워 '빈 칸'이 아니라
// '의도한 자리'로 읽히게 한다.
const TINTS = ['bg-green/[0.04]', 'bg-green/[0.07]', 'bg-green/[0.10]', 'bg-green/[0.13]']

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** 첫 글자 — 이모지·결합문자를 쪼개지 않도록 grapheme 단위로 자른다 */
function initial(name: string): string {
  const trimmed = name.replace(/^[\s\d[\](){}'"·-]+/, '').trim()
  const chars = [...(trimmed || name)]
  return chars[0] ?? '·'
}

export default function PosterFallback({ name, className = '' }: { name: string; className?: string }) {
  const tint = TINTS[hash(name) % TINTS.length]
  return (
    <div
      className={`w-full h-full flex items-center justify-center border-b border-green/10 ${tint} ${className}`}
      aria-hidden="true"
    >
      <span className="font-black text-green/55 leading-none select-none text-[2.6em]">{initial(name)}</span>
    </div>
  )
}
