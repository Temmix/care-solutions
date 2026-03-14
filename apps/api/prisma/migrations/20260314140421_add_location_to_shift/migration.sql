-- AlterTable
ALTER TABLE "shifts" ADD COLUMN     "locationId" TEXT;

-- CreateIndex
CREATE INDEX "shifts_locationId_idx" ON "shifts"("locationId");

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
