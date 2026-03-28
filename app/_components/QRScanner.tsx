import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Text } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import ThemedText from './ThemedText';
import Colors from '@/constants/Colors';

interface QRScannerProps {
  onScan: (data: string) => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
}

export default function QRScanner({
  onScan,
  onCancel,
  title = 'Scan QR Code',
  description = 'Point your camera at the QR code',
}: QRScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    requestPermission();
  }, []);

  const handleBarCodeScanned = ({ data }: { data: string; type: string }) => {
    setScanned(true);

    // Validate QR data
    if (!data || data.trim().length === 0) {
      Alert.alert('Invalid QR', 'The QR code is invalid. Please try again.');
      setScanned(false);
      return;
    }

    // Call the onScan callback
    onScan(data);
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ThemedText>Requesting camera permission...</ThemedText>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.errorText}>Camera permission denied</ThemedText>
        <TouchableOpacity style={styles.button} onPress={() => requestPermission()}>
          <Text style={styles.buttonText}>Allow Camera</Text>
        </TouchableOpacity>
        {onCancel && (
          <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Go Back</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        <ThemedText style={styles.description}>{description}</ThemedText>
      </View>

      <CameraView
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barCodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        style={styles.camera}
      >
        <View style={styles.overlay}>
          <View style={styles.scanFrame} />
        </View>
      </CameraView>

      {scanned && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.button} onPress={() => setScanned(false)}>
            <Text style={styles.buttonText}>Scan Again</Text>
          </TouchableOpacity>
          {onCancel && (
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#000',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#ccc',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#4CAF50',
    backgroundColor: 'transparent',
    borderRadius: 12,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    backgroundColor: '#000',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
  },
});
