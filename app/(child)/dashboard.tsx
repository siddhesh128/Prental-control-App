import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import PairingService from '../services/pairing.service';
import { useFocusEffect } from '@react-navigation/native';

export default function ChildDashboardScreen() {
  const [isChecking, setIsChecking] = useState(true);
  const [isPaired, setIsPaired] = useState(false);

  const checkPairing = React.useCallback(async () => {
    try {
      setIsChecking(true);
      const uid = getAuth().currentUser?.uid;
      if (!uid) {
        setIsPaired(false);
        return;
      }

      const pairing = await PairingService.getChildConfirmedPairing(uid);
      setIsPaired(!!pairing);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      checkPairing();
    }, [checkPairing])
  );

  const handlePairWithParent = () => {
    router.push('/(child)/pair-with-parent');
  };

  if (isChecking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Child Dashboard</Text>
      {isPaired ? (
        <Text style={styles.subtitle}>This device is already linked with parent successfully.</Text>
      ) : (
        <>
          <Text style={styles.subtitle}>Tap below to link this device with your parent.</Text>
          <TouchableOpacity style={styles.button} onPress={handlePairWithParent}>
            <Text style={styles.buttonText}>Scan Parent QR Code</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
