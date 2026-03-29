import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ThemedText from '@/_components/ThemedText';
import ThemedView from '@/_components/ThemedView';
import Colors from '@/constants/Colors';
import DeviceManagementService, { ChildDevice } from '@/services/device-management.service';
import PairingService from '@/services/pairing.service';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getAuth } from 'firebase/auth';
import { db } from '../../config/firebase';
import { off, onValue, ref } from 'firebase/database';

type NavigationProp = NativeStackNavigationProp<any>;
type PairingDevice = ChildDevice & { childId?: string };

const formatLastSeen = (lastSeenIso: string): string => {
  const date = new Date(lastSeenIso);
  if (Number.isNaN(date.getTime())) {
    return 'unknown';
  }

  const deltaMs = Date.now() - date.getTime();
  if (deltaMs < 60_000) {
    return 'just now';
  }
  if (deltaMs < 3_600_000) {
    return `${Math.floor(deltaMs / 60_000)}m ago`;
  }
  if (deltaMs < 86_400_000) {
    return `${Math.floor(deltaMs / 3_600_000)}h ago`;
  }
  return `${Math.floor(deltaMs / 86_400_000)}d ago`;
};

export default function DevicesScreen() {
  const router = useRouter();
  const navigation = useNavigation<NavigationProp>();
  const [devices, setDevices] = useState<PairingDevice[]>([]);
  const [loading, setLoading] = useState(true);

  const toTimestampMillis = (value: any): number => {
    if (typeof value === 'number') {
      return value < 1_000_000_000_000 ? value * 1000 : value;
    }

    if (value && typeof value.toMillis === 'function') {
      return value.toMillis();
    }

    if (value && typeof value.seconds === 'number') {
      return value.seconds * 1000;
    }

    if (typeof value === 'string') {
      const parsed = Date.parse(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    return Date.now();
  };

  const handleAddDevice = () => {
    router.push('/(parent)/add-device');
  };

  // Configure header with add button
  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Devices',
      headerStyle: {
        backgroundColor: '#0A1B35',
      },
      headerTintColor: '#E8F2FF',
      headerTitleStyle: {
        color: '#E8F2FF',
        fontWeight: '700',
      },
      headerShadowVisible: false,
      headerRight: () => (
        <TouchableOpacity onPress={handleAddDevice} style={styles.headerButton}>
          <Ionicons name="add-circle-outline" size={24} color="#8FD4FF" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const loadDevices = async () => {
    try {
      setLoading(true);
      const uid = getAuth().currentUser?.uid;

      if (uid) {
        const pairings = await PairingService.getParentPairings(uid);
        const pairedDevices = pairings.map((pairing) => ({
          id: pairing.id,
          childId: pairing.childId,
          name: pairing.childDeviceName || 'Child Device',
          deviceModel: 'Linked Device',
          platform: 'android',
          status: 'offline',
          batteryLevel: 0,
          lastSeen: new Date(
            toTimestampMillis(pairing.confirmedAt ?? pairing.createdAt)
          ).toISOString(),
          restrictions: {
            appUsageLimits: false,
            contentFiltering: true,
            screenTime: false,
            appInstallation: true,
          },
        }));

        setDevices(pairedDevices as PairingDevice[]);

        pairedDevices.forEach((device) => {
          if (!device.childId) {
            return;
          }

          const deviceRef = ref(db, `devices/${device.childId}`);
          onValue(deviceRef, (snapshot) => {
            const live = snapshot.val() || {};
            const battery = Number(live.batteryLevel ?? 0);
            const normalizedBattery = battery > 1 ? battery / 100 : battery;
            const lastUpdatedMs = toTimestampMillis(live.lastUpdated ?? Date.now());

            setDevices((current) =>
              current.map((item) => {
                if (item.id !== device.id) {
                  return item;
                }

                const isOnline = Date.now() - lastUpdatedMs <= 70_000;
                return {
                  ...item,
                  status: isOnline ? 'online' : 'offline',
                  batteryLevel: Math.max(0, Math.min(1, normalizedBattery)),
                  lastSeen: new Date(lastUpdatedMs).toISOString(),
                };
              })
            );
          });
        });
      } else {
        const deviceList = await DeviceManagementService.getChildDevices();
        setDevices(deviceList as PairingDevice[]);
      }
    } catch (error) {
      console.error('Error loading devices:', error);
      Alert.alert('Error', 'Failed to load devices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadDevices();

      return () => {
        devices.forEach((device) => {
          if (device.childId) {
            off(ref(db, `devices/${device.childId}`));
          }
        });
      };
    }, [])
  );

  const handleDevicePress = (device: ChildDevice & { childId?: string }) => {
    router.push({
      pathname: '/(parent)/devices/[id]',
      params: {
        id: device.id,
        childId: device.childId || '',
        name: device.name,
      },
    });
  };

  const handleDeviceAction = async (deviceId: string, action: string) => {
    try {
      switch (action) {
        case 'remove':
          Alert.alert(
            'Remove Device',
            'Are you sure you want to remove this device? This action cannot be undone.',
            [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                  const uid = getAuth().currentUser?.uid;
                  if (uid) {
                    await PairingService.unpairDevice(deviceId);
                  } else {
                    await DeviceManagementService.removeDevice(deviceId);
                  }
                  loadDevices();
                },
              },
            ]
          );
          break;
        case 'restrictions':
          router.push(`/device-restrictions/${deviceId}`);
          break;
        default:
          console.warn('Unknown action:', action);
      }
    } catch (error) {
      console.error('Error performing device action:', error);
      Alert.alert('Error', 'Failed to perform action. Please try again.');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.bgOrbTop} />
      <View style={styles.bgOrbBottom} />

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
        </View>
      ) : devices.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="phone-portrait-outline" size={46} color={Colors.light.tint} />
          </View>
          <ThemedText style={styles.emptyStateTitle}>No Devices</ThemedText>
          <ThemedText style={styles.emptyStateText}>
            Add a child device to start monitoring
          </ThemedText>
          <TouchableOpacity style={styles.addButton} onPress={handleAddDevice}>
            <Ionicons name="add" size={20} color="#fff" />
            <ThemedText style={styles.addButtonText}>Add Device</ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
          <View style={styles.heroCard}>
            <ThemedText style={styles.heroTitle}>Linked Devices</ThemedText>
            <ThemedText style={styles.heroSubtitle}>
              Live battery and activity sync from child phones
            </ThemedText>
          </View>

          {devices.map((device) => (
            <TouchableOpacity
              key={device.id}
              style={styles.deviceCard}
              onPress={() => handleDevicePress(device as PairingDevice)}
              activeOpacity={0.9}
            >
              <View style={styles.deviceInfo}>
                <View style={styles.deviceHeader}>
                  <View style={styles.nameWrap}>
                    <View
                      style={[
                        styles.deviceIcon,
                        {
                          backgroundColor:
                            device.status === 'online'
                              ? 'rgba(13,166,122,0.16)'
                              : 'rgba(148,163,184,0.22)',
                        },
                      ]}
                    >
                      <Ionicons
                        name="phone-portrait-outline"
                        size={18}
                        color={device.status === 'online' ? '#0DA67A' : '#64748B'}
                      />
                    </View>
                    <View>
                      <ThemedText style={styles.deviceName}>{device.name}</ThemedText>
                      <ThemedText style={styles.deviceModel}>{device.deviceModel}</ThemedText>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: device.status === 'online' ? '#DCFCE7' : '#E2E8F0' },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: device.status === 'online' ? '#16A34A' : '#64748B' },
                      ]}
                    />
                    <ThemedText style={styles.statusLabel}>
                      {device.status === 'online' ? 'Online' : 'Offline'}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.deviceStats}>
                  <View style={styles.statItem}>
                    <Ionicons name="battery-half-outline" size={16} color="#334155" />
                    <ThemedText style={styles.statText}>
                      {Math.round((device.batteryLevel || 0) * 100)}%
                    </ThemedText>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="time-outline" size={16} color="#334155" />
                    <ThemedText style={styles.statText}>
                      Last seen: {formatLastSeen(device.lastSeen)}
                    </ThemedText>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleDeviceAction(device.id, 'remove')}
              >
                <Ionicons name="trash-outline" size={20} color="#DC2626" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1B35',
  },
  bgOrbTop: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(61,181,255,0.24)',
    top: -90,
    right: -70,
  },
  bgOrbBottom: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(126,119,255,0.2)',
    bottom: -110,
    left: -70,
  },
  headerButton: {
    marginRight: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  contentInner: {
    paddingBottom: 24,
  },
  heroCard: {
    marginTop: 14,
    marginBottom: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(17, 40, 79, 0.9)',
    padding: 16,
  },
  heroTitle: {
    color: '#F6FAFF',
    fontSize: 24,
    fontFamily: 'SpaceMono',
  },
  heroSubtitle: {
    color: '#C2D5F2',
    marginTop: 6,
    fontSize: 13,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIconWrap: {
    width: 86,
    height: 86,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(52, 148, 255, 0.14)',
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F7FD',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  nameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deviceIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2B48',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    color: '#1F334F',
    fontSize: 12,
    fontWeight: '700',
  },
  deviceModel: {
    fontSize: 12,
    color: '#5F6F89',
  },
  deviceStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#37495F',
    fontWeight: '600',
  },
  removeButton: {
    padding: 10,
    marginLeft: 8,
  },
});
