# Firebase Setup Architecture Diagram

## Overall Setup Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FIREBASE SETUP FOR PARENTAL CONTROL              │
└─────────────────────────────────────────────────────────────────────┘

                            ┌──────────────┐
                            │   Firebase   │
                            │   Console    │
                            └──────┬───────┘
                                   │
                ┌──────────────────┼──────────────────┐
                │                  │                  │
        ┌───────▼─────┐   ┌────────▼────────┐   ┌────▼──────────┐
        │ Auth Service │   │    Firestore    │   │ Cloud Fns     │
        │              │   │    Database     │   │               │
        │ • Email/Pass │   │                 │   │ • Pairing API │
        │ • Anonymous  │   │ • Collections   │   │ • Monitoring  │
        └────┬──────────┘   │ • Security      │   │ • Activity    │
             │              │   Rules         │   │   Logging     │
             │              └────┬────────────┘   └────┬──────────┘
             │                   │                     │
             └───────────────────┼─────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Project Credentials   │
                    │                         │
                    │ • Project ID            │
                    │ • API Key               │
                    │ • Auth Domain           │
                    │ • Storage Bucket        │
                    │ • Messaging Sender ID   │
                    │ • App ID                │
                    │ • Database URL          │
                    └───────────┬──────────────┘
                                │
                    ┌───────────▼──────────┐
                    │   .env.local File    │
                    │                      │
                    │ [EXPO_PUBLIC_*=...]  │
                    └────────┬─────────────┘
                             │
                    ┌────────▼──────────┐
                    │  App Starts       │
                    │                   │
                    │ • Reads .env.local│
                    │ • Connects to DB  │
                    │ • Auth ready      │
                    │ • Functions ready │
                    └───────────────────┘
```

---

## Development vs Production Flow

### Development Flow (with Emulator)

```
┌─────────────────┐
│   You Start     │
│   Emulator      │
│ firebase        │
│ emulators:start │
└────────┬────────┘
         │
  ┌──────▼──────────┐
  │  Emulator Suite │
  │   Starts        │
  ├──────────────────┤
  │ • Auth Server    │  Port 9099
  │ • Firestore      │  Port 8080
  │ • Functions      │  Port 5001
  │ • Realtime DB    │  Port 9000
  │ • Admin UI       │  Port 4000
  └─────┬───────────┘
        │
   ┌────▼─────┐
   │  App      │
   │  .env.local points to localhost
   │  Connects to Emulator
   │  All data local (NOT sent to cloud)
   └──────────┘
```

### Production Flow (Real Firebase)

```
┌──────────────────┐
│  Your App Binary │
│  (Release Build) │
└────────┬─────────┘
         │
   ┌─────▼─────────┐
   │  .env.local    │
   │  Production    │
   │  Credentials   │
   └─────┬─────────┘
         │
    ┌────▼─────────────────┐
    │  HTTPS Connection    │
    │  to Firebase Cloud   │
    │                      │
    │ • Cloud Firestore    │
    │ • Cloud Functions    │
    │ • Cloud Auth         │
    └──────────────────────┘
```

---

## Firestore Data Structure

```
root/
├── users/
│   ├── {parentId}/
│   │   ├── profile_data
│   │   ├── children/
│   │   │   └── {childId}/
│   │   │       └── pairing_info
│   │   ├── devices/
│   │   │   └── {deviceId}/
│   │   │       ├── device_config
│   │   │       └── pairedChildren/
│   │   │           └── {childId}
│   │   └── activities/
│   │       └── {activityId}
│   │
│   └── {childId}/
│       ├── profile_data
│       └── devices/
│           └── /default/
│               └── parentId_reference
│
├── pairingSessions/
│   └── {sessionId}/
│       ├── parentId
│       ├── token (32-char)
│       ├── status (active|used|expired)
│       └── expiresAt (5min)
│
└── devicePairings/
    └── {pairingId}/
        ├── parentId
        ├── childId
        ├── status (confirmed)
        ├── createdAt
        └── expiresAt
```

---

## Cloud Functions Deployment

```
┌─────────────────────────────────────────────┐
│    functions/src/index.ts                   │
│    (7 Cloud Functions)                      │
└──────────────┬──────────────────────────────┘
               │
        ┌──────▼────────┐
        │ npm run build │
        │ (Compile TS)  │
        └──────┬────────┘
               │
        ┌──────▼──────────┐
        │ firebase deploy │
        │ --only functions│
        └──────┬──────────┘
               │
    ┌──────────▼───────────────┐
    │  Firebase Cloud Console  │
    │                          │
    │ ✓ confirmDevicePairing   │
    │ ✓ validatePairingToken   │
    │ ✓ generatePairingCode    │
    │ ✓ logDeviceActivity      │
    │ ✓ cleanupExpiredPairings │
    │ ✓ onPairingCreated       │
    │ ✓ onPairingDeleted       │
    └──────────────────────────┘
```

---

## Security Rules Flow

```
┌─────────────────┐
│ App Requests    │
│ Firestore Data  │
└────────┬────────┘
         │
    ┌────▼─────────────────────┐
    │ Firestore Security       │
    │ Rules Engine             │
    ├────────────────────────────┤
    │ 1. Is user authenticated? │
    │ 2. Are they accessing     │
    │    their own data?        │
    │ 3. Permission check       │
    └────┬─────────────────────┘
         │
    ┌────┴───────┬─────────┐
    │            │         │
