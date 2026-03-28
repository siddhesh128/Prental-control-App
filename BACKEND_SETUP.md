# Backend Setup & Deployment Guide

## Overview

ThunderControl uses Firebase for backend services:

- **Firestore**: Real-time database for storing pairings, user relationships, and activity logs
- **Cloud Functions**: Serverless APIs for pairing, monitoring, and communication
- **Firebase Auth**: User authentication and authorization
- **Cloud Storage**: Device logs and media files (future)

## Prerequisites

1. **Node.js 20+** - Install from https://nodejs.org
2. **Firebase CLI** - Install globally: `npm install -g firebase-tools`
3. **Firebase Project** - Create one at https://console.firebase.google.com
4. **Google Cloud Project** - Associated with your Firebase project

## Local Development Setup

### 1. Install Dependencies

```bash
# From project root
npm install

# Install functions dependencies
cd functions
npm install
cd ..
```

### 2. Firebase Emulator Setup

The Firebase Emulator lets you test Cloud Functions locally without deploying.

```bash
# Install emulator suite
firebase init emulators

# Choose these emulators when prompted:
# - Firestore
# - Functions
# - Authentication (optional)
# - Realtime Database (optional)
```

### 3. Start Emulator

```bash
# From project root
firebase emulators:start
```

The emulator displays URLs for accessing each service:

- Firestore: http://127.0.0.1:4000
- Functions: http://127.0.0.1:5001 (accessed via SDK)
- Auth: Integrated with Functions emulator

### 4. Configure App for Local Development

Update `app/config/firebase.ts` to use emulators when developing:

```typescript
import { connectFunctionsEmulator } from 'firebase/functions';
import { connectFirestoreEmulator } from 'firebase/firestore';

// In your initializeApp section:
if (__DEV__) {
  try {
    connectFunctionsEmulator(functions, 'localhost', 5001);
    connectFirestoreEmulator(firestore, 'localhost', 8080);
  } catch (e) {
    // Emulator already connected - ignore
  }
}
```

## Cloud Functions Overview

### Available Functions

#### 1. `confirmDevicePairing(data, context)` - Callable

**Purpose**: Confirm device pairing after QR code is scanned

**Request**:

```typescript
{
  childId: string; // Child device user ID
  parentId: string; // Parent device user ID
  token: string; // 32-char token from QR code
  childDeviceName: string; // Device name (e.g., "Samsung Galaxy A12")
}
```

**Response**:

```typescript
{
  id: string; // Pairing document ID
  parentId: string;
  childId: string;
  childDeviceName: string;
  status: 'confirmed';
  confirmedAt: number; // Unix timestamp
}
```

**Error Cases**:

- `unauthenticated`: User not logged in
- `invalid-argument`: Missing or invalid parameters
- `not-found`: Pairing token not found or already used
- `deadline-exceeded`: Token has expired (>5 minutes)
- `already-exists`: Child is already paired with this parent

#### 2. `validatePairingToken(data, context)` - Callable

**Purpose**: Validate token during QR scanning (real-time feedback)

**Request**:

```typescript
{
  token: string; // Token to validate
  parentId: string; // Parent ID
}
```

**Response**:

```typescript
{
  valid: boolean; // Token still valid
  timeRemaining: number; // Seconds until expiry
  message: string; // Human-readable message
}
```

**Use Case**: Called periodically during scanning to show countdown

#### 3. `generatePairingCode(data, context)` - Callable

**Purpose**: Generate new pairing code for parent device

**Request**:

```typescript
{
  parentId: string;
  parentDeviceId: string;
}
```

**Response**:

```typescript
{
  token: string; // 32-char alphanumeric token
  expiresAt: number; // Unix millisecond timestamp
  qrData: string; // JSON-encoded QR data
}
```

#### 4. `cleanupExpiredPairings()` - Scheduled

**Purpose**: Auto-cleanup expired pairing sessions (runs hourly)

**Trigger**: Pub/Sub schedule - Every 1 hour

**Action**: Marks expired sessions as 'expired' in Firestore

#### 5. `logDeviceActivity(data, context)` - Callable

**Purpose**: Log child device activities (app launches, website visits, etc)

**Request**:

```typescript
{
  childId: string;
  activity: {
    type: 'app_launch' | 'website_visit' | 'screen_time';
    appName?: string;
    url?: string;
    duration?: number;
    timestamp?: number;
  };
}
```

#### 6. `onPairingCreated` - Firestore Trigger

**Purpose**: Auto-initialize parent-child relationship when pairing is created

**Trigger**: Document create in `devicePairings` collection

**Action**:

- Creates child document in parent's `children` subcollection
- Sets initial relationship status to 'active'

#### 7. `onPairingDeleted` - Firestore Trigger

**Purpose**: Clean up relationships when pairing is deleted

**Trigger**: Document delete in `devicePairings` collection

**Action**:

- Marks child as 'inactive' in parent's children subcollection
- Records unpair timestamp

## Firestore Database Schema

### Collection: `pairingSessions`

Temporary pairing sessions created by parent devices.

```
/pairingSessions/{sessionId}
├── parentId: string
├── parentDeviceId: string
├── token: string (32 chars, A-Z0-9)
├── status: 'active' | 'used' | 'expired'
├── createdAt: Timestamp
├── expiresAt: Timestamp (5 minutes from creation)
└── usedAt?: Timestamp (when confirmed)
```

**Indexes**:

- `token` + `parentId` + `status` (query for validation)

### Collection: `devicePairings`

