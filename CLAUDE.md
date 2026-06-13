# TravelPack

패키지여행식 관광가이드 앱 (안드로이드 우선). 단일 진실 공급원은 [docs/TravelPack_기획설계서.md](docs/TravelPack_기획설계서.md) — 화면/DB/API/정책 변경 시 문서도 함께 갱신할 것.

## 구조

- `docs/` — 기획·설계서 (v1.2, 오픈 이슈 4건 결정 완료)
- `design/wireframes.html` — 전체 20개 화면 와이어프레임 (브라우저로 열람)
- `design/logo.html` + `design/logo/` — 브랜드 로고("게임팩 × 소풍") SVG 원본·앱 아이콘·워드마크·가이드
- `backend/` — Express + TypeScript + Prisma + PostgreSQL(PostGIS) API 서버
- `admin-web/` — 관리자 웹(CMS), React + Vite + TS. dev 서버가 `/api`를 :4000으로 프록시 (`cd admin-web && npm run dev`, :5173)
- `mobile/` — RN 안드로이드 앱(M3), Expo SDK 56 + TS. 하단탭 5개 + 가이드 모드(expo-location 체크인). API 베이스는 `EXPO_PUBLIC_API_BASE`(기본 10.0.2.2:4000)

## backend 명령어 (cd backend)

```bash
npm run dev          # 개발 서버 (:4000, tsx watch)
npm test             # vitest 통합 테스트 (travelpack_test DB에 migrate deploy 후 실행)
npm run typecheck    # tsc --noEmit
npm run db:migrate   # prisma migrate dev
npm run db:seed      # 제주 시드 (관리자 3계정 + 코스 2개 + 스팟 8곳)
npm run sync:tourapi -- --region=jeju [--types=12,39] [--max=100] [--overview] [--dry-run]   # 관광지
npm run sync:tourapi -- --region=jeju --courses [--max=10] [--dry-run]                        # 여행코스(경유지→좌표 연결)
```

## backend 핵심 규약

- 응답: `{ success: true, data }` / `{ success: false, error: { code, message } }`. BigInt id는 문자열로 직렬화됨
- 모든 async 핸들러는 `h()` 래퍼 필수 (Express 4는 async 에러 미포착)
- 루트 마운트 라우터에 router-level `use(미들웨어)` 금지 — 다른 라우터 경로까지 가로챔. 라우트별로 붙일 것
- 인증: JWT RS256 (keys/ 자동 생성), Refresh는 RTR + 재사용 감지. KV는 REDIS_URL 없으면 인메모리(개발 전용)
- PostGIS: spots.location은 lat/lng 트리거 자동 동기화. 반경 검증은 ST_Distance, 좌표 쓰기는 raw SQL
- 발행 워크플로: DRAFT→IN_REVIEW→PUBLISHED(4-eyes: 작성자≠승인자)→ARCHIVED. 발행 변경 시 캐시 버전 범프
- 관리자 쓰기·개인정보 열람은 logAudit() 필수
- 로컬 DB: Homebrew PostgreSQL 17 + PostGIS (`postgresql://yoon@localhost:5432/travelpack_dev`)

## 남은 작업 (M2 잔여 → M3)

- 관리자 웹(CMS): 코어 완료(인증·대시보드·스팟/코스 CRUD·발행 워크플로·회원/신고/배너), 브라우저 E2E 검증 완료. 잔여 — 푸시 캠페인 UI(백엔드 API는 완료), 코스 미리보기, 감사 로그 뷰어
- TourAPI 동기화 배치: 구현·테스트·라이브 검증 완료(`src/modules/tourapi/`). 관광지 동기화 + **여행코스 import**(areaBasedList2→detailInfo2→detailCommon2로 경유지를 좌표 POI에 연결, DRAFT 코스 생성→에디터 4-eyes 발행). 멱등(코스 보존·스팟 가공필드 보존). 운영 실행은 `TOURAPI_SERVICE_KEY` 필요
- S3 presigned 업로드: 구현 완료(`src/modules/uploads/`, `S3_BUCKET` 없으면 503). FCM 푸시 캠페인: 구현 완료(`src/modules/push/`, 야간 차단·마케팅 미동의 제외, `FCM_PROJECT_ID` 없으면 집계만). 실제 발송은 FCM HTTP v1 자격증명 연결 필요
- 데이터 파기 배치: 구현 완료(`src/modules/retention/`, `npm run purge`, 탈퇴 30일/체크인 좌표 6개월)

## mobile (M3) 현황 (cd mobile)

- 핵심 흐름 완료: 홈·탐색(지역→코스목록→코스상세→관광지)·여행시작→가이드 모드(체크인)·저장·MY. typecheck·Android 번들 통과
- **카카오맵**(`MapView` 추상화, `EXPO_PUBLIC_KAKAO_NATIVE_KEY` 없으면 플레이스홀더), **카카오 소셜 로그인**(`@react-native-kakao/user`→`/auth/social`), **온보딩+약관 동의**(AU-02), **리뷰 작성·북마크 토글** 완료
- 지도·소셜은 카카오 네이티브 키 + dev build(`npx expo run:android`) 필요. 키 없이도 앱은 정상 실행(폴백). app.config.ts가 키를 env에서 주입
- 잔여: 구글 로그인, 관심테마(ON-02), FCM 토큰 등록, 카카오맵 마커/폴리라인
- 명령: `npm run android` / `npm run typecheck` / `npx expo export -p android`
