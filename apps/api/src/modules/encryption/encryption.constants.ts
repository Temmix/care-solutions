import type { FieldEncryptionMap } from './encryption.types';

/** Prefix for all encrypted field values — used by isEncrypted() detection */
export const ENCRYPTION_PREFIX = 'enc:v1:';

/** AES-256-GCM configuration */
export const AES_ALGORITHM = 'aes-256-gcm' as const;
export const IV_LENGTH = 12;
export const AUTH_TAG_LENGTH = 16;
export const KEY_LENGTH = 32;

/** bcrypt-style salt rounds for HKDF info derivation (not actual bcrypt) */
export const HKDF_HASH = 'sha256';
export const HKDF_SALT_LENGTH = 32;

/** Minimum n-gram length for tokenized search */
export const MIN_NGRAM_LENGTH = 3;

/**
 * Registry of all model fields that require encryption.
 *
 * - Tier 1: PHI (patient data, clinical notes, identifiers)
 * - Tier 2: Staff PII (user emails, practitioner details, billing IDs)
 *
 * Fields marked `searchable` will have blind indexes maintained automatically.
 */
export const ENCRYPTED_FIELDS: FieldEncryptionMap = {
  // ── Tier 1: PHI ──────────────────────────────────────
  Patient: {
    givenName: { searchable: true, searchType: 'ngram', indexModel: 'PatientSearchIndex' },
    middleName: {},
    familyName: { searchable: true, searchType: 'ngram', indexModel: 'PatientSearchIndex' },
    phone: {},
    email: {},
    addressLine1: {},
    addressLine2: {},
    postalCode: { searchable: true, searchType: 'exact', indexField: 'postalCodeIndex' },
  },

  PatientIdentifier: {
    value: { searchable: true, searchType: 'exact', indexField: 'valueIndex' },
  },

  PatientContact: {
    givenName: {},
    familyName: {},
    phone: {},
    email: {},
    addressLine1: {},
  },

  Assessment: {
    notes: {},
    responses: { isJson: true },
    recommendedActions: {},
    scoreInterpretation: {},
  },

  CarePlanNote: {
    content: {},
  },

  CarePlanGoal: {
    description: {},
    notes: {},
  },

  CarePlanActivity: {
    description: {},
    notes: {},
  },

  MedicationRequest: {
    dosageText: {},
    reasonText: {},
    instructions: {},
  },

  MedicationAdministration: {
    notes: {},
    notGivenReason: {},
  },

  PatientEvent: {
    summary: {},
    detail: { isJson: true },
  },

  Encounter: {
    notes: {},
  },

  // ── Tier 2: Staff PII ────────────────────────────────
  User: {
    email: { searchable: true, searchType: 'exact', indexField: 'emailIndex' },
    firstName: {},
    lastName: {},
  },

  Practitioner: {
    givenName: { searchable: true, searchType: 'exact', indexField: 'givenNameIndex' },
    familyName: { searchable: true, searchType: 'exact', indexField: 'familyNameIndex' },
    phone: {},
    email: {},
    registrationNumber: {},
  },

  Organization: {
    phone: {},
    email: {},
    stripeCustomerId: {},
  },

  Subscription: {
    stripeSubscriptionId: {},
  },

  StaffAvailability: {
    notes: {},
  },
};
