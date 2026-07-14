-- CreateTable
CREATE TABLE "festivals" (
    "id" BIGSERIAL NOT NULL,
    "region_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "image_url" TEXT,
    "tel" TEXT,
    "source" TEXT NOT NULL DEFAULT 'TOURAPI',
    "tourapi_content_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "festivals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "festivals_tourapi_content_id_key" ON "festivals"("tourapi_content_id");

-- CreateIndex
CREATE INDEX "festivals_end_date_start_date_idx" ON "festivals"("end_date", "start_date");

-- CreateIndex
CREATE INDEX "festivals_region_id_start_date_idx" ON "festivals"("region_id", "start_date");

-- AddForeignKey
ALTER TABLE "festivals" ADD CONSTRAINT "festivals_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
