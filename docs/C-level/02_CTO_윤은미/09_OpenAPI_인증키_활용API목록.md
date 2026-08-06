# 공사 OpenAPI 인증키·활용 API 목록 (CTO_5)

> **용도** · 1차 심사 제출 필수 항목. 제출용 원본(실제 키 포함)은 공개 레포에 두지 않는다 — `~/Desktop/kota/제출용_OpenAPI_인증키_활용API목록_2026-08-06.md` (윤은미 로컬)
> **작성** · 2026-08-06 · 윤은미(CTO)

## 1. 인증키

| 항목 | 내용 |
|---|---|
| 발급처 | 공공데이터포털(data.go.kr) |
| 발급 계정 | yuneunmi814@gmail.com (윤은미) |
| 일반 인증키 | `45b56436…9ac2e1 (64자)` — 제출용 문서에 전체 키 |
| **인코딩/디코딩** | 키가 16진수 64자(특수문자 없음)라 **인코딩 키 = 디코딩 키 동일**. 어느 칸이든 같은 값 제출 |
| 관리 위치 | `backend/.env`(gitignore) · GitHub Actions Secret `TOURAPI_SERVICE_KEY` · Render 환경변수 — 코드·레포에 키 없음 |
| 일일 한도 | 서비스별 상이. 초과 시 '정상 모양 빈 응답'으로 오는 경우 있어 클라이언트에 감지 로직 내장 |

## 2. 활용 API 목록 (한국관광공사 B551011 — 8개 서비스 13개 오퍼레이션)

| # | 서비스 | 오퍼레이션 | 용도 | 구현 위치 |
|---|---|---|---|---|
| 1 | KorService2 | searchFestival2 | 축제 수집(법정동 코드 기반 16개 시·도) | `festivals/sync.ts` |
| 2 | KorService2 | areaBasedList2 | 축제 지역기반 수집(커버리지 보강) · 관광지/여행코스 수집 | `festivals/sync.ts` · `tourapi/` |
| 3 | KorService2 | detailIntro2 | 축제 기간·장소 보강 | `tourapi/client.ts` |
| 4 | KorService2 | detailCommon2 | 관광지·코스 상세(좌표·이미지·개요) | `tourapi/client.ts` |
| 5 | KorService2 | detailInfo2 | 여행코스 경유지 | `tourapi/client.ts` |
| 6 | KorService2 | searchKeyword2 | 장소 지오코딩·contentId 백필 | `geocode-festivals.ts` 외 |
| 7 | KorService2 | detailPetTour2 | 반려동물 동반여행 정보 | `tourism/client.ts` |
| 8 | KorWithService2 | detailWithTour2 | 무장애(배리어프리) 여행 정보 | `tourism/client.ts` |
| 9 | TarRlteTarService1 | areaBasedList1 | 연관 관광지 추천 | `tourism/client.ts` |
| 10 | EngService2 | areaBasedList2 | 관광지 영문 정보(다국어) | `i18n/` |
| 11 | PhotoGalleryService1 | gallerySearchList1 | 관광사진 갤러리 | `photos/` |
| 12 | DataLabService | metcoRegnVisitrDDList | 지역 방문자수(관광 빅데이터 → 인기 정렬) | `visitors/` |
| 13 | Odii | (스토리 목록·상세) | 오디오 가이드 | `audioguide/` |

## 3. 공사 외 공공데이터 (동일 키)

| 데이터셋 | 용도 |
|---|---|
| 전국문화축제표준데이터 (`tn_pubr_public_cltur_fstvl_api`) | 소도시 축제 보강 (주간 자동) |

## 4. 비(非) data.go.kr 소스

| 소스 | 키 | 용도 |
|---|---|---|
| 문체부 연간 지역축제 개최계획 | 불필요(공개 엑셀) | 구·동 단위 소규모 축제 +301건 |
| YouTube Data API v3 | `YOUTUBE_API_KEY`(별도, 백엔드 전용) | 여행영상 큐레이션 |

## 5. 활용신청 상태

| 데이터셋 | 상태 |
|---|---|
| 위 8개 서비스 + 표준데이터 | ✅ 승인·운영 중 |
| 한국문화정보원 한눈에보는문화정보(15138937) | ⏳ 활용신청 대기(자동승인) — 축제 이미지·좌표 보강 후보 |
