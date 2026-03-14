import { Injectable, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { KeyManagementService } from './key-management.service';
import { HKDF_HASH, MIN_NGRAM_LENGTH } from './encryption.constants';

@Injectable()
export class BlindIndexService {
  constructor(@Inject(KeyManagementService) private readonly keyManager: KeyManagementService) {}

  /**
   * Compute a single blind index (HMAC-SHA256) for an exact-match searchable field.
   * The HMAC key is derived from the tenant's DEK via HKDF with the field name as info,
   * ensuring each field has a distinct index space.
   */
  async computeBlindIndex(value: string, tenantId: string, fieldName: string): Promise<string> {
    const hmacKey = await this.deriveBlindIndexKey(tenantId, fieldName);
    const normalized = this.normalize(value);
    return crypto.createHmac('sha256', hmacKey).update(normalized).digest('hex');
  }

  /**
   * Generate n-gram blind indexes for a value, supporting partial/substring search.
   * Returns an array of HMAC hex strings, one per unique n-gram.
   *
   * Example: "John" with minLength=3 → ngrams ["joh", "ohn", "john"]
   *          → HMAC for each → ["abc123...", "def456...", "ghi789..."]
   */
  async computeNgramIndexes(
    value: string,
    tenantId: string,
    fieldName: string,
    minLength: number = MIN_NGRAM_LENGTH,
  ): Promise<string[]> {
    const hmacKey = await this.deriveBlindIndexKey(tenantId, fieldName);
    const normalized = this.normalize(value);

    if (normalized.length < minLength) {
      // Value too short to generate any n-grams — index the whole value
      const hash = crypto.createHmac('sha256', hmacKey).update(normalized).digest('hex');
      return [hash];
    }

    const ngrams = this.generateNgrams(normalized, minLength);
    return ngrams.map((ngram) => crypto.createHmac('sha256', hmacKey).update(ngram).digest('hex'));
  }

  /**
   * Compute the HMAC hash for a search query (used at query time).
   * For exact search, pass the full query. For n-gram search, pass the query as-is
   * and it will be normalized and hashed as a single token.
   */
  async computeSearchHash(query: string, tenantId: string, fieldName: string): Promise<string> {
    const hmacKey = await this.deriveBlindIndexKey(tenantId, fieldName);
    const normalized = this.normalize(query);
    return crypto.createHmac('sha256', hmacKey).update(normalized).digest('hex');
  }

  /**
   * Compute a global blind index (not tenant-specific).
   * Used for cross-tenant lookups like User.email during login/register.
   * Key is derived from the master key, so the same email always produces
   * the same index regardless of tenant.
   */
  computeGlobalBlindIndex(value: string, fieldName: string): string {
    const globalKey = this.keyManager.getGlobalBlindIndexKey();
    const hmacKey = crypto.hkdfSync(
      HKDF_HASH,
      globalKey,
      Buffer.alloc(0),
      `blind-index:${fieldName}`,
      32,
    );
    const normalized = this.normalize(value);
    return crypto.createHmac('sha256', Buffer.from(hmacKey)).update(normalized).digest('hex');
  }

  // ── Private helpers ──────────────────────────────────

  /**
   * Derive a field-specific blind index key from the tenant's DEK using HKDF.
   * Each (tenant, field) pair gets a unique key, so compromising one field's
   * indexes reveals nothing about another field.
   */
  private async deriveBlindIndexKey(tenantId: string, fieldName: string): Promise<Buffer> {
    const { key: dek } = await this.keyManager.getDEK(tenantId);
    const info = `blind-index:${fieldName}`;

    const derived = crypto.hkdfSync(
      HKDF_HASH,
      dek,
      Buffer.alloc(0), // no salt — the DEK itself provides sufficient entropy
      info,
      32,
    );
    return Buffer.from(derived);
  }

  /**
   * Normalize a value for consistent blind indexing:
   * - Lowercase
   * - Strip diacritics (é → e, ñ → n)
   * - Remove apostrophes and hyphens (O'Brien → obrien, Smith-Jones → smithjones)
   * - Trim whitespace
   */
  private normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // strip diacritics
      .replace(/['-]/g, '') // strip apostrophes and hyphens
      .trim();
  }

  /**
   * Generate all unique n-grams (substrings) of length minLength..valueLength.
   *
   * "John" with min=3 → ["joh", "ohn", "john"]
   * "Margaret" with min=3 → ["mar", "arg", "rga", "gar", "are", "ret", "marg", "arga", ...]
   */
  private generateNgrams(value: string, minLength: number): string[] {
    const ngrams = new Set<string>();

    for (let len = minLength; len <= value.length; len++) {
      for (let i = 0; i <= value.length - len; i++) {
        ngrams.add(value.substring(i, i + len));
      }
    }

    return Array.from(ngrams);
  }
}
