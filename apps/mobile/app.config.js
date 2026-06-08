// Dynamic Expo config — picks the app variant (development / staging / production)
// from the APP_VARIANT env var so the staging app installs side-by-side with
// production, each with its own bundle id, display name and API base. EAS build
// profiles set APP_VARIANT + EXPO_PUBLIC_API_URL (see eas.json); without it
// (local `expo start`) we default to development.
//
// All other config (slug, version, plugins, EAS projectId, owner, etc.) comes
// from app.json — this only overrides the per-environment bits.

const VARIANT = process.env.APP_VARIANT ?? 'development';

const VARIANTS = {
  development: { name: 'Clinvara (Dev)', id: 'com.clinvara.mobile.dev' },
  staging: { name: 'Clinvara (Staging)', id: 'com.clinvara.mobile.staging' },
  production: { name: 'Clinvara', id: 'com.clinvara.mobile' },
};

module.exports = ({ config }) => {
  const v = VARIANTS[VARIANT] ?? VARIANTS.development;
  return {
    ...config,
    name: v.name,
    ios: { ...config.ios, bundleIdentifier: v.id },
    android: { ...config.android, package: v.id },
  };
};
