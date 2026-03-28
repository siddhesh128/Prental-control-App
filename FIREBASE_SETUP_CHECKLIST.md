# Firebase Setup Quick Reference - Checklist

## 🚀 5-Minute Quick Start

### Phase 1: Cloud Console (5 min)

- [ ] Go to https://console.firebase.google.com
- [ ] Click **"Add project"** → Enter **"Parental Control"**
- [ ] Wait for project to create
- [ ] In **Authentication** → Enable **Email/Password**
- [ ] In **Firestore** → Click **Create database** → test mode
- [ ] In **Realtime Database** → Click **Create database** → test mode
- [ ] In **Functions** → Enable (upgrades to Blaze plan)
- [ ] Go to **Project Settings** ⚙️ → Copy credentials

### Phase 2: Copy Credentials (3 min)

Copy these from Project Settings:

```
Project ID: ________________________
API Key: ________________________
Auth Domain: ________________________
Storage Bucket: ________________________
Sender ID: ________________________
App ID: ________________________
Database URL: ________________________
```

Save somewhere safe!

### Phase 3: Setup Project Locally (5 min)

```bash
# 1. Install CLI
npm install -g firebase-tools

# 2. Create .env.local (copy .env.local.example)
# 3. Fill in values above

# 4. Login
firebase login

# 5. Initialize
firebase init
```

### Phase 4: Deploy (10 min)

```bash
# Build functions
cd functions && npm run build && cd ..

# Deploy
firebase deploy

# Start emulator
firebase emulators:start
```

### Phase 5: Test (5 min)

```bash
# In new terminal
npx expo start
```

Test in app:

- Create parent account
- Create child account
- Generate QR code
- Scan QR code
- Pair devices

---

## 📋 Complete Checklist

### Prerequisites

- [ ] Node.js 18+ installed
- [ ] npm installed
- [ ] Google account for Firebase
- [ ] This project cloned/downloaded

### Step 1: Create Firebase Project

- [ ] Visit https://console.firebase.google.com
- [ ] Create new project named "Parental Control"
- [ ] Choose region near you
- [ ] Project created ✓

### Step 2: Enable Services

**Authentication**

- [ ] Click "Authentication"
- [ ] Click "Get started"
- [ ] Enable "Email/Password"
- [ ] Enable "Anonymous" (optional)
- [ ] Save

**Firestore Database**

- [ ] Click "Firestore Database"
- [ ] Click "Create database"
- [ ] Choose same region
- [ ] Start in **test mode**
- [ ] Database ready ✓

**Realtime Database**

- [ ] Click "Realtime Database"
- [ ] Click "Create database"
- [ ] Choose same region
- [ ] Start in **test mode**
- [ ] Database ready ✓

**Cloud Functions**

- [ ] Click "Functions"
- [ ] Click "Get started"
- [ ] Select Blaze (pay-as-you-go)
- [ ] Confirm billing (has free tier)
- [ ] Enabled ✓

### Step 3: Get Credentials

From Project Settings ⚙️:

- [ ] Copy **Project ID**
- [ ] Copy **API Key**
- [ ] Copy **Auth Domain** (or construct: `PROJECT_ID.firebaseapp.com`)
- [ ] Copy **Storage Bucket** (or construct: `PROJECT_ID.appspot.com`)
- [ ] Copy **Messaging Sender ID**
- [ ] Copy **App ID**
- [ ] Copy **Database URL** (from Realtime Database)

### Step 4: Install Local Tools

- [ ] Run: `npm install -g firebase-tools`
- [ ] Verify: `firebase --version` (shows version)
- [ ] Install dependencies: `npm install`
- [ ] Install functions: `cd functions && npm install && cd ..`

### Step 5: Create Environment File

- [ ] Copy `.env.local.example` to `.env.local`
- [ ] Open `.env.local`
- [ ] Fill in all 8 values from Step 3
- [ ] Save file

### Step 6: Configure Firebase Locally

- [ ] Run: `firebase login` (browser opens, click Allow)
- [ ] Login successful ✓
- [ ] File `firebase.json` exists ✓ (already created)
- [ ] File `.firebaserc` exists ✓ (already created)
- [ ] File `firestore.rules` exists ✓ (already created)
- [ ] File `database.rules.json` exists ✓ (already created)

### Step 7: Deploy to Firebase

