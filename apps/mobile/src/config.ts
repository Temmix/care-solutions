/**
 * Runtime configuration. EXPO_PUBLIC_* vars are inlined at build time by the
 * Expo bundler and are safe to read on the client.
 */
export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:3000/api';

/** Worker roles allowed to use this app. ADMIN-only users get a gentle notice. */
export const WORKER_ROLES = ['CLINICIAN', 'NURSE', 'CARER'] as const;