┌───▼──┐  ┌────▼───┐  ┌──▼──┐
│ALLOW │  │ DENY   │  │DENY │
│READ  │  │(other) │  │WRITE│
│WRITE │  │        │  │(app)│
└──────┘  └────────┘  └─────┘
```

---

## Setup Timeline

```
Time    Activity                    Duration
────────────────────────────────────────────
0:00 - Create Firebase Project          3 min
0:03 - Enable Services                  5 min
0:08 - Get Credentials                  3 min
0:11 - Install CLI & Tools              3 min
0:14 - Create .env.local                2 min
0:16 - Firebase Login & Init            5 min
0:21 - Deploy Functions                 5 min
0:26 - Deploy Security Rules            3 min
0:29 - Setup Emulator                   5 min
0:34 - Configure App                    3 min
0:37 - Test Pairing Flow               10 min
0:47 - Verify Firestore Data            3 min
────────────────────────────────────────────
     TOTAL                             ~45 min
```

---

## Component Connection Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                   React Native App                            │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                 UI Components                          │  │
│  │  • Add Device Screen (QR Generator)                   │  │
│  │  • Pair with Parent Screen (QR Scanner)               │  │
│  └────────────┬───────────────────────────────────────────┘  │
│               │                                               │
│  ┌────────────▼────────────────────────────────────────────┐  │
│  │          Pairing Service (SDK)                         │  │
│  │                                                         │  │
│  │  • confirmPairing()                                    │  │
│  │  • validateToken()                                     │  │
│  │  • createSession()                                     │  │
│  └────────────┬──────────────────────────────────────────┘   │
│               │                                               │
│  ┌────────────▼──────────────────────────────────────────┐   │
│  │       Firebase SDK (JS)                               │   │
│  │                                                        │   │
│  │  • Functions Client                                  │   │
│  │  • Firestore Client                                  │   │
│  │  • Auth Client                                        │   │
│  └────────────┬────────────────────────────────────────┘    │
│               │                                              │
└───────────────┼──────────────────────────────────────────────┘
                │
      ┌─────────▼────────────┐
      │ HTTPS Connection     │
      │ (or Localhost:port)  │
      └─────────┬────────────┘
                │
    ┌───────────▼──────────────────┐
    │  Firebase Cloud Services     │
    │                              │
    │  ┌──────────────────────┐   │
    │  │ Cloud Functions      │   │
    │  │ • confirmPairing()   │   │
    │  │ • etc.               │   │
    │  └──────────────────────┘   │
    │  ┌──────────────────────┐   │
    │  │ Firestore            │   │
    │  │ • Collections        │   │
    │  │ • Documents          │   │
    │  │ • Indexes            │   │
    │  └──────────────────────┘   │
    │  ┌──────────────────────┐   │
    │  │ Authentication       │   │
    │  │ • User Sessions      │   │
    │  │ • Tokens             │   │
    │  └──────────────────────┘   │
    │                              │
    └──────────────────────────────┘
```

---

## File Structure After Setup

```
ParentalControl-master/
├── .env.local                    ⬅️ YOUR VALUES HERE
├── .firebaserc                   ✓ Already created
├── firebase.json                 ✓ Already created
├── firestore.rules               ✓ Already created
├── database.rules.json           ✓ Already created
│
├── app/
│   ├── config/
│   │   └── firebase.ts           ✓ Already configured
│   ├── services/
│   │   └── pairing.service.ts    ✓ With Firebase calls
│   ├── (parent)/
│   │   └── add-device/
│   │       └── index.tsx         ✓ Uses backend
│   ├── (child)/
│   │   └── pair-with-parent.tsx  ✓ Calls backend
│   └── _components/
│       ├── QRCodeDisplay.tsx     ✓ Displays QR
│       └── QRScanner.tsx         ✓ Scans QR
│
├── functions/
│   ├── package.json              ✓ Dependencies ready
│   ├── tsconfig.json             ✓ TypeScript config
│   └── src/
│       └── index.ts              ✓ 7 Cloud Functions
│
├── FIREBASE_SETUP_COMPLETE.md    ⬅️ MAIN GUIDE
├── FIREBASE_SETUP_CHECKLIST.md   ⬅️ QUICK CHECK
├── TESTING_GUIDE.md              ⬅️ Test procedures
└── QUICK_START_DEPLOY.md         ⬅️ Deploy guide
```

---

## Support Decision Tree

```
                    Having Issues?
                          │
                ┌─────────┼─────────┐
                │         │         │
        ┌───────▼──┐ ┌────▼────┐ ┌─▼────────┐
        │ Firebase │ │  Local  │ │   App    │
        │ Console  │ │Emulator │ │ Issues   │
        │ Issues   │ │ Issues  │ │          │
        └─────┬────┘ └────┬────┘ └─┬────────┘
              │           │        │
              │           │    ┌───▼──────────┐
              │           │    │ Check:       │
              │           │    │ • .env.local │
              │           │    │ • npm start  │
              │           │    └──────────────┘
              │           │
         ┌────▼─────┬─────▼────┐
         │           │          │
    ┌────▼──┐   ┌───▼───┐  ┌──▼──────┐
    │Project │   │Emulator  │  │ Read   │
    │ ID OK? │   │ Port OK? │  │Logs:   │
    └────────┘   └─────────┘  │firebase│
                               │functions:log│
                               └────────┘
```

---

## Quick Reference - Port Numbers

| Service            | Port     | URL                       |
| ------------------ | -------- | ------------------------- |
| Firestore Emulator | 8080     | http://localhost:8080     |
| Functions Emulator | 5001     | http://localhost:5001     |
| Auth Emulator      | 9099     | http://localhost:9099     |
| Realtime DB        | 9000     | http://localhost:9000     |
| **Emulator UI**    | **4000** | **http://localhost:4000** |

---

**Use these diagrams to understand the overall architecture!**
