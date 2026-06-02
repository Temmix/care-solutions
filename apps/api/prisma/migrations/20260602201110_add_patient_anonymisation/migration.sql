-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "anonymizedAt" TIMESTAMP(3),
ADD COLUMN     "anonymizedById" TEXT;
