# Complete Firebase Setup Guide for ThunderControl

## Overview

This guide walks you through setting up Firebase from scratch for the ThunderControl app. You'll configure authentication, Firestore/Realtime Database, Cloud Functions, and the emulator.

**Estimated Time**: 20-30 minutes

## Part 1: Create Firebase Project

### Step 1.1: Go to Firebase Console

1. Visit https://console.firebase.google.com
2. Click **"Add project"** button
3. Enter project name: `ThunderControl` (or your choice)
4. Choose region: Select closest to your location
5. Click **"Create project"**

Wait 2-3 minutes for project to be created.

### Step 1.2: Enable Analytics (Optional)

When prompted:

- Choose **"Enable Google Analytics for this project"** (optional but helpful)
- Select/create Analytics account
- Click **"Create project"**

Your project is now ready! 🎉

---

## Part 2: Set Up Firebase Services

### Step 2.1: Enable Authentication

1. In Firebase Console, click **"Authentication"** in left menu
2. Click **"Get started"** tab
3. Click **"Email/Password"** provider
4. Toggle **"Enable"** to ON
5. Click **"Save"**

**Enable Anonymous Auth (Optional but recommended for testing)**:

1. Click **"Anonymous"** provider
2. Toggle **"Enable"** to ON
3. Click **"Save"**

### Step 2.2: Enable Firestore Database

1. Click **"Firestore Database"** in left menu
2. Click **"Create database"** button
3. Choose region: **Same as project** ✓
4. Choose security rules mode: **"Start in test mode"** (for development)
   - This allows any authenticated user to read/write
   - We'll lock it down later
5. Click **"Create"**

Wait for database to initialize (1-2 minutes).

### Step 2.3: Enable Realtime Database

1. Click **"Realtime Database"** in left menu
2. Click **"Create database"** button
3. Choose location: **Same region** ✓
4. Choose rules: **"Start in test mode"** ✓
5. Click **"Create"**

### Step 2.4: Enable Cloud Functions

1. Click **"Functions"** in left menu
2. Click **"Get started"** button
3. Select plan: **"Pay as you go"** (Blaze plan - required for Cloud Functions)
   - Free tier includes usage
   - Only pay for what you use
4. Click **"Enable API and create function"**

If prompted about billing, this is normal - functions aren't free but have a generous free tier.

---

## Part 3: Get Project Credentials

### Step 3.1: Get Web API Key

1. Go to **"Project settings"** (click gear icon ⚙️ at top)
2. Copy these values:
   - **Project ID**
   - **API Key** (in "Your apps" section or scroll down for Web API Key)
   - **Auth Domain**: `[PROJECT-ID].firebaseapp.com`
   - **Storage Bucket**: `[PROJECT-ID].appspot.com`
   - **Messaging Sender ID**

### Step 3.2: Get Service Account Key

1. In **Project Settings**, go to **"Service accounts"** tab
2. Click **"Generate new private key"** button
3. A JSON file downloads - **KEEP THIS SAFE**
4. Copy to somewhere secure for later

### Step 3.3: Get Database URLs

For Firestore:

- Already available once DB created

For Realtime Database:

1. Go to **"Realtime Database"**
2. Copy the **Database URL** (looks like: `https://your-project.firebaseio.com`)

---

## Part 4: Install Firebase CLI & Dependencies

### Step 4.1: Install Firebase CLI Globally

```bash
npm install -g firebase-tools
```

Verify installation:

```bash
firebase --version
```

### Step 4.2: Install Project Dependencies

```bash
# From project root
npm install

# Install functions dependencies
cd functions
npm install
cd ..
```

### Step 4.3: Login to Firebase

```bash
firebase login
```

Browser will open. Click "Allow" to grant permissions. You should see success message.

---

## Part 5: Configure Environment Variables

### Step 5.1: Create `.env.local` file

Create a new file: `.env.local` in project root with your credentials:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY_HERE
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT_ID.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT_ID.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
EXPO_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=YOUR_MEASUREMENT_ID
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://YOUR_PROJECT_ID.firebaseio.com
```

**Where to find each value:**

1. Go to Firebase Console → Project Settings ⚙️
2. Under "Your apps" section, look for the web app configuration
3. If no web app exists:
   - Click **"Add app"** → **"Web"**
   - Register app
   - Copy values from the config

**Example filled out:**

```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyDl5v_qQ8z7RxT9pKmL3OvW1YuZ4xAb5Cd
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=thundercontrol-p1a2b.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=thundercontrol-p1a2b
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=thundercontrol-p1a2b.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcd1234efgh5678ijkl
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-ABC123DEFG
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://thundercontrol-p1a2b.firebaseio.com
```

### Step 5.2: Create `.env` file (for Cloud Functions)

Create `.env` in `functions/` directory:

```env
FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
FIREBASE_AUTH_DOMAIN=YOUR_PROJECT_ID.firebaseapp.com
```

---

## Part 6: Initialize Firebase in Project

### Step 6.1: Create `firebase.json` Config File

```bash
firebase init
```

When prompted:

```
Do you want to use ESLint? → No
Which Firebase features? → Choose:
  ✓ Functions
  ✓ Firestore
  ✓ Emulators
  [SPACE to toggle, A to all, I to invert selection]

