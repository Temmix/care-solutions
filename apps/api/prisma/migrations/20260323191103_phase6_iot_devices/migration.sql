-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('PULSE_OXIMETER', 'BLOOD_PRESSURE_MONITOR', 'THERMOMETER', 'GLUCOMETER', 'WEIGHT_SCALE', 'WEARABLE', 'SPIROMETER', 'ECG_MONITOR', 'OTHER');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('REGISTERED', 'ACTIVE', 'OFFLINE', 'DECOMMISSIONED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'DEVICE_BATTERY_LOW';

-- DropForeignKey
ALTER TABLE "vital_observations" DROP CONSTRAINT "vital_observations_recorderId_fkey";

-- AlterTable
ALTER TABLE "vital_observations" ADD COLUMN     "deviceId" TEXT,
ALTER COLUMN "recorderId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "iot_devices" (
    "id" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "deviceType" "DeviceType" NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "firmwareVersion" TEXT,
    "status" "DeviceStatus" NOT NULL DEFAULT 'REGISTERED',
    "lastSeenAt" TIMESTAMP(3),
    "batteryLevel" INTEGER,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "iot_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iot_device_assignments" (
    "id" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deviceId" TEXT NOT NULL,
    "enrolmentId" TEXT NOT NULL,

    CONSTRAINT "iot_device_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iot_api_keys" (
    "id" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "deviceId" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "iot_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "iot_devices_tenantId_status_idx" ON "iot_devices"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "iot_devices_serialNumber_tenantId_key" ON "iot_devices"("serialNumber", "tenantId");

-- CreateIndex
CREATE INDEX "iot_device_assignments_deviceId_idx" ON "iot_device_assignments"("deviceId");

-- CreateIndex
CREATE INDEX "iot_device_assignments_enrolmentId_idx" ON "iot_device_assignments"("enrolmentId");

-- CreateIndex
CREATE UNIQUE INDEX "iot_device_assignments_deviceId_enrolmentId_isActive_key" ON "iot_device_assignments"("deviceId", "enrolmentId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "iot_api_keys_keyHash_key" ON "iot_api_keys"("keyHash");

-- CreateIndex
CREATE UNIQUE INDEX "iot_api_keys_deviceId_key" ON "iot_api_keys"("deviceId");

-- CreateIndex
CREATE INDEX "iot_api_keys_tenantId_idx" ON "iot_api_keys"("tenantId");

-- CreateIndex
CREATE INDEX "iot_api_keys_keyHash_idx" ON "iot_api_keys"("keyHash");

-- AddForeignKey
ALTER TABLE "vital_observations" ADD CONSTRAINT "vital_observations_recorderId_fkey" FOREIGN KEY ("recorderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_observations" ADD CONSTRAINT "vital_observations_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "iot_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iot_devices" ADD CONSTRAINT "iot_devices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iot_device_assignments" ADD CONSTRAINT "iot_device_assignments_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "iot_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iot_device_assignments" ADD CONSTRAINT "iot_device_assignments_enrolmentId_fkey" FOREIGN KEY ("enrolmentId") REFERENCES "virtual_ward_enrolments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iot_api_keys" ADD CONSTRAINT "iot_api_keys_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "iot_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iot_api_keys" ADD CONSTRAINT "iot_api_keys_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
