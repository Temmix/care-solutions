-- CreateEnum
CREATE TYPE "ChcStatus" AS ENUM ('REFERRAL', 'SCREENING', 'ASSESSMENT', 'DECISION', 'APPROVED', 'REJECTED', 'CARE_PACKAGE_LIVE', 'ANNUAL_REVIEW', 'CLOSED');

-- CreateEnum
CREATE TYPE "ChcFastTrackReason" AS ENUM ('TERMINAL_ILLNESS', 'RAPIDLY_DETERIORATING');

-- CreateEnum
CREATE TYPE "ChcDomain" AS ENUM ('BEHAVIOUR', 'COGNITION', 'COMMUNICATION', 'PSYCHOLOGICAL', 'MOBILITY', 'NUTRITION', 'CONTINENCE', 'SKIN', 'BREATHING', 'DRUG_THERAPIES', 'ALTERED_STATES', 'OTHER');

-- CreateEnum
CREATE TYPE "ChcDomainLevel" AS ENUM ('NO_NEEDS', 'LOW', 'MODERATE', 'HIGH', 'SEVERE', 'PRIORITY');

-- CreateEnum
CREATE TYPE "ChcDecision" AS ENUM ('APPROVED', 'REJECTED', 'DEFERRED');

-- CreateEnum
CREATE TYPE "ChcFundingBand" AS ENUM ('STANDARD', 'HIGH', 'ENHANCED', 'EXCEPTIONAL');

-- CreateEnum
CREATE TYPE "VirtualWardStatus" AS ENUM ('ENROLLED', 'MONITORING', 'ESCALATED', 'PAUSED', 'DISCHARGED');

-- CreateEnum
CREATE TYPE "VitalType" AS ENUM ('HEART_RATE', 'BLOOD_PRESSURE_SYSTOLIC', 'BLOOD_PRESSURE_DIASTOLIC', 'RESPIRATORY_RATE', 'OXYGEN_SATURATION', 'TEMPERATURE', 'BLOOD_GLUCOSE', 'WEIGHT', 'OTHER');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'ESCALATED', 'RESOLVED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PatientEventType" ADD VALUE 'CHC_REFERRAL';
ALTER TYPE "PatientEventType" ADD VALUE 'CHC_STATUS_CHANGE';
ALTER TYPE "PatientEventType" ADD VALUE 'VIRTUAL_WARD_ENROLLED';
ALTER TYPE "PatientEventType" ADD VALUE 'VIRTUAL_WARD_DISCHARGED';
ALTER TYPE "PatientEventType" ADD VALUE 'VIRTUAL_WARD_ALERT';

