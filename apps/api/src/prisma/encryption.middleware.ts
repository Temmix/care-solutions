import type { Prisma } from '@prisma/client';
import { ENCRYPTED_FIELDS } from '../modules/encryption/encryption.constants';
import type { EncryptionService } from '../modules/encryption/encryption.service';
import type { BlindIndexService } from '../modules/encryption/blind-index.service';
import type { FieldEncryptionConfig } from '../modules/encryption/encryption.types';

/**
 * Tenant ID resolution strategy per model.
 * - direct: tenantId is a column on the model
 * - self:   the record's own ID is the tenantId (Organization)
 * - parent: tenantId is resolved by looking up a parent record
 */
interface TenantResolution {
  type: 'direct' | 'self' | 'parent';
  field: string;
  parentModel?: string;
  foreignKey?: string;
}

const TENANT_RESOLUTION: Record<string, TenantResolution> = {
  Patient: { type: 'direct', field: 'tenantId' },
  PatientIdentifier: {
    type: 'parent',
    field: 'tenantId',
    parentModel: 'patient',
    foreignKey: 'patientId',
  },
  PatientContact: {
    type: 'parent',
    field: 'tenantId',
    parentModel: 'patient',
    foreignKey: 'patientId',
  },
  Assessment: { type: 'direct', field: 'tenantId' },
  CarePlanNote: {
    type: 'parent',
    field: 'tenantId',
    parentModel: 'carePlan',
    foreignKey: 'carePlanId',
  },
  CarePlanGoal: {
    type: 'parent',
    field: 'tenantId',
    parentModel: 'carePlan',
    foreignKey: 'carePlanId',
  },
  CarePlanActivity: {
    type: 'parent',
    field: 'tenantId',
    parentModel: 'carePlan',
    foreignKey: 'carePlanId',
  },
  MedicationRequest: { type: 'direct', field: 'tenantId' },
  MedicationAdministration: { type: 'direct', field: 'tenantId' },
  PatientEvent: { type: 'direct', field: 'tenantId' },
  Encounter: { type: 'direct', field: 'tenantId' },
  User: { type: 'direct', field: 'tenantId' },
  Practitioner: { type: 'direct', field: 'tenantId' },
  Organization: { type: 'self', field: 'id' },
  Subscription: {
    type: 'parent',
    field: 'id',
    parentModel: 'organization',
    foreignKey: 'organizationId',
  },
  StaffAvailability: { type: 'direct', field: 'tenantId' },
};

/** Relations that may be included in queries and contain encrypted fields */
const NESTED_RELATIONS: Record<string, Record<string, string>> = {
  Patient: {
    contacts: 'PatientContact',
    identifiers: 'PatientIdentifier',
  },
  CarePlan: {
    notes: 'CarePlanNote',
    goals: 'CarePlanGoal',
    activities: 'CarePlanActivity',
  },
  MedicationRequest: {
    administrations: 'MedicationAdministration',
  },
};

const WRITE_ACTIONS = new Set(['create', 'update', 'upsert', 'createMany', 'updateMany']);

const RESULT_ACTIONS = new Set([
  'findFirst',
  'findUnique',
  'findMany',
  'create',
  'update',
  'upsert',
]);

