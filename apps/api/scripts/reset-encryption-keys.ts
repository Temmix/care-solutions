/**
 * One-off script to reset encryption keys and re-encrypt patient data.
 *
 * The KMS key was recreated by Terraform, making all existing DEKs
 * unrecoverable. This script:
 *   1. Deletes orphaned encryption keys (wrapped with old KMS key)
 *   2. Clears n-gram search indexes (they reference old keys)
 *   3. Deletes all patients and related data (encrypted fields are unrecoverable)
 *
 * Usage: npx tsx apps/api/scripts/reset-encryption-keys.ts
 * (Must be run with DATABASE_URL pointing to the target database)
 */

import { PrismaClient } from '@prisma/client';

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    console.log('Starting encryption key reset...');

    // Count existing data
    const [patients, keys, encounters, searchIndexes] = await Promise.all([
      prisma.patient.count(),
      prisma.encryptionKey.count(),
      prisma.encounter.count(),
      prisma.patientSearchIndex.count(),
    ]);

    console.log(
      `Found: ${patients} patients, ${keys} encryption keys, ${encounters} encounters, ${searchIndexes} search indexes`,
    );

    if (patients === 0 && keys === 0) {
      console.log('Nothing to clean up.');
      return;
    }

    // Delete in correct order to respect foreign keys
    console.log('Deleting discharge tasks...');
    await prisma.dischargeTask.deleteMany({});

    console.log('Deleting discharge plans...');
    await prisma.dischargePlan.deleteMany({});

    console.log('Deleting shift swap requests...');
    await prisma.shiftSwapRequest.deleteMany({});

    console.log('Deleting transfers...');
    await prisma.transfer.deleteMany({});

    console.log('Deleting encounters...');
    await prisma.encounter.deleteMany({});

    console.log('Deleting patient events...');
    await prisma.patientEvent.deleteMany({});

    console.log('Deleting medication administrations...');
    await prisma.medicationAdministration.deleteMany({});

    console.log('Deleting medication requests...');
    await prisma.medicationRequest.deleteMany({});

    console.log('Deleting assessments...');
    await prisma.assessment.deleteMany({});

    console.log('Deleting care plan activities...');
    await prisma.carePlanActivity.deleteMany({});

    console.log('Deleting care plan goals...');
    await prisma.carePlanGoal.deleteMany({});

    console.log('Deleting care plan notes...');
    await prisma.carePlanNote.deleteMany({});

    console.log('Deleting care plans...');
    await prisma.carePlan.deleteMany({});

    console.log('Deleting patient search indexes...');
    await prisma.patientSearchIndex.deleteMany({});

    console.log('Deleting patient contacts...');
    await prisma.patientContact.deleteMany({});

    console.log('Deleting patient identifiers...');
    await prisma.patientIdentifier.deleteMany({});

    console.log('Deleting patients...');
    await prisma.patient.deleteMany({});

    console.log('Deleting encryption keys...');
    await prisma.encryptionKey.deleteMany({});

    console.log('Resetting beds to AVAILABLE...');
    await prisma.bed.updateMany({
      where: { status: 'OCCUPIED' },
      data: { status: 'AVAILABLE' },
    });

    console.log('Done! All encrypted data and orphaned keys have been removed.');
    console.log(
      'New encryption keys will be generated automatically when new patients are created.',
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});
