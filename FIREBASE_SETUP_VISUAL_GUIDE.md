# Firebase Setup - Step-by-Step Visual Guide

## 📋 Complete Setup - Copy & Paste Guide

This guide lets you copy-paste commands and see exactly what to do.

---

## STEP 1: Create Firebase Project (Online)

### 🌐 In Browser

```
1. Visit: https://console.firebase.google.com
2. Click: "Add project" (big blue button)
3. Enter: "Parental Control"
4. Region: Choose closest to you ✓
5. Click: "Create project"
6. WAIT: 2-3 minutes (shows loading bar)
7. ✓ Project ready!
```

**Image:** You should see your project name in sidebar

---

## STEP 2: Enable Essential Services (Online)

### 🔐 Authentication

```
📍 Left Menu → "Authentication"
  → Click "Get started"
  → Click "Email/Password" provider
  → Toggle "Enable" to ON
  → Click "Save"
✓ Done
```

### 💾 Firestore Database

```
📍 Left Menu → "Firestore Database"
  → Click "Create database"
  → Region: SAME as project ✓
  → Security Rules: "Start in test mode"
  → Click "Create"
  → WAIT: 1-2 minutes
✓ Database created
```

### 🔄 Realtime Database

```
📍 Left Menu → "Realtime Database"
  → Click "Create database"
  → Region: SAME as project ✓
  → Rules: "Start in test mode"
  → Click "Create"
  → WAIT: 1-2 minutes
✓ Database created
```

### ⚡ Cloud Functions

```
📍 Left Menu → "Functions"
  → Click "Get started"
  → Click upgrade to "Blaze" (pay-as-you-go plan)
  → ✓ Functions enabled (will prompt for billing)
```

---

## STEP 3: Get Your Firebase Credentials (Online)

### 📌 Project Settings

```
1. Click gear icon ⚙️ at TOP RIGHT
2. Click "Project Settings"
3. You're in "General" tab

COPY THESE VALUES (keep safe!):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ Project ID: ________________________
□ API Key: ________________________
□ Auth Domain: ________________________
□ Storage Bucket: ________________________

Scroll Down→ Cloud Messaging tab:
□ Sender ID: ________________________

Scroll Back→ General tab→ "Your apps" section:
□ App ID: ________________________
□ Measurement ID: ________________________

Go to: Realtime Database → Copy URL:
□ Database URL: ________________________
```

**💾 Save these to a text file - you'll need them next!**

---

## STEP 4: Terminal Setup (Your Computer)

### 📂 Open Terminal

```bash
# Make sure you're in the project folder
cd /Users/siddhesh/Desktop/ParentalControl-master

# List files to verify
ls -la
# Should show: app/, functions/, package.json, etc.
```

### 🔧 Install Firebase CLI

```bash
# Install globally (one time only)
npm install -g firebase-tools

# Verify it worked
firebase --version
# Should show: 13.x.x or higher
```

### 📦 Install Dependencies

```bash
# Install app dependencies
npm install

# Install Cloud Functions dependencies
cd functions
npm install
cd ..
```

---

## STEP 5: Create `.env.local` File

### 📝 Create the file

**On Mac/Linux:**

```bash
# Create empty file
touch .env.local

# Open in editor (pick one)
nano .env.local
# OR
code .env.local  # If VS Code installed
```

**On Windows (PowerShell):**

```powershell
# Create empty file
New-Item -Name ".env.local" -ItemType File

# Open in editor
code .env.local
```

### ✍️ Fill in the file

Copy the template below and **replace** the YOUR_XXX values with values from Step 3:

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

### ✅ Example (filled in)

```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyDl5v_qQ8z7RxT9pKmL3OvW1YuZ4xAb5Cd
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=parental-control-p1a2b.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=parental-control-p1a2b
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=parental-control-p1a2b.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcd1234efgh5678ijkl
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-ABC123DEFG
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://parental-control-p1a2b.firebaseio.com
```

**Save the file!**

---

## STEP 6: Login to Firebase

### 🔐 Terminal

```bash
firebase login
```

Browser will open automatically:

```
1. Google login page appears
2. Click "Allow"
3. Browser shows: ✓ You are now authenticated
4. Return to terminal - should say ✓ Success
```

---

## STEP 7: Update Firebase Config Files

### ✏️ Edit `.firebaserc`

```bash
# Edit the file
code .firebaserc
# OR nano .firebaserc
```

Replace `YOUR_PROJECT_ID` with your actual project ID:

```json
{
  "projects": {
    "default": "parental-control-p1a2b"
  }
}
```

**Save it!**

---

## STEP 8: Deploy Cloud Functions

### 🏗️ Build Functions

```bash
cd functions
npm run build
cd ..

# Wait for compilation to finish
```

### 🚀 Deploy

```bash
firebase deploy --only functions

# Wait 2-5 minutes
# You'll see: ✓ Function deployed
# (Do this 7 times, one for each function)
```

**Expected Output:**

