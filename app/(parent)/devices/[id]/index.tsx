import React from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ThemedText from '@/_components/ThemedText';
import ThemedView from '@/_components/ThemedView';
import { IconSymbol } from '@/_components/ui/IconSymbol';
import Colors from '@/constants/Colors';
import { db } from '../../../config/firebase';
import { limitToLast, off, onValue, orderByChild, query, ref } from 'firebase/database';

type NavigationProp = NativeStackNavigationProp<any>;

type DeviceStat = {
  id: string;
  title: string;
  value: string;
  icon: string;
  color: string;
};

type MonitoringControl = {
  id: string;
  title: string;
  description: string;
  icon: string;
};

const monitoringControls: MonitoringControl[] = [
  {
    id: '1',
    title: 'App Usage Tracking',
    description: 'Displays real app usage durations from the child device.',
    icon: 'chart.bar',
  },
  {
    id: '2',
    title: 'Location Tracking',
    description: 'Shows latest synced location coordinates from the child device.',
    icon: 'location',
  },
  {
    id: '3',
    title: 'Battery Monitoring',
    description: 'Shows current battery percentage reported by the child device.',
    icon: 'battery.100',
  },
  {
    id: '4',
    title: 'Storage Monitoring',
    description: 'Shows last reported storage usage from the child device.',
    icon: 'internaldrive',
  },
];

const formatDuration = (milliseconds: number): string => {
  const safeMs = Math.max(0, milliseconds || 0);
  const totalMinutes = Math.floor(safeMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) {
    return `${minutes}m`;
  }
  return `${hours}h ${minutes}m`;
};