Confirmed parent-child device relationships.

```
/devicePairings/{pairingId}
├── parentId: string
├── childId: string
├── childDeviceName: string
├── token: string
├── status: 'confirmed' | 'rejected' | 'inactive'
├── createdAt: Timestamp
├── confirmedAt: Timestamp
├── expiresAt: Timestamp
└── rejectedAt?: Timestamp
```

**Indexes**:

- `parentId` + `status` (list parent's pairings)
- `childId` + `status` (get child's parent)
- `token` (lookup by token)

### Collection: `users/{userId}/children`

Parent's view of paired children.

```
/users/{parentId}/children/{childId}
├── childId: string
├── pairingId: string
├── pairedAt: Timestamp
└── status: 'active' | 'inactive'
```

### Collection: `users/{userId}/devices/{deviceId}`

Device information and configurations.

```
/users/{userId}/devices/{deviceId}
├── pairedParentId?: string (for child devices)
├── pairedParentDeviceId?: string
├── pairingId: string
├── pairedAt?: Timestamp
├── deviceType: 'iOS' | 'Android' | 'Web'
├── modelName: string
├── osVersion: string
└── lastUpdated: Timestamp
```

### Collection: `users/{userId}/activities`

Activity logs for child devices.

```
/users/{childId}/activities/{activityId}
├── type: 'app_launch' | 'website_visit' | 'screen_time'
├── appName?: string
├── packageName?: string
├── url?: string
├── duration?: number
├── timestamp: Timestamp
└── metadata?: object
```

## Security Rules

### Firestore Rules

```typescript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Default deny all
    match /{document=**} {
      allow read, write: if false;
    }

    // Users can read their own data
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;

      // Children subcollection
      match /children/{childId} {
        allow read: if request.auth.uid == userId;
        allow write: if request.auth.uid == userId;
      }

      // Devices subcollection
      match /devices/{deviceId} {
        allow read, write: if request.auth.uid == userId;

        match /pairedChildren/{childId} {
          allow read, write: if request.auth.uid == userId;
        }
      }

      // Activities subcollection
      match /activities/{activityId} {
        allow read: if request.auth.uid == userId;
        allow write: if request.auth.uid == userId;
      }
    }

    // Pairing sessions - only created by functions
    match /pairingSessions/{sessionId} {
      allow read: if request.auth.uid != null;
    }

    // Device pairings - managed by functions
    match /devicePairings/{pairingId} {
      allow read: if request.auth.uid != null;
    }
  }
}
```

## Deployment

### 1. Deploy Functions to Production

```bash
# Compile TypeScript
cd functions
npm run build
cd ..

# Deploy all functions
firebase deploy --only functions

# Or deploy specific function
firebase deploy --only functions:confirmDevicePairing
```

### 2. View Logs

```bash
# Stream live logs
firebase functions:log

# View specific function logs
firebase functions:log --function confirmDevicePairing
```

### 3. Monitor Performance

Use Firebase Console:

1. Go to Functions in Firebase Console
2. View execution metrics, latency, error rates
3. Set up alerts for unusual activity

## Environment Variables (`.env.local`)

Create a `.env.local` file for sensitive configuration:

```
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```

## Troubleshooting

### Functions Not Running Locally

```bash
# Clear emulator data
firebase emulators:start --clear

# Check emulator logs
firebase emulators:start --only functions
# Look for errors in console
```

### Token Expiration Issues

- Ensure system clock is synced (affects timestamp comparison)
- Check Firestore timestamp format (should be ISO 8601)
- In emulator, timestamps use local system time

### Pairing Confirmation Fails

1. Verify token format: `^[A-Z0-9]{32}$`
2. Check if pairing session exists
3. Confirm parent/child IDs match
4. Verify authentication token is valid
5. Check Firestore security rules

### Database Queries Slow

- Add proper indexes (Firestore suggests automatically)
- Use compound indexes for multi-field queries
- Limit result set size (use `.limit()`)
- Use pagination for large datasets

## Testing

### Test with Emulator

```typescript
import { connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import { connectFirestoreEmulator, collection, addDoc } from 'firebase/firestore';

// In your test setup:
connectFunctionsEmulator(functions, 'localhost', 5001);
connectFirestoreEmulator(firestore, 'localhost', 8080);

// Call function
const confirmPairing = httpsCallable(functions, 'confirmDevicePairing');
try {
  const result = await confirmPairing({
    childId: 'test-child-id',
    parentId: 'test-parent-id',
    token: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ012345',
    childDeviceName: 'Test Device',
  });
  console.log('Success:', result.data);
} catch (error) {
  console.error('Error:', error.message);
}
```

### Manual Testing in Emulator UI

1. Go to http://127.0.0.1:4000 (Firestore Emulator UI)
2. Add test documents to verify structure
3. Call functions via Firebase CLI shell:
   ```bash
   firebase functions:shell
   > confirmDevicePairing({
   >   childId: 'child123',
   >   parentId: 'parent456',
   >   token: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ012345',
   >   childDeviceName: 'Test Device'
   > })
   ```

## Next Steps

1. ✅ Deploy functions to production
2. ✅ Create Firestore indexes via Console
3. ✅ Set up monitoring and alerts
4. ✅ Test end-to-end pairing flow with real devices
5. ✅ Implement activity logging for child devices
6. ✅ Add approval workflow (if needed)
7. ✅ Implement device restrictions management
8. ✅ Add communication services

## References

- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Cloud Functions Pricing](https://firebase.google.com/pricing)
