# TravelPack 모바일 앱 (M3)

React Native(Expo SDK 56) + TypeScript. 안드로이드 우선.

## 실행

```bash
cd mobile
npm install
# 백엔드(:4000)가 떠 있어야 함. 안드로이드 에뮬레이터는 호스트를 10.0.2.2로 접근(기본값)
npm run android        # 또는: npx expo start  → a(안드로이드)
```

실기기·다른 호스트는 API 베이스를 환경변수로 주입:

```bash
EXPO_PUBLIC_API_BASE=http://192.168.0.10:4000/api/v1 npx expo start
```

## 검증

```bash
npm run typecheck                       # tsc --noEmit (없으면 npx tsc --noEmit)
npx expo export -p android -o /tmp/x    # Metro 번들 생성 확인
```

## 구조

- `src/config.ts` — API 베이스(EXPO_PUBLIC_API_BASE), 체크인 기본 반경
- `src/theme.ts` — 브랜드 디자인 토큰(design/logo와 동일)
- `src/api/` — `client.ts`(토큰 저장·refresh), `types.ts`(공개 API 타입), `useResource.ts`
- `src/auth/AuthContext.tsx` — 로그인/가입/세션, 게스트 열람 허용(결정 4)
- `src/navigation/` — 하단탭 5개(홈·탐색·내 여행·저장·MY) + 스택
- `src/screens/` — Home·Regions·CourseList·CourseDetail·SpotDetail·ReviewWrite·Trips·GuideMode·Saved·My·Login·Consent·Onboarding
- `src/components/MapView.tsx`(카카오맵 추상화)·`BookmarkButton.tsx`, `src/auth/social.ts`(카카오 로그인)

## 핵심 흐름

탐색 → 코스 상세 → **이 코스로 여행 시작**(trip 생성) → **가이드 모드**(`expo-location`으로 현재 위치 → 서버 반경 검증 체크인, 반경 밖이면 "그래도 체크인"=MANUAL).

## 키 설정 (지도·소셜)

`.env`(`.env.example` 참고)에 `EXPO_PUBLIC_KAKAO_NATIVE_KEY`를 넣고 **네이티브 dev build**(`npx expo run:android`)로 실행해야 지도·카카오 로그인이 동작합니다. 키가 없으면 지도는 플레이스홀더, 카카오 버튼은 비활성(앱은 정상 실행).

## 구현 완료 (M3)

- 탐색→코스상세(전체지도)→관광지상세→여행시작→**가이드 모드**(expo-location 체크인)
- **카카오맵 연동**(`MapView` 추상화, 키 없으면 플레이스홀더 폴백)
- **카카오 소셜 로그인**(`@react-native-kakao/user` → `/auth/social`), 이메일 로그인/가입
- **온보딩**(첫 실행 3스텝) + **약관 동의**(AU-02, 가입 플로우 연계)
- **리뷰 작성**(별점·1,000자) + **북마크 토글**(코스/관광지 상세, 저장함 연동)

## 남은 작업

- 구글 소셜 로그인(자격증명·설정 필요), 관심 테마 선택(ON-02), FCM 푸시 토큰 등록
- 카카오맵 마커·폴리라인 오버레이(현재 카메라 센터만), 통합 검색·온보딩 화면 디테일 고도화
