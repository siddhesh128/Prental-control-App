import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import PairingService from '../services/pairing.service';
import { useFocusEffect } from '@react-navigation/native';
import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import { db } from '../config/firebase';
import { push, ref, set } from 'firebase/database';

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

  const syncRealtimeMetrics = React.useCallback(async () => {
    try {
      const uid = getAuth().currentUser?.uid;
      if (!uid) {
        return;
      }

      const batteryLevel = await Battery.getBatteryLevelAsync();
      const dirInfo = await FileSystem.getInfoAsync(FileSystem.documentDirectory || '');
      const storageUsed = typeof dirInfo.size === 'number' ? dirInfo.size : 0;

      await set(ref(db, `devices/${uid}`), {
        batteryLevel,
        storageUsed,
        isOnline: true,
        lastUpdated: Date.now(),
      });

      const permission = await Location.getForegroundPermissionsAsync();
      const hasPermission =
        permission.status === 'granted' ||
        (await Location.requestForegroundPermissionsAsync()).status === 'granted';

      if (hasPermission) {
        const currentLocation = await Location.getCurrentPositionAsync({});
        await push(ref(db, `locations/${uid}`), {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error('Failed to sync child realtime metrics:', error);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      checkPairing();

      let interval: ReturnType<typeof setInterval> | null = null;
      const startSync = async () => {
        await syncRealtimeMetrics();
        interval = setInterval(syncRealtimeMetrics, 15000);
      };

      startSync();

      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    }, [checkPairing, syncRealtimeMetrics])
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
