import { Injectable, Inject } from '@nestjs/common';
import { BlindIndexService } from './blind-index.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MIN_NGRAM_LENGTH } from './encryption.constants';

@Injectable()
export class PatientSearchService {
  constructor(
    @Inject(BlindIndexService) private readonly blindIndex: BlindIndexService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  /**
   * Index a patient's searchable name fields (n-gram blind indexes).
   * Replaces existing indexes for the given fields.
   */
  async indexPatient(
    patientId: string,
    tenantId: string,
    fields: Record<string, string | undefined>,
  ): Promise<void> {
    for (const [fieldName, value] of Object.entries(fields)) {
      if (!value) continue;

      await this.prisma.patientSearchIndex.deleteMany({
        where: { patientId, fieldName },
      });

      const hashes = await this.blindIndex.computeNgramIndexes(
        value,
        tenantId,
        fieldName,
        MIN_NGRAM_LENGTH,
      );

      if (hashes.length > 0) {
        await this.prisma.patientSearchIndex.createMany({
          data: hashes.map((tokenHash) => ({
            patientId,
            tenantId,
            fieldName,
            tokenHash,
          })),
        });
      }
    }
  }

  /**
   * Search for patients by name using blind index n-gram matching.
   * Returns patient IDs that match the query against any of the specified fields.
   */
  async searchByName(
    query: string,
    tenantId: string,
    fieldNames: string[] = ['givenName', 'familyName'],
  ): Promise<string[]> {
    const searchHashes: string[] = [];

    for (const fieldName of fieldNames) {
      const hash = await this.blindIndex.computeSearchHash(query, tenantId, fieldName);
      searchHashes.push(hash);
    }

    const matches = await this.prisma.patientSearchIndex.findMany({
      where: {
        tenantId,
        fieldName: { in: fieldNames },
        tokenHash: { in: searchHashes },
      },
      select: { patientId: true },
    });

    return [...new Set(matches.map((m) => m.patientId))];
  }

  /**
   * Search for patients by postal code using exact blind index.
   */
  async searchByPostalCode(postalCode: string, tenantId: string): Promise<string[]> {
    const hash = await this.blindIndex.computeBlindIndex(postalCode, tenantId, 'postalCode');

    const patients = await this.prisma.patient.findMany({
      where: { tenantId, postalCodeIndex: hash },
      select: { id: true },
    });

    return patients.map((p) => p.id);
  }
}
