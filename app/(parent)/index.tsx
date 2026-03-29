import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ThemedText from '@/_components/ThemedText';
import ThemedView from '@/_components/ThemedView';

const features = [
  {
    id: 'location',
    title: 'Location Tracking',
    icon: 'location-outline',
    color: '#2E7CF6',
    route: 'location',
    description: 'Track device location and set safe zones',
  },
  {
    id: 'calls',
    title: 'Call Logs',
    icon: 'call-outline',
    color: '#0DA67A',
    route: 'call-logs',
    description: 'Monitor call history and contacts',
  },
  {
    id: 'messages',
    title: 'Messages',
    icon: 'chatbubble-ellipses-outline',
    color: '#6A5DF2',
    route: 'messages',
    description: 'View and filter text messages',
  },
  {
    id: 'devices',
    title: 'Devices',
    icon: 'phone-portrait-outline',
    color: '#E67912',
    route: 'devices',
    description: 'Manage connected devices',
  },
  {
    id: 'reports',
    title: 'Reports',
    icon: 'bar-chart-outline',
    color: '#D04D8A',
    route: 'reports',
    description: 'View detailed activity reports',
  },
  {
    id: 'restrictions',
    title: 'Restrictions',
    icon: 'lock-closed-outline',
    color: '#1E4E8E',
    route: 'device-restrictions',
    description: 'Set app and content restrictions',
  },
];

export default function ParentDashboard() {
  const router = useRouter();

  const handleNavigation = (route: string) => {
    router.push(`/(parent)/${route}`);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.bgOrbTop} />
      <View style={styles.bgOrbBottom} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerCard}>
          <ThemedText style={styles.badge}>Parent Hub</ThemedText>
          <ThemedText style={styles.title}>Control Center</ThemedText>
          <ThemedText style={styles.subtitle}>
            Monitor and manage connected devices from one place
          </ThemedText>

          <View style={styles.headerMetrics}>
            <View style={styles.metricChip}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#0B4A9A" />
              <ThemedText style={styles.metricText}>Live Protection</ThemedText>
            </View>
            <View style={styles.metricChip}>
              <Ionicons name="flash-outline" size={14} color="#0B4A9A" />
              <ThemedText style={styles.metricText}>Realtime Alerts</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.grid}>
          {features.map((feature) => (
            <TouchableOpacity
              key={feature.id}
              style={styles.card}
              onPress={() => handleNavigation(feature.route)}
              activeOpacity={0.9}
            >
              <View style={[styles.iconContainer, { backgroundColor: `${feature.color}22` }]}>
                <Ionicons name={feature.icon as any} size={24} color={feature.color} />
              </View>
              <ThemedText style={styles.cardTitle}>{feature.title}</ThemedText>
              <ThemedText style={styles.cardDescription}>{feature.description}</ThemedText>

              <View style={styles.cardFooter}>
                <ThemedText style={styles.cardAction}>Open</ThemedText>
                <Ionicons name="arrow-forward" size={16} color="#2B4C7D" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
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
    backgroundColor: 'rgba(61, 181, 255, 0.24)',
    top: -90,
    right: -70,
  },
  bgOrbBottom: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(126, 119, 255, 0.2)',
    bottom: -110,
    left: -70,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 26,
  },
  headerCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(17, 40, 79, 0.92)',
    padding: 18,
    marginBottom: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#D8E9FF',
    color: '#0D3E7A',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  title: {
    marginTop: 10,
    fontSize: 30,
    color: '#F6FAFF',
    fontFamily: 'SpaceMono',
    letterSpacing: 0.4,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#C2D5F2',
    lineHeight: 20,
  },
  headerMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F2FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  metricText: {
    color: '#0B4A9A',
    fontSize: 12,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#F4F7FD',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    minHeight: 184,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2B48',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 13,
    color: '#5E6F89',
    lineHeight: 18,
    flex: 1,
  },
  cardFooter: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardAction: {
    fontSize: 13,
    color: '#2B4C7D',
    fontWeight: '700',
  },
});
