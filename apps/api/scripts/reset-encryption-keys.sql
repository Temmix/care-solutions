-- Reset encryption keys and encrypted patient data.
-- The KMS key was recreated by Terraform, making existing DEKs unrecoverable.
-- Run via: npx prisma db execute --file scripts/reset-encryption-keys.sql --schema prisma/schema.prisma

BEGIN;

-- Delete child records first (FK constraints)
DELETE FROM discharge_tasks;
DELETE FROM discharge_plans;
DELETE FROM shift_swap_requests;
DELETE FROM transfers;
DELETE FROM encounters;
DELETE FROM patient_events;
DELETE FROM medication_administrations;
DELETE FROM medication_requests;
DELETE FROM assessments;
DELETE FROM care_plan_activities;
DELETE FROM care_plan_goals;
DELETE FROM care_plan_notes;
DELETE FROM care_plans;
DELETE FROM patient_search_indexes;
DELETE FROM patient_contacts;
DELETE FROM patient_identifiers;
DELETE FROM patients;
DELETE FROM encryption_keys;

-- Reset any occupied beds
UPDATE beds SET status = 'AVAILABLE' WHERE status = 'OCCUPIED';

COMMIT;