/**
 * Install Prisma middleware for transparent field-level encryption.
 *
 * - Encrypts configured fields on write operations
 * - Computes blind indexes for searchable fields
 * - Decrypts fields on read (with isEncrypted() fallback for mixed data)
 * - Creates n-gram search indexes for Patient name fields
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaLike = { $use: (middleware: Prisma.Middleware) => void } & Record<string, any>;

export function setupEncryptionMiddleware(
  prisma: PrismaLike,
  encryptionService: EncryptionService,
  blindIndexService: BlindIndexService,
): void {
  prisma.$use(async (params, next) => {
    const model = params.model;
    if (!model || !encryptionService.isEnabled()) {
      return next(params);
    }

    const fieldConfigs = ENCRYPTED_FIELDS[model];
    if (!fieldConfigs) {
      return next(params);
    }

    // Save plaintext values for n-gram indexing BEFORE encryption
    let ngramPlaintexts: Record<string, string> | null = null;

    if (WRITE_ACTIONS.has(params.action)) {
      ngramPlaintexts = extractNgramPlaintexts(params, fieldConfigs);
      await encryptWriteArgs(
        params,
        model,
        fieldConfigs,
        encryptionService,
        blindIndexService,
        prisma,
      );
    }

    const result = await next(params);

    // Create/update n-gram search indexes after successful write
    if (
      ngramPlaintexts &&
      Object.keys(ngramPlaintexts).length > 0 &&
      result &&
      (params.action === 'create' || params.action === 'update' || params.action === 'upsert')
    ) {
      await upsertNgramIndexes(model, result, ngramPlaintexts, blindIndexService, prisma);
    }

    // Decrypt result fields
    if (result != null && RESULT_ACTIONS.has(params.action)) {
      await decryptResult(result, model, encryptionService, prisma);
    }

    return result;
  });
}

// ── Tenant resolution ────────────────────────────────────

function toDelegateName(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

async function resolveTenantId(
  model: string,
  record: Record<string, unknown>,
  prisma: PrismaLike,
): Promise<string | null> {
  const resolution = TENANT_RESOLUTION[model];
  if (!resolution) return null;

  if (resolution.type === 'direct' || resolution.type === 'self') {
    return (record[resolution.field] as string) ?? null;
  }

  if (resolution.type === 'parent' && resolution.parentModel && resolution.foreignKey) {
    const fkValue = record[resolution.foreignKey] as string | undefined;
    if (!fkValue) return null;

    const parent = await prisma[resolution.parentModel].findUnique({
      where: { id: fkValue },
      select: { [resolution.field]: true },
    });
    return parent?.[resolution.field] ?? null;
  }

  return null;
}

async function resolveTenantIdForUpdate(
  model: string,
  data: Record<string, unknown>,
  where: Record<string, unknown> | undefined,
  prisma: PrismaLike,
): Promise<string | null> {
  // Try from data first
  const fromData = await resolveTenantId(model, data, prisma);
  if (fromData) return fromData;

  if (!where) return null;

  const resolution = TENANT_RESOLUTION[model];
  if (!resolution) return null;

  // Try from where clause directly
  if ((resolution.type === 'direct' || resolution.type === 'self') && where[resolution.field]) {
    return where[resolution.field] as string;
  }

  // Look up existing record by where clause
  const delegateName = toDelegateName(model);

  try {
    if (resolution.type === 'direct' || resolution.type === 'self') {
      const existing = await prisma[delegateName].findFirst({
        where,
        select: { [resolution.field]: true },
      });
      return existing?.[resolution.field] ?? null;
    }

    if (resolution.type === 'parent' && resolution.foreignKey) {
      const existing = await prisma[delegateName].findFirst({
        where,
        select: { [resolution.foreignKey]: true },
      });
      const fk = existing?.[resolution.foreignKey] as string | undefined;
      if (fk) {
        const parent = await prisma[resolution.parentModel!].findUnique({
          where: { id: fk },
          select: { [resolution.field]: true },
        });
        return parent?.[resolution.field] ?? null;
      }
    }
  } catch {
    // Lookup failed — skip encryption for this operation
  }

  return null;
}

// ── Write encryption ─────────────────────────────────────

function extractNgramPlaintexts(
  params: Prisma.MiddlewareParams,
  fieldConfigs: Record<string, FieldEncryptionConfig>,
): Record<string, string> {
  const plaintexts: Record<string, string> = {};

  let data: Record<string, unknown> | undefined;
  if (params.action === 'upsert') {
    data = { ...params.args.create, ...params.args.update };
  } else {
    data = params.args?.data;
    if (Array.isArray(data)) return plaintexts;
  }

  if (!data) return plaintexts;

  for (const [fieldName, config] of Object.entries(fieldConfigs)) {
    if (config.searchable && config.searchType === 'ngram' && typeof data[fieldName] === 'string') {
      plaintexts[fieldName] = data[fieldName] as string;
    }
  }

  return plaintexts;
}

async function encryptWriteArgs(
  params: Prisma.MiddlewareParams,
  model: string,
  fieldConfigs: Record<string, FieldEncryptionConfig>,
  encryptionService: EncryptionService,
  blindIndexService: BlindIndexService,
  prisma: PrismaLike,
): Promise<void> {
  switch (params.action) {
    case 'create': {
      const tenantId = await resolveTenantId(model, params.args.data, prisma);
      if (tenantId) {
        await encryptFields(
          params.args.data,
          fieldConfigs,
          tenantId,
          encryptionService,
          blindIndexService,
        );
      }
      break;
    }
    case 'update': {
      const tenantId = await resolveTenantIdForUpdate(
        model,
        params.args.data,
        params.args.where,
        prisma,
      );
      if (tenantId) {
        await encryptFields(
          params.args.data,
          fieldConfigs,
          tenantId,
          encryptionService,
          blindIndexService,
        );
      }
      break;
    }
    case 'upsert': {
      const createTenantId = await resolveTenantId(model, params.args.create, prisma);
      if (createTenantId) {
        await encryptFields(
          params.args.create,
          fieldConfigs,
          createTenantId,
          encryptionService,
          blindIndexService,
        );
      }
      const updateTenantId = await resolveTenantIdForUpdate(
        model,
        params.args.update,
        params.args.where,
        prisma,
      );
      if (updateTenantId) {
        await encryptFields(
          params.args.update,
          fieldConfigs,
          updateTenantId,
          encryptionService,
          blindIndexService,
        );
      }
      break;
    }
    case 'createMany': {
      if (Array.isArray(params.args.data)) {
        for (const item of params.args.data) {
          const tenantId = await resolveTenantId(model, item, prisma);
          if (tenantId) {
            await encryptFields(item, fieldConfigs, tenantId, encryptionService, blindIndexService);
          }
        }
      }
      break;
    }
    case 'updateMany': {
      const tenantId = await resolveTenantIdForUpdate(
        model,
        params.args.data,
        params.args.where,
        prisma,
      );
      if (tenantId) {
        await encryptFields(
          params.args.data,
          fieldConfigs,
          tenantId,
          encryptionService,
          blindIndexService,
        );
      }
      break;
    }
  }
}

async function encryptFields(
  data: Record<string, unknown>,
  fieldConfigs: Record<string, FieldEncryptionConfig>,
  tenantId: string,
  encryptionService: EncryptionService,
  blindIndexService: BlindIndexService,
): Promise<void> {
  for (const [fieldName, config] of Object.entries(fieldConfigs)) {
    const value = data[fieldName];
    if (value === undefined || value === null) continue;

    // Compute exact blind index BEFORE encryption (needs plaintext)
    if (config.searchable && config.searchType === 'exact' && config.indexField) {
      const plaintext = typeof value === 'string' ? value : String(value);
      data[config.indexField] = await blindIndexService.computeBlindIndex(
        plaintext,
        tenantId,
        fieldName,
      );
    }

    // Encrypt the field
    if (config.isJson) {
      data[fieldName] = await encryptionService.encryptJson(value, tenantId);
    } else if (typeof value === 'string' && !encryptionService.isEncrypted(value)) {
      data[fieldName] = await encryptionService.encrypt(value, tenantId);
    }
  }
}

// ── Read decryption ──────────────────────────────────────

async function decryptResult(
  result: unknown,
  model: string,
  encryptionService: EncryptionService,
  prisma: PrismaLike,
): Promise<void> {
  const fieldConfigs = ENCRYPTED_FIELDS[model];
  if (!fieldConfigs) return;

  if (Array.isArray(result)) {
    for (const item of result) {
      if (item && typeof item === 'object') {
        await decryptRecord(
          item as Record<string, unknown>,
          model,
          fieldConfigs,
          encryptionService,
          prisma,
        );
      }
    }
  } else if (typeof result === 'object' && result !== null) {
    await decryptRecord(
      result as Record<string, unknown>,
      model,
      fieldConfigs,
      encryptionService,
      prisma,
    );
  }
}

async function decryptRecord(
  record: Record<string, unknown>,
  model: string,
  fieldConfigs: Record<string, FieldEncryptionConfig>,
  encryptionService: EncryptionService,
  prisma: PrismaLike,
): Promise<void> {
  const tenantId = await resolveTenantId(model, record, prisma);
  if (!tenantId) return;

  for (const [fieldName, config] of Object.entries(fieldConfigs)) {
    const value = record[fieldName];
    if (value === undefined || value === null || typeof value !== 'string') continue;

    if (encryptionService.isEncrypted(value)) {
      record[fieldName] = config.isJson
        ? await encryptionService.decryptJson(value, tenantId)
        : await encryptionService.decrypt(value, tenantId);
    }
  }

  // Decrypt nested included relations
  const nestedRelations = NESTED_RELATIONS[model];
  if (nestedRelations) {
    for (const [relationName, childModel] of Object.entries(nestedRelations)) {
      if (record[relationName]) {
        await decryptResult(record[relationName], childModel, encryptionService, prisma);
      }
    }
  }
}

// ── N-gram index management ──────────────────────────────

async function upsertNgramIndexes(
  model: string,
  result: Record<string, unknown>,
  plaintexts: Record<string, string>,
  blindIndexService: BlindIndexService,
  prisma: PrismaLike,
): Promise<void> {
  // Currently only Patient has n-gram indexed fields
  if (model !== 'Patient') return;

  const patientId = result.id as string | undefined;
  const tenantId = result.tenantId as string | undefined;
  if (!patientId || !tenantId) return;

  const searchIndex = prisma.patientSearchIndex;

  for (const [fieldName, plaintext] of Object.entries(plaintexts)) {
    // Remove existing indexes for this patient + field
    await searchIndex.deleteMany({
      where: { patientId, fieldName },
    });

    // Compute n-gram hashes
    const hashes = await blindIndexService.computeNgramIndexes(plaintext, tenantId, fieldName);

    // Bulk-create new index entries
    if (hashes.length > 0) {
      await searchIndex.createMany({
        data: hashes.map((tokenHash: string) => ({
          patientId,
          tenantId,
          fieldName,
          tokenHash,
        })),
      });
    }
  }
}
