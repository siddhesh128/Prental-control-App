# Parental Control App Architecture

This document describes how the app is wired end to end: authentication, pairing, child background sync, and parent-facing views.

## High-level flow

```mermaid
flowchart TD
  A[Parent/Child App Launch] --> B[Firebase Auth]
  B --> C{User Role}
  C -->|Parent| P1[Parent Dashboard]
  C -->|Child| C1[Child Dashboard]

  P1 --> P2[Generate QR Pairing Code]
  P2 --> P3[Cloud Function / Firestore Pairing Session]
  P3 --> P4[Child Scans QR]

  C1 --> C2[Child Background Monitor Starts]
  C2 --> C3[Read Usage Stats / Location / Battery / SMS / Call Logs]
  C3 --> C4[Sync to Firebase Realtime Database]

  P4 --> C5[Validate Token]
  C5 --> C6[Confirm Pairing]
  C6 --> C7[Write devicePairings + user links]

  C7 --> P5[Parent Screens Subscribe to Child Data]
  C4 --> P5

  P5 --> L1[Location Tracking]
  P5 --> M1[Messages Screen]
  P5 --> K1[Call Logs Screen]
  P5 --> S1[Screen Time / Device Health]

  P5 --> DB[(Firestore + Realtime DB)]
  C4 --> DB
  C7 --> DB
```

## What each layer does

- React Native and Expo Router handle UI and navigation.
- Firebase Auth identifies the signed-in parent or child.
- Firestore stores pairing metadata and relationship documents.
- Realtime Database stores fast-changing device telemetry and history.
- Native Android code collects system data that React Native cannot read directly.
- Parent screens render live subscriptions from the child device records.

## Runtime responsibilities

- Parent app:
  - Creates pairing sessions.
  - Reads live child data.
  - Shows location, messages, call logs, and device status.
- Child app:
  - Starts the background monitor when paired.
  - Collects usage, location, battery, SMS, and call data.
  - Syncs records to Firebase on a timer.
- Backend:
  - Validates QR pairing tokens.
  - Writes pairing relationships.
  - Enforces auth and database rules.

## Important data paths

- Firestore:
  - `pairingSessions`
  - `devicePairings`
  - `users/{userId}/children`
  - `users/{userId}/devices`
- Realtime Database:
  - `devices/{uid}`
  - `locations/{uid}`
  - `screenTime/{uid}`
  - `callHistory/{uid}`
  - `messageHistory/{uid}`

## Notes for developers

- The map screen on Android uses Google Maps SDK, so it needs an API key in the native manifest.
- Realtime Database queries that use `orderByChild('timestamp')` need `.indexOn` rules for performance.
- Native module changes require a rebuild, not just a reload.
- If the parent screen is empty, check both the pairing record and the child sync pipeline.
