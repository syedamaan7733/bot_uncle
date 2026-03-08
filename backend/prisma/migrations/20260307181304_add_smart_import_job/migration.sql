-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'READY_FOR_REVIEW', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "smart_import_jobs" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'UPLOADED',
    "result_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smart_import_jobs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "smart_import_jobs" ADD CONSTRAINT "smart_import_jobs_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
