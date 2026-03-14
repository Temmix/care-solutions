-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('EARLY', 'LATE', 'NIGHT', 'LONG_DAY', 'TWILIGHT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AvailabilityType" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'ANNUAL_LEAVE', 'SICK_LEAVE', 'TRAINING');

-- CreateEnum
CREATE TYPE "EncounterStatus" AS ENUM ('PLANNED', 'ARRIVED', 'IN_PROGRESS', 'ON_LEAVE', 'FINISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EncounterClass" AS ENUM ('INPATIENT', 'OUTPATIENT', 'EMERGENCY', 'HOME_HEALTH');

-- CreateEnum
CREATE TYPE "AdmissionSource" AS ENUM ('GP_REFERRAL', 'EMERGENCY', 'TRANSFER', 'SELF_REFERRAL', 'OTHER');

-- CreateEnum
CREATE TYPE "DischargeDestination" AS ENUM ('HOME', 'CARE_HOME', 'HOSPITAL_TRANSFER', 'DECEASED', 'OTHER');

-- CreateEnum
CREATE TYPE "BedStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'CLOSED');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('WARD', 'ROOM', 'BED', 'DEPARTMENT', 'WING');

-- CreateTable
CREATE TABLE "shift_patterns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shiftType" "ShiftType" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "ShiftStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "shiftPatternId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_assignments" (
    "id" TEXT NOT NULL,
    "role" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "shiftId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_availability" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "AvailabilityType" NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "LocationType" NOT NULL,
    "ward" TEXT,
    "floor" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beds" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "status" "BedStatus" NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "locationId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "beds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encounters" (
    "id" TEXT NOT NULL,
    "status" "EncounterStatus" NOT NULL DEFAULT 'PLANNED',
    "class" "EncounterClass" NOT NULL DEFAULT 'INPATIENT',
    "admissionSource" "AdmissionSource",
    "admissionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dischargeDate" TIMESTAMP(3),
    "dischargeDestination" "DischargeDestination",
    "notes" TEXT,
    "patientId" TEXT NOT NULL,
    "locationId" TEXT,
    "bedId" TEXT,
    "primaryPractitionerId" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "encounters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfers" (
    "id" TEXT NOT NULL,
    "transferredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "encounterId" TEXT NOT NULL,
    "fromLocationId" TEXT,
    "toLocationId" TEXT NOT NULL,
    "fromBedId" TEXT,
    "toBedId" TEXT,
    "transferredById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shift_patterns_tenantId_idx" ON "shift_patterns"("tenantId");

-- CreateIndex
CREATE INDEX "shifts_tenantId_date_idx" ON "shifts"("tenantId", "date");

-- CreateIndex
CREATE INDEX "shifts_shiftPatternId_idx" ON "shifts"("shiftPatternId");

-- CreateIndex
CREATE INDEX "shifts_date_status_idx" ON "shifts"("date", "status");

-- CreateIndex
CREATE INDEX "shift_assignments_userId_idx" ON "shift_assignments"("userId");

-- CreateIndex
CREATE INDEX "shift_assignments_shiftId_idx" ON "shift_assignments"("shiftId");

-- CreateIndex
CREATE UNIQUE INDEX "shift_assignments_shiftId_userId_key" ON "shift_assignments"("shiftId", "userId");

-- CreateIndex
CREATE INDEX "staff_availability_userId_date_idx" ON "staff_availability"("userId", "date");

-- CreateIndex
CREATE INDEX "staff_availability_tenantId_date_idx" ON "staff_availability"("tenantId", "date");

-- CreateIndex
CREATE INDEX "locations_tenantId_idx" ON "locations"("tenantId");

-- CreateIndex
CREATE INDEX "locations_parentId_idx" ON "locations"("parentId");

-- CreateIndex
CREATE INDEX "locations_type_idx" ON "locations"("type");

-- CreateIndex
CREATE INDEX "beds_tenantId_idx" ON "beds"("tenantId");

-- CreateIndex
CREATE INDEX "beds_status_idx" ON "beds"("status");

-- CreateIndex
CREATE UNIQUE INDEX "beds_locationId_identifier_key" ON "beds"("locationId", "identifier");

-- CreateIndex
CREATE INDEX "encounters_tenantId_status_idx" ON "encounters"("tenantId", "status");

-- CreateIndex
CREATE INDEX "encounters_patientId_idx" ON "encounters"("patientId");

-- CreateIndex
CREATE INDEX "encounters_locationId_idx" ON "encounters"("locationId");

-- CreateIndex
CREATE INDEX "encounters_bedId_idx" ON "encounters"("bedId");

-- CreateIndex
CREATE INDEX "transfers_encounterId_idx" ON "transfers"("encounterId");

-- CreateIndex
CREATE INDEX "transfers_transferredAt_idx" ON "transfers"("transferredAt");

-- AddForeignKey
ALTER TABLE "shift_patterns" ADD CONSTRAINT "shift_patterns_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_shiftPatternId_fkey" FOREIGN KEY ("shiftPatternId") REFERENCES "shift_patterns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_availability" ADD CONSTRAINT "staff_availability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_availability" ADD CONSTRAINT "staff_availability_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beds" ADD CONSTRAINT "beds_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beds" ADD CONSTRAINT "beds_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "beds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_primaryPractitionerId_fkey" FOREIGN KEY ("primaryPractitionerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_fromBedId_fkey" FOREIGN KEY ("fromBedId") REFERENCES "beds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_toBedId_fkey" FOREIGN KEY ("toBedId") REFERENCES "beds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_transferredById_fkey" FOREIGN KEY ("transferredById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
