-- AlterTable
ALTER TABLE "patient_identifiers" ADD COLUMN     "valueIndex" TEXT;

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "postalCodeIndex" TEXT;

-- AlterTable
ALTER TABLE "practitioners" ADD COLUMN     "familyNameIndex" TEXT,
ADD COLUMN     "givenNameIndex" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailIndex" TEXT;

-- CreateTable
CREATE TABLE "patient_search_index" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,

    CONSTRAINT "patient_search_index_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encryption_keys" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "encryptedDek" TEXT NOT NULL,
    "keyVersion" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "algorithm" TEXT NOT NULL DEFAULT 'AES-256-GCM',
    "kmsKeyArn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rotatedAt" TIMESTAMP(3),

    CONSTRAINT "encryption_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patient_search_index_tenantId_tokenHash_idx" ON "patient_search_index"("tenantId", "tokenHash");

-- CreateIndex
CREATE INDEX "patient_search_index_patientId_idx" ON "patient_search_index"("patientId");

-- CreateIndex
CREATE INDEX "encryption_keys_tenantId_isActive_idx" ON "encryption_keys"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "encryption_keys_tenantId_keyVersion_key" ON "encryption_keys"("tenantId", "keyVersion");

-- AddForeignKey
ALTER TABLE "patient_search_index" ADD CONSTRAINT "patient_search_index_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
