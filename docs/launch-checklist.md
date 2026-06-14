# TravelPack 출시 체크리스트 (최종)

v1 = **무료 공유 모델**. 결제 관련 절차는 전부 빠지고, 아래만 하면 출시됩니다.
범례: ✅ 완료 · ⬜ 사용자 작업 · 🤖 코드/설정 준비됨(제가 함)

---

## 0. 한눈에 — 출시까지 남은 핵심 5가지 (사용자)
1. ⬜ 개인정보처리방침 **웹 URL 호스팅** (Google/Apple 둘 다 필수)
2. ⬜ 백엔드 **클라우드 배포** (Render 블루프린트 1클릭 — 아래 1장)
3. ⬜ 카카오/구글 **키·플랫폼 등록**(지도·소셜 쓸 경우) — 없어도 앱은 동작
4. ⬜ **EAS 빌드 → 스토어 제출** (Android+iOS, 아래 3장)
5. ⬜ 스토어 **심사 자료 입력**(설명·스크린샷·데이터안전/개인정보)

> 인허가: ✅ 위치기반서비스사업 신고 완료. 무료라 통신판매업·PG·인앱결제·정산 **불필요**.

---

## 1. 백엔드 클라우드 배포 (Render 블루프린트) 🤖→⬜
루트 `render.yaml`에 백엔드(Docker)+PostgreSQL(PostGIS)+Redis+관리자웹이 정의돼 있습니다.
- ⬜ Render 가입 → **New → Blueprint → 이 GitHub 레포 선택 → Apply**
- ⬜ 배포 후 대시보드에서 `SEED_ADMIN_PASSWORD`(강한 값), (선택)`TOURAPI_SERVICE_KEY` 입력
- ⬜ 백엔드 첫 기동 시 `prisma migrate deploy` 자동 실행됨. 시드는 1회: 서비스 Shell에서 `npm run db:seed`
- ⬜ 헬스체크: `https://<api>.onrender.com/health` → `{"ok":true}`
- ⬜ 관리자웹 `VITE_API_BASE`에 `https://<api>.onrender.com/api/v1` 입력 후 재배포
- 🤖 대안 DB: Supabase/Neon(PostGIS 지원) 사용 시 `DATABASE_URL`만 교체
- ⚠️ 무료 플랜은 체험용(웹 슬립·DB 90일). 운영은 `plan: starter`+ 유료 DB로. JWT 키(`keys/`)는 재배포 시 재생성(세션 재로그인) — 유지하려면 디스크/시크릿로 영속화

## 2. 도메인·HTTPS ⬜
- ⬜ (선택) 커스텀 도메인 연결(api.travelpack.app 등) — Render가 HTTPS 자동
- ⬜ `mobile/eas.json`·`admin VITE_API_BASE`의 URL을 실제 배포 주소로 맞춤

## 3. 모바일 빌드 & 제출 (EAS) 🤖→⬜
`mobile/eas.json`에 Android(app-bundle)·iOS 프로필 준비됨. 계정 둘 다 보유.
```bash
cd mobile && npm i -g eas-cli && eas login
eas build --profile production --platform all     # Android AAB + iOS IPA
eas submit --profile production --platform android # Play Console 업로드
eas submit --profile production --platform ios     # App Store Connect 업로드
```
- ⬜ EAS에 **EXPO_PUBLIC_API_BASE**(실서버), 카카오/구글 키를 EAS Secret으로 등록
- ⬜ 릴리스 서명: Android는 Play App Signing(권장), iOS는 EAS가 인증서/프로비저닝 관리
- 🤖 iOS 수출규정 면제 플래그(ITSAppUsesNonExemptEncryption=false)·위치 권한 문구 설정됨
- ⬜ 카카오/구글 콘솔에 빌드 서명 지문(SHA-1 / iOS 번들·URL스킴) 등록

## 4. 키·외부 연동 (선택 — 없어도 앱 동작) ⬜
- ⬜ 카카오: 네이티브키(`EXPO_PUBLIC_KAKAO_NATIVE_KEY`)·JS키(`EXPO_PUBLIC_KAKAO_JS_KEY`+웹도메인) — 지도/로그인
- ⬜ 구글 로그인: OAuth 클라이언트(웹=백엔드 `GOOGLE_CLIENT_ID`, iOS/Android 클라이언트)
- ⬜ (나중) FCM 푸시·S3 업로드 자격증명

## 5. 스토어 심사 자료
공통: 앱 설명·스크린샷·아이콘은 `docs/legal/구글플레이_출시자료.md` + `design/` 참고.
### Google Play ⬜
- ⬜ 개인정보처리방침 URL, **데이터 보안(Data safety)** 양식(가이드 7장 매핑표 그대로)
- ⬜ 콘텐츠 등급 설문(전체이용가 예상), 타깃층, 광고 없음, **인앱결제 없음(무료)**
- ⬜ 위치 권한: 포그라운드만 — 사용 목적 안내 문구 입력
### App Store (iOS) ⬜
- ⬜ App Privacy(영양성분표): 수집 항목 = 위치(앱 기능)·이메일·이름·사용자 콘텐츠(데이터안전 매핑과 동일)
- ⬜ 위치 사용 설명(NSLocationWhenInUse — 코드에 한국어 문구 설정됨), 데모 계정 제공(심사용 시드 계정)
- ⬜ 연령 등급, 카테고리(여행), 스크린샷(6.7"·6.5"·5.5" + iPad)

## 6. 법무 (무료 v1 최소) 🤖 초안 / ⬜ 확정
- ✅ 위치기반서비스사업 신고(방통위) 제출 완료 → 신고확인증 번호 받으면 앱/약관에 기재
- ⬜ **개인정보처리방침 게시**(필수) — `docs/legal/개인정보처리방침.md` 빈칸 채워 웹 호스팅(GitHub Pages 등, `docs/legal/site/` 활용)
- ⬜ 위치기반서비스 이용약관·이용약관 게시(권장)
- 🤖 앱 내 사업자 신원정보 화면(AboutScreen) + 데이터 출처(TourAPI) 고지 완료
- 💤 통신판매업·청약철회·정산 = 유료화 시점에만

## 7. 출시 후 스모크 테스트 ⬜
- ⬜ 회원가입/로그인 → 홈 추천 코스 표시(사진 포함) → 코스 상세 → 여행 시작 → (실기기)체크인
- ⬜ 커뮤니티: 여행팩 작성 → 관리자(CMS) 검수·발행 → 홈/둘러보기 노출 → 저장
- ⬜ CMS 로그인(시드 super 계정) → 코스/신고/정산 화면 동작
- 🤖 자동: 백엔드 테스트 88개 / 모바일 typecheck·번들 / CI(.github/workflows)

---
## 진행 분담 요약
- 🤖 제가 한 것: 배포 블루프린트(render.yaml)·Dockerfile·CI·EAS(Android/iOS)·앱 설정(권한·수출규정)·법무/스토어 초안·앱 내 신원표시
- ⬜ 사용자: 클라우드 Apply·스토어 계정에서 빌드 제출·심사 자료 입력·개인정보처리방침 호스팅·(선택)카카오/구글 키
