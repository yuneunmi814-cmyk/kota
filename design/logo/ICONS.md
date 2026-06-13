# 앱 아이콘 (iOS · Android)

`generate-icons.sh`로 SVG 원본에서 일괄 추출한 런처 아이콘 세트. 재생성:

```bash
brew install librsvg          # rsvg-convert (최초 1회)
bash design/logo/generate-icons.sh
```

소스 SVG는 `src/` — 수정 후 스크립트를 다시 돌리면 모든 크기가 갱신됩니다.

| 소스 | 용도 |
|---|---|
| `src/icon-ios.svg` | iOS — 풀블리드 정사각(모서리 사각, OS가 마스킹), 알파 없음 |
| `src/icon-android-legacy.svg` | Android 레거시 정사각(둥근 모서리) |
| `src/icon-android-round.svg` | Android 원형(`ic_launcher_round`) |
| `src/icon-adaptive-fg.svg` | Android 적응형 전경(투명, 마크를 72dp 안전영역에) |
| `src/icon-adaptive-mono.svg` | Android 13+ 테마 아이콘 모노크롬 |

## iOS — `ios/AppIcon.appiconset/`

13개 PNG(20~1024px, 모두 **알파 채널 없음** → App Store 통과) + `Contents.json`.

- **네이티브/Xcode**: Finder에서 `AppIcon.appiconset` 폴더를 Xcode `Assets.xcassets`로 드래그(기존 AppIcon 대체).
- **React Native**: `ios/<앱이름>/Images.xcassets/AppIcon.appiconset/` 내용을 이 폴더로 교체.

## Android — `android/`

```
mipmap-mdpi … xxxhdpi/
  ic_launcher.png            레거시 정사각 (48~192)
  ic_launcher_round.png      레거시 원형
  ic_launcher_foreground.png 적응형 전경 (108~432)
  ic_launcher_monochrome.png 테마 아이콘 (108~432)
mipmap-anydpi-v26/
  ic_launcher.xml            적응형 정의 (background+foreground+monochrome)
  ic_launcher_round.xml
values/
  ic_launcher_background.xml 배경색 #1D3557
playstore-icon-512.png       Play 콘솔 등록용
```

- **설치**: `android/` 하위 `mipmap-*`·`values` 폴더를 RN 프로젝트의 `android/app/src/main/res/`에 병합.
- **매니페스트** 확인 (`AndroidManifest.xml`):
  ```xml
  android:icon="@mipmap/ic_launcher"
  android:roundIcon="@mipmap/ic_launcher_round"
  ```
- `values/ic_launcher_background.xml`의 색상이 기존 `colors.xml`과 충돌하면 한쪽으로 합칠 것.
- `playstore-icon-512.png`는 앱에 넣지 말고 Play 콘솔 스토어 등록에만 사용.

## 디자인 근거

- 배경색 = 딥 네이비 `#1D3557`, 마크 = 선셋 오렌지 카트리지. 컬러 배경이라 밝은/어두운 바탕화면 모두에서 분리됨.
- 적응형 전경은 108dp 캔버스의 중앙 72dp 안전영역 안에만 핵심 형태를 둬, 원형·스퀴클·둥근사각 등 어떤 런처 마스크에서도 잘림 없이 보임.
