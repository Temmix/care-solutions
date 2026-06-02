import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit';

export interface AuditOptions {
  /** Resource type recorded on the audit entry (e.g. 'Patient', 'CarePlan'). */
  resource: string;
  /** Action recorded on the audit entry. Defaults to 'VIEW'. */
  action?: string;
  /** Route param name to use as the audited resourceId. Defaults to 'id'. */
  idParam?: string;
}

/**
 * Marks a controller route for audit logging. The {@link AuditInterceptor}
 * records an entry (after the handler succeeds) capturing who accessed which
 * resource. Used for patient-data access (view) logging across clinical modules.
 *
 * @example
 *   @Get(':id')
 *   @Audit({ resource: 'Patient' })
 *   findOne(@Param('id') id: string) { ... }
 */
export const Audit = (options: AuditOptions): ReturnType<typeof SetMetadata> =>
  SetMetadata(AUDIT_KEY, options);
