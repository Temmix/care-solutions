/**
 * Human-readable labels for the `OrganizationType` Prisma enum.
 * Used wherever org type is displayed to end users (admin pages,
 * tenant detail, register form dropdowns, etc.).
 *
 * Falls back to a Title-Cased version of the raw value for any new
 * enum members added in the future before this map is updated —
 * never surfaces a SCREAMING_SNAKE_CASE string to a user.
 */
const ORG_TYPE_LABELS: Record<string, string> = {
  HOSPITAL: 'Hospital',
  GP_PRACTICE: 'GP Practice',
  CARE_HOME: 'Care Home',
  COMMUNITY_SERVICE: 'Community Service',
  MENTAL_HEALTH_TRUST: 'Mental Health Trust',
  OTHER: 'Other',
};

export function formatOrgType(type: string | null | undefined): string {
  if (!type) return '—';
  if (ORG_TYPE_LABELS[type]) return ORG_TYPE_LABELS[type];
  // Fallback: SCREAMING_SNAKE_CASE → Title Case
  return type
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
