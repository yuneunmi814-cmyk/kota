-- 축제 테마(여행 목적) — 목적 기반 탐색·SEO 랜딩용
ALTER TABLE "festivals" ADD COLUMN "themes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
CREATE INDEX "festivals_themes_idx" ON "festivals" USING GIN ("themes");
