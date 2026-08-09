import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// 8/9 회의: 상세 진입 시 스크롤이 중간에 걸려 이미지가 안 보였다.
// 새 이동(PUSH)만 최상단으로 — 뒤로가기(POP)는 브라우저 위치 복원을 존중해
// "더 보기 내려갔다 오면 처음부터" 문제를 만들지 않는다.
export default function ScrollToTop() {
  const { pathname } = useLocation()
  const navType = useNavigationType()
  useEffect(() => {
    if (navType === 'PUSH') window.scrollTo(0, 0)
  }, [pathname, navType])
  return null
}
