# TravelPack 🧳

> **"패키지여행의 편안함을 앱으로."**
> 이것저것 알아보기 귀찮은 사람을 위해, 대표 명소 위주의 **검증된 여행 코스**를 추천하고
> 코스를 따라가며 쓰는 **가이드 모드**와 관광지 **큐레이션 정보**를 제공하는 모바일 앱. 안드로이드 우선.

핵심 가설: **여행 준비 시간을 3시간에서 3분으로 줄인다.**

콘텐츠는 **한국관광공사 TourAPI**(공공데이터)에서 수급하고, 에디터가 가공해 발행합니다. 지도는 카카오맵, 인증은 JWT(RS256)+Refresh Rotation, 가이드 모드 체크인은 PostGIS 반경 검증을 씁니다.

## 저장소 구성 (모노레포)

| 경로 | 내용 |
|---|---|
| [`docs/`](docs/) | 종합 기획·설계서 v1.2 — 화면/DB/API/아키텍처/보안·개인정보 법령/CRUD |
| [`design/wireframes.html`](design/wireframes.html) | 전체 20개 화면 와이어프레임 (브라우저로 열람) |
| [`design/logo.html`](design/logo.html) · [`design/logo/`](design/logo/) | 브랜드 로고·iOS/Android 앱 아이콘 세트 (설치 [ICONS.md](design/logo/ICONS.md)) |
| [`backend/`](backend/) | API 서버 — Express + TS + Prisma + PostgreSQL(PostGIS). TourAPI 동기화·S3·FCM·파기 배치 포함 |
| [`admin-web/`](admin-web/) | 관리자 웹(CMS) — React + Vite + TS |
| [`mobile/`](mobile/) | 안드로이드 앱 — React Native(Expo) + TS |

---

# 📖 사용 매뉴얼

## 사전 준비

| 도구 | 버전 | 비고 |
|---|---|---|
| Node.js | 22 LTS 이상 | 전 패키지 공통 |
| PostgreSQL | 16+ **+ PostGIS** | 백엔드 필수. 미설치 시 Docker로 대체 |
| Docker (선택) | — | PostGIS/Redis를 컨테이너로 띄울 때 |
| Android Studio / Expo | — | 모바일 앱 실행용 |

```bash
git clone https://github.com/<owner>/travelpack.git
cd travelpack
```

## 1) 백엔드 (API 서버)

```bash
cd backend
npm install
cp .env.example .env        # 환경변수 설정(아래 표 참고)
```

**데이터베이스 준비** — 둘 중 하나

- **Homebrew PostgreSQL + PostGIS** (로컬 설치형)
  ```bash
  createdb travelpack_dev && createdb travelpack_test
  # .env: DATABASE_URL=postgresql://<사용자>@localhost:5432/travelpack_dev
  ```
- **Docker** (PostGIS·Redis 컨테이너)
  ```bash
  docker compose up -d       # PostGIS :5433, Redis :6379
  # .env: DATABASE_URL=postgresql://travelpack:travelpack@localhost:5433/travelpack_dev
  ```

**마이그레이션·시드·실행**

```bash
npm run db:migrate      # 스키마 적용(PostGIS 확장·GIST 인덱스·좌표 동기화 트리거 포함)
npm run db:seed         # 제주 시드(관리자 3계정 + 코스 2개 + 스팟 8곳)
npm run dev             # 개발 서버 → http://localhost:4000  (헬스체크: GET /health)
npm test                # vitest 통합 테스트 51개 (travelpack_test DB)
npm run typecheck       # tsc --noEmit
```

응답 규약: `{ "success": true, "data": ... }` / `{ "success": false, "error": { "code", "message" } }` · BigInt id는 문자열로 직렬화.

## 2) 관리자 웹 (CMS)

```bash
cd admin-web
npm install
npm run dev             # http://localhost:5173  (/api 요청은 :4000으로 프록시)
```

백엔드가 먼저 떠 있어야 합니다. 브라우저에서 접속 → 시드 관리자 계정으로 로그인.

- 대시보드, 관광지/코스 CRUD, **발행 워크플로(DRAFT→검수요청→4-eyes 발행→회수)**, 회원·신고·배너·푸시 캠페인
- 역할(RBAC)에 따라 좌측 메뉴가 달라집니다.

## 3) 모바일 앱 (안드로이드)

```bash
cd mobile
npm install
cp .env.example .env    # EXPO_PUBLIC_API_BASE, (선택) EXPO_PUBLIC_KAKAO_NATIVE_KEY
npm run android         # 또는: npx expo start → a
```

- 안드로이드 에뮬레이터는 호스트 API를 `10.0.2.2:4000`으로 접근(기본값). 실기기는 PC의 LAN IP로 `EXPO_PUBLIC_API_BASE` 지정.
- **지도·카카오 로그인**은 카카오 네이티브 키 + 네이티브 dev build(`npx expo run:android`)가 필요합니다. 키가 없으면 지도는 플레이스홀더, 카카오 로그인은 비활성이지만 앱은 정상 동작합니다.
- 검증: `npm run typecheck`, `npx expo export -p android`(번들 생성 확인).

## 4) 콘텐츠 수급 — TourAPI 동기화

