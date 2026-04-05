import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { getAuth } from 'firebase/auth';
import ThemedView from '@/_components/ThemedView';
import ThemedText from '@/_components/ThemedText';
import Colors from '@/constants/Colors';
import PairingService from '@/services/pairing.service';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { limitToLast, off, onValue, orderByChild, query, ref } from 'firebase/database';
import { db } from '../../config/firebase';

type ChildLocationDevice = {
  id: string;
  name: string;
  location?: {
    latitude: number;
    longitude: number;
    timestamp: number;
  };
};

export default function LocationTrackingScreen() {
  const [devices, setDevices] = useState<ChildLocationDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const unsubsRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    let mounted = true;

    const loadDevices = async () => {
      try {
        setLoading(true);
        const uid = getAuth().currentUser?.uid;

        if (!uid) {
          setDevices([]);
          return;
        }

        const pairings = await PairingService.getParentPairings(uid);
        if (!mounted) {
          return;
        }

        const baseDevices: ChildLocationDevice[] = pairings.map((pairing) => ({
          id: pairing.childId,
          name: pairing.childDeviceName || 'Child Device',
        }));
        setDevices(baseDevices);

        unsubsRef.current.forEach((unsubscribe) => unsubscribe());
        unsubsRef.current = [];

        baseDevices.forEach((device) => {
          const locationQuery = query(
            ref(db, `locations/${device.id}`),
            orderByChild('timestamp'),
            limitToLast(1)
          );

          const unsubscribe = onValue(locationQuery, (snapshot) => {
            const locationMap = snapshot.val() || {};
            const latest = Object.values(locationMap)[0] as
              | { latitude?: number; longitude?: number; timestamp?: number }
              | undefined;

            setDevices((current) =>
              current.map((item) =>
                item.id !== device.id
                  ? item
                  : {
                      ...item,
                      location:
                        latest?.latitude != null && latest?.longitude != null
                          ? {
                              latitude: Number(latest.latitude),
                              longitude: Number(latest.longitude),
                              timestamp: Number(latest.timestamp || Date.now()),
                            }
                          : undefined,
                    }
              )
            );
          });

          unsubsRef.current.push(() => off(locationQuery, 'value', unsubscribe));
        });
      } catch (error) {
        console.error('Error loading devices:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadDevices();

    return () => {
      mounted = false;
      unsubsRef.current.forEach((unsubscribe) => unsubscribe());
      unsubsRef.current = [];
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    const uid = getAuth().currentUser?.uid;

    if (uid) {
      const pairings = await PairingService.getParentPairings(uid);
      setDevices(
        pairings.map((pairing) => ({
          id: pairing.childId,
          name: pairing.childDeviceName || 'Child Device',
        }))
      );
    }

    setRefreshing(false);
  };

  const devicesWithLocation = useMemo(() => devices.filter((device) => device.location), [devices]);

  if (loading) {
    return (
      <ThemedView style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Location Tracking',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />

      {devicesWithLocation.length === 0 ? (
        <View style={styles.emptyState}>
          <ThemedText style={styles.emptyStateTitle}>No Location Data</ThemedText>
          <ThemedText style={styles.emptyStateText}>
            No devices are currently sharing their location
          </ThemedText>
        </View>
      ) : (
        <View style={styles.mapContainer}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              latitude: devicesWithLocation[0].location?.latitude || 0,
              longitude: devicesWithLocation[0].location?.longitude || 0,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
          >
            {devicesWithLocation.map(
              (device) =>
                device.location && (
                  <Marker
                    key={device.id}
                    coordinate={{
                      latitude: device.location.latitude,
                      longitude: device.location.longitude,
                    }}
                    title={device.name}
                    description={`Last updated: ${new Date(device.location.timestamp).toLocaleString()}`}
                  />
                )
            )}
          </MapView>
        </View>
      )}

      <ScrollView
        style={styles.deviceList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {devices.map((device) => (
          <View key={device.id} style={styles.deviceItem}>
            <View>
              <ThemedText style={styles.deviceName}>{device.name}</ThemedText>
              {device.location ? (
                <ThemedText style={styles.lastUpdate}>
                  Last updated: {new Date(device.location.timestamp).toLocaleString()}
                </ThemedText>
              ) : (
                <ThemedText style={styles.noLocation}>Location not available</ThemedText>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  map: {
    width: Dimensions.get('window').width,
    height: '100%',
  },
  deviceList: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  lastUpdate: {
    fontSize: 12,
    color: '#666',
  },
  noLocation: {
    fontSize: 12,
    color: '#ff3b30',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
