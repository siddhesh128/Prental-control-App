import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { getAuth } from 'firebase/auth';
import ThemedText from '@/_components/ThemedText';
import ThemedView from '@/_components/ThemedView';
import { IconSymbol } from '@/_components/ui/IconSymbol';
import Colors from '@/constants/Colors';
import PairingService from '@/services/pairing.service';
import { CommunicationService } from '@/services/communication.service';

export type CallLogEntry = {
  id: string;
  name: string;
  number: string;
  type: 'incoming' | 'outgoing' | 'missed';
  duration: number; // in seconds
  timestamp: string;
  deviceId: string;
};

export default function CallLogsScreen() {
  const [calls, setCalls] = useState<CallLogEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'incoming' | 'outgoing' | 'missed'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [devices, setDevices] = useState<Record<string, string>>({});
  const unsubscribersRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        const uid = getAuth().currentUser?.uid;

        if (!uid) {
          setCalls([]);
          setDevices({});
          return;
        }

        const pairings = await PairingService.getParentPairings(uid);
        if (!mounted) {
          return;
        }

        const deviceMap = pairings.reduce(
          (acc, pairing) => {
            acc[pairing.childId] = pairing.childDeviceName || 'Child Device';
            return acc;
          },
          {} as Record<string, string>
        );
        setDevices(deviceMap);

        unsubscribersRef.current.forEach((unsubscribe) => unsubscribe());
        unsubscribersRef.current = [];

        const childLogsByDevice: Record<string, CallLogEntry[]> = {};

        const updateMergedCalls = () => {
          const merged = Object.values(childLogsByDevice)
            .flat()
            .sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
          setCalls(merged);
        };

        pairings.forEach((pairing) => {
          const unsubscribe = CommunicationService.subscribeToCallHistory(
            pairing.childId,
            (records) => {
              childLogsByDevice[pairing.childId] = records.map((record) => ({
                id: record.id || `${pairing.childId}-${record.timestamp}`,
                name: record.contactName || 'Unknown',
                number: record.phoneNumber,
                type: record.callType,
                duration: record.duration,
                timestamp: new Date(record.timestamp).toISOString(),
                deviceId: pairing.childId,
              }));
              updateMergedCalls();
            }
          );

          unsubscribersRef.current.push(unsubscribe);
        });
      } catch (error) {
        console.error('Error loading call logs:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
      unsubscribersRef.current.forEach((unsubscribe) => unsubscribe());
      unsubscribersRef.current = [];
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    const uid = getAuth().currentUser?.uid;

    if (uid) {
      const pairings = await PairingService.getParentPairings(uid);
      const refreshedCalls = await Promise.all(
        pairings.map(async (pairing) => {
          const records = await CommunicationService.getCallHistory(pairing.childId);
          return records.map((record) => ({
            id: record.id || `${pairing.childId}-${record.timestamp}`,
            name: record.contactName || 'Unknown',
            number: record.phoneNumber,
            type: record.callType,
            duration: record.duration,
            timestamp: new Date(record.timestamp).toISOString(),
            deviceId: pairing.childId,
          }));
        })
      );

      setCalls(refreshedCalls.flat().sort((a, b) => Number(b.timestamp) - Number(a.timestamp)));
    }

    setRefreshing(false);
  };

  const getCallIcon = (type: CallLogEntry['type']) => {
    switch (type) {
      case 'incoming':
        return 'arrow.down.left.circle.fill';
      case 'outgoing':
        return 'arrow.up.right.circle.fill';
      case 'missed':
        return 'xmark.circle.fill';
      default:
        return 'phone.circle.fill';
    }
  };

  const getCallColor = (type: CallLogEntry['type']) => {
    switch (type) {
      case 'incoming':
        return '#34c759';
      case 'outgoing':
        return Colors.light.tint;
      case 'missed':
        return '#ff3b30';
      default:
        return '#666';
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return 'No duration';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const filteredCalls = useMemo(
    () => calls.filter((call) => filter === 'all' || call.type === filter),
    [calls, filter]
  );

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
          title: 'Call Logs',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />

      <View style={styles.filterContainer}>
        {(['all', 'incoming', 'outgoing', 'missed'] as const).map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.filterButton, filter === type && styles.filterButtonActive]}
            onPress={() => setFilter(type)}
          >
            <ThemedText
              style={[styles.filterButtonText, filter === type && styles.filterButtonTextActive]}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredCalls.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol name="phone" size={64} color={Colors.light.tint} />
            <ThemedText style={styles.emptyStateTitle}>No Call Logs</ThemedText>
            <ThemedText style={styles.emptyStateText}>
              There are no call logs matching your filter
            </ThemedText>
          </View>
        ) : (
          filteredCalls.map((call) => (
            <View key={call.id} style={styles.callItem}>
              <View style={styles.callIcon}>
                <IconSymbol
                  name={getCallIcon(call.type)}
                  size={24}
                  color={getCallColor(call.type)}
                />
              </View>
              <View style={styles.callInfo}>
                <ThemedText style={styles.callName}>{call.name || 'Unknown'}</ThemedText>
                <ThemedText style={styles.callNumber}>{call.number}</ThemedText>
                <View style={styles.callDetails}>
                  <ThemedText style={styles.callTime}>
                    {new Date(call.timestamp).toLocaleString()}
                  </ThemedText>
                  <ThemedText style={styles.callDuration}>
                    {formatDuration(call.duration)}
                  </ThemedText>
                </View>
                <ThemedText style={styles.deviceName}>
                  {devices[call.deviceId] || 'Unknown Device'}
                </ThemedText>
              </View>
            </View>
          ))
        )}
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
  content: {
    flex: 1,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: Colors.light.tint + '10',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
  },
  filterButtonTextActive: {
    color: Colors.light.tint,
    fontWeight: '600',
  },
  callItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  callIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  callInfo: {
    flex: 1,
  },
  callName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  callNumber: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  callDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  callTime: {
    fontSize: 12,
    color: '#666',
  },
  callDuration: {
    fontSize: 12,
    color: '#666',
  },
  deviceName: {
    fontSize: 12,
    color: Colors.light.tint,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
