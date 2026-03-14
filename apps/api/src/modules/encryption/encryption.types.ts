/** Serialised envelope stored in encrypted database fields */
export interface EncryptedEnvelope {
  /** Envelope format version */
  v: number;
  /** Key ID (EncryptionKey.id) used to encrypt */
  kid: string;
  /** Base64-encoded 12-byte IV */
  iv: string;
  /** Base64-encoded ciphertext */
  ct: string;
  /** Base64-encoded 16-byte GCM auth tag */
  tag: string;
}

/** Per-field encryption configuration */
export interface FieldEncryptionConfig {
  /** Whether a blind index should be maintained for search */
  searchable?: boolean;
  /** 'exact' = single HMAC blind index, 'ngram' = tokenized n-gram index */
  searchType?: 'exact' | 'ngram';
  /** Column name on the same model that stores the blind index (for exact) */
  indexField?: string;
  /** Model name for n-gram search index table */
  indexModel?: string;
  /** Whether the field is a Prisma Json type (uses JSON serialization before encryption) */
  isJson?: boolean;
  /** Whether to use a global (non-tenant-specific) blind index — for cross-tenant lookups like login */
  globalIndex?: boolean;
}

/** Map of model name → field name → encryption config */
export type FieldEncryptionMap = Record<string, Record<string, FieldEncryptionConfig>>;

/** Resolved DEK material returned by KeyManagementService */
export interface ResolvedDEK {
  /** EncryptionKey record ID */
  keyId: string;
  /** Raw 32-byte AES key */
  key: Buffer;
}

/** Cached DEK entry */
export interface CachedDEK extends ResolvedDEK {
  expiresAt: number;
}

/** Supported encryption providers */
export type EncryptionProvider = 'local' | 'kms';