Do you want the default Experience? → Yes
```

### Step 6.2: Verify Files Created

Check that these files now exist:

- ✅ `firebase.json` - Firebase configuration
- ✅ `firestore.rules` - Firestore security rules
- ✅ `.firebaserc` - Project mapping

---

## Part 7: Set Up Firestore Security Rules

### Step 7.1: Update `firestore.rules` File

Replace contents with:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Default: deny all
    match /{document=**} {
      allow read, write: if false;
    }

    // Users collection - each user can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;

      // Children subcollection
      match /children/{childId} {
        allow read, write: if request.auth.uid == userId;
      }

      // Devices subcollection
      match /devices/{deviceId} {
        allow read, write: if request.auth.uid == userId;

        // Paired children subcollection
        match /pairedChildren/{childId} {
          allow read, write: if request.auth.uid == userId;
        }
      }

      // Activities subcollection
      match /activities/{activityId} {
        allow read, write: if request.auth.uid == userId;
      }
    }

    // Pairing sessions - accessible to authenticated users
    match /pairingSessions/{sessionId} {
      allow read: if request.auth.uid != null;
      allow write: if false; // Only functions can write
    }

    // Device pairings - accessible to authenticated users
    match /devicePairings/{pairingId} {
      allow read: if request.auth.uid != null;
      allow write: if false; // Only functions can write
    }
  }
}
```

### Step 7.2: Deploy Rules

```bash
firebase deploy --only firestore:rules
```

---

## Part 8: Deploy Cloud Functions

### Step 8.1: Build Functions

```bash
cd functions
npm run build
cd ..
```

### Step 8.2: Deploy

```bash
firebase deploy --only functions
```

**Expected output:**

```
✓ confirmDevicePairing deployed
✓ validatePairingToken deployed
✓ generatePairingCode deployed
✓ logDeviceActivity deployed
✓ cleanupExpiredPairings deployed
✓ onPairingCreated deployed
✓ onPairingDeleted deployed
```

Wait 2-5 minutes for deployment.

### Step 8.3: Verify Deployment

```bash
firebase functions:log
```

You should see no errors (or only info logs).

---

## Part 9: Set Up Firebase Emulator (For Local Development)

### Step 9.1: Install Emulator

```bash
firebase emulators:start
```

**First time will prompt to download emulator binaries** - this is normal, takes 5-10 minutes.

### Step 9.2: Configure App to Use Emulator (Development Only)

Update `app/config/firebase.ts`:

```typescript
import { connectFunctionsEmulator } from 'firebase/functions';
import { connectFirestoreEmulator } from 'firebase/firestore';

// After initializing app:

// Connect to emulators in development
if (__DEV__) {
  try {
    connectFunctionsEmulator(functions, 'localhost', 5001);
    connectFirestoreEmulator(firestore, 'localhost', 8080);
  } catch (e) {
    // Already connected, ignore error
  }
}

// Make sure to initialize functions:
export const functions = getFunctions(app);
export const firestore = getFirestore(app);
```

### Step 9.3: Start Emulator

```bash
firebase emulators:start
```

**Expected output:**

```
✓ Firestore Emulator running on http://127.0.0.1:8080
✓ Functions Emulator running on http://127.0.0.1:5001
✓ Auth Emulator running on http://127.0.0.1:9099
```

Keep this running in a terminal. **Open another terminal for the app.**

### Step 9.4: Access Emulator UI (Optional)

Visit: http://127.0.0.1:4000

This shows:

- Firestore data
- Auth users
- Function logs
- All emulator status

---

## Part 10: Test Everything

### Step 10.1: Start App

In a new terminal:

```bash
npx expo start
```

Press `i` for iOS or `a` for Android.

### Step 10.2: Create Test Accounts

1. Open app in simulator
2. Go to Register
3. Create parent account: `parent@test.com` / `test123456`
4. Create child account: `child@test.com` / `test123456`

### Step 10.3: Test Pairing Flow

1. Parent: Login → "Add Device" → See QR code
2. Child: Login → "Pair with Parent" → Scan QR
3. Should see success message

### Step 10.4: Verify Firestore

