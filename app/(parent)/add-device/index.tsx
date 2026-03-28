import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useRouter } from 'expo-router';
import ThemedText from '@/_components/ThemedText';
import ThemedView from '@/_components/ThemedView';
import QRCodeDisplay from '@/_components/QRCodeDisplay';
import { IconSymbol } from '@/_components/ui/IconSymbol';
import Colors from '@/constants/Colors';
import PairingService from '@/services/pairing.service';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { getAuth } from 'firebase/auth';

type NavigationProp = NativeStackNavigationProp<any>;

export default function AddDeviceScreen() {
  const navigation = useNavigation<NavigationProp>();
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);
  const userId = user?.id ?? user?.uid;
  const firebaseUid = getAuth().currentUser?.uid;
  const [pairingData, setPairingData] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [pairingCompleted, setPairingCompleted] = useState(false);

  useEffect(() => {
    // Set header
    navigation.setOptions({
      title: 'Add Device',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    });
  }, [navigation]);

  useEffect(() => {
    if (userId) {
      generatePairingToken();
    }
  }, [userId]);

  useEffect(() => {
    if (!pairingData || pairingCompleted) {
      return;
    }

    const decoded = PairingService.decodePairingData(pairingData);
    if (!decoded?.token) {
      return;
    }

    const interval = setInterval(async () => {
      const pairing = await PairingService.getConfirmedPairingByToken(decoded.token, firebaseUid);
      if (pairing) {
        setPairingCompleted(true);
        clearInterval(interval);
        Alert.alert(
          'Child Paired Successfully',
          `${pairing.childDeviceName || 'Child device'} has been linked to your account.`,
          [
            {
              text: 'Go to Devices',
              onPress: () => router.replace('/(parent)/devices'),
            },
          ]
        );
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [pairingData, pairingCompleted, firebaseUid]);

  // Timer for token expiry
  useEffect(() => {
    if (timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining]);

  const generatePairingToken = async () => {
    try {
      if (!userId || !firebaseUid) {
        Alert.alert(
          'Authentication Required',
          'Please sign in with your account to generate a pairing code.'
        );
        return;
      }

      setLoading(true);

      // Call backend function to generate pairing code
      const data = await PairingService.createPairingSession(firebaseUid, firebaseUid);

      setPairingData(data);
      setPairingCompleted(false);

      // Decode to get expiry time
      const decodedData = PairingService.decodePairingData(data);
      if (decodedData) {
        setTimeRemaining(PairingService.getTimeRemaining(decodedData.expiresAt));
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to generate pairing code'
      );
      console.error('Pairing generation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateCode = () => {
    Alert.alert(
      'Regenerate Code',
      'This will create a new pairing code. The old one will expire.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Regenerate',
          style: 'default',
          onPress: generatePairingToken,
        },
      ]
    );
  };

  const handleViewInstructions = () => {
    Alert.alert(
      'Pairing Instructions',
      `1. This QR code is valid for 5 minutes
2. Show this screen to the child's device
3. On the child device, go to "Pair with Parent"
4. Tap "Scan QR Code"
5. Point the camera at this QR code
6. Confirm the pairing
7. The device will be added to your family

Notes:
• Each QR code expires after 5 minutes
• You can regenerate a new code if needed
• Make sure the child device has Parental Control installed`
    );
  };

  const handleGoToLogin = () => {
    navigation.goBack();
  };

  if (!userId || !firebaseUid) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centerContent}>
          <ThemedText style={styles.sectionTitle}>Authentication Required</ThemedText>
          <ThemedText style={styles.sectionDescription}>
            Please sign in with a full account before generating a pairing code.
          </ThemedText>
          <TouchableOpacity
            style={[styles.button, styles.regenerateButton]}
            onPress={handleGoToLogin}
          >
            <ThemedText style={styles.buttonText}>Go Back</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  if (!pairingData) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
          <ThemedText style={styles.loadingText}>
            {loading ? 'Generating pairing code...' : 'Preparing pairing...'}
          </ThemedText>
          {!loading && (
            <TouchableOpacity
              style={[styles.button, styles.regenerateButton]}
              onPress={generatePairingToken}
            >
              <ThemedText style={styles.buttonText}>Try Again</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Header Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Add Child Device</ThemedText>
          <ThemedText style={styles.sectionDescription}>
            Use this QR code to pair a child's device with your account
          </ThemedText>
        </View>

        {/* QR Code Display */}
        <View style={styles.qrSection}>
          <QRCodeDisplay
            data={pairingData}
            size={280}
            title="Pairing QR Code"
            description="Let the child scan this with their device"
          />
        </View>

        {/* Timer Section */}
        <View style={[styles.section, styles.timerSection]}>
          <View style={styles.timerInfo}>
            <IconSymbol name="timer" size={24} color={Colors.light.tint} />
            <View style={styles.timerText}>
              <ThemedText style={styles.timerLabel}>Code expires in</ThemedText>
              <ThemedText style={styles.timerValue}>{timeRemaining}s</ThemedText>
            </View>
          </View>
          {timeRemaining < 30 && (
            <ThemedText style={styles.warningText}>
              Code expiring soon! Regenerate if needed.
            </ThemedText>
          )}
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <ThemedText style={styles.instructionsTitle}>How it works:</ThemedText>
          <View style={styles.instructionsList}>
            <View style={styles.instructionItem}>
              <ThemedText style={styles.stepNumber}>1</ThemedText>
              <ThemedText style={styles.stepText}>Share this QR code with the child</ThemedText>
            </View>
            <View style={styles.instructionItem}>
              <ThemedText style={styles.stepNumber}>2</ThemedText>
              <ThemedText style={styles.stepText}>Child opens "Pair with Parent"</ThemedText>
            </View>
            <View style={styles.instructionItem}>
              <ThemedText style={styles.stepNumber}>3</ThemedText>
              <ThemedText style={styles.stepText}>Child scans this QR code</ThemedText>
            </View>
            <View style={styles.instructionItem}>
              <ThemedText style={styles.stepNumber}>4</ThemedText>
              <ThemedText style={styles.stepText}>Device gets paired automatically</ThemedText>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.button, styles.regenerateButton]}
            onPress={handleRegenerateCode}
            disabled={loading}
          >
            <IconSymbol name="arrow.clockwise" size={20} color="#fff" />
            <ThemedText style={styles.buttonText}>Regenerate Code</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.infoButton]}
            onPress={handleViewInstructions}
          >
            <IconSymbol name="info.circle" size={20} color={Colors.light.tint} />
            <ThemedText style={styles.infoButtonText}>View Full Instructions</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <IconSymbol name="lock.shield" size={20} color={Colors.light.tint} />
          <View style={styles.infoContent}>
            <ThemedText style={styles.infoTitle}>Secure Pairing</ThemedText>
            <ThemedText style={styles.infoText}>
              Each QR code is unique and expires after 5 minutes. Only devices that scan this code
              within the time limit can be paired.
            </ThemedText>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  timerSection: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
  },
  timerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  timerText: {
    flex: 1,
  },
  timerLabel: {
    fontSize: 12,
    color: '#999',
  },
  timerValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.tint,
  },
  warningText: {
    fontSize: 12,
    color: '#ff9800',
    fontWeight: '600',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  instructionsList: {
    gap: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: Colors.light.tint,
    width: 28,
    height: 28,
    borderRadius: 14,
    textAlign: 'center',
    lineHeight: 28,
  },
  stepText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 22,
  },
  buttonGroup: {
    gap: 12,
    marginBottom: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  regenerateButton: {
    backgroundColor: Colors.light.tint,
  },
  infoButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: Colors.light.tint,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoButtonText: {
    color: Colors.light.tint,
    fontSize: 14,
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
