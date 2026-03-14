-- CreateEnum
CREATE TYPE "MedicationRequestStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'STOPPED', 'CANCELLED', 'ENTERED_IN_ERROR');

-- CreateEnum
CREATE TYPE "MedicationAdminStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'NOT_DONE', 'ENTERED_IN_ERROR');

-- CreateEnum
CREATE TYPE "MedicationRoute" AS ENUM ('ORAL', 'TOPICAL', 'INTRAVENOUS', 'INTRAMUSCULAR', 'SUBCUTANEOUS', 'INHALED', 'RECTAL', 'SUBLINGUAL', 'OTHER');

-- CreateEnum
CREATE TYPE "MedicationForm" AS ENUM ('TABLET', 'CAPSULE', 'LIQUID', 'INJECTION', 'CREAM', 'OINTMENT', 'INHALER', 'PATCH', 'DROPS', 'SUPPOSITORY', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PatientEventType" ADD VALUE 'MEDICATION_PRESCRIBED';
ALTER TYPE "PatientEventType" ADD VALUE 'MEDICATION_ADMINISTERED';

-- CreateTable
CREATE TABLE "medications" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "genericName" TEXT,
    "code" TEXT,
    "form" "MedicationForm" NOT NULL DEFAULT 'TABLET',
    "strength" TEXT,
    "manufacturer" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_requests" (
    "id" TEXT NOT NULL,
    "status" "MedicationRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" TEXT,
    "dosageText" TEXT NOT NULL,
    "dose" TEXT,
    "frequency" TEXT,
    "route" "MedicationRoute" NOT NULL DEFAULT 'ORAL',
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "reasonText" TEXT,
    "instructions" TEXT,
    "asNeeded" BOOLEAN NOT NULL DEFAULT false,
    "asNeededReason" TEXT,
    "maxDosePerDay" TEXT,
    "medicationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "prescriberId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medication_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_administrations" (
    "id" TEXT NOT NULL,
    "status" "MedicationAdminStatus" NOT NULL DEFAULT 'COMPLETED',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "doseGiven" TEXT,
    "route" "MedicationRoute",
    "site" TEXT,
    "notes" TEXT,
    "notGivenReason" TEXT,
    "requestId" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "performerId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medication_administrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "medications_name_idx" ON "medications"("name");

-- CreateIndex
CREATE INDEX "medications_code_idx" ON "medications"("code");

-- CreateIndex
CREATE INDEX "medications_tenantId_idx" ON "medications"("tenantId");

-- CreateIndex
CREATE INDEX "medication_requests_patientId_status_idx" ON "medication_requests"("patientId", "status");

-- CreateIndex
CREATE INDEX "medication_requests_medicationId_idx" ON "medication_requests"("medicationId");

-- CreateIndex
CREATE INDEX "medication_requests_tenantId_idx" ON "medication_requests"("tenantId");

-- CreateIndex
CREATE INDEX "medication_requests_prescriberId_idx" ON "medication_requests"("prescriberId");

-- CreateIndex
CREATE INDEX "medication_administrations_requestId_idx" ON "medication_administrations"("requestId");

-- CreateIndex
CREATE INDEX "medication_administrations_patientId_occurredAt_idx" ON "medication_administrations"("patientId", "occurredAt");

-- CreateIndex
CREATE INDEX "medication_administrations_tenantId_idx" ON "medication_administrations"("tenantId");

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_requests" ADD CONSTRAINT "medication_requests_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "medications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_requests" ADD CONSTRAINT "medication_requests_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_requests" ADD CONSTRAINT "medication_requests_prescriberId_fkey" FOREIGN KEY ("prescriberId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_requests" ADD CONSTRAINT "medication_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "medication_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "medications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_performerId_fkey" FOREIGN KEY ("performerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