-- CreateTable
CREATE TABLE "chc_cases" (
    "id" TEXT NOT NULL,
    "status" "ChcStatus" NOT NULL DEFAULT 'REFERRAL',
    "referralDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referralReason" TEXT NOT NULL,
    "isFastTrack" BOOLEAN NOT NULL DEFAULT false,
    "fastTrackReason" "ChcFastTrackReason",
    "screeningDate" TIMESTAMP(3),
    "screeningOutcome" TEXT,
    "screeningNotes" TEXT,
    "decisionDate" TIMESTAMP(3),
    "decision" "ChcDecision",
    "decisionNotes" TEXT,
    "fundingBand" "ChcFundingBand",
    "carePackageStartDate" TIMESTAMP(3),
    "annualReviewDate" TIMESTAMP(3),
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "carePlanId" TEXT,
    "referrerId" TEXT NOT NULL,
    "screenerId" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chc_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chc_domain_scores" (
    "id" TEXT NOT NULL,
    "domain" "ChcDomain" NOT NULL,
    "level" "ChcDomainLevel" NOT NULL,
    "evidence" TEXT,
    "notes" TEXT,
    "chcCaseId" TEXT NOT NULL,
    "assessorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chc_domain_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chc_panel_members" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "chcCaseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chc_panel_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chc_notes" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "phase" "ChcStatus" NOT NULL,
    "chcCaseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chc_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "virtual_ward_enrolments" (
    "id" TEXT NOT NULL,
    "status" "VirtualWardStatus" NOT NULL DEFAULT 'ENROLLED',
    "enrolmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dischargeDate" TIMESTAMP(3),
    "dischargeReason" TEXT,
    "clinicalSummary" TEXT,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "enrollerId" TEXT NOT NULL,
    "dischargerId" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "virtual_ward_enrolments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoring_protocols" (
    "id" TEXT NOT NULL,
    "vitalType" "VitalType" NOT NULL,
    "frequencyHours" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "enrolmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monitoring_protocols_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vital_thresholds" (
    "id" TEXT NOT NULL,
    "minValue" DOUBLE PRECISION,
    "maxValue" DOUBLE PRECISION,
    "severity" "AlertSeverity" NOT NULL,
    "protocolId" TEXT NOT NULL,

    CONSTRAINT "vital_thresholds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vital_observations" (
    "id" TEXT NOT NULL,
    "vitalType" "VitalType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "notes" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enrolmentId" TEXT NOT NULL,
    "recorderId" TEXT NOT NULL,

    CONSTRAINT "vital_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "virtual_ward_alerts" (
    "id" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "message" TEXT NOT NULL,
    "vitalType" "VitalType",
    "triggerValue" DOUBLE PRECISION,
    "thresholdBreached" TEXT,
    "enrolmentId" TEXT NOT NULL,
    "acknowledgerId" TEXT,
    "escalatedToId" TEXT,
    "resolverId" TEXT,
    "resolveNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "virtual_ward_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chc_cases_tenantId_status_idx" ON "chc_cases"("tenantId", "status");

-- CreateIndex
CREATE INDEX "chc_cases_patientId_idx" ON "chc_cases"("patientId");

-- CreateIndex
CREATE INDEX "chc_cases_annualReviewDate_idx" ON "chc_cases"("annualReviewDate");

-- CreateIndex
CREATE INDEX "chc_domain_scores_chcCaseId_idx" ON "chc_domain_scores"("chcCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "chc_domain_scores_chcCaseId_domain_key" ON "chc_domain_scores"("chcCaseId", "domain");

-- CreateIndex
CREATE INDEX "chc_panel_members_chcCaseId_idx" ON "chc_panel_members"("chcCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "chc_panel_members_chcCaseId_userId_key" ON "chc_panel_members"("chcCaseId", "userId");

-- CreateIndex
CREATE INDEX "chc_notes_chcCaseId_createdAt_idx" ON "chc_notes"("chcCaseId", "createdAt");

-- CreateIndex
CREATE INDEX "virtual_ward_enrolments_tenantId_status_idx" ON "virtual_ward_enrolments"("tenantId", "status");

-- CreateIndex
CREATE INDEX "virtual_ward_enrolments_patientId_idx" ON "virtual_ward_enrolments"("patientId");

-- CreateIndex
CREATE INDEX "monitoring_protocols_enrolmentId_idx" ON "monitoring_protocols"("enrolmentId");

-- CreateIndex
CREATE UNIQUE INDEX "monitoring_protocols_enrolmentId_vitalType_key" ON "monitoring_protocols"("enrolmentId", "vitalType");

-- CreateIndex
CREATE INDEX "vital_thresholds_protocolId_idx" ON "vital_thresholds"("protocolId");

-- CreateIndex
CREATE INDEX "vital_observations_enrolmentId_vitalType_idx" ON "vital_observations"("enrolmentId", "vitalType");

-- CreateIndex
CREATE INDEX "vital_observations_enrolmentId_recordedAt_idx" ON "vital_observations"("enrolmentId", "recordedAt");

-- CreateIndex
CREATE INDEX "virtual_ward_alerts_enrolmentId_status_idx" ON "virtual_ward_alerts"("enrolmentId", "status");

-- CreateIndex
CREATE INDEX "virtual_ward_alerts_severity_status_idx" ON "virtual_ward_alerts"("severity", "status");

-- AddForeignKey
ALTER TABLE "chc_cases" ADD CONSTRAINT "chc_cases_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chc_cases" ADD CONSTRAINT "chc_cases_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chc_cases" ADD CONSTRAINT "chc_cases_carePlanId_fkey" FOREIGN KEY ("carePlanId") REFERENCES "care_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chc_cases" ADD CONSTRAINT "chc_cases_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chc_cases" ADD CONSTRAINT "chc_cases_screenerId_fkey" FOREIGN KEY ("screenerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chc_cases" ADD CONSTRAINT "chc_cases_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chc_domain_scores" ADD CONSTRAINT "chc_domain_scores_chcCaseId_fkey" FOREIGN KEY ("chcCaseId") REFERENCES "chc_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chc_domain_scores" ADD CONSTRAINT "chc_domain_scores_assessorId_fkey" FOREIGN KEY ("assessorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chc_panel_members" ADD CONSTRAINT "chc_panel_members_chcCaseId_fkey" FOREIGN KEY ("chcCaseId") REFERENCES "chc_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chc_panel_members" ADD CONSTRAINT "chc_panel_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chc_notes" ADD CONSTRAINT "chc_notes_chcCaseId_fkey" FOREIGN KEY ("chcCaseId") REFERENCES "chc_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chc_notes" ADD CONSTRAINT "chc_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_ward_enrolments" ADD CONSTRAINT "virtual_ward_enrolments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_ward_enrolments" ADD CONSTRAINT "virtual_ward_enrolments_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_ward_enrolments" ADD CONSTRAINT "virtual_ward_enrolments_enrollerId_fkey" FOREIGN KEY ("enrollerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_ward_enrolments" ADD CONSTRAINT "virtual_ward_enrolments_dischargerId_fkey" FOREIGN KEY ("dischargerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_ward_enrolments" ADD CONSTRAINT "virtual_ward_enrolments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_protocols" ADD CONSTRAINT "monitoring_protocols_enrolmentId_fkey" FOREIGN KEY ("enrolmentId") REFERENCES "virtual_ward_enrolments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_thresholds" ADD CONSTRAINT "vital_thresholds_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "monitoring_protocols"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_observations" ADD CONSTRAINT "vital_observations_enrolmentId_fkey" FOREIGN KEY ("enrolmentId") REFERENCES "virtual_ward_enrolments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_observations" ADD CONSTRAINT "vital_observations_recorderId_fkey" FOREIGN KEY ("recorderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_ward_alerts" ADD CONSTRAINT "virtual_ward_alerts_enrolmentId_fkey" FOREIGN KEY ("enrolmentId") REFERENCES "virtual_ward_enrolments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_ward_alerts" ADD CONSTRAINT "virtual_ward_alerts_acknowledgerId_fkey" FOREIGN KEY ("acknowledgerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_ward_alerts" ADD CONSTRAINT "virtual_ward_alerts_escalatedToId_fkey" FOREIGN KEY ("escalatedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_ward_alerts" ADD CONSTRAINT "virtual_ward_alerts_resolverId_fkey" FOREIGN KEY ("resolverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
