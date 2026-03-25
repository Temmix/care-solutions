/*
  Warnings:

  - Changed the type of `category` on the `training_records` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "training_records" DROP COLUMN "category",
ADD COLUMN     "category" TEXT NOT NULL;

-- DropEnum
DROP TYPE "TrainingCategory";

-- CreateTable
CREATE TABLE "training_type_configs" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_type_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "training_type_configs_tenantId_idx" ON "training_type_configs"("tenantId");

-- CreateIndex
CREATE INDEX "training_type_configs_isActive_idx" ON "training_type_configs"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "training_type_configs_code_tenantId_key" ON "training_type_configs"("code", "tenantId");

-- CreateIndex
CREATE INDEX "training_records_category_idx" ON "training_records"("category");

-- AddForeignKey
ALTER TABLE "training_type_configs" ADD CONSTRAINT "training_type_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
