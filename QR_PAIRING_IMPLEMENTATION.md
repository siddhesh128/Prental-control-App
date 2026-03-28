# QR Code-Based Device Pairing System

## Overview

The ThunderControl app now features a secure QR code-based device pairing system that allows parents to pair child devices without manual setup. This is much more secure and user-friendly than the previous manual approach.

## Architecture

### Components

#### 1. **Pairing Service** (`app/services/pairing.service.ts`)

Core service for QR code generation, validation, and token management.

**Key Functions:**

- `generateToken()` - Creates a unique 32-character pairing token
- `generatePairingData()` - Generates pairing data with expiration
- `encodePairingData()` - Converts to JSON string for QR encoding
- `decodePairingData()` - Parses QR data back to pairing object
- `isTokenValid()` - Validates token hasn't expired
- `getTimeRemaining()` - Gets seconds until expiration

**Token Format:**

```javascript
{
  parentId: string,        // Parent device ID
  parentDeviceId: string,  // Parent device identifier
  token: string,           // Unique 32-char token
  expiresAt: number        // Unix timestamp (5 minutes from generation)
}
```

#### 2. **QR Code Display Component** (`app/_components/QRCodeDisplay.tsx`)

Displays the generated QR code for scanning.

**Props:**

- `data: string` - Encoded pairing data
- `size?: number` - QR code size (default: 250)
- `title?: string` - Display title
- `description?: string` - Display description

#### 3. **QR Scanner Component** (`app/_components/QRScanner.tsx`)

Provides camera-based QR code scanning interface.

**Features:**

- Real-time camera feed
- Green frame overlay for better targeting
- Barcode scanning using Expo Barcode Scanner
- Permission handling
- Error states

**Props:**

- `onScan: (data: string) => void` - Callback when QR is scanned
- `onCancel?: () => void` - Cancel scanning callback
- `title?: string` - Screen title
- `description?: string` - Screen description

### Screens

#### 1. **Parent Add Device Screen** (`app/(parent)/add-device/index.tsx`)

**Flow:**

1. User navigates to "Add Device"
2. Screen generates QR code automatically
3. QR code displays with 5-minute countdown
4. Parent can regenerate code if needed
5. Instructions guide sharing the code with child

**Key Features:**

- Automatic QR generation with unique token
- Real-time countdown timer
- Warning when code is expiring
- Regenerate button for new codes
- Security information box
- Clear instructions

**UI Elements:**

- QR code display (280x280)
- Timer showing seconds remaining
- 4-step instruction list
- Regenerate & Info buttons
- Security info box

#### 2. **Child Pair with Parent Screen** (`app/(child)/pair-with-parent.tsx`)

**Flow:**

1. Child taps "Pair with Parent"
2. Taps "Start Scanning" button
3. Camera opens for QR scanning
4. Child points camera at parent's QR code
5. QR data decoded and validated
6. Confirmation screen shows pairing details
7. Child confirms pairing
8. Device gets paired with parent account

**Key Features:**

- Feature list explaining what parent can do
- Clear scanning instructions
- Validation of QR code before confirmation
- Confirmation screen with pairing details
- Security information

**UI Elements:**

- Feature list (4 items)
- Main "Start Scanning" button
- Instructions box
- Info box with security details

### Security Features

#### 1. **Time-Limited Tokens**

- Each QR code expires after 5 minutes
- Expired tokens are rejected
- Countdown timer visible to parent

#### 2. **Unique Per-Pairing**

- Each QR code is unique
- Different token for each generation
- Cannot reuse old codes

#### 3. **Token Validation**

- Only valid JSON format accepted
- Token format strictly validated
- Expiration checked on scan

#### 4. **Secure Data**

- Only essential data in QR (IDs + token)
- No sensitive information exposed
- Fast expiration reduces exposure window

## Implementation Details

### Dependencies

```json
{
  "react-native-qrcode-svg": "^6.x",
  "expo-camera": "~14.0",
  "expo-barcode-scanner": "*"
}
```

### Database Considerations (Backend)

When implementing the backend pairing confirmation:

```typescript
interface DevicePairing {
  id: string;
  parentId: string;
  childId: string;
  childDeviceId: string;
  token: string;
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt: timestamp;
  confirmedAt?: timestamp;
  expiresAt: timestamp;
}
```

## Usage

### For Parents

1. Open app → Navigate to Devices
2. Tap "+ Add Device" button
3. QR code appears on screen
4. Share phone/screen with child
5. Code valid for 5 minutes
6. Can regenerate if needed

### For Children

1. Open app → Go to child section
2. Tap "Pair with Parent"
3. Tap "Start Scanning"
4. Point camera at parent's QR code
5. Confirm pairing details
6. Tap "Confirm Pairing"
7. Wait for parent to approve (if needed)

## API Endpoints (To Implement)

### 1. Generate Pairing Session

```
POST /api/pairing/generate
Body: { parentId, expiryMinutes? }
Response: { token, expiresAt }
```

### 2. Confirm Pairing

```
POST /api/pairing/confirm
Body: { childId, parentId, token }
Response: { success, pairingId }
```

### 3. Validate Token

```
POST /api/pairing/validate
Body: { token, parentId }
Response: { valid, data }
```

### 4. Remove Pairing

```
DELETE /api/pairing/{pairingId}
Response: { success }
```

## Error Handling

### QR Scanning Errors

- **Invalid QR** - "The QR code is not valid"
- **Expired Token** - "The QR code has expired"
- **Camera Permission** - "Camera permission denied"
- **Invalid JSON** - "Scanned code could not be parsed"

### Pairing Errors

- **User Not Found** - "Parent user not found"
- **Device Not Found** - "Device information missing"
- **Network Error** - "Failed to confirm pairing"

## Future Enhancements

1. **Bulk Pairing** - Add multiple children at once
2. **Pairing History** - Track all past pairings
3. **Remote Unpair** - Remove pairing from distance
4. **Pairing Approval** - Parent manual approval flow
5. **Multiple Parents** - Support shared custody scenarios
6. **QR Code Customization** - Branded QR codes with app logo
7. **Offline Mode** - Store tokens locally for offline pairing
8. **Pairing Expiry** - Auto-expire old pairings
9. **Device Recovery** - Regain access if device lost
10. **Pairing Analytics** - Track pairing success rates

## Files Changed/Created

### New Files

- `app/services/pairing.service.ts` - Pairing service
- `app/_components/QRCodeDisplay.tsx` - QR display component
- `app/_components/QRScanner.tsx` - QR scanner component
- `app/(child)/pair-with-parent.tsx` - Child pairing screen

### Modified Files

- `app/(parent)/add-device/index.tsx` - New QR-based UI
- `app/(child)/_layout.tsx` - Added pairing route

### Dependencies Added

- `react-native-qrcode-svg`
- `expo-camera@~14.0`
- `expo-barcode-scanner`

## Testing Checklist

- [ ] QR code generates correctly
- [ ] QR code displays with proper size
- [ ] Timer counts down accurately
- [ ] Token expires after 5 minutes
- [ ] Camera permission request works
- [ ] QR scanning works with valid code
- [ ] Invalid QR shows error
- [ ] Expired QR shows error
- [ ] Pairing confirmation displays correctly
- [ ] Pairing confirms without errors
- [ ] Parent can regenerate code
- [ ] UI is responsive on different screen sizes
- [ ] Instructions are clear
- [ ] Security info displays correctly

## Notes

- Tokens are 32 characters (A-Z, 0-9)
- Valid for exactly 5 minutes
- Each QR is single-use (parents can regenerate)
- No personal data in QR code
- Works offline (validation online only)
