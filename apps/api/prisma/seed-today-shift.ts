/**
 * Dev helper: seed a PUBLISHED shift for TODAY assigned to nurse@sunrise-care.local
 * so the mobile Clock tab has something to clock into.
 *
 * Idempotent — safe to re-run. Each run also clears any existing clock record for
 * the assignment, so it doubles as a "reset" to test clock-in/out repeatedly.
 *
 *   npx tsx prisma/seed-today-shift.ts
 *
 * The location is created WITHOUT coordinates, so the server geofence check is
 * skipped and you can clock in from anywhere. To test the geofence itself, set
 * the location's latitude/longitude/geofenceRadius (see the note printed at the end).
 */
import { config } from 'dotenv';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

// Load env the same way the API does (apps/api/.env, then the monorepo root .env).
config({ path: join(__dirname, '..', '.env') });
config({ path: join(__dirname, '..', '..', '..', '.env') });

const prisma = new PrismaClient();

// Fixed IDs so re-runs upsert the same rows instead of piling up duplicates.
const PATTERN_ID = '00000000-0000-4000-8000-0000000000a1';
const LOCATION_ID = '00000000-0000-4000-8000-0000000000a2';
const SHIFT_ID = '00000000-0000-4000-8000-0000000000a3';
const WORKER_EMAIL = 'nurse@sunrise-care.local';

async function main(): Promise<void> {
  const worker = await prisma.user.findUnique({ where: { email: WORKER_EMAIL } });
  if (!worker) throw new Error(`User ${WORKER_EMAIL} not found — run the main seed first.`);
  if (!worker.tenantId) throw new Error(`User ${WORKER_EMAIL} has no tenantId.`);
  const tenantId = worker.tenantId;

  // Mirror getMyShiftsToday EXACTLY: it computes today via `new Date()` +
  // setHours(0,0,0,0). Constructing the date the same way guarantees the stored
  // @db.Date matches the API's [today, tomorrow) filter through identical Prisma
  // (UTC) serialization — avoids the timezone off-by-one of building it ourselves.
  const shiftDate = new Date();
  shiftDate.setHours(0, 0, 0, 0);

  // Overnight ~24h window (20:00 → 19:59 next day). Because @db.Date anchors the
  // window at UTC-midnight of the stored day, an overnight pattern keeps the
  // clock-in window open across the UTC-midnight boundary (important when the
  // local time is an hour ahead of UTC), rather than slamming shut at 23:59 UTC.
  await prisma.shiftPattern.upsert({
    where: { id: PATTERN_ID },
    create: {
      id: PATTERN_ID,
      name: 'Dev test (all-day)',
      shiftType: 'NIGHT',
      startTime: '20:00',
      endTime: '19:59',
      breakMinutes: 0,
      tenantId,
    },
    update: { startTime: '20:00', endTime: '19:59', tenantId },
  });

  await prisma.location.upsert({
    where: { id: LOCATION_ID },
    create: {
      id: LOCATION_ID,
      name: 'Sunrise Care Home (dev)',
      type: 'WARD',
      tenantId,
      // No lat/lng → geofence check skipped (clock in from anywhere).
      latitude: null,
      longitude: null,
    },
    update: { tenantId },
  });

  await prisma.shift.upsert({
    where: { id: SHIFT_ID },
    create: {
      id: SHIFT_ID,
      date: shiftDate,
      status: 'PUBLISHED',
      shiftPatternId: PATTERN_ID,
      locationId: LOCATION_ID,
      tenantId,
    },
    update: { date: shiftDate, status: 'PUBLISHED', locationId: LOCATION_ID, tenantId },
  });

  const assignment = await prisma.shiftAssignment.upsert({
    where: { shiftId_userId: { shiftId: SHIFT_ID, userId: worker.id } },
    create: { shiftId: SHIFT_ID, userId: worker.id, role: 'NURSE' },
    update: {},
    include: { clockRecord: true },
  });

  // Reset any prior clock state so clock-in is available again.
  if (assignment.clockRecord) {
    await prisma.clockRecord.delete({ where: { id: assignment.clockRecord.id } });
    console.log('  Cleared previous clock record (reset for a fresh clock-in).');
  }

  console.log(`✅ Today shift seeded for ${WORKER_EMAIL}`);
  console.log(
    `   date=${shiftDate.toISOString().slice(0, 10)}  status=PUBLISHED  window=00:00–23:59`,
  );
  console.log(`   location has no coordinates → geofence skipped (clock in from anywhere).`);
  console.log('');
  console.log('   To test the geofence instead, set the location coords + radius, e.g.:');
  console.log(
    `   UPDATE locations SET latitude=51.5074, longitude=-0.1278, "geofenceRadius"=150 WHERE id='${LOCATION_ID}';`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
