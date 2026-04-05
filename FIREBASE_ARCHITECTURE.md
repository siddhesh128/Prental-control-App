# Firebase Architecture

This doc is the developer reference for Firebase in this app. For a complete system view, read [APP_ARCHITECTURE.md](APP_ARCHITECTURE.md).

## What Firebase does here

- Firebase Auth handles sign-in and user identity.
- Firestore stores pairing sessions and parent-child relationships.
- Realtime Database stores live device state and telemetry.
- Cloud Functions validate pairing tokens and manage backend workflows.

## Development vs production

- In development, the app can talk to local emulators.
- In production, the app talks to Firebase Cloud services.
- The code path is the same; only the backend target changes.

## Data model snapshot

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

## Developer notes

- Add `.indexOn` for any query that uses `orderByChild()`.
- Deploy database rules after changing indexes.
- Native Android changes require a full rebuild.
- If a screen is empty, confirm the pairing record first, then confirm the child sync writer.
