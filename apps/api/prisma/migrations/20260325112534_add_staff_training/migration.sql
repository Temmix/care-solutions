-- CreateEnum
CREATE TYPE "TrainingStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "TrainingCategory" AS ENUM ('SAFEGUARDING', 'MANUAL_HANDLING', 'FIRE_SAFETY', 'INFECTION_CONTROL', 'BLS_FIRST_AID', 'MENTAL_HEALTH', 'DATA_PROTECTION', 'MEDICATION_MANAGEMENT', 'HEALTH_AND_SAFETY', 'EQUALITY_DIVERSITY', 'COMMUNICATION', 'CLINICAL_SKILLS', 'OTHER');

-- CreateEnum
CREATE TYPE "TrainingPriority" AS ENUM ('MANDATORY', 'RECOMMENDED', 'OPTIONAL');

-- CreateTable
CREATE TABLE "training_records" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "TrainingCategory" NOT NULL,
    "priority" "TrainingPriority" NOT NULL DEFAULT 'MANDATORY',
    "status" "TrainingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "provider" TEXT,
    "scheduledDate" TIMESTAMP(3),
    "startedDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "renewalPeriodMonths" INTEGER,
    "hoursCompleted" DOUBLE PRECISION,
    "score" DOUBLE PRECISION,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_certificates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "certificateNumber" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "trainingRecordId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "training_records_tenantId_idx" ON "training_records"("tenantId");

-- CreateIndex
CREATE INDEX "training_records_userId_idx" ON "training_records"("userId");

-- CreateIndex
CREATE INDEX "training_records_status_idx" ON "training_records"("status");

-- CreateIndex
CREATE INDEX "training_records_category_idx" ON "training_records"("category");

-- CreateIndex
CREATE INDEX "training_records_expiryDate_idx" ON "training_records"("expiryDate");

-- CreateIndex
CREATE INDEX "training_records_tenantId_userId_idx" ON "training_records"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "training_certificates_tenantId_idx" ON "training_certificates"("tenantId");

-- CreateIndex
CREATE INDEX "training_certificates_trainingRecordId_idx" ON "training_certificates"("trainingRecordId");

-- CreateIndex
CREATE INDEX "training_certificates_expiryDate_idx" ON "training_certificates"("expiryDate");

-- AddForeignKey
ALTER TABLE "training_records" ADD CONSTRAINT "training_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_records" ADD CONSTRAINT "training_records_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_records" ADD CONSTRAINT "training_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_certificates" ADD CONSTRAINT "training_certificates_trainingRecordId_fkey" FOREIGN KEY ("trainingRecordId") REFERENCES "training_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_certificates" ADD CONSTRAINT "training_certificates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
