import { SetMetadata } from '@nestjs/common';

export const CLINICAL_DATA_KEY = 'clinicalData';

/**
 * Marks a controller (or handler) as serving patient clinical data (PHI).
 *
 * Combined with {@link ClinicalAccessGuard}, this blocks platform
 * administrators (SUPER_ADMIN) — who have no tenant membership and no clinical
 * role — from reading patient clinical data in any tenant, even though they
 * bypass `@Roles()` checks for legitimate platform operations.
 */
export const ClinicalData = (): ReturnType<typeof SetMetadata> =>
  SetMetadata(CLINICAL_DATA_KEY, true);
