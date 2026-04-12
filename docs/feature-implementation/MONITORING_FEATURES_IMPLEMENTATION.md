# Monitoring Features Implementation

## Purpose

This document covers the feature-wise monitoring flow for the app: screen time, location tracking, call logs, messages, and reports. It is intended as the source-of-truth guide for the parent-facing monitoring UI and the child-device sync pipeline.

## Feature Map

| Feature     | Parent UI                                                                         | Child sync source                                  | Database path                                   | Platform notes                                                     |
| ----------- | --------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------ |
| Screen time | `app/screens/parent/ScreenTimeScreen.tsx`, `app/(parent)/reports/index.tsx`       | `app/services/child-background-monitor.service.ts` | `screenTime/{uid}` and `devices/{uid}`          | Android uses native UsageStats; non-Android has a limited fallback |
| Location    | `app/screens/parent/LocationTrackingScreen.tsx`, `app/(parent)/reports/index.tsx` | `app/services/child-background-monitor.service.ts` | `locations/{uid}`                               | Uses Expo Location; Android also requests background location      |
| Call logs   | `app/(parent)/call-logs/index.tsx`, `app/screens/parent/CommunicationScreen.tsx`  | `app/services/child-background-monitor.service.ts` | `callHistory/{uid}/{recordId}`                  | Android-only native call log access                                |
| Messages    | `app/(parent)/messages/index.tsx`, `app/screens/parent/CommunicationScreen.tsx`   | `app/services/child-background-monitor.service.ts` | `messageHistory/{uid}/{recordId}`               | Android-only SMS access                                            |
| Reports     | `app/(parent)/reports/index.tsx`, `app/screens/parent/MonitoringReportScreen.tsx` | Aggregates data from the paths above               | Realtime Database reads across monitoring nodes | Exports text summaries for sharing                                 |

## Shared Data Flow

1. The child app starts the background monitor when a child session is active.
2. The monitor requests runtime permissions for communication and location access.
3. The monitor performs periodic syncs on a timer and also resyncs when app state changes.
4. Each sync updates device health, usage metrics, call logs, message logs, and current location.
5. Parent screens read the synced data from Realtime Database and render filtered views.

## Screen Time

### Child-side collection

- Implemented in `app/services/child-background-monitor.service.ts`.
- Android reads daily usage from the native `UsageStatsModule`.
- The service sanitizes package names before writing them to Realtime Database.
- It writes app-level usage to `screenTime/{uid}` and summary values to `devices/{uid}`.
- Key summary fields include `screenTimeToday`, `appsUsedToday`, and `usageLastUpdated`.

### Parent-side consumption

- `app/screens/parent/ScreenTimeScreen.tsx` loads usage data for one device and shows per-app limits.
- Parents can update a total daily limit and app-specific limits.
- The screen currently computes progress from the stored `duration` and `dailyLimit` values.
- `app/(parent)/reports/index.tsx` also uses the screen-time data to generate an activity report.

### Current state

- Android usage tracking is implemented and written to Firebase.
- Non-Android screen-time handling is a fallback and does not provide the same app-level fidelity.
- Enforcement exists in `MonitoringService.checkAndEnforceScreenTimeLimits`, but it depends on the stored usage data and current device lock state.

## Location Tracking

### Child-side collection

- Implemented in `app/services/child-background-monitor.service.ts`.
- The service requests foreground location permission on all platforms and background permission on Android.
- It first tries `getCurrentPositionAsync`, then falls back to `getLastKnownPositionAsync`.
- Location updates are written as points under `locations/{uid}` with latitude, longitude, and timestamp.

### Parent-side consumption

- `app/screens/parent/LocationTrackingScreen.tsx` subscribes to the latest location and renders a map marker.
- The screen requests location permission before subscribing to updates.
- `app/(parent)/reports/index.tsx` and `app/screens/parent/MonitoringReportScreen.tsx` include location data in exported summaries.

### Current state

- Live location sync is implemented for child devices.
- The parent map view only renders the latest known point, not a full route history.
- Historical location data is still available in the database and can be used by report screens.

## Call Logs

### Child-side collection

- Implemented in `app/services/child-background-monitor.service.ts`.
- Android requests `READ_CALL_LOG`, `READ_CONTACTS`, and `READ_SMS` as part of the monitoring permission set.
- The monitor reads call records from the native call log module when available.
- It stores up to the most recent 100 call records per sync batch in `callHistory/{uid}/{recordId}`.
- Each record keeps `id`, `phoneNumber`, `callType`, `duration`, `timestamp`, and optional `contactName`.

### Parent-side consumption

- `app/(parent)/call-logs/index.tsx` shows a consolidated call log across paired child devices.
- `app/screens/parent/CommunicationScreen.tsx` provides a device-focused calls tab with a 24h, 7d, and 30d filter.
- Both screens rely on `CommunicationService.getCallHistory` and realtime subscriptions.

### Current state

- Call logs are Android-only in the current implementation.
- The UI supports filtering by call type and time window.
- The parent view reads from the synced Firebase records rather than the device directly.

## Messages

### Child-side collection

- Implemented in `app/services/child-background-monitor.service.ts`.
- Android requests SMS permission and reads logs from the native `SmsLogsModule`.
- The monitor stores up to the most recent 100 SMS records per sync batch in `messageHistory/{uid}/{recordId}`.
- Each record keeps `id`, `phoneNumber`, `messageType`, `messagePreview`, `timestamp`, and optional `contactName`.

### Parent-side consumption

- `app/(parent)/messages/index.tsx` shows a merged message feed across paired child devices.
- `app/screens/parent/CommunicationScreen.tsx` provides a device-specific messages tab with time filtering.
- The UI currently supports sent, received, and blocked filters.

### Current state

- Message collection is Android-only in the current implementation.
- The parent UI renders message previews only; full message bodies are not shown in the current flow.
- Blocking in the messages UI is currently local UI state and not wired to a server-side enforcement path.

## Reports

### Parent reports screen

- `app/(parent)/reports/index.tsx` exposes four report types: activity, location, communication, and safety.
- It aggregates data from the monitoring services and shares a formatted text report.

### Monitoring report screen

- `app/screens/parent/MonitoringReportScreen.tsx` renders per-device summary cards.
- The report includes screen time, battery level, last seen, and location when available.
- It can export a plain-text report to web download, iOS share sheet, or the native Android share flow.

### Current state

- The reporting layer is implemented as a read-only summary surface.
- It does not create new telemetry; it reuses the synced monitoring data.

## Supporting Services

- `app/services/communication.service.ts` handles Firebase reads, writes, subscriptions, and deletes for call and message history.
- `app/services/monitoring.service.ts` contains device stat helpers, screen-time limit writes, and enforcement logic.
- `app/store/monitoring.slice.ts` keeps local monitoring state for location history, call logs, messages, and safe zones.

## Permissions and Platform Dependencies

- Android permissions include call log, contacts, SMS, and location access.
- iOS support exists for location permission and general UI flow, but communication history collection is Android-only.
- The child background monitor depends on native modules for usage stats, calls, and SMS, so those features require the Android native build path.

## Current State Summary

- Screen time, location, call logs, messages, and reports are all wired into the app.
- Android provides the full data collection path for communication and usage features.
- Parent-facing screens are mostly read-oriented, with limit editing available for screen time.
- The main remaining gap is end-to-end enforcement for message blocking and broader policy actions beyond data display.
