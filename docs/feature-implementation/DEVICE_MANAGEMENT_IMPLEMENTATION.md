# Device Management Implementation

## Purpose

Covers how parent views linked child devices, live status, and unpair/remove actions.

## Primary source files

- `app/(parent)/devices/index.tsx`
- `app/(parent)/devices/[id]/...`
- `app/services/pairing.service.ts`
- `app/services/device-management.service.ts`

## Data sources

### Cloud-backed paired devices (primary)

- Parent UI calls `PairingService.getParentPairings(parentUid)`.
- Each pairing is converted into a visible device card.
- Live device status is subscribed from `devices/{childId}` in Realtime Database.

### Local fallback devices

- If no authenticated Firebase user, it falls back to `DeviceManagementService` local AsyncStorage list.

## Device list behavior

- Shows online/offline status based on heartbeat staleness window.
- Shows battery percentage from child telemetry.
- Displays relative last-seen text.
- Supports navigation to device detail page.

## Device actions

- Remove/unpair in authenticated flow: `PairingService.unpairDevice(pairingId)` (deletes `devicePairings` doc).
- Remove in local fallback flow: `DeviceManagementService.removeDevice(deviceId)`.

## Current state

- Pairing-backed device list is implemented and live-updating.
- Local device management service remains as fallback/mock path for non-auth/dev use.
- Restriction action entry points exist, but backend enforcement of restrictions is separate.