export default function DeviceDetailsScreen() {
  const { id, childId, name } = useLocalSearchParams();
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = React.useState(true);
  const [deviceName, setDeviceName] = React.useState('Child Device');
  const [deviceStats, setDeviceStats] = React.useState<DeviceStat[]>([]);
  const [screenTimeData, setScreenTimeData] = React.useState<Record<string, any>>({});
  const [deviceData, setDeviceData] = React.useState<Record<string, any>>({});
  const [latestLocation, setLatestLocation] = React.useState<{
    latitude?: number;
    longitude?: number;
  } | null>(null);

  const childDeviceId = React.useMemo(() => {
    if (Array.isArray(childId)) {
      return String(childId[0] ?? '');
    }
    return String(childId ?? '');
  }, [childId]);

  const routeDeviceName = React.useMemo(() => {
    if (Array.isArray(name)) {
      return String(name[0] ?? 'Child Device');
    }
    return String(name ?? 'Child Device');
  }, [name]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: deviceName,
      headerLargeTitle: true,
    });
  }, [navigation, deviceName]);

  React.useEffect(() => {
    setDeviceName(routeDeviceName || 'Child Device');
  }, [routeDeviceName]);

  React.useEffect(() => {
    if (!childDeviceId) {
      setLoading(false);
      Alert.alert('Missing Device', 'Child device ID is missing from the route.');
      return;
    }

    setLoading(true);
    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 8000);

    const deviceRef = ref(db, `devices/${childDeviceId}`);
    const screenTimeRef = ref(db, `screenTime/${childDeviceId}`);
    const locationRef = query(
      ref(db, `locations/${childDeviceId}`),
      orderByChild('timestamp'),
      limitToLast(1)
    );

    const onDeviceValue = onValue(deviceRef, (snapshot) => {
      setDeviceData(snapshot.val() || {});
      setLoading(false);
      clearTimeout(timeoutId);
    });

    const onScreenTimeValue = onValue(screenTimeRef, (snapshot) => {
      setScreenTimeData(snapshot.val() || {});
      setLoading(false);
      clearTimeout(timeoutId);
    });

    const onLocationValue = onValue(locationRef, (snapshot) => {
      const locationDataMap = snapshot.val() || {};
      const latest = Object.values(locationDataMap)[0] as
        | { latitude?: number; longitude?: number }
        | undefined;
      setLatestLocation(latest || null);
      setLoading(false);
      clearTimeout(timeoutId);
    });

    return () => {
      clearTimeout(timeoutId);
      off(deviceRef, 'value', onDeviceValue);
      off(screenTimeRef, 'value', onScreenTimeValue);
      off(locationRef, 'value', onLocationValue);
    };
  }, [childDeviceId]);

  React.useEffect(() => {
    const batteryRaw = Number(deviceData.batteryLevel ?? 0);
    const batteryPercent = batteryRaw <= 1 ? Math.round(batteryRaw * 100) : Math.round(batteryRaw);

    const appEntries = Object.values(screenTimeData || {}) as Array<{ duration?: number }>;
    const totalScreenTimeMs = appEntries.reduce(
      (acc, item) => acc + Number(item?.duration || 0),
      0
    );
    const appsUsed = Object.keys(screenTimeData || {}).length;

    const storageUsedValue =
      typeof deviceData.storageUsed === 'number'
        ? `${(deviceData.storageUsed / (1024 * 1024 * 1024)).toFixed(1)} GB`
        : 'N/A';

    const locationValue =
      latestLocation?.latitude != null && latestLocation?.longitude != null
        ? `${Number(latestLocation.latitude).toFixed(3)}, ${Number(latestLocation.longitude).toFixed(3)}`
        : 'No location';

    setDeviceStats([
      {
        id: '1',
        title: 'Screen Time Today',
        value: formatDuration(totalScreenTimeMs),
        icon: 'timer',
        color: '#FF6B6B',
      },
      {
        id: '2',
        title: 'Apps Used',
        value: `${appsUsed} app${appsUsed === 1 ? '' : 's'}`,
        icon: 'apps.iphone',
        color: '#4ECDC4',
      },
      {
        id: '3',
        title: 'Battery Level',
        value: `${batteryPercent}%`,
        icon: 'battery.100',
        color: '#45B7D1',
      },
      {
        id: '4',
        title: 'Storage Used',
        value: storageUsedValue,
        icon: 'internaldrive',
        color: '#96CEB4',
      },
      {
        id: '5',
        title: 'Last Location',
        value: locationValue,
        icon: 'location',
        color: '#A18CD1',
      },
    ]);
  }, [deviceData, screenTimeData, latestLocation]);

  const openLocationInGoogleMaps = React.useCallback(async () => {
    if (latestLocation?.latitude == null || latestLocation?.longitude == null) {
      Alert.alert('Location Unavailable', 'No recent location is available for this child device.');
      return;
    }

    const latitude = Number(latestLocation.latitude);
    const longitude = Number(latestLocation.longitude);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

    try {
      const canOpen = await Linking.canOpenURL(mapsUrl);
      if (!canOpen) {
        Alert.alert('Unable to Open Maps', 'Google Maps link could not be opened on this device.');
        return;
      }
      await Linking.openURL(mapsUrl);
    } catch {
      Alert.alert('Unable to Open Maps', 'Something went wrong while opening Google Maps.');
    }
  }, [latestLocation]);

  return (
    <ThemedView style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
          <ThemedText style={styles.loadingText}>Loading real device metrics...</ThemedText>
        </View>
      ) : (
        <ScrollView style={styles.scrollView}>
          <View style={styles.statsGrid}>
            {deviceStats.map((stat) => (
              <View key={stat.id} style={styles.statCard}>
                <View style={[styles.iconContainer, { backgroundColor: stat.color + '20' }]}>
                  <IconSymbol name={stat.icon} size={24} color={stat.color} />
                </View>
                <ThemedText style={styles.statValue}>{stat.value}</ThemedText>
                <ThemedText style={styles.statTitle}>{stat.title}</ThemedText>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.mapButton,
              latestLocation?.latitude == null || latestLocation?.longitude == null
                ? styles.mapButtonDisabled
                : null,
            ]}
            onPress={openLocationInGoogleMaps}
            disabled={latestLocation?.latitude == null || latestLocation?.longitude == null}
          >
            <IconSymbol name="map" size={20} color="#fff" />
            <ThemedText style={styles.mapButtonText}>Open Live Location in Google Maps</ThemedText>
          </TouchableOpacity>

          <ThemedText type="title" style={styles.sectionTitle}>
            Monitoring Controls
          </ThemedText>

          {monitoringControls.map((control) => (
            <View key={control.id} style={styles.controlItem}>
              <View style={styles.controlIcon}>
                <IconSymbol name={control.icon} size={24} color={Colors.light.tint} />
              </View>
              <View style={styles.controlContent}>
                <ThemedText type="defaultSemiBold">{control.title}</ThemedText>
                <ThemedText style={styles.controlDescription}>{control.description}</ThemedText>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#666',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 16,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 16,
    marginHorizontal: 16,
  },
  mapButton: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: Colors.light.tint,
    borderRadius: 10,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapButtonDisabled: {
    opacity: 0.5,
  },
  mapButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  controlItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  controlIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  controlContent: {
    flex: 1,
  },
  controlDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});
