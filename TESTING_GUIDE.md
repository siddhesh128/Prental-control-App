# Complete Pairing Flow Testing Guide

## Prerequisites

1. **Two devices or emulators**:
   - One for parent role
   - One for child role
   - (Or use one device with app installed twice)

2. **Firebase Emulator running** (or use production Firebase):

   ```bash
   firebase emulators:start
   ```

3. **Two test accounts**:
   - Parent account (email: `parent@test.com`, password: `test123456`)
   - Child account (email: `child@test.com`, password: `test123456`)

## Step 1: Setup Test Accounts

### Create Parent Account

1. Open app on first device/emulator
2. Go to Register screen
3. Enter:
   - Email: `parent@test.com`
   - Password: `test123456`
   - Role: **Parent**
4. Tap Register
5. Verify email (or skip if using emulator)
6. Login with parent credentials

### Create Child Account

1. Open app on second device/emulator
2. Go to Register screen
3. Enter:
   - Email: `child@test.com`
   - Password: `test123456`
   - Role: **Child**
4. Tap Register
5. Verify email (or skip if using emulator)
6. Login with child credentials

## Step 2: Generate Pairing Code (Parent Side)

### On Parent Device

1. Go to navigation menu → "Add Device"
2. You should see:
   - A QR code display (large square)
   - A countdown timer below it (e.g., "5:00")
   - "Regenerate Code" button
   - "View Instructions" button
3. **Verify the timer is counting down** - this confirms backend is working
4. Note the time remaining

## Step 3: Validate Token (Optional - Real-time Feedback)

This step verifies the `validatePairingToken` function is working.

### While QR is displayed on parent device:

The child app can call validation in real-time. In production, this happens automatically during scanning.

**Check in Firestore Console**:

1. Go to http://127.0.0.1:4000 (Firestore Emulator UI)
2. Look at `pairingSessions` collection
3. You should see the newly created document with:
   - `status: 'active'`
   - `token: 'XXXXX...'` (32 characters)
   - `expiresAt: <timestamp 5 min from now>`
   - `createdAt: <current timestamp>`

## Step 4: Scan QR Code (Child Side)

### On Child Device

1. Go to navigation menu → "Pair with Parent"
2. Tap **"Start Scanning"** button
3. Camera permission dialog appears → **Allow**
4. QR scanner screen shows with:
   - Camera feed
   - Green frame overlay
   - Instructions: "Scan Parent's QR Code"
5. Point camera at parent device's QR code
6. Scan page should capture the code automatically

### What Happens After Scan

- Scanner should display checkmark icon (✓)
- Show "QR Code Scanned!" confirmation screen
- Display scanned details:
  - Parent ID
  - Token (first 8 chars visible)
  - Time remaining

## Step 5: Confirm Pairing

### On Child Device

1. Tap **"Confirm Pairing"** button on confirmation screen
2. Loading spinner appears while backend processes
3. Success alert: "You have been paired with the parent device successfully!"
4. Tap "Go to Dashboard" button
5. Should navigate to child home screen

### Backend Verification (Check Firestore)

**1. Check pairingSessions collection:**

- The session should now have `status: 'used'`
- New field `usedAt: <timestamp>`

**2. Check devicePairings collection:**

- New document should exist with:
  ```
  {
    childId: "child@test.com",
    parentId: "parent@test.com",
    childDeviceName: "Device Name",
    token: "XXXXX...",
    status: "confirmed",
    createdAt: <timestamp>,
    confirmedAt: <timestamp>,
    expiresAt: <timestamp>
  }
  ```

**3. Check users/{parentId}/children collection:**

- New document under parent's user record:
  ```
  /users/parent@test.com/children/child@test.com/
  {
    childId: "child@test.com",
    pairingId: <documentId from devicePairings>,
    pairedAt: <timestamp>,
    status: "active"
  }
  ```

**4. Check users/{childId}/devices collection:**

- Default device should be updated:
  ```
  /users/child@test.com/devices/default/
  {
    pairedParentId: "parent@test.com",
    pairingId: <documentId>,
    pairedAt: <timestamp>
  }
  ```

## Step 6: Verify Parent Side

### On Parent Device

1. Go back from "Add Device" screen
2. Go to "Devices" or "My Devices" section
3. Should see the new child device listed:
   - Device name: (whatever was scanned)
   - Status: "Connected"
   - Pairing date

## Step 7: Test Edge Cases

### Test 1: Token Expiration

