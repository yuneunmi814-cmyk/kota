-- Region: 인기 점수(방문자 빅데이터)
ALTER TABLE "regions" ADD COLUMN "visitor_score" INTEGER NOT NULL DEFAULT 0;

-- SpotImage: 출처/외부식별자(관광사진 갤러리 dedupe)
ALTER TABLE "spot_images" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'EDITOR';
ALTER TABLE "spot_images" ADD COLUMN "source_id" TEXT;
CREATE UNIQUE INDEX "spot_images_spot_id_source_id_key" ON "spot_images"("spot_id", "source_id");

-- SpotTranslation: 다국어(영문 등)
CREATE TABLE "spot_translations" (
    "id" BIGSERIAL NOT NULL,
    "spot_id" BIGINT NOT NULL,
    "lang_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spot_translations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "spot_translations_spot_id_lang_code_key" ON "spot_translations"("spot_id", "lang_code");
ALTER TABLE "spot_translations" ADD CONSTRAINT "spot_translations_spot_id_fkey" FOREIGN KEY ("spot_id") REFERENCES "spots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PostGIS 반경검색 GIST 인덱스 복구(이전 마이그레이션이 드롭함)
CREATE INDEX IF NOT EXISTS "spots_location_gist" ON "spots" USING GIST ("location");
