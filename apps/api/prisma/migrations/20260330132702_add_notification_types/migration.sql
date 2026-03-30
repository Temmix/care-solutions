-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'SHIFT_SWAP_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'SHIFT_SWAP_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'SHIFT_SWAP_CANCELLED';
ALTER TYPE "NotificationType" ADD VALUE 'SHIFT_SWAP_NEEDS_APPROVAL';
ALTER TYPE "NotificationType" ADD VALUE 'WELCOME';
ALTER TYPE "NotificationType" ADD VALUE 'USER_INVITED';
ALTER TYPE "NotificationType" ADD VALUE 'USER_DEACTIVATED';
ALTER TYPE "NotificationType" ADD VALUE 'PATIENT_ADMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'PATIENT_DISCHARGED';
ALTER TYPE "NotificationType" ADD VALUE 'PATIENT_TRANSFERRED';
ALTER TYPE "NotificationType" ADD VALUE 'TRAINING_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'TRAINING_EXPIRING';
ALTER TYPE "NotificationType" ADD VALUE 'TRIAL_EXPIRING';
ALTER TYPE "NotificationType" ADD VALUE 'SUBSCRIPTION_CHANGED';
