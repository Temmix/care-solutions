-- CreateEnum
CREATE TYPE "ClockRecordStatus" AS ENUM ('CLOCKED_IN', 'CLOCKED_OUT', 'MISSED', 'AUTO_CLOCKED_OUT');

-- AlterEnum
ALTER TYPE "LocationType" ADD VALUE 'PATIENT_HOME';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'SHIFT_CLOCK_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE 'SHIFT_CLOCK_OUT_REMINDER';

-- AlterTable
ALTER TABLE "locations" ADD COLUMN     "geofenceRadius" INTEGER DEFAULT 150,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "locationId" TEXT;

-- CreateTable
CREATE TABLE "clock_records" (
    "id" TEXT NOT NULL,
    "status" "ClockRecordStatus" NOT NULL DEFAULT 'CLOCKED_IN',
    "clockInAt" TIMESTAMP(3) NOT NULL,
    "clockInLatitude" DOUBLE PRECISION,
    "clockInLongitude" DOUBLE PRECISION,
    "clockInDistance" DOUBLE PRECISION,
    "clockOutAt" TIMESTAMP(3),
    "clockOutLatitude" DOUBLE PRECISION,
    "clockOutLongitude" DOUBLE PRECISION,
    "autoClockOut" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "shiftAssignmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clock_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clock_records_shiftAssignmentId_key" ON "clock_records"("shiftAssignmentId");

-- CreateIndex
CREATE INDEX "clock_records_userId_clockInAt_idx" ON "clock_records"("userId", "clockInAt");

-- CreateIndex
CREATE INDEX "clock_records_tenantId_clockInAt_idx" ON "clock_records"("tenantId", "clockInAt");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clock_records" ADD CONSTRAINT "clock_records_shiftAssignmentId_fkey" FOREIGN KEY ("shiftAssignmentId") REFERENCES "shift_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clock_records" ADD CONSTRAINT "clock_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clock_records" ADD CONSTRAINT "clock_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
