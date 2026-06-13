-- DropIndex
DROP INDEX "spots_location_gist";

-- CreateTable
CREATE TABLE "audio_guides" (
    "id" BIGSERIAL NOT NULL,
    "spot_id" BIGINT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'ODII',
    "odii_theme_id" TEXT NOT NULL,
    "odii_story_id" TEXT NOT NULL,
    "lang_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "audio_title" TEXT,
    "script" TEXT,
    "audio_url" TEXT,
    "image_url" TEXT,
    "play_time" INTEGER,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audio_guides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audio_guides_spot_id_lang_code_idx" ON "audio_guides"("spot_id", "lang_code");

-- CreateIndex
CREATE UNIQUE INDEX "audio_guides_spot_id_odii_story_id_lang_code_key" ON "audio_guides"("spot_id", "odii_story_id", "lang_code");

-- AddForeignKey
ALTER TABLE "audio_guides" ADD CONSTRAINT "audio_guides_spot_id_fkey" FOREIGN KEY ("spot_id") REFERENCES "spots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
