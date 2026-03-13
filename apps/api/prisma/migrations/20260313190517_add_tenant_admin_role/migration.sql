/*
  Warnings:

  - A unique constraint covering the columns `[stripeCustomerId]` on the table `organizations` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "CarePlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'ENTERED_IN_ERROR');

-- CreateEnum
CREATE TYPE "CarePlanCategory" AS ENUM ('NURSING', 'PHYSIOTHERAPY', 'MENTAL_HEALTH', 'PALLIATIVE', 'GENERAL');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('MEDICATION', 'EXERCISE', 'APPOINTMENT', 'OBSERVATION', 'EDUCATION', 'REFERRAL', 'OTHER');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('DRAFT', 'COMPLETED', 'REVIEWED', 'CANCELLED', 'ENTERED_IN_ERROR');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PatientEventType" ADD VALUE 'CARE_PLAN_CREATED';
ALTER TYPE "PatientEventType" ADD VALUE 'CARE_PLAN_UPDATED';

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'TENANT_ADMIN';

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "stripeCustomerId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "trialEndsAt" TIMESTAMP(3),
    "patientLimit" INTEGER NOT NULL DEFAULT 10,
    "userLimit" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_plans" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "CarePlanStatus" NOT NULL DEFAULT 'DRAFT',
    "category" "CarePlanCategory" NOT NULL DEFAULT 'GENERAL',
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "nextReviewDate" DATE,
    "patientId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "care_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_plan_goals" (
    "id" TEXT NOT NULL,
    "carePlanId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "GoalStatus" NOT NULL DEFAULT 'PROPOSED',
    "targetDate" DATE,
    "measure" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "care_plan_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_plan_activities" (
    "id" TEXT NOT NULL,
    "carePlanId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL DEFAULT 'OTHER',
    "status" "ActivityStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "description" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "notes" TEXT,
    "assigneeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "care_plan_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_plan_notes" (
    "id" TEXT NOT NULL,
    "carePlanId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "care_plan_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_type_configs" (
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

    CONSTRAINT "assessment_type_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specialty_configs" (
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

    CONSTRAINT "specialty_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assessmentType" TEXT NOT NULL,
    "toolName" TEXT,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'COMPLETED',
    "score" INTEGER,
    "maxScore" INTEGER,
    "scoreInterpretation" TEXT,
    "riskLevel" "RiskLevel",
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "recommendedActions" TEXT,
    "responses" JSONB,
    "patientId" TEXT NOT NULL,
    "performedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_organizationId_key" ON "subscriptions"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripeSubscriptionId_key" ON "subscriptions"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "subscriptions_organizationId_idx" ON "subscriptions"("organizationId");

-- CreateIndex
CREATE INDEX "subscriptions_stripeSubscriptionId_idx" ON "subscriptions"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "care_plans_patientId_status_idx" ON "care_plans"("patientId", "status");

-- CreateIndex
CREATE INDEX "care_plans_tenantId_idx" ON "care_plans"("tenantId");

-- CreateIndex
CREATE INDEX "care_plans_authorId_idx" ON "care_plans"("authorId");

-- CreateIndex
CREATE INDEX "care_plans_nextReviewDate_idx" ON "care_plans"("nextReviewDate");

-- CreateIndex
CREATE INDEX "care_plan_goals_carePlanId_idx" ON "care_plan_goals"("carePlanId");

-- CreateIndex
CREATE INDEX "care_plan_activities_carePlanId_idx" ON "care_plan_activities"("carePlanId");

-- CreateIndex
CREATE INDEX "care_plan_activities_assigneeId_idx" ON "care_plan_activities"("assigneeId");

-- CreateIndex
CREATE INDEX "care_plan_activities_scheduledAt_idx" ON "care_plan_activities"("scheduledAt");

-- CreateIndex
CREATE INDEX "care_plan_notes_carePlanId_createdAt_idx" ON "care_plan_notes"("carePlanId", "createdAt");

-- CreateIndex
CREATE INDEX "assessment_type_configs_tenantId_idx" ON "assessment_type_configs"("tenantId");

-- CreateIndex
CREATE INDEX "assessment_type_configs_isActive_idx" ON "assessment_type_configs"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_type_configs_code_tenantId_key" ON "assessment_type_configs"("code", "tenantId");

-- CreateIndex
CREATE INDEX "specialty_configs_tenantId_idx" ON "specialty_configs"("tenantId");

-- CreateIndex
CREATE INDEX "specialty_configs_isActive_idx" ON "specialty_configs"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "specialty_configs_code_tenantId_key" ON "specialty_configs"("code", "tenantId");

-- CreateIndex
CREATE INDEX "assessments_patientId_performedAt_idx" ON "assessments"("patientId", "performedAt");

-- CreateIndex
CREATE INDEX "assessments_patientId_assessmentType_idx" ON "assessments"("patientId", "assessmentType");

-- CreateIndex
CREATE INDEX "assessments_assessmentType_riskLevel_idx" ON "assessments"("assessmentType", "riskLevel");

-- CreateIndex
CREATE INDEX "assessments_tenantId_idx" ON "assessments"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_stripeCustomerId_key" ON "organizations"("stripeCustomerId");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plan_goals" ADD CONSTRAINT "care_plan_goals_carePlanId_fkey" FOREIGN KEY ("carePlanId") REFERENCES "care_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plan_activities" ADD CONSTRAINT "care_plan_activities_carePlanId_fkey" FOREIGN KEY ("carePlanId") REFERENCES "care_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plan_activities" ADD CONSTRAINT "care_plan_activities_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "practitioners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plan_notes" ADD CONSTRAINT "care_plan_notes_carePlanId_fkey" FOREIGN KEY ("carePlanId") REFERENCES "care_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plan_notes" ADD CONSTRAINT "care_plan_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_type_configs" ADD CONSTRAINT "assessment_type_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specialty_configs" ADD CONSTRAINT "specialty_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
