-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "enabledModules" TEXT[] DEFAULT ARRAY[]::TEXT[];
