-- 축제 다중 소스 확장: 전국 커버(regionId nullable) + sido/sigungu + externalId(소스 접두 고유키)

-- 1) 컬럼 추가
ALTER TABLE "festivals" ADD COLUMN "sido" TEXT;
ALTER TABLE "festivals" ADD COLUMN "sigungu" TEXT;
ALTER TABLE "festivals" ADD COLUMN "homepage" TEXT;
ALTER TABLE "festivals" ADD COLUMN "external_id" TEXT;

-- 2) 기존 TourAPI 행 external_id 백필 (데이터 보존)
UPDATE "festivals" SET "external_id" = 'tourapi:' || "tourapi_content_id" WHERE "tourapi_content_id" IS NOT NULL;

-- 3) external_id 필수 + 유니크
ALTER TABLE "festivals" ALTER COLUMN "external_id" SET NOT NULL;
CREATE UNIQUE INDEX "festivals_external_id_key" ON "festivals"("external_id");

-- 4) 기존 tourapi_content_id 유니크/컬럼 제거
DROP INDEX IF EXISTS "festivals_tourapi_content_id_key";
ALTER TABLE "festivals" DROP COLUMN "tourapi_content_id";

-- 5) region_id nullable (큐레이션 미매칭 축제 수용)
ALTER TABLE "festivals" ALTER COLUMN "region_id" DROP NOT NULL;

-- 6) 소스 간 중복 제거용 인덱스(정규화 이름+시작일)
CREATE INDEX "festivals_name_start_date_idx" ON "festivals"("name", "start_date");
