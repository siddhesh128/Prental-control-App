import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { SedentaryAlert } from '../../types/wellness';

const DEMO_ALERTS: SedentaryAlert[] = [
  {
    alertId: 'w-alert-1',
    childId: 'demo-child',
    startTime: Date.now() - 1000 * 60 * 45,
    duration: 20,
    alertType: 'STRETCH',
    dismissed: false,
  },
  {
    alertId: 'w-alert-2',
    childId: 'demo-child',
    startTime: Date.now() - 1000 * 60 * 110,
    duration: 25,
    alertType: 'MOVEMENT_BREAK',
    dismissed: true,
    dismissedAt: Date.now() - 1000 * 60 * 95,
  },
];

export default function WellnessDashboardScreen() {
  const dashboard = useSelector((state: RootState) => state.wellness.dashboard);
  const stats = useSelector((state: RootState) => state.wellness.stats);
  const alerts = useSelector((state: RootState) => state.wellness.sedentaryAlerts);

  const activeAlerts = useMemo(
    () => (alerts.length > 0 ? alerts : DEMO_ALERTS).filter((alert) => !alert.dismissed),
    [alerts]
  );
  const score = dashboard?.overallWellnessScore ?? stats?.avgPostureQuality ?? 76;
  const sedentaryMinutes = stats?.sedentaryMinutes ?? 32;
  const exerciseMinutes = stats?.exerciseMinutes ?? 18;
  const posturePercent = dashboard?.positivePosturePercent ?? 82;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroIcon}>
            <Ionicons name="pulse-outline" size={24} color="#0B4A9A" />
          </View>
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles-outline" size={12} color="#0B4A9A" />
            <Text style={styles.heroBadgeText}>Phase 2</Text>
          </View>
        </View>

        <Text style={styles.title}>Wellness Dashboard</Text>
        <Text style={styles.subtitle}>
          Monitor posture, breaks, and movement trends in one parent view.
        </Text>

        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Overall wellness</Text>
          <Text style={styles.scoreValue}>{score}</Text>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Posture quality</Text>
          <Text style={styles.metricValue}>{posturePercent}%</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Sedentary time</Text>
          <Text style={styles.metricValue}>{sedentaryMinutes} min</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Exercise minutes</Text>
          <Text style={styles.metricValue}>{exerciseMinutes} min</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Active alerts</Text>
          <Text style={styles.metricValue}>{activeAlerts.length}</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Current alerts</Text>
        {activeAlerts.length === 0 ? (
          <Text style={styles.emptyText}>No active wellness alerts.</Text>
        ) : (
          activeAlerts.map((alert) => (
            <View key={alert.alertId} style={styles.alertRow}>
              <View style={styles.alertIcon}>
                <Ionicons name="notifications-outline" size={18} color="#0B4A9A" />
              </View>
              <View style={styles.alertCopy}>
                <Text style={styles.alertTitle}>{alert.alertType.replace('_', ' ')}</Text>
                <Text style={styles.alertMeta}>{alert.duration} min sedentary period</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1B35',
  },
  content: {
    padding: 18,
    paddingBottom: 28,
  },
  heroCard: {
    borderRadius: 22,
    backgroundColor: 'rgba(15, 35, 72, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 18,
    marginBottom: 14,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(143, 212, 255, 0.15)',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F2FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroBadgeText: {
    color: '#0B4A9A',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 30,
    color: '#F6FAFF',
    fontFamily: 'SpaceMono',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: '#C2D5F2',
  },
  scoreCard: {
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: '#F4F7FD',
    padding: 16,
  },
  scoreLabel: {
    color: '#5E6D86',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  scoreValue: {
    marginTop: 8,
    color: '#0B4A9A',
    fontSize: 34,
    fontWeight: '800',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  metricCard: {
    width: '48%',
    borderRadius: 18,
    backgroundColor: '#F4F7FD',
    padding: 14,
  },
  metricLabel: {
    color: '#5E6D86',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metricValue: {
    marginTop: 8,
    color: '#1A2B48',
    fontSize: 22,
    fontWeight: '800',
  },
  sectionCard: {
    borderRadius: 20,
    backgroundColor: '#F4F7FD',
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionTitle: {
    color: '#1A2B48',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  emptyText: {
    color: '#61718D',
    fontSize: 13,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F2',
  },
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertCopy: {
    flex: 1,
  },
  alertTitle: {
    color: '#1A2B48',
    fontSize: 14,
    fontWeight: '700',
  },
  alertMeta: {
    marginTop: 2,
    color: '#61718D',
    fontSize: 12,
  },
});
