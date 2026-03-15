-- CreateEnum
CREATE TYPE "ShiftSwapStatus" AS ENUM ('PENDING', 'ACCEPTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DischargePlanStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'READY', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DischargeTaskType" AS ENUM ('MEDICATION_REVIEW', 'CARE_PACKAGE', 'TRANSPORT', 'FOLLOW_UP_APPOINTMENT', 'EQUIPMENT', 'PATIENT_EDUCATION', 'FAMILY_NOTIFICATION', 'GP_LETTER');

-- CreateEnum
CREATE TYPE "DischargeTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED');

-- CreateTable
CREATE TABLE "shift_swap_requests" (
    "id" TEXT NOT NULL,
    "status" "ShiftSwapStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "managerNote" TEXT,
    "requesterId" TEXT NOT NULL,
    "originalShiftAssignmentId" TEXT NOT NULL,
    "targetShiftAssignmentId" TEXT,
    "responderId" TEXT,
    "approvedById" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_swap_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discharge_plans" (
    "id" TEXT NOT NULL,
    "status" "DischargePlanStatus" NOT NULL DEFAULT 'DRAFT',
    "plannedDate" DATE,
    "actualDate" TIMESTAMP(3),
    "notes" TEXT,
    "encounterId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "completedById" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discharge_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discharge_tasks" (
    "id" TEXT NOT NULL,
    "type" "DischargeTaskType" NOT NULL,
    "status" "DischargeTaskStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "dischargePlanId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "completedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discharge_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shift_swap_requests_tenantId_status_idx" ON "shift_swap_requests"("tenantId", "status");

-- CreateIndex
CREATE INDEX "shift_swap_requests_requesterId_idx" ON "shift_swap_requests"("requesterId");

-- CreateIndex
CREATE INDEX "shift_swap_requests_responderId_idx" ON "shift_swap_requests"("responderId");

-- CreateIndex
CREATE INDEX "shift_swap_requests_originalShiftAssignmentId_idx" ON "shift_swap_requests"("originalShiftAssignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "discharge_plans_encounterId_key" ON "discharge_plans"("encounterId");

-- CreateIndex
CREATE INDEX "discharge_plans_tenantId_status_idx" ON "discharge_plans"("tenantId", "status");

-- CreateIndex
CREATE INDEX "discharge_plans_encounterId_idx" ON "discharge_plans"("encounterId");

-- CreateIndex
CREATE INDEX "discharge_tasks_dischargePlanId_idx" ON "discharge_tasks"("dischargePlanId");

-- CreateIndex
CREATE INDEX "discharge_tasks_assignedToId_idx" ON "discharge_tasks"("assignedToId");

-- AddForeignKey
ALTER TABLE "shift_swap_requests" ADD CONSTRAINT "shift_swap_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_swap_requests" ADD CONSTRAINT "shift_swap_requests_originalShiftAssignmentId_fkey" FOREIGN KEY ("originalShiftAssignmentId") REFERENCES "shift_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_swap_requests" ADD CONSTRAINT "shift_swap_requests_targetShiftAssignmentId_fkey" FOREIGN KEY ("targetShiftAssignmentId") REFERENCES "shift_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_swap_requests" ADD CONSTRAINT "shift_swap_requests_responderId_fkey" FOREIGN KEY ("responderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_swap_requests" ADD CONSTRAINT "shift_swap_requests_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_swap_requests" ADD CONSTRAINT "shift_swap_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discharge_plans" ADD CONSTRAINT "discharge_plans_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discharge_plans" ADD CONSTRAINT "discharge_plans_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discharge_plans" ADD CONSTRAINT "discharge_plans_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discharge_plans" ADD CONSTRAINT "discharge_plans_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discharge_tasks" ADD CONSTRAINT "discharge_tasks_dischargePlanId_fkey" FOREIGN KEY ("dischargePlanId") REFERENCES "discharge_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discharge_tasks" ADD CONSTRAINT "discharge_tasks_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discharge_tasks" ADD CONSTRAINT "discharge_tasks_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
