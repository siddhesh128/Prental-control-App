# Child Background Monitoring Implementation

## Purpose

Describes how child device telemetry is collected and synced to Realtime Database.

## Primary source files

- `app/(child)/_layout.tsx`
- `app/(child)/dashboard.tsx`
- `app/services/child-background-monitor.service.ts`

## Lifecycle wiring

1. Child layout checks authenticated user and `isChild` flag.
2. When active child session is detected, it calls `childBackgroundMonitorService.start(uid)`.
3. On unmount or role/user change, it calls `stop()`.

## Sync cadence

- Foreground sync interval: 15 seconds.
- Background sync interval: 60 seconds.
- App state changes trigger immediate sync and heartbeat update.

## Data collected

- Device status:
  - battery level
  - storage used
  - app state
  - online heartbeat timestamp
- Screen-time usage map (Android via native UsageStats module)
- Call logs (Android via native module)
- SMS/message logs (Android via native module)
- Location points (foreground/last-known fallback)

## Database writes

- `devices/{uid}`: heartbeat + health + summary stats
- `screenTime/{uid}`: sanitized app usage map
- `callHistory/{uid}/{recordId}`
- `messageHistory/{uid}/{recordId}`
- `locations/{uid}`: pushed location history entries

## Platform behavior

- Android path uses native modules for usage/calls/messages.
- Non-Android path keeps limited fallback updates for screen time.
- Permission requests include location and Android communication permissions.

## Current state

- Core child telemetry pipeline is implemented and actively used by parent screens.
- Quality depends on granted runtime permissions and native module availability.
- Data volume controls exist (e.g., last 100 logs for calls/messages per sync batch).
