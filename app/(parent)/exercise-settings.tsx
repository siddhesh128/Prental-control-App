import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { ExerciseService } from '../services/exercise.service';
import { ExerciseType } from '../../types/exercise';

const SETTINGS = [
  { type: ExerciseType.PUSH_UPS, minutesPerRep: 1, cap: 30 },
  { type: ExerciseType.SQUATS, minutesPerRep: 1, cap: 30 },
  { type: ExerciseType.JUMPING_JACKS, minutesPerRep: 1, cap: 30 },
  { type: ExerciseType.STRETCHES, minutesPerRep: 0.5, cap: 15 },
  { type: ExerciseType.WALKING, minutesPerRep: 0.25, cap: 20 },
] as const;

export default function ExerciseSettingsScreen() {
  const rewardRules = useSelector((state: RootState) => state.rewards.rewardRules);
  const routines = useMemo(
    () =>
      SETTINGS.map((item) => ({
        ...item,
        routine: ExerciseService.getExerciseRoutine(item.type),
      })),
    []
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroIcon}>
            <Ionicons name="fitness-outline" size={24} color="#0B4A9A" />
          </View>
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles-outline" size={12} color="#0B4A9A" />
            <Text style={styles.heroBadgeText}>Phase 2</Text>
          </View>
        </View>

        <Text style={styles.title}>Exercise Settings</Text>
        <Text style={styles.subtitle}>
          Configure how exercise converts into bonus minutes and screen-time caps.
        </Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Default conversion rules</Text>
        {routines.map((item) => (
          <View key={item.type} style={styles.ruleCard}>
            <View style={styles.ruleHeader}>
              <Text style={styles.ruleTitle}>{item.routine.name}</Text>
              <Ionicons name="flash-outline" size={16} color="#0B4A9A" />
            </View>
            <Text style={styles.ruleText}>
              {item.minutesPerRep} min per rep • {item.cap} minute daily cap
            </Text>
            <Text style={styles.ruleMeta}>{item.routine.instructions}</Text>
          </View>
        ))}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Reward rules connected to exercise</Text>
        {rewardRules.length === 0 ? (
          <Text style={styles.emptyText}>No reward rules are loaded yet.</Text>
        ) : (
          rewardRules.map((rule) => (
            <View key={rule.ruleId} style={styles.rewardRow}>
              <View style={styles.rewardDot} />
              <View style={styles.rewardCopy}>
                <Text style={styles.rewardTitle}>{rule.name}</Text>
                <Text style={styles.rewardText}>
                  {rule.rewardType} • {rule.pointsRequired} points
                </Text>
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
  ruleCard: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderWidth: 1,
    borderColor: '#DCE5F3',
    marginBottom: 10,
  },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ruleTitle: {
    color: '#1A2B48',
    fontSize: 15,
    fontWeight: '700',
  },
  ruleText: {
    marginTop: 6,
    color: '#0B4A9A',
    fontSize: 13,
    fontWeight: '700',
  },
  ruleMeta: {
    marginTop: 6,
    color: '#61718D',
    fontSize: 12,
    lineHeight: 17,
  },
  emptyText: {
    color: '#61718D',
    fontSize: 13,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F2',
  },
  rewardDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0B4A9A',
  },
  rewardCopy: {
    flex: 1,
  },
  rewardTitle: {
    color: '#1A2B48',
    fontSize: 14,
    fontWeight: '700',
  },
  rewardText: {
    marginTop: 2,
    color: '#61718D',
    fontSize: 12,
  },
});
