# Device Pairing Implementation (Developer Guide)

## Purpose

This document explains how QR-based parent-child device pairing is implemented end to end in this codebase: parent QR generation, child scan/confirm, backend validation, Firestore writes, and post-pairing behavior.

## Scope

- Parent creates short-lived pairing sessions.
- Child scans and confirms pairing.
- Backend validates token/session state and writes relationship documents.
- Parent app detects newly confirmed pairings and starts using child telemetry streams.

## Key Components

### Frontend (React Native / Expo)

- Parent pairing screen: `app/(parent)/add-device/index.tsx`
- Child pairing screen: `app/(child)/pair-with-parent.tsx`
- QR render component: `app/_components/QRCodeDisplay.tsx`
- QR scanner component: `app/_components/QRScanner.tsx`
- Pairing service abstraction: `app/services/pairing.service.ts`

### Backend (Firebase Cloud Functions)

- `generatePairingCode`
- `validatePairingToken`
- `confirmDevicePairing`
- `cleanupExpiredPairings`
- `onPairingCreated` trigger
- `onPairingDeleted` trigger

Implementation file: `functions/src/index.ts`

## Implementation Flow

### 1) Parent generates QR session

1. Parent opens Add Device (`/(parent)/add-device`).
2. UI calls `PairingService.createPairingSession(parentUid, parentUid)`.
3. Service calls callable function `generatePairingCode`.
4. Function creates:
   - 32-char alphanumeric token
   - `expiresAt = now + 5 minutes`
   - Firestore document in `pairingSessions` with `status: active`
5. Function returns `qrData` (JSON payload string), token, and expiry.
6. Parent screen renders QR code and starts:
   - local countdown timer
   - polling for confirmed pairing by token every 3 seconds

### 2) Child scans and validates

1. Child opens Pair with Parent (`/(child)/pair-with-parent`).
2. Scanner reads QR payload and uses `PairingService.decodePairingData`.
3. Client performs local expiration check (`PairingService.isTokenValid`).
4. User confirms pairing in child UI.

### 3) Backend confirms pairing

1. Child calls `PairingService.confirmPairing(childUid, parentId, token, deviceName)`.
2. Service calls callable function `confirmDevicePairing`.
3. Function validates:
   - authenticated caller
   - required fields
   - token format (`^[A-Z0-9]{32}$`)
   - active session exists for `(token, parentId)`
   - not expired
   - no duplicate confirmed pairing for same parent-child
4. Function writes:
   - new `devicePairings/{pairingId}` document (`status: confirmed`)
   - updates source `pairingSessions/{sessionId}` to `status: used`
   - parent link: `users/{parentId}/devices/{parentDeviceId}/pairedChildren/{childId}`
   - child link: `users/{childId}/devices/default` with parent metadata
5. Function returns pairing response payload.

### 4) Parent sees success

1. Parent polling loop checks `PairingService.getConfirmedPairingByToken(token, parentUid)`.
2. When confirmed pairing appears, parent is alerted and navigates to Devices screen.

## Data Model

### Firestore Collections

- `pairingSessions/{sessionId}`
  - `parentId`
  - `parentDeviceId`
  - `token`
  - `createdAt`
  - `expiresAt`
  - `status` (`active | used | expired`)

- `devicePairings/{pairingId}`
  - `parentId`
  - `childId`
  - `childDeviceName`
  - `token`
  - `status` (`confirmed | rejected | inactive` used by service/UI semantics)
  - `createdAt`
  - `confirmedAt`
  - `expiresAt`

- Relationship side-documents
  - `users/{parentId}/devices/{parentDeviceId}/pairedChildren/{childId}`
  - `users/{childId}/devices/default`

## Fallback Behavior

`PairingService` includes a fallback path when callable functions are unavailable (`not-found`/`unimplemented`):

- session creation can write directly to Firestore
- confirmation can validate/write directly to Firestore

This allows local development before function deployment, but production should rely on callable functions for stronger server-side validation.

## Security and Validation Notes

- Token expiry is enforced server-side (not only UI-side).
- Session is single-use (`active -> used`).
- Duplicate confirmed pairings for same parent-child are blocked.
- Auth is required for `generatePairingCode` and `confirmDevicePairing`.
- `validatePairingToken` currently does not enforce auth; protect via rules and callable access policies as needed.

## Operational Functions

- `cleanupExpiredPairings` runs hourly to mark stale active sessions as expired.
- Firestore trigger `onPairingCreated` creates/merges parent-side child relation in `users/{parentId}/children/{childId}`.
- Firestore trigger `onPairingDeleted` marks relation inactive.

## Known Constraints

- Parent screen currently uses polling for confirmation detection, not a Firestore realtime listener.
- Device ID passed during pairing generation currently reuses parent UID in UI flow.
- Parent and child role switching is app-state driven; auth user claims are not used for role enforcement.

## Developer Workflow

```bash
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions
```

For local-first development, use Firebase Emulator Suite before cloud deploy.

## Related Docs

- `APP_ARCHITECTURE.md`
- `FIREBASE_ARCHITECTURE.md`
- `QR_PAIRING_IMPLEMENTATION.md`
- `TESTING_GUIDE.md`
- `QUICK_START_DEPLOY.md`
