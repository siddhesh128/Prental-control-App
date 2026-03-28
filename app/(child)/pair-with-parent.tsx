import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import QRScanner from '@/_components/QRScanner';
import ThemedText from '@/_components/ThemedText';
import ThemedView from '@/_components/ThemedView';
import { IconSymbol } from '@/_components/ui/IconSymbol';
import Colors from '@/constants/Colors';
import PairingService, { PairingData } from '@/services/pairing.service';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { getAuth } from 'firebase/auth';

export default function PairWithParentScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const userId = (user as any)?.id ?? (user as any)?.uid;
  const firebaseUid = getAuth().currentUser?.uid;

  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scannedData, setScannedData] = useState<PairingData | null>(null);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Pair with Parent',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    });
  }, [navigation]);

  const handleStartScanning = () => {
    setScanning(true);
    setScannedData(null);
  };

  const handleScanQR = async (qrData: string) => {
    try {
      // Parse the QR data
      const data = PairingService.decodePairingData(qrData);

      if (!data) {
        Alert.alert(
          'Invalid QR Code',
          "The QR code is not valid. Please try scanning the parent's code again."
        );
        setScanning(false);
        return;
      }

      // Check if token is still valid
      if (!PairingService.isTokenValid(data.expiresAt)) {
        Alert.alert(
          'Expired QR Code',
          'The QR code has expired. Please ask the parent to generate a new one.'
        );
        setScanning(false);
        return;
      }

      // Show confirmation dialog
      setScannedData(data);
      setScanning(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to scan QR code. Please try again.');
      console.error('Scan error:', error);
      setScanning(false);
    }
  };

  const handleConfirmPairing = async () => {
    if (!scannedData || !userId || !firebaseUid) {
      Alert.alert('Error', 'Missing required information');
      return;
    }

    try {
      setLoading(true);

      // Call backend API to confirm pairing
      const displayName = (user as any)?.displayName;
      const deviceName = displayName ? `${displayName}'s Device` : 'Child Device';
      await PairingService.confirmPairing(
        firebaseUid,
        scannedData.parentId,
        scannedData.token,
        deviceName
      );

      Alert.alert('Success', 'You have been paired with the parent device successfully!', [
        {
          text: 'Go to Dashboard',
          onPress: () => {
            setScannedData(null);
            router.replace('/(child)/dashboard');
          },
        },
      ]);
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to pair with parent. Please try again.'
      );
      console.error('Pairing error:', error);
      setScannedData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPairing = () => {
    setScannedData(null);
  };

  const handleCancelScanning = () => {
    setScanning(false);
  };

  if (scanning) {
    return (
      <QRScanner
        onScan={handleScanQR}
        onCancel={handleCancelScanning}
        title="Scan Parent's QR Code"
        description="Point your camera at the parent's pairing code"
      />
    );
  }

  if (scannedData) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
            {/* Success Icon */}
            <View style={styles.checkmarkContainer}>
              <IconSymbol name="checkmark.circle.fill" size={80} color="#4CAF50" />
            </View>

            {/* Message */}
            <ThemedText style={styles.title}>QR Code Scanned!</ThemedText>
            <ThemedText style={styles.subtitle}>
              Confirm that you want to be paired with this parent account?
            </ThemedText>

            {/* Details */}
            <View style={styles.detailsBox}>
              <View style={styles.detailItem}>
                <ThemedText style={styles.detailLabel}>Parent ID</ThemedText>
                <ThemedText style={styles.detailValue}>{scannedData.parentId}</ThemedText>
              </View>
              <View style={styles.divider} />
              <View style={styles.detailItem}>
                <ThemedText style={styles.detailLabel}>Token Valid</ThemedText>
                <ThemedText style={[styles.detailValue, { color: '#4CAF50' }]}>
                  ✓ Confirmed
                </ThemedText>
              </View>
            </View>

            {/* Security Info */}
            <View style={styles.infoBox}>
              <IconSymbol name="lock.shield" size={20} color={Colors.light.tint} />
              <View style={styles.infoContent}>
                <ThemedText style={styles.infoTitle}>Secure Connection</ThemedText>
                <ThemedText style={styles.infoText}>
                  This connection is secured with encryption. Your activity will be monitored by the
                  parent account.
                </ThemedText>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.button, styles.confirmButton]}
                onPress={handleConfirmPairing}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <IconSymbol name="checkmark" size={20} color="#fff" />
                    <ThemedText style={styles.buttonText}>Confirm Pairing</ThemedText>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancelPairing}
                disabled={loading}
              >
                <IconSymbol name="xmark" size={20} color={Colors.light.tint} />
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <IconSymbol name="qrcode" size={80} color={Colors.light.tint} />
          </View>

          {/* Title */}
          <ThemedText style={styles.title}>Pair with Parent</ThemedText>
          <ThemedText style={styles.subtitle}>
            Scan the QR code from your parent's device to establish a secure connection
          </ThemedText>

          {/* Features List */}
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <View style={styles.featureBullet}>
                <ThemedText style={styles.featureBulletText}>•</ThemedText>
              </View>
              <ThemedText style={styles.featureText}>
                Your parent can monitor your device activity
              </ThemedText>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureBullet}>
                <ThemedText style={styles.featureBulletText}>•</ThemedText>
              </View>
              <ThemedText style={styles.featureText}>Track your location in real-time</ThemedText>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureBullet}>
                <ThemedText style={styles.featureBulletText}>•</ThemedText>
              </View>
              <ThemedText style={styles.featureText}>
                Receive alerts for important events
              </ThemedText>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureBullet}>
                <ThemedText style={styles.featureBulletText}>•</ThemedText>
              </View>
              <ThemedText style={styles.featureText}>
                Access app and content restrictions
              </ThemedText>
            </View>
          </View>

          {/* Main Button */}
          <TouchableOpacity
            style={[styles.button, styles.scanButton]}
            onPress={handleStartScanning}
          >
            <IconSymbol name="qrcode" size={24} color="#fff" />
            <ThemedText style={styles.buttonText}>Start Scanning</ThemedText>
          </TouchableOpacity>

          {/* Instructions */}
          <View style={styles.instructionsBox}>
            <ThemedText style={styles.instructionsTitle}>How to pair:</ThemedText>
            <View style={styles.instructionsList}>
              <View style={styles.instructionStep}>
                <ThemedText style={styles.stepNumber}>1</ThemedText>
                <ThemedText style={styles.stepText}>Ask your parent for their QR code</ThemedText>
              </View>
              <View style={styles.instructionStep}>
                <ThemedText style={styles.stepNumber}>2</ThemedText>
                <ThemedText style={styles.stepText}>Tap "Start Scanning" below</ThemedText>
              </View>
              <View style={styles.instructionStep}>
                <ThemedText style={styles.stepNumber}>3</ThemedText>
                <ThemedText style={styles.stepText}>Scan the parent's QR code</ThemedText>
              </View>
              <View style={styles.instructionStep}>
                <ThemedText style={styles.stepNumber}>4</ThemedText>
                <ThemedText style={styles.stepText}>Confirm the pairing on your screen</ThemedText>
              </View>
            </View>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <IconSymbol name="info.circle" size={20} color={Colors.light.tint} />
            <View style={styles.infoContent}>
              <ThemedText style={styles.infoTitle}>Important</ThemedText>
              <ThemedText style={styles.infoText}>
                Your parent can approve and deny this pairing. Once paired, they will be able to
                monitor your device.
              </ThemedText>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 32,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 24,
  },
  checkmarkContainer: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  featuresList: {
    gap: 16,
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  featureBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  featureBulletText: {
    color: '#fff',
    fontSize: 20,
    lineHeight: 24,
  },
  featureText: {
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
  },
  buttonGroup: {
    gap: 12,
    marginBottom: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  scanButton: {
    backgroundColor: Colors.light.tint,
    marginBottom: 24,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: Colors.light.tint,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: Colors.light.tint,
    fontSize: 16,
    fontWeight: '600',
  },
  instructionsBox: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  instructionsList: {
    gap: 12,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: Colors.light.tint,
    width: 32,
    height: 32,
    borderRadius: 16,
    textAlign: 'center',
    lineHeight: 32,
    flexShrink: 0,
  },
  stepText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  detailsBox: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  detailItem: {
    paddingVertical: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
});
