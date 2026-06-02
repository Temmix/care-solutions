-- CreateEnum
CREATE TYPE "LegalDocumentType" AS ENUM ('DPA', 'PRIVACY_POLICY', 'TERMS_OF_SERVICE', 'ACCEPTABLE_USE_POLICY');

-- CreateTable
CREATE TABLE "legal_acceptances" (
    "id" TEXT NOT NULL,
    "documentType" "LegalDocumentType" NOT NULL,
    "version" TEXT NOT NULL,
    "acceptedById" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "legal_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "legal_acceptances_tenantId_idx" ON "legal_acceptances"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "legal_acceptances_tenantId_documentType_version_key" ON "legal_acceptances"("tenantId", "documentType", "version");

-- AddForeignKey
ALTER TABLE "legal_acceptances" ADD CONSTRAINT "legal_acceptances_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
