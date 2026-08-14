import { useState } from 'react'
import PosterFallback from './PosterFallback'

// 축제 포스터 — 이미지가 없거나 '로딩에 실패해도' 자리를 채운다.
//
// 왜 onError까지 다루나: 포스터 URL은 지자체 서버에 있어 수시로 죽는다.
// <img>가 404를 받으면 빈 회색 상자가 남는데, 목록에서 그건 '만들다 만 화면'으로 읽힌다.
// 실패하면 이름 첫 글자 플레이스홀더로 떨어뜨려 어떤 경우에도 카드가 비지 않게 한다.

export default function Poster({
  src,
  name,
  className = '',
  imgClassName = '',
}: {
  src?: string | null
  name: string
  /** 플레이스홀더에 넘길 클래스(글자 크기 조정용) */
  className?: string
  imgClassName?: string
}) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return <PosterFallback name={name} className={className} />
  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`w-full h-full object-cover ${imgClassName}`}
    />
  )
}