- [ ] Build functions: `cd functions && npm run build && cd ..`
- [ ] Deploy: `firebase deploy`
- [ ] Wait 2-5 min for deployment
- [ ] All functions deployed ✓

### Step 8: Deploy Security Rules

- [ ] Check `firestore.rules` file ✓
- [ ] Run: `firebase deploy --only firestore:rules`
- [ ] Rules deployed ✓

### Step 9: Setup Emulator (Development)

- [ ] Run: `firebase emulators:start`
- [ ] Wait for startup (2-3 min)
- [ ] See all emulator URLs:
  - [ ] Firestore: http://127.0.0.1:8080
  - [ ] Functions: http://127.0.0.1:5001
  - [ ] Auth: http://127.0.0.1:9099
  - [ ] UI: http://127.0.0.1:4000

### Step 10: Configure App for Emulator (Dev Only)

- [ ] Open `app/config/firebase.ts`
- [ ] Add emulator connections (already code there, uncomment)
- [ ] Add: `export const functions = getFunctions(app);`
- [ ] Add: `export const firestore = getFirestore(app);`

### Step 11: Test App

- [ ] Open new terminal
- [ ] Run: `npx expo start`
- [ ] Press `i` (iOS) or `a` (Android)
- [ ] App opens in emulator/simulator

### Step 12: Test Pairing Flow

- [ ] Register parent account: parent@test.com
- [ ] Register child account: child@test.com
- [ ] Parent: Add Device → See QR code
- [ ] Child: Pair with Parent → Scan QR
- [ ] Confirm pairing
- [ ] Should see success message ✓

### Step 13: Verify Firestore Data

- [ ] Open http://127.0.0.1:4000 (Emulator UI)
- [ ] Check collections exist:
  - [ ] `pairingSessions` (status: used)
  - [ ] `devicePairings` (status: confirmed)
  - [ ] `users/{userId}/children` (relationship)
  - [ ] `users/{userId}/devices` (pairing info)

### Step 14: Production Deployment

- [ ] Build release APK/IPA: `eas build --platform android`
- [ ] Test production flow
- [ ] Monitor logs: `firebase functions:log`
- [ ] Set up alerts in Cloud Console
- [ ] Document any custom changes

---

## 🔑 Important Files & Locations

| File                     | Purpose                             | Status  |
| ------------------------ | ----------------------------------- | ------- |
| `.env.local`             | Environment variables (YOUR VALUES) | ⬜ TODO |
| `firebase.json`          | Firebase config                     | ✅ Done |
| `.firebaserc`            | Project mapping                     | ✅ Done |
| `firestore.rules`        | Firestore security                  | ✅ Done |
| `database.rules.json`    | Database security                   | ✅ Done |
| `app/config/firebase.ts` | App Firebase init                   | ✅ Done |
| `functions/src/index.ts` | Cloud Functions                     | ✅ Done |
| `functions/package.json` | Functions deps                      | ✅ Done |

---

## 📞 Common Issues

### "Cannot find module 'firebase-admin'"

```bash
cd functions
npm install
```

### "Project not found"

- [ ] Check `.firebaserc` has correct project ID
- [ ] Run: `firebase list` to see your projects

### Emulator fails to start

```bash
# Clear and retry
firebase emulators:start --clear
```

### "Database URL invalid"

- Go to Firestore/Realtime Database in console
- Copy exact URL shown at top

### QR code not scanning

- Ensure good lighting
- Keep camera steady
- QR should be clearly visible and not rotated

---

## ✅ Success Indicators

After completing all steps, you should see:

✓ Firebase Console shows project  
✓ All services enabled (Auth, Firestore, Functions)  
✓ 7 Cloud Functions deployed  
✓ `firebase functions:log` shows no errors  
✓ App can create accounts  
✓ Pairing flow works end-to-end  
✓ Firestore collections created automatically  
✓ Emulator UI at http://127.0.0.1:4000 accessible

---

## 🎓 Next Steps

1. ✅ Follow this checklist completely
2. 📖 Read `TESTING_GUIDE.md` for comprehensive testing
3. 🚀 Deploy to production with `firebase deploy`
4. 📊 Monitor logs: `firebase functions:log`
5. 🔍 Review security rules in production

---

**Estimated Total Time**: 45 minutes to 1 hour

**Questions?** Check `FIREBASE_SETUP_COMPLETE.md` for detailed guide.
