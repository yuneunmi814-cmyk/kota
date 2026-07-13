#!/usr/bin/env bash
# KOTA 아이콘 PNG 일괄 생성 — iOS AppIcon + Android mipmap
# 요구: rsvg-convert (brew install librsvg)
set -euo pipefail
cd "$(dirname "$0")"
R=$(command -v rsvg-convert)
SRC=src
IOS=ios/AppIcon.appiconset
AND=android

echo "▶ iOS AppIcon.appiconset"
mkdir -p "$IOS"
for px in 20 29 40 58 60 76 80 87 120 152 167 180 1024; do
  "$R" -w "$px" -h "$px" "$SRC/icon-ios.svg" -o "$IOS/Icon-$px.png"
done

DPI=(mdpi hdpi xhdpi xxhdpi xxxhdpi)
LAUNCH=(48 72 96 144 192)   # 레거시 런처
FORE=(108 162 216 324 432)  # 적응형 전경 (108dp)

echo "▶ Android 레거시 (정사각 + 원형)"
for i in "${!DPI[@]}"; do
  d="${DPI[$i]}"; s="${LAUNCH[$i]}"
  mkdir -p "$AND/mipmap-$d"
  "$R" -w "$s" -h "$s" "$SRC/icon-android-legacy.svg" -o "$AND/mipmap-$d/ic_launcher.png"
  "$R" -w "$s" -h "$s" "$SRC/icon-android-round.svg"  -o "$AND/mipmap-$d/ic_launcher_round.png"
done

echo "▶ Android 적응형 (전경 + 모노크롬)"
for i in "${!DPI[@]}"; do
  d="${DPI[$i]}"; s="${FORE[$i]}"
  "$R" -w "$s" -h "$s" "$SRC/icon-adaptive-fg.svg"   -o "$AND/mipmap-$d/ic_launcher_foreground.png"
  "$R" -w "$s" -h "$s" "$SRC/icon-adaptive-mono.svg" -o "$AND/mipmap-$d/ic_launcher_monochrome.png"
done

echo "▶ Play Store 512"
"$R" -w 512 -h 512 "$SRC/icon-android-legacy.svg" -o "$AND/playstore-icon-512.png"

echo "✔ 완료"
