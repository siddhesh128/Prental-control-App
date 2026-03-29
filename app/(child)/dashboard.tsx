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
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import PairingService from '../services/pairing.service';
import { useFocusEffect } from '@react-navigation/native';
import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import { db } from '../config/firebase';
import { push, ref, runTransaction, set, update } from 'firebase/database';

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
    if (!usageModule?.getDailyUsageStats) {
      return;
    }

    let accessGranted = false;
    if (usageModule?.isUsageAccessGranted) {
      try {
        accessGranted = !!(await usageModule.isUsageAccessGranted());
      } catch {
        accessGranted = false;
      }
    }

    let usageStats: Record<string, any> = {};
    try {
      const rawUsage = await usageModule.getDailyUsageStats();
      if (rawUsage && typeof rawUsage === 'object') {
        usageStats = rawUsage as Record<string, any>;
      }
    } catch (usageError) {
      console.warn('Failed to fetch daily usage stats:', usageError);
    }

    const hasUsageData = Object.keys(usageStats).length > 0;
    setHasUsageAccess(accessGranted || hasUsageData);

    if (!accessGranted && !hasUsageData) {
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
    }

    // Persist even empty objects so stale screen-time entries don't stick forever.
    await set(ref(db, `screenTime/${uid}`), usageStats);

    const usageValues = Object.values(usageStats) as Array<{
      duration?: number;
      lastUsed?: number;
    }>;
    const totalFromUsageMap = usageValues.reduce(
      (acc, item) => acc + Number(item?.duration || 0),
      0
    );
    const latestUsageTimestamp = usageValues.reduce(
      (latest, item) => Math.max(latest, Number(item?.lastUsed || 0)),
      0
    );

    let appsUsedToday = Object.keys(usageStats).length;
    let totalScreenTimeMs = totalFromUsageMap;

    if (usageModule?.getDailyUsageSummary) {
      try {
        const summary = await usageModule.getDailyUsageSummary();
        if (summary && typeof summary === 'object') {
          appsUsedToday = Number(summary.appsUsedToday || appsUsedToday);
          totalScreenTimeMs = Number(summary.totalScreenTimeMs || totalScreenTimeMs);
        }
      } catch (summaryError) {
        console.warn('Failed to fetch usage summary:', summaryError);
      }
    }

    await update(ref(db, `devices/${uid}`), {
      screenTimeToday: totalScreenTimeMs,
      appsUsedToday,
      usageLastUpdated: Date.now(),
      screenTimeMapLastUsed: latestUsageTimestamp,
    });

    return accessGranted || hasUsageData;
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

      await update(ref(db, `devices/${uid}`), {
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6CC6FF" />
        <Text style={styles.loadingText}>Preparing dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.bgTop} />
      <View style={styles.bgBottom} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="shield-checkmark-outline" size={28} color="#8FD4FF" />
          </View>
          <Text style={styles.title}>Child Dashboard</Text>
          <Text style={styles.subtitle}>
            Live sync is active for battery, storage and location.
          </Text>
        </View>

        <View style={styles.quickGrid}>
          <View style={styles.quickCard}>
            <Ionicons name="time-outline" size={22} color="#3F6EF3" />
            <Text style={styles.quickTitle}>Screen Time</Text>
            <Text style={styles.quickDesc}>Synced throughout the day</Text>
          </View>

          <View style={styles.quickCard}>
            <Ionicons name="apps-outline" size={22} color="#0E9C87" />
            <Text style={styles.quickTitle}>Apps Used</Text>
            <Text style={styles.quickDesc}>Tracks overall app activity</Text>
          </View>

          <View style={styles.quickCard}>
            <Ionicons name="location-outline" size={22} color="#D97706" />
            <Text style={styles.quickTitle}>Location</Text>
            <Text style={styles.quickDesc}>Realtime updates enabled</Text>
          </View>

          <View style={styles.quickCard}>
            <Ionicons name="battery-half-outline" size={22} color="#A855F7" />
            <Text style={styles.quickTitle}>Device Health</Text>
            <Text style={styles.quickDesc}>Battery and storage usage</Text>
          </View>
        </View>

        {isPaired ? (
          <View style={styles.statusCard}>
            <View style={styles.rowCenter}>
              <Ionicons name="link-outline" size={20} color="#0E9C87" />
              <Text style={styles.statusTitle}>Paired with Parent</Text>
            </View>
            <Text style={styles.statusDescription}>
              This child device is connected and sending monitoring updates.
            </Text>

            {Platform.OS === 'android' && !hasUsageAccess && (
              <TouchableOpacity style={styles.secondaryButton} onPress={openUsageSettings}>
                <Ionicons name="settings-outline" size={18} color="#123A82" />
                <Text style={styles.secondaryButtonText}>Enable Usage Access</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.statusCard}>
            <View style={styles.rowCenter}>
              <Ionicons name="qr-code-outline" size={20} color="#3F6EF3" />
              <Text style={styles.statusTitle}>Not Paired Yet</Text>
            </View>
            <Text style={styles.statusDescription}>
              Connect this device by scanning the parent QR code.
            </Text>

            <TouchableOpacity style={styles.primaryButton} onPress={handlePairWithParent}>
              <Ionicons name="scan-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Scan Parent QR Code</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#091A35',
  },
  bgTop: {
    position: 'absolute',
    top: -90,
    right: -70,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(69, 154, 255, 0.32)',
  },
  bgBottom: {
    position: 'absolute',
    bottom: -90,
    left: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(77, 255, 226, 0.2)',
  },
  content: {
    padding: 18,
    paddingBottom: 28,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#091A35',
  },
  loadingText: {
    marginTop: 10,
    color: '#D5E3FF',
    fontSize: 14,
  },
  headerCard: {
    borderRadius: 22,
    backgroundColor: 'rgba(15, 35, 72, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 20,
    marginBottom: 14,
  },
  headerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(143, 212, 255, 0.15)',
    marginBottom: 10,
  },
  title: {
    fontSize: 30,
    color: '#F6FAFF',
    fontFamily: 'SpaceMono',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#BFD2F4',
    marginTop: 6,
    lineHeight: 20,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickCard: {
    width: '48.5%',
    borderRadius: 16,
    backgroundColor: '#F4F7FD',
    padding: 14,
    minHeight: 116,
  },
  quickTitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#1B2B48',
  },
  quickDesc: {
    marginTop: 4,
    fontSize: 12,
    color: '#5E6D86',
    lineHeight: 17,
  },
  statusCard: {
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#16243E',
  },
  statusDescription: {
    marginTop: 8,
    color: '#596A86',
    fontSize: 13,
    lineHeight: 19,
  },
  primaryButton: {
    marginTop: 14,
    backgroundColor: '#123A82',
    borderRadius: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryButton: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#123A82',
    borderRadius: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#123A82',
    fontWeight: '700',
    fontSize: 14,
  },
});
