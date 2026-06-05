-- CreateEnum
CREATE TYPE "ShiftReportCategory" AS ENUM ('GENERAL_NOTE', 'PERSONAL_CARE', 'NUTRITION_HYDRATION', 'CONTINENCE', 'MOBILITY', 'MOOD_BEHAVIOUR', 'SLEEP', 'INCIDENT', 'SAFEGUARDING');

-- CreateEnum
CREATE TYPE "ShiftReportPriority" AS ENUM ('NORMAL', 'CONCERN', 'URGENT');

-- CreateTable
CREATE TABLE "shift_reports" (
    "id" TEXT NOT NULL,
    "category" "ShiftReportCategory" NOT NULL DEFAULT 'GENERAL_NOTE',
    "priority" "ShiftReportPriority" NOT NULL DEFAULT 'NORMAL',
    "content" TEXT NOT NULL,
    "detail" JSONB,
    "shiftAssignmentId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "locationId" TEXT NOT NULL,
    "bedId" TEXT,
    "recordedById" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientEventId" TEXT,
    "capturedAt" TIMESTAMP(3),
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shift_reports_clientEventId_key" ON "shift_reports"("clientEventId");

-- CreateIndex
CREATE INDEX "shift_reports_patientId_recordedAt_idx" ON "shift_reports"("patientId", "recordedAt");

-- CreateIndex
CREATE INDEX "shift_reports_locationId_recordedAt_idx" ON "shift_reports"("locationId", "recordedAt");

-- CreateIndex
CREATE INDEX "shift_reports_shiftAssignmentId_idx" ON "shift_reports"("shiftAssignmentId");

-- CreateIndex
CREATE INDEX "shift_reports_tenantId_recordedAt_idx" ON "shift_reports"("tenantId", "recordedAt");

-- AddForeignKey
ALTER TABLE "shift_reports" ADD CONSTRAINT "shift_reports_shiftAssignmentId_fkey" FOREIGN KEY ("shiftAssignmentId") REFERENCES "shift_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_reports" ADD CONSTRAINT "shift_reports_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_reports" ADD CONSTRAINT "shift_reports_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_reports" ADD CONSTRAINT "shift_reports_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_reports" ADD CONSTRAINT "shift_reports_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "beds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_reports" ADD CONSTRAINT "shift_reports_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_reports" ADD CONSTRAINT "shift_reports_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

