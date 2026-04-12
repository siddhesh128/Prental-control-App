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

export default function ChildDashboardScreen() {
  const [isChecking, setIsChecking] = useState(true);
  const [isPaired, setIsPaired] = useState(false);
  const [hasUsageAccess, setHasUsageAccess] = useState(Platform.OS !== 'android');
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

  const checkUsageAccess = React.useCallback(async () => {
    if (Platform.OS !== 'android') {
      setHasUsageAccess(true);
      return;
    }

    const usageModule = (NativeModules as any).UsageStatsModule;
    if (!usageModule) {
      setHasUsageAccess(false);
      return;
    }

    try {
      const hasAccess = usageModule.isUsageAccessGranted
        ? !!(await usageModule.isUsageAccessGranted())
        : false;
      setHasUsageAccess(hasAccess);

      if (!hasAccess && !promptedUsageAccessRef.current) {
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
    } catch {
      setHasUsageAccess(false);
    }
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

  useFocusEffect(
    React.useCallback(() => {
      checkPairing();
      checkUsageAccess();
      return undefined;
    }, [checkPairing, checkUsageAccess])
  );

  const handlePairWithParent = () => {
    router.push('/(child)/pair-with-parent');
  };

  const handleOpenTasks = () => {
    router.push('/(child)/tasks');
  };

  const handleOpenRewards = () => {
    router.push('/(child)/rewards');
  };

  const handleOpenHomework = () => {
    router.push('/(child)/homework');
  };

  const handleOpenExercise = () => {
    router.push('/(child)/exercise');
  };

  const handleOpenWellness = () => {
    router.push('/(child)/wellness');
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
          <TouchableOpacity
            style={styles.quickCard}
            onPress={handleOpenWellness}
            activeOpacity={0.88}
          >
            <Ionicons name="pulse-outline" size={22} color="#0E9C87" />
            <Text style={styles.quickTitle}>Wellness</Text>
            <Text style={styles.quickDesc}>See posture alerts and break reminders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={handleOpenExercise}
            activeOpacity={0.88}
          >
            <Ionicons name="fitness-outline" size={22} color="#D04D8A" />
            <Text style={styles.quickTitle}>Exercise</Text>
            <Text style={styles.quickDesc}>Earn screen time with verified reps</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={handleOpenHomework}
            activeOpacity={0.88}
          >
            <Ionicons name="school-outline" size={22} color="#0DA67A" />
            <Text style={styles.quickTitle}>Homework</Text>
            <Text style={styles.quickDesc}>Capture before and after work</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickCard} onPress={handleOpenTasks} activeOpacity={0.88}>
            <Ionicons name="checkbox-outline" size={22} color="#0B4A9A" />
            <Text style={styles.quickTitle}>Tasks</Text>
            <Text style={styles.quickDesc}>Submit chores and homework for review</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={handleOpenRewards}
            activeOpacity={0.88}
          >
            <Ionicons name="trophy-outline" size={22} color="#D97706" />
            <Text style={styles.quickTitle}>Rewards</Text>
            <Text style={styles.quickDesc}>View points and unlock privileges</Text>
          </TouchableOpacity>

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
