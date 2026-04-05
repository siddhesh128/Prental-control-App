# Quick Start: Firebase Deployment

This is the short developer runbook for installing, testing, and deploying the Firebase backend.

## Pre-Deployment Checklist

- [ ] Node.js 20+ installed: `node --version`
- [ ] Firebase CLI installed: `firebase --version`
- [ ] Firebase project created at https://console.firebase.google.com
- [ ] Local git repo up to date: `git status`

## 1. Install Dependencies (5 min)

```bash
# Install app dependencies
npm install

# Install Cloud Functions dependencies
cd functions
npm install
cd ..
```

**Expected output**: a normal npm install output. Vulnerability warnings are not blocking for local setup.

## 2. Local Testing with Emulator (10 min)

```bash
# Start Firebase Emulator (runs all services)
firebase emulators:start
```

Visit: http://127.0.0.1:4000 (Firestore UI)

**Then in another terminal:**

```bash
# Start the app
npx expo start

# Press 'i' for iOS simulator or 'a' for Android emulator
```

**Test the flow:**

1. Create parent account with email: `parent@test.com`
2. Create child account with email: `child@test.com`
3. Parent: Go to "Add Device" → See QR code with countdown
4. Child: Go to "Pair with Parent" → Scan the QR code
5. Confirm pairing on child device

**Verify in Firestore Console:**

- Check `pairingSessions` collection (should show 'used' status)
- Check `devicePairings` collection (should show confirmed pairing)
- Check `users/{childId}/devices/default` (should have parent info)

## 3. Deploy to Production

### Step 1: Build Functions

```bash
cd functions
npm run build
cd ..
```

### Step 2: Deploy

```bash
firebase deploy --only functions
```

**Expected time**: 2-5 minutes per function.

### Step 3: Verify Deployment

```bash
# Check function logs
firebase functions:log

# And should see something like:
# ✓ confirmDevicePairing deployed
# ✓ validatePairingToken deployed
# ✓ generatePairingCode deployed
# ... (4 more functions)
```

### Step 4: Update Firestore Security Rules

Go to **Firebase Console** → **Firestore** → **Rules**

Copy-paste the security rules from `BACKEND_SETUP.md` (lines 395-450)

Click **Publish** to apply

## 4. Test Production Backend

### Update App Configuration

Open `app/config/firebase.ts` and ensure:

```typescript
// Comment out the emulator connections (if dev only)
// connectFunctionsEmulator(functions, 'localhost', 5001);
// connectFirestoreEmulator(firestore, 'localhost', 8080);
```

### Test with Real Devices

1. Build APK/IPA for both roles:

   ```bash
   eas build --platform android
   # or for iOS
   eas build --platform ios
   ```

2. Install on two test devices

3. Create accounts and test pairing flow

4. Watch logs with: `firebase functions:log`

## 5. Monitor Performance

### Cloud Function Metrics

Go to **Firebase Console** → **Functions**

Check:

- Execution count
- Average duration (should be <1s)
- Error rate (should be <1%)

### Set Up Alerts

1. Go to **Cloud Console** → **Monitoring** → **Policies**
2. Create alert for error rate > 5%
3. Set notification email

## Troubleshooting

| Issue                                 | Solution                                      |
| ------------------------------------- | --------------------------------------------- |
| `Cannot find module 'firebase-admin'` | Run `cd functions && npm install`             |
| Functions not appearing in Console    | Wait 10-30 seconds after deploy, then refresh |
| Pairing fails with "Firebase error"   | Check `firebase functions:log` for details    |
| Firestore permission denied           | Verify security rules are published           |
| QR Scanner not working                | Check camera permissions on device            |

## Rollback (If Needed)

### Redeploy Previous Version

```bash
# Revert code changes
git checkout app/services/pairing.service.ts
git checkout app/(child)/pair-with-parent.tsx
git checkout app/(parent)/add-device/index.tsx

# If Cloud Functions issue, delete and redeploy
firebase functions:delete confirmDevicePairing
firebase deploy --only functions:confirmDevicePairing
```

## Success criteria

✅ All 7 Cloud Functions deployed without errors  
✅ Firestore collections created automatically on first pairing  
✅ Parent can generate QR code with countdown  
✅ Child can scan QR code successfully  
✅ Pairing confirmation creates records in Firestore  
✅ No errors in `firebase functions:log`  
✅ Pairing works with multiple parent-child pairs

## Performance Baselines

- QR generation: <500ms
- Token validation: <300ms
- Pairing confirmation: <1s
- Total flow end-to-end: <5s

## Production best practices

1. **Monitor Daily**
   - Check error rates in Firebase Console
   - Review cold start times
   - Watch cost metrics

2. **Test Regularly**
   - Run pairing flow 2x per week
   - Test error scenarios (expired tokens, invalid QR)
   - Monitor logs for warnings

3. **Keep Updated**
   - Update firebase-admin monthly
   - Update firebase-functions quarterly
   - Review Firebase security advisories

4. **Documentation**
   - Keep TESTING_GUIDE.md updated
   - Document any custom changes
   - Create runbook for common issues

## Need help?

1. Check logs: `firebase functions:log`
2. Read BACKEND_SETUP.md (comprehensive guide)
3. Use Firebase Console debugger
4. Check function source code in `functions/src/index.ts`

Deployment complete! 🚀
