-- CreateEnum
CREATE TYPE "IncidentCategory" AS ENUM ('DATA_BREACH', 'UNAUTHORISED_ACCESS', 'DATA_LOSS', 'LOST_OR_STOLEN_DEVICE', 'MISDIRECTED_COMMUNICATION', 'SYSTEM_OUTAGE', 'MALWARE_OR_PHISHING', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'CONTAINED', 'RESOLVED', 'CLOSED');

-- CreateTable
CREATE TABLE "security_incidents" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "IncidentCategory" NOT NULL,
    "severity" "IncidentSeverity" NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "affectedDataSubjects" INTEGER,
    "occurredAt" TIMESTAMP(3),
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "containedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "icoReportable" BOOLEAN NOT NULL DEFAULT false,
    "icoReportedAt" TIMESTAMP(3),
    "reportedById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "security_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "security_incidents_reference_key" ON "security_incidents"("reference");

-- CreateIndex
CREATE INDEX "security_incidents_tenantId_status_idx" ON "security_incidents"("tenantId", "status");

-- CreateIndex
CREATE INDEX "security_incidents_tenantId_discoveredAt_idx" ON "security_incidents"("tenantId", "discoveredAt");

-- AddForeignKey
ALTER TABLE "security_incidents" ADD CONSTRAINT "security_incidents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
