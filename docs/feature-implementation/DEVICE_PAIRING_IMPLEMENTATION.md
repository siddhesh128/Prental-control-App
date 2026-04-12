# Device Pairing Implementation

## Purpose

Describes how parent-child device linking is implemented with QR + Firebase.

## Primary source files

- `app/(parent)/add-device/index.tsx`
- `app/(child)/pair-with-parent.tsx`
- `app/services/pairing.service.ts`
- `app/_components/QRCodeDisplay.tsx`
- `app/_components/QRScanner.tsx`
- `functions/src/index.ts`

## End-to-end flow

1. Parent screen calls `PairingService.createPairingSession`.
2. Callable function `generatePairingCode` creates `pairingSessions` document with 5-minute expiry.
3. Parent renders QR payload and starts confirmation polling by token.
4. Child scans QR, decodes payload, performs local expiry check, and confirms.
5. Callable function `confirmDevicePairing` validates token/session and creates `devicePairings`.
6. Function updates relationship docs under parent and child user trees.
7. Parent detects confirmed pairing and navigates to Devices.

## Backend contract

### Callable: `generatePairingCode`

Input:

- `parentId`
- `parentDeviceId`

Output:

- `token`
- `expiresAt`
- `qrData` (JSON string)

### Callable: `confirmDevicePairing`

Input:

- `childId`
- `parentId`
- `token`
- `childDeviceName`

Output:

- pairing summary object with `status: confirmed`

## Data model

- `pairingSessions/{sessionId}`: temporary session (`active`, `used`, `expired`)
- `devicePairings/{pairingId}`: confirmed relationship
- `users/{parentId}/devices/{parentDeviceId}/pairedChildren/{childId}`
- `users/{childId}/devices/default`

## Fallback behavior

When callable functions are unavailable (`not-found`/`unimplemented`), the service falls back to direct Firestore writes/queries for create + confirm flows. This is useful in local development but cloud functions should be the primary production path.

## Current state

- Implemented and integrated in parent and child UIs.
- Includes expiry cleanup (`cleanupExpiredPairings`) and relationship triggers.
- Confirmation check on parent side is polling-based, not realtime listener based.
