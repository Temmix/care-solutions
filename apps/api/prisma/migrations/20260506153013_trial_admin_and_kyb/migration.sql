-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED');

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "companiesHouseNumber" TEXT,
ADD COLUMN     "cqcProviderId" TEXT,
ADD COLUMN     "verificationNotes" TEXT,
ADD COLUMN     "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedById" TEXT;

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "lastTrialReminderDay" INTEGER;

-- CreateIndex
CREATE INDEX "subscriptions_status_trialEndsAt_idx" ON "subscriptions"("status", "trialEndsAt");

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
