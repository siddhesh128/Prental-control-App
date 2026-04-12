import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { SedentaryAlert, PostureEvent } from '../../types/wellness';

const DEMO_ALERTS: SedentaryAlert[] = [
  {
    alertId: 'alert-1',
    childId: 'demo-child',
    startTime: Date.now() - 1000 * 60 * 45,
    duration: 15,
    alertType: 'STRETCH',
    dismissed: false,
  },
  {
    alertId: 'alert-2',
    childId: 'demo-child',
    startTime: Date.now() - 1000 * 60 * 90,
    duration: 20,
    alertType: 'MOVEMENT_BREAK',
    dismissed: true,
    dismissedAt: Date.now() - 1000 * 60 * 70,
  },
];

const DEMO_EVENTS: PostureEvent[] = [
  {
    eventId: 'posture-1',
    childId: 'demo-child',
    timestamp: Date.now() - 1000 * 60 * 18,
    postureQuality: 'GOOD',
    confidenceScore: 88,
    shoulderAngle: 12,
    neckAngle: 9,
  },
  {
    eventId: 'posture-2',
    childId: 'demo-child',
    timestamp: Date.now() - 1000 * 60 * 4,
    postureQuality: 'SLOUCHING',
    confidenceScore: 79,
    shoulderAngle: 29,
    neckAngle: 17,
  },
];

export default function ChildWellnessScreen() {
  const storeAlerts = useSelector((state: RootState) => state.wellness.sedentaryAlerts);
  const storeEvents = useSelector((state: RootState) => state.wellness.recentPostureEvents);

  const alerts = storeAlerts.length > 0 ? storeAlerts : DEMO_ALERTS;
  const events = storeEvents.length > 0 ? storeEvents : DEMO_EVENTS;

  const activeAlerts = useMemo(() => alerts.filter((alert) => !alert.dismissed), [alerts]);

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

        <Text style={styles.title}>Wellness Alerts</Text>
        <Text style={styles.subtitle}>
          Track posture feedback, sedentary reminders, and movement breaks.
        </Text>

        <View style={styles.metricsRow}>
          <View style={styles.metricPill}>
            <Ionicons name="warning-outline" size={14} color="#0B4A9A" />
            <Text style={styles.metricText}>{activeAlerts.length} active alerts</Text>
          </View>
          <View style={styles.metricPill}>
            <Ionicons name="body-outline" size={14} color="#0B4A9A" />
            <Text style={styles.metricText}>{events.length} posture checks</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Current alerts</Text>
        {alerts.map((alert) => (
          <View key={alert.alertId} style={styles.alertRow}>
            <View style={styles.alertIcon}>
              <Ionicons
                name={alert.alertType === 'STRETCH' ? 'walk-outline' : 'notifications-outline'}
                size={18}
                color="#0B4A9A"
              />
            </View>
            <View style={styles.alertCopy}>
              <Text style={styles.alertTitle}>{alert.alertType.replace('_', ' ')}</Text>
              <Text style={styles.alertMeta}>
                {alert.duration} min • {alert.dismissed ? 'dismissed' : 'active'}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Recent posture checks</Text>
        {events.map((event) => (
          <View key={event.eventId} style={styles.postureRow}>
            <View style={styles.postureDot} />
            <View style={styles.postureCopy}>
              <Text style={styles.postureTitle}>{event.postureQuality}</Text>
              <Text style={styles.postureMeta}>
                Confidence {event.confidenceScore}% • Shoulder {event.shoulderAngle ?? 0}°
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#091A35',
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
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  metricText: {
    color: '#0B4A9A',
    fontSize: 12,
    fontWeight: '700',
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
  postureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F2',
  },
  postureDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0B4A9A',
  },
  postureCopy: {
    flex: 1,
  },
  postureTitle: {
    color: '#1A2B48',
    fontSize: 14,
    fontWeight: '700',
  },
  postureMeta: {
    marginTop: 2,
    color: '#61718D',
    fontSize: 12,
  },
});
