# Clinvara Mobile (`@care/mobile`)

Expo (React Native) app for **frontline care workers** — a focused companion to
the web app covering the worker-facing workflows, not administration.

## Status

**v1, slice 1.** Shipped: auth + tenant selection, and the **Clock** tab
(geofenced clock-in/out with an offline queue). Shifts, Swaps/Availability and
Training tabs are placeholders landing in subsequent branches. Push-notification
registration is wired (no-op until an EAS `projectId` is set and run on a real
device).

## Architecture

- **Auth** — JWT in `expo-secure-store`; same single-flight 401 refresh as the
  web client (`src/lib/api-client.ts`, ported from `apps/web`). Multi-tenant via
  the `X-Tenant-Id` header; auto-selects when the user has one membership, shows
  a picker otherwise.
- **Clock** — `src/features/clock`. `useGeolocation` gets a high-accuracy fix;
  `offline-queue.ts` durably stores each clock event with its capture time +
  GPS in `AsyncStorage` and flushes on reconnect (NetInfo). The API dedupes on
  `clientEventId`, so retries are safe. Server rejections (geofence/time) are
  quarantined to a "failed" list and surfaced to the worker.
- **Push** — `src/push/usePushRegistration.ts` registers the Expo push token
  with `POST /api/notifications/device-tokens` after sign-in and unregisters on
  sign-out.

## Backend dependencies

This app relies on API changes added alongside it:

- `POST /api/notifications/device-tokens`, `DELETE /api/notifications/device-tokens/:token`
- `clientEventId` + `capturedAt` on `POST /api/clock-in` and `/api/clock-out`
  (idempotent, offline-friendly)
- Auth-route rate limiting (`@nestjs/throttler`)

## Running locally

```bash
# from the repo root
npm install

cd apps/mobile
cp .env.example .env          # set EXPO_PUBLIC_API_URL to your machine's LAN IP
npx expo start                # press i / a, or scan the QR with Expo Go
```

Notes:

- Use your host's **LAN IP** (e.g. `http://192.168.x.x:3000/api`), not
  `localhost` — the device/emulator can't reach the host loopback.
- **Expo Go** runs the JS for quick iteration, but **push notifications and
  reliable background geolocation need a dev build** (`npx expo run:ios` /
  `run:android`, or an EAS development build).

## Builds & release (EAS)

```bash
npm i -g eas-cli && eas login
eas build:configure                       # writes the EAS projectId
# put the printed projectId into app.json → expo.extra.eas.projectId
eas build --profile development --platform ios     # or android
eas build --profile production --platform all
eas submit --profile production --platform all
```

Prerequisites you must set up (outside this repo):

- **Apple Developer Program** membership + an App Store Connect app record.
- **Google Play Console** developer account + app listing.

## Conventions

Strict TypeScript, no `any`; shares `@care/eslint-config`. Run `npm run lint` and
`npm run typecheck` before pushing.

> The API types in `src/types.ts` currently mirror a subset of `@care/shared`.
> Wiring the workspace package through Metro is a planned follow-up.
