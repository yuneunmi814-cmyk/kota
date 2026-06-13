# TravelPack 브랜드 마크

> 콘셉트: **게임팩(카트리지) × 소풍** — "코스 팩을 꽂으면 가이드가 시작된다."
> 카트리지 실루엣 + 상단 그립 라인 + 라벨 창 속 여행 핀.

전체 자산은 브라우저로 [../logo.html](../logo.html)에서 한눈에 확인.

## 파일

| 파일 | 용도 |
|---|---|
| `travelpack-mark.svg` | **메인 마크** (선셋 오렌지). 밝은 배경 기본 |
| `travelpack-mark-navy.svg` | 보조 마크 (네이비 반전). 문서·포멀·흑백 인쇄 |
| `travelpack-mark-mono.svg` | 단색 라인 (`currentColor` 상속). 워터마크·각인·1색 인쇄 |
| `travelpack-mark-picnic.svg` | 시즌 (피크닉 그린). 봄·가을 캠페인 |
| `travelpack-mark-sea.svg` | 시즌 (바다 소풍). 여름 캠페인 |
| `travelpack-app-icon.svg` | 스토어/런처 아이콘 (1024, 네이비 배경 + 오렌지 마크) |
| `travelpack-wordmark.svg` | 가로형 워드마크 락업 (앱바·스플래시·스토어 목록) |

## 컬러 토큰

| 역할 | HEX | 비고 |
|---|---|---|
| Sunset Orange (primary) | `#FF6B35` | 카트리지 본체, CTA |
| Orange Deep | `#C24818` | 눌림·테두리 |
| Deep Navy (secondary) | `#1D3557` | 핀, 타이포, 앱 아이콘 배경 |
| Label White | `#FFFFFF` | 라벨 창 |
| Picnic Green | `#5E9457` / `#8CC084` | 시즌 |
| Sea Blue | `#3D9BD9` | 시즌 |

> 앱 디자인 토큰(`docs/TravelPack_기획설계서.md` 1.1절)과 동일 체계. 메인은 오렌지+네이비, 그린·바다는 시즌 한정 서브 팔레트.

## 사용 규칙

- **최소 크기**: 마크 단독 24px, 워드마크 100px 이상. 이하에서는 `mark-mono` 또는 앱 아이콘 사용.
- **여백(clear space)**: 마크 주위로 카트리지 그립 라인 1칸(≈ 마크 높이의 12%) 이상 비울 것.
- **배경**: 밝은 배경엔 메인(오렌지), 어두운/사진 배경엔 메인 그대로(오렌지 본체가 대비를 확보) 또는 `mark-mono` 흰색.
- **하지 말 것**: 비율 왜곡, 그림자/그라데이션 추가, 핀만 따로 떼어 다른 색으로 변경, 라벨 창 안에 다른 그래픽 삽입.

## 래스터 내보내기

SVG가 원본(SoT). PNG가 필요하면:

```bash
# 예: 앱 아이콘 512/1024 PNG (rsvg-convert 또는 resvg 사용)
rsvg-convert -w 1024 -h 1024 travelpack-app-icon.svg -o travelpack-app-icon-1024.png
rsvg-convert -w 512  -h 512  travelpack-app-icon.svg -o travelpack-app-icon-512.png
```
