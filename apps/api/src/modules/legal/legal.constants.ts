import { LegalDocumentType } from '@prisma/client';

export interface LegalDocumentDefinition {
  type: LegalDocumentType;
  title: string;
  /** Current version. Bump when the document text changes (date-based). */
  version: string;
}

/**
 * The canonical list of legal documents and their CURRENT versions. The
 * version is authoritative server-side — clients accept "the current version",
 * they don't supply it. Bump a version here when the corresponding page in
 * apps/web/src/features/legal changes; tenants then show that document as
 * outstanding until they re-accept.
 */
export const CURRENT_LEGAL_DOCUMENTS: readonly LegalDocumentDefinition[] = [
  { type: 'DPA', title: 'Data Processing Agreement', version: '2026-04-15' },
  { type: 'PRIVACY_POLICY', title: 'Privacy Policy', version: '2026-04-15' },
  { type: 'TERMS_OF_SERVICE', title: 'Terms of Service', version: '2026-04-15' },
  { type: 'ACCEPTABLE_USE_POLICY', title: 'Acceptable Use Policy', version: '2026-04-15' },
];

export function currentVersionFor(type: LegalDocumentType): string {
  const doc = CURRENT_LEGAL_DOCUMENTS.find((d) => d.type === type);
  if (!doc) {
    throw new Error(`No current version configured for legal document ${type}`);
  }
  return doc.version;
}
