-- 축제 다국어(en/ja/th) — 관광공사 영문 API가 축제를 제공하지 않아 직접 번역해 적재
CREATE TABLE "festival_translations" (
    "id" BIGSERIAL NOT NULL,
    "festival_id" BIGINT NOT NULL,
    "lang_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT,
    "place_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "festival_translations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "festival_translations_festival_id_lang_code_key"
    ON "festival_translations"("festival_id", "lang_code");

ALTER TABLE "festival_translations" ADD CONSTRAINT "festival_translations_festival_id_fkey"
    FOREIGN KEY ("festival_id") REFERENCES "festivals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