1. Open http://127.0.0.1:4000
2. Check collections:
   - ✅ `pairingSessions` (status: used)
   - ✅ `devicePairings` (status: confirmed)
   - ✅ `users/{userId}/children` (relationship created)
   - ✅ `users/{userId}/devices` (pairing info saved)

---

## Part 11: Deploy to Production

### Step 11.1: Create Release Build

For Android:

```bash
eas build --platform android --release
```

For iOS:

```bash
eas build --platform ios --release
```

### Step 11.2: Verify Production Config

Ensure `.env.local` has production values (not emulator):

```env
# Production - NOT localhost
EXPO_PUBLIC_FIREBASE_API_KEY=your_production_key_here
# ... rest of values
```

### Step 11.3: Deploy Everything

```bash
firebase deploy
```

This deploys:

- ✓ Functions
- ✓ Firestore rules
- ✓ Realtime Database rules

### Step 11.4: Monitor Logs

```bash
firebase functions:log
```

---

## Part 12: Create Firestore Indexes (Important!)

Firebase will suggest creating indexes automatically, but you can create them manually:

1. Go to Firebase Console → **Firestore** → **Indexes**
2. Create compound indexes for:
   - `pairingSessions`: token + parentId + status
   - `devicePairings`: parentId + status

Firebase will show a message with the exact indexes needed when queries fail.

---

## Troubleshooting

### Issue: "Cannot find module 'firebase-admin'"

**Solution:**

```bash
cd functions
npm install
cd ..
```

### Issue: Emulator won't start

**Solution:**

```bash
# Kill any running emulators
# Then clear cache
firebase emulators:start --clear

# If still fails, reinstall emulator binaries
rm -rf ~/.cache/firebase/emulators
firebase emulators:start
```

### Issue: Environment variables not loading

**Solution:**

- File must be named `.env.local` (exact name)
- Restart app: `npx expo start` (press Ctrl+C and restart)
- Check variables are used with `EXPO_PUBLIC_` prefix

### Issue: "Project ID is invalid"

**Solution:**

- Copy exact project ID from Firebase Console
- Verify no extra spaces
- Check .env.local file is in project root

### Issue: Functions deploy fails

**Solution:**

```bash
cd functions
npm run build  # Build first
cd ..
firebase deploy --only functions --force
```

### Issue: Security rules too restrictive

**Solution:**

- During development, use test mode (allows all read/write for auth users)
- Copy rules from BACKEND_SETUP.md for production
- Deploy: `firebase deploy --only firestore:rules`

---

## Verification Checklist

After completing steps above, verify:

- [ ] Firebase project created in console
- [ ] Authentication enabled (Email/Password)
- [ ] Firestore database created and initialized
- [ ] Realtime Database created and initialized
- [ ] Cloud Functions enabled (Blaze plan)
- [ ] `.env.local` file created with all 8 variables
- [ ] `firebase.json` exists in project root
- [ ] `firestore.rules` updated with security rules
- [ ] Cloud Functions built and deployed successfully
- [ ] Firebase Emulator starts without errors
- [ ] App starts and connects to Firebase
- [ ] Test accounts can be created
- [ ] Pairing flow works end-to-end
- [ ] Firestore collections populated with data

---

## Next Steps

1. **Testing**: Follow TESTING_GUIDE.md for comprehensive testing
2. **Monitoring**: Set up Firebase alerts in Cloud Console
3. **Performance**: Monitor function latency in Firebase Console
4. **Security**: Review security rules monthly
5. **Scaling**: Add database backups/exports as needed

---

## Helpful Commands

```bash
# View all services status
firebase emulators:start

# View function logs (real-time)
firebase functions:log

# Deploy everything
firebase deploy

# Deploy specific service
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only database

# Clear emulator data
firebase emulators:start --clear

# List functions
firebase functions:list

# View function details
firebase functions:describe confirmDevicePairing

# Delete a function
firebase functions:delete confirmDevicePairing
```

---

## Key Concepts

### Environment Variables

- Prefix `EXPO_PUBLIC_` makes them available to app
- `.env.local` is read by Expo automatically
- Never commit `.env.local` to git

### Cloud Functions

- Callable functions: Called from app via SDK
- Triggered functions: Run on Firestore events
- Deploy multiple times if updating code

### Firestore vs Realtime Database

- **Firestore**: Better querying, more scalable (use this)
- **Realtime Database**: Simpler, faster real-time sync (legacy)
- ThunderControl uses Firestore primarily

### Emulator

- Perfect for local development (no internet needed)
- Data resets each restart (by design)
- UI at http://127.0.0.1:4000 is helpful for debugging

---

**You're all set!** 🚀 Firebase is now configured from scratch.

Next: Follow the TESTING_GUIDE.md for comprehensive testing procedures.
