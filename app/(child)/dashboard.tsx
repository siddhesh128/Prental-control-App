import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  NativeModules,
  Platform,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import PairingService from '../services/pairing.service';
import { useFocusEffect } from '@react-navigation/native';
import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import { db } from '../config/firebase';
import { push, ref, runTransaction, set } from 'firebase/database';

export default function ChildDashboardScreen() {
  const [isChecking, setIsChecking] = useState(true);
  const [isPaired, setIsPaired] = useState(false);
  const [hasUsageAccess, setHasUsageAccess] = useState(Platform.OS !== 'android');
  const lastScreenTimeSyncRef = React.useRef<number | null>(null);
  const promptedUsageAccessRef = React.useRef(false);

  const openUsageSettings = React.useCallback(async () => {
    const usageModule = (NativeModules as any).UsageStatsModule;

    if (!usageModule?.openUsageAccessSettings) {
      Alert.alert(
        'Usage Access Unavailable',
        'Usage Access module is not available in this build. Please rebuild/reinstall the Android app and try again.',
        [
          {
            text: 'Open App Settings',
            onPress: () => {
              Linking.openSettings().catch(() => {
                Alert.alert('Error', 'Could not open app settings.');
              });
            },
          },
          { text: 'OK', style: 'cancel' },
        ]
      );
      return;
    }

    Alert.alert(
      'Enable Usage Access',
      'On the next screen, find Parental Control and enable Usage Access.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Now',
          onPress: () => {
            try {
              usageModule.openUsageAccessSettings();
            } catch (error) {
              console.error('Failed to open usage settings:', error);
              Alert.alert('Error', 'Could not open Usage Access settings.');
            }
          },
        },
      ]
    );
  }, []);

  const syncAndroidSystemUsage = React.useCallback(async (uid: string) => {
    if (Platform.OS !== 'android') {
      return;
    }

    const usageModule = (NativeModules as any).UsageStatsModule;
    if (!usageModule?.isUsageAccessGranted || !usageModule?.getDailyUsageStats) {
      return;
    }

    const accessGranted = await usageModule.isUsageAccessGranted();
    setHasUsageAccess(!!accessGranted);

    if (!accessGranted) {
      if (!promptedUsageAccessRef.current) {
        promptedUsageAccessRef.current = true;
        Alert.alert(
          'Enable Usage Access',
          'To monitor system-wide app usage, allow Usage Access for Parental Control in Android settings.',
          [
            { text: 'Not now', style: 'cancel' },
            {
              text: 'Open settings',
              onPress: () => {
                if (usageModule.openUsageAccessSettings) {
                  usageModule.openUsageAccessSettings();
                }
              },
            },
          ]
        );
      }
      return false;
    }

    const usageStats = await usageModule.getDailyUsageStats();
    if (usageStats && typeof usageStats === 'object') {
      await set(ref(db, `screenTime/${uid}`), usageStats);
    }
    return true;
  }, []);

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
      let storageUsed = 0;
      try {
        const usageModule = (NativeModules as any).UsageStatsModule;
        if (Platform.OS === 'android' && usageModule?.getStorageStats) {
          const storageStats = await usageModule.getStorageStats();
          storageUsed = Number(storageStats?.usedBytes || 0);
        } else {
          const dirInfo = await FileSystem.getInfoAsync(FileSystem.documentDirectory || '');
          storageUsed =
            'size' in dirInfo && typeof dirInfo.size === 'number' ? Number(dirInfo.size) : 0;
        }
      } catch (storageError) {
        console.warn('Failed to read storage stats, continuing with fallback:', storageError);
      }

      const now = Date.now();
      const lastSyncAt = lastScreenTimeSyncRef.current;
      const elapsedMs = lastSyncAt ? Math.max(0, now - lastSyncAt) : 0;
      lastScreenTimeSyncRef.current = now;

      await set(ref(db, `devices/${uid}`), {
        batteryLevel,
        storageUsed,
        isOnline: true,
        lastUpdated: Date.now(),
      });

      const syncedSystemUsage = await syncAndroidSystemUsage(uid);

      // Non-Android fallback tracking when system-wide stats API is unavailable.
      if (Platform.OS !== 'android' || !syncedSystemUsage) {
        if (Platform.OS !== 'android') {
          await runTransaction(ref(db, `screenTime/${uid}/Parental Control App`), (current) => {
            const existingDuration = Number(current?.duration || 0);
            return {
              duration: existingDuration + elapsedMs,
              lastUsed: now,
            };
          });
        }
      }

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
  }, [syncAndroidSystemUsage]);

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
        if (Platform.OS === 'android') {
          setHasUsageAccess(false);
        }
        lastScreenTimeSyncRef.current = null;
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
        <>
          <Text style={styles.subtitle}>
            This device is already linked with parent successfully.
          </Text>
          {Platform.OS === 'android' && !hasUsageAccess && (
            <TouchableOpacity style={styles.button} onPress={openUsageSettings}>
              <Text style={styles.buttonText}>Enable Usage Access</Text>
            </TouchableOpacity>
          )}
        </>
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
