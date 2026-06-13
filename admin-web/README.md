# TravelPack 관리자 웹 (CMS)

React + Vite + TypeScript. 백엔드 API(`../backend`)에 붙는 운영 콘솔.

## 실행

```bash
# 1) 백엔드 먼저 (다른 터미널)
cd ../backend && npm run dev        # :4000 + 시드 데이터 (npm run db:seed)

# 2) 관리자 웹
npm install
npm run dev                          # http://localhost:5173
```

Vite dev 서버가 `/api` 요청을 `:4000`으로 프록시하므로 CORS 설정이 불필요합니다.

시드 관리자: `super@` / `editor@` / `reviewer@travelpack.app` (pw: `travelpack-dev-1234`)

## 구성

| 영역 | 경로 | 설명 |
|---|---|---|
| 인증 | `auth/AuthContext` + `api/client` | 로그인(2단계 구조)·토큰 저장·자동 refresh, 401 시 재시도 |
| 레이아웃 | `components/Layout` | 역할별 사이드바 네비게이션(RBAC) |
| 대시보드 | `pages/DashboardPage` | DAU·가입·여행·체크인 + 인기 코스 TOP10 |
| 관광지 | `pages/Spots*` | 목록(검색·필터)·등록/수정·비활성화 |
| 코스 | `pages/Course*` | 목록·타임라인 빌더·**발행 워크플로(검수→발행/반려/회수, 4-eyes)** |
| 운영 | `pages/Users/Reports/Banners` | 회원(마스킹·정지)·신고 큐·배너 CRUD |

## 검증 완료 (2026-06-13)

브라우저 E2E: 로그인 → RBAC 네비 게이팅(CONTENT_MANAGER 3메뉴 vs SUPER 6메뉴) → 대시보드 → 코스 발행 워크플로(작성자 submit → 작성자 publish **403 차단** → 다른 매니저 publish **200**) → 관광지/회원 목록 렌더.

## 빌드

```bash
npm run typecheck    # tsc --noEmit
npm run build        # 정적 산출물 dist/
```
