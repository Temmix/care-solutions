-- CreateEnum
CREATE TYPE "ProcessingPurpose" AS ENUM ('DIRECT_CARE', 'CARE_COORDINATION', 'BILLING', 'SAFEGUARDING', 'SERVICE_IMPROVEMENT', 'RESEARCH', 'LEGAL_COMPLIANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "LawfulBasisArticle6" AS ENUM ('CONSENT', 'CONTRACT', 'LEGAL_OBLIGATION', 'VITAL_INTERESTS', 'PUBLIC_TASK', 'LEGITIMATE_INTERESTS');

-- CreateEnum
CREATE TYPE "LawfulBasisArticle9" AS ENUM ('EXPLICIT_CONSENT', 'EMPLOYMENT_SOCIAL_SECURITY', 'VITAL_INTERESTS', 'NOT_FOR_PROFIT', 'MADE_PUBLIC_BY_SUBJECT', 'LEGAL_CLAIMS', 'SUBSTANTIAL_PUBLIC_INTEREST', 'HEALTH_OR_SOCIAL_CARE', 'PUBLIC_HEALTH', 'ARCHIVING_RESEARCH');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('DATA_SHARING', 'THIRD_PARTY_SHARING', 'RESEARCH', 'MARKETING', 'PHOTOGRAPHY');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('GRANTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "patient_processing_bases" (
    "id" TEXT NOT NULL,
    "purpose" "ProcessingPurpose" NOT NULL,
    "article6Basis" "LawfulBasisArticle6" NOT NULL,
    "article9Condition" "LawfulBasisArticle9",
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_processing_bases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_consents" (
    "id" TEXT NOT NULL,
    "type" "ConsentType" NOT NULL,
    "status" "ConsentStatus" NOT NULL,
    "grantedAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_consents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patient_processing_bases_tenantId_idx" ON "patient_processing_bases"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "patient_processing_bases_patientId_purpose_key" ON "patient_processing_bases"("patientId", "purpose");

-- CreateIndex
CREATE INDEX "patient_consents_tenantId_idx" ON "patient_consents"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "patient_consents_patientId_type_key" ON "patient_consents"("patientId", "type");

-- AddForeignKey
ALTER TABLE "patient_processing_bases" ADD CONSTRAINT "patient_processing_bases_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_processing_bases" ADD CONSTRAINT "patient_processing_bases_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