1. Generate QR code on parent
2. Note the expiry time (5 minutes)
3. On child, start scanning
4. Wait for 5+ minutes or wait for timer to countdown to 0:00
5. Try to confirm pairing
6. Should show error: "Token has expired"

### Test 2: Regenerate Code

1. Display QR on parent device
2. Tap "Regenerate Code" button
3. Confirm in alert dialog
4. New QR code should appear with reset timer (5:00)
5. Old QR should no longer work for pairing

**Verify in Firestore:**

- Old session should have `status: 'expired'`
- New session should have `status: 'active'`

### Test 3: Duplicate Pairing

1. After confirming first pairing (child paired with parent)
2. Try scanning same QR again (or generate new one and scan)
3. If same parent generates new QR:
   - New session should work
   - Should allow re-pairing the same child
4. Second pairing should succeed or fail based on business logic

### Test 4: Invalid QR

1. On child device, try scanning something that isn't a valid pairing QR:
   - QR code from a website
   - Random QR
   - Barcode or other format
2. Should show error: "Invalid QR Code"

### Test 5: Network Failure (Offline)

1. Generate pairing code on parent
2. Turn off internet on child device
3. Start scanning
4. Scan the QR code
5. Try to confirm (should fail since backend unreachable)
6. Should show error: "Network error" or "Unable to connect"
7. Turn internet back on and retry - should work

## Testing Checklist

- [ ] Parent account created and logged in
- [ ] Child account created and logged in
- [ ] Parent can generate QR code
- [ ] Timer appears and counts down
- [ ] QR code is valid (can be scanned by any QR reader)
- [ ] Child can scan QR code
- [ ] Confirmation screen shows correct parent ID
- [ ] Pairing can be confirmed
- [ ] Success message appears
- [ ] Firestore `devicePairings` collection updated
- [ ] `pairingSessions` marked as 'used'
- [ ] Parent's children subcollection created
- [ ] Child's devices updated with parent info
- [ ] Regenerate code works and creates new session
- [ ] Expired tokens show proper error
- [ ] Invalid QR shows proper error
- [ ] Both devices show pairing in UI

## Debugging

### Check Cloud Function Logs

```bash
firebase functions:log
```

Look for:

- Success messages (pairing confirmed)
- Error messages with stack traces
- Performance metrics

### Manual Function Testing

```bash
firebase functions:shell

# In the shell, call functions directly:
> confirmDevicePairing({
>   childId: 'child@test.com',
>   parentId: 'parent@test.com',
>   token: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ012345',
>   childDeviceName: 'Test Device'
> })
```

### Check Firestore Data

1. Open Firestore Emulator UI: http://127.0.0.1:4000
2. Navigate through collections to verify data structure
3. Check timestamps (should be recent)
4. Verify status fields

### Debug QR Encoding/Decoding

Add logs in `PairingService`:

```typescript
console.log('Encoded QR:', encodedData);
console.log('Decoded data:', decodedData);
```

Check app logs to see what QR data was generated and scanned.

## Performance Metrics

Expected timings:

- QR generation: <1 second
- QR scanning: <2 seconds
- Pairing confirmation: <3 seconds (including network latency)
- Total pairing flow: <10 seconds

If significantly slower:

1. Check network latency (Firebase → local device)
2. Check Firestore indexes
3. Monitor Cloud Function execution time in Console

## Production Considerations

After testing completes:

1. **Deploy Functions**:

   ```bash
   firebase deploy --only functions
   ```

2. **Update Firestore Rules** (use security rules from BACKEND_SETUP.md)

3. **Monitor Initial Deployments**:
   - Watch error logs
   - Monitor function latency
   - Set up alerts for failures

4. **User Communication**:
   - Test with real user flows
   - Gather feedback on UX
   - Adjust timing/messaging if needed

5. **Rollback Plan**:
   - Keep old Cloud Functions deployed (with v1, v2 naming)
   - Can switch traffic if issues arise
   - Test rollback procedure beforehand

## Support & Troubleshooting

Common issues and solutions:

| Issue                       | Solution                                                |
| --------------------------- | ------------------------------------------------------- |
| QR code not scanning        | Ensure good lighting, steady camera, QR is large enough |
| "Token not found" error     | Token might be expired or session deleted; regenerate   |
| Pairing takes >5 seconds    | Check network latency; consider retry logic             |
| Firebase Auth errors        | Verify user is logged in; check authentication state    |
| Firestore permission denied | Check security rules; verify user ID matches            |
