-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PatientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DECEASED');

-- CreateEnum
CREATE TYPE "IdentifierType" AS ENUM ('NHS_NUMBER', 'MRN', 'PASSPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "ContactRelationship" AS ENUM ('NEXT_OF_KIN', 'EMERGENCY', 'CARER', 'GUARDIAN', 'OTHER');

-- CreateEnum
CREATE TYPE "PatientEventType" AS ENUM ('CREATED', 'UPDATED', 'ADMISSION', 'DISCHARGE', 'TRANSFER', 'NOTE', 'ASSESSMENT', 'REFERRAL', 'DEMOGRAPHIC_CHANGE');

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('HOSPITAL', 'GP_PRACTICE', 'CARE_HOME', 'COMMUNITY_SERVICE', 'MENTAL_HEALTH_TRUST', 'OTHER');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "name" TEXT NOT NULL,
    "type" "OrganizationType" NOT NULL,
    "odsCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "addressLine1" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT DEFAULT 'GB',
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practitioners" (
    "id" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "givenName" TEXT NOT NULL,
    "familyName" TEXT NOT NULL,
    "gender" "Gender",
    "phone" TEXT,
    "email" TEXT,
    "specialty" TEXT,
    "registrationNumber" TEXT,
    "organizationId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "practitioners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "status" "PatientStatus" NOT NULL DEFAULT 'ACTIVE',
    "givenName" TEXT NOT NULL,
    "familyName" TEXT NOT NULL,
    "prefix" TEXT,
    "gender" "Gender" NOT NULL,
    "birthDate" DATE NOT NULL,
    "deceasedDate" TIMESTAMP(3),
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "district" TEXT,
    "postalCode" TEXT,
    "country" TEXT DEFAULT 'GB',
    "phone" TEXT,
    "email" TEXT,
    "maritalStatus" TEXT,
    "careSetting" TEXT,
    "managingOrganizationId" TEXT,
    "gpPractitionerId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_identifiers" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" "IdentifierType" NOT NULL,
    "system" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_identifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_contacts" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "relationship" "ContactRelationship" NOT NULL,
    "givenName" TEXT NOT NULL,
    "familyName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "addressLine1" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_events" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "eventType" "PatientEventType" NOT NULL,
    "summary" TEXT NOT NULL,
    "detail" JSONB,
    "careSetting" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT NOT NULL,

    CONSTRAINT "patient_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_odsCode_key" ON "organizations"("odsCode");

-- CreateIndex
CREATE INDEX "organizations_name_idx" ON "organizations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "practitioners_userId_key" ON "practitioners"("userId");

-- CreateIndex
CREATE INDEX "practitioners_familyName_givenName_idx" ON "practitioners"("familyName", "givenName");

-- CreateIndex
CREATE INDEX "practitioners_organizationId_idx" ON "practitioners"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "patients_userId_key" ON "patients"("userId");

-- CreateIndex
CREATE INDEX "patients_familyName_givenName_idx" ON "patients"("familyName", "givenName");

-- CreateIndex
CREATE INDEX "patients_birthDate_idx" ON "patients"("birthDate");

-- CreateIndex
CREATE INDEX "patients_managingOrganizationId_idx" ON "patients"("managingOrganizationId");

-- CreateIndex
CREATE INDEX "patient_identifiers_patientId_idx" ON "patient_identifiers"("patientId");

-- CreateIndex
CREATE INDEX "patient_identifiers_value_idx" ON "patient_identifiers"("value");

-- CreateIndex
CREATE UNIQUE INDEX "patient_identifiers_type_value_key" ON "patient_identifiers"("type", "value");

-- CreateIndex
CREATE INDEX "patient_contacts_patientId_idx" ON "patient_contacts"("patientId");

-- CreateIndex
CREATE INDEX "patient_events_patientId_occurredAt_idx" ON "patient_events"("patientId", "occurredAt");

-- CreateIndex
CREATE INDEX "patient_events_patientId_eventType_idx" ON "patient_events"("patientId", "eventType");

-- CreateIndex
CREATE INDEX "patient_events_careSetting_idx" ON "patient_events"("careSetting");

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practitioners" ADD CONSTRAINT "practitioners_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practitioners" ADD CONSTRAINT "practitioners_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_managingOrganizationId_fkey" FOREIGN KEY ("managingOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_gpPractitionerId_fkey" FOREIGN KEY ("gpPractitionerId") REFERENCES "practitioners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_identifiers" ADD CONSTRAINT "patient_identifiers_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_contacts" ADD CONSTRAINT "patient_contacts_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_events" ADD CONSTRAINT "patient_events_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_events" ADD CONSTRAINT "patient_events_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