```
✓ confirmDevicePairing deployed
✓ validatePairingToken deployed
✓ generatePairingCode deployed
✓ logDeviceActivity deployed
✓ cleanupExpiredPairings deployed
✓ onPairingCreated deployed
✓ onPairingDeleted deployed

Deploy complete!
```

---

## STEP 9: Deploy Security Rules

### 📋 Firestore Rules

```bash
firebase deploy --only firestore:rules

# Wait for completion
# You'll see: ✓ firestore.rules deployed
```

---

## STEP 10: Start Firebase Emulator (For Local Testing)

### ▶️ Terminal 1 - Start Emulator

```bash
firebase emulators:start
```

**Wait for startup (shows all URLs):**

```
✓ Firestore Emulator running on http://127.0.0.1:8080
✓ Functions Emulator running on http://127.0.0.1:5001
✓ Auth Emulator running on http://127.0.0.1:9099
✓ Realtime Database on http://127.0.0.1:9000

Web interface (Emulator UI): http://127.0.0.1:4000
```

**Keep this terminal open!**

---

## STEP 11: Start Your App

### ▶️ Terminal 2 - Start App

```bash
# Open NEW terminal (don't close the emulator one!)
cd /Users/siddhesh/Desktop/ParentalControl-master

npx expo start
```

**You'll see:**

```
LAN:     http://192.168.x.x:8081
Local:   http://localhost:8081

Press i for iOS
Press a for Android emulator
```

**Press `i` or `a`** to start simulator

---

## STEP 12: Test Pairing Flow

### 📱 In Emulator/Simulator

```
1. App opens → Click "Register"

2. Create PARENT account:
   Email: parent@test.com
   Password: test123456
   Role: Parent ✓
   → Click "Register"

3. Login with parent account ✓

4. Click on "Add Device" (or similar menu)
   → You should see QR code with countdown timer

5. Go back, Logout ✓

6. Create CHILD account:
   Email: child@test.com
   Password: test123456
   Role: Child ✓
   → Click "Register"

7. Login with child account ✓

8. Click on "Pair with Parent" (or similar menu)
   → Click "Start Scanning"
   → Point camera at QR code on parent device/screen
   → QR should scan automatically

9. See confirmation screen showing parent ID ✓

10. Click "Confirm Pairing"
    → Should see: "You have been paired with the parent device successfully!"
    → Click "Go to Dashboard"

✓ PAIRING COMPLETE!
```

---

## STEP 13: Verify Firestore Data

### 🔍 Check Data in Emulator UI

```
1. Open browser: http://127.0.0.1:4000
2. Left menu → "Firestore"
3. You should see collections:

   ✓ devicePairings (1 document)
     └ status: "confirmed"
     └ parentId: parent@test.com
     └ childId: child@test.com

   ✓ pairingSessions (1 document)
     └ status: "used"
     └ token: "XXXXX..." (32 chars)

   ✓ users
     └ parent@test.com
        └ children
           └ child@test.com
     └ child@test.com
        └ devices
           └ default (has parent info)
```

**If you see all this → ✨ Setup complete!**

---

## STEP 14: Test Production Setup (Optional)

### 📦 Create Release Build

```bash
# For Android
eas build --platform android --release

# For iOS
eas build --platform ios --release
```

Then install on real device and test the pairing flow.

---

## 🎉 You're Done!

### What You've Accomplished

✅ Created Firebase project  
✅ Enabled all services (Auth, Firestore, Functions)  
✅ Got credentials and configured app  
✅ Deployed Cloud Functions  
✅ Set up security rules  
✅ Tested locally with emulator  
✅ Verified end-to-end pairing works

### Next Steps

1. **More testing** → Read `TESTING_GUIDE.md`
2. **Production deployment** → Follow `QUICK_START_DEPLOY.md`
3. **Performance monitoring** → Check Firebase Console
4. **Custom changes** → Modify `firestore.rules` as needed

---

## ⚠️ Common Issues & Quick Fixes

| Issue                        | Fix                                                     |
| ---------------------------- | ------------------------------------------------------- |
| "Cannot find firebase-admin" | `cd functions && npm install && cd ..`                  |
| ".env.local not loading"     | File must be named exactly `.env.local` in project root |
| "Project not found"          | Check `.firebaserc` has correct project ID              |
| "Emulator fails to start"    | Try: `firebase emulators:start --clear`                 |
| "QR code won't scan"         | Ensure good lighting and steady camera                  |
| "Pairing fails"              | Check `firebase functions:log` for errors               |

---

## 📱 Testing Checklist (Quick)

- [ ] Parent account created
- [ ] QR code displays with countdown
- [ ] Can regenerate QR code (old one expires)
- [ ] Child account created
- [ ] Child can scan parent's QR
- [ ] Confirmation screen shows correct parent ID
- [ ] Pairing completes with success message
- [ ] Firestore has the pairing documents
- [ ] Can view pairing in both accounts

---

**Estimated Time: 45 minutes**

**Questions?** Check:

- `FIREBASE_SETUP_COMPLETE.md` - Detailed explanation
- `FIREBASE_ARCHITECTURE.md` - Diagrams and architecture
- `TESTING_GUIDE.md` - Comprehensive test procedures