공공데이터포털에서 **한국관광공사 국문 관광정보 서비스(KorService2)** serviceKey를 발급받아 `backend/.env`의 `TOURAPI_SERVICE_KEY`에 넣습니다.

```bash
cd backend
# 관광지 동기화 (지역·콘텐츠 타입별)
npm run sync:tourapi -- --region=jeju --types=12,39 --max=100 [--overview] [--dry-run]
# 여행코스 import (경유지를 좌표 POI에 연결해 DRAFT 코스 생성 → 에디터가 4-eyes 발행)
npm run sync:tourapi -- --region=jeju --courses --max=10 [--dry-run]
# 전 지역
npm run sync:tourapi -- --all --courses --max=10
```

지역 slug: `jeju busan gyeongju yeosu gangneung jeonju` · 멱등(재실행 시 기존 코스 보존, 스팟 가공 필드 보존) · `--dry-run`으로 호출만 미리 확인.

## 5) 운영 배치

```bash
cd backend
npm run purge [-- --dry-run]   # 탈퇴 30일 후 완전 파기 + 체크인 좌표 6개월 후 NULL (일 1회 크론 권장)
```

## 환경변수 (`backend/.env`)

| 키 | 필수 | 설명 |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL(PostGIS) 연결 문자열 |
| `TEST_DATABASE_URL` | 테스트 | `npm test`용 DB |
| `REDIS_URL` | — | 비우면 인메모리(개발 전용). 운영은 필수 |
| `TOURAPI_SERVICE_KEY` | 수급 시 | 공공데이터포털 발급 키. 없으면 `sync:tourapi` 비활성 |
| `S3_BUCKET` / `AWS_REGION` | 업로드 시 | 없으면 `/uploads/presigned-url` 503 |
| `FCM_PROJECT_ID` | 푸시 시 | 없으면 푸시 캠페인은 수신자 집계만(no-op) |
| `JWT_*` / `BCRYPT_ROUNDS` | — | 기본값 제공. 키(keys/*.pem)는 자동 생성 |

모바일(`mobile/.env`): `EXPO_PUBLIC_API_BASE`, `EXPO_PUBLIC_KAKAO_NATIVE_KEY`.

## 기본 계정 (시드)

| 이메일 | 역할 | 비밀번호 |
|---|---|---|
| `super@travelpack.app` | 총괄 관리자 | `travelpack-dev-1234` |
| `editor@travelpack.app` | 콘텐츠 매니저(작성) | `travelpack-dev-1234` |
| `reviewer@travelpack.app` | 콘텐츠 매니저(검수·발행) | `travelpack-dev-1234` |

> 4-eyes 정책상 코스 **발행은 작성자가 아닌 다른 콘텐츠 매니저**만 가능합니다(editor 작성 → reviewer 발행).

## 트러블슈팅

- **PostGIS 오류 / `geography` 타입 없음** → DB에 PostGIS 확장 필요. Docker 이미지(`postgis/postgis`) 사용 또는 `CREATE EXTENSION postgis;` (마이그레이션이 자동 수행).
- **`P1010 User was denied access`** → `DATABASE_URL`에 사용자명 포함 확인 (예: `postgresql://yoon@localhost:5432/...`).
- **에뮬레이터에서 API 연결 안 됨** → `EXPO_PUBLIC_API_BASE`를 `10.0.2.2:4000`(에뮬) 또는 LAN IP(실기기)로.
- **지도가 안 보임** → 카카오 네이티브 키 + dev build 필요(위 3번 참고).

---

## 기술 스택

React Native(Expo) + TypeScript · React 18 + Vite(CMS) · Node.js 22 + Express + Prisma ·
PostgreSQL 16 + PostGIS · Redis 7 · JWT(RS256)+RTR · Kakao Maps · FCM · AWS 서울 리전. (선정 사유: 기획설계서 0.2절)

## 진행 상태

- [x] 기획·설계 문서, 와이어프레임 20화면, 오픈 이슈 4건 결정
- [x] 브랜드 로고 + iOS/Android 앱 아이콘 세트
- [x] 백엔드 API(인증 RTR·탐색·저장·여행/체크인·리뷰·관리자 4-eyes·감사로그) — 테스트 51개
- [x] 관리자 웹(CMS) 코어 — 브라우저 E2E 검증
- [x] TourAPI 동기화(관광지 + 여행코스 import) — 전 6개 지역 코스 53개 라이브 적재
- [x] S3 업로드·FCM 푸시·데이터 파기 배치
- [x] 모바일 앱 핵심 — 탐색→코스→가이드 모드, 카카오맵·카카오 로그인·온보딩/약관·리뷰/북마크
- [ ] M3 잔여: 구글 로그인, 관심 테마(ON-02), FCM 토큰 등록, 카카오맵 마커/폴리라인 → M4 통합 QA·보안·스토어 심사

## 출시 전 필수 체크 (법무)

가이드 모드가 위치정보를 사용하므로 **위치기반서비스사업자 신고(방통위)가 출시의 선행 조건**입니다. 상세 체크리스트는 기획설계서 6.1절.

## 라이선스

[MIT](LICENSE) © 2026 TravelPack
