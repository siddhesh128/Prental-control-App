import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { httpsCallable } from 'firebase/functions';
import { doc, setDoc } from 'firebase/firestore';
import { functions, firestoreDb } from '../config/firebase';
import { RootState } from '../store';
import { ExerciseService } from '../services/exercise.service';
import { ExerciseSession, ExerciseType } from '../../types/exercise';

const EXERCISE_TYPES: ExerciseType[] = [
  ExerciseType.PUSH_UPS,
  ExerciseType.SQUATS,
  ExerciseType.JUMPING_JACKS,
  ExerciseType.STRETCHES,
  ExerciseType.WALKING,
];

export default function ChildExerciseScreen() {
  const familyId = useSelector((state: RootState) => state.family.family?.familyId);
  const childId = useSelector((state: RootState) => state.auth.user?.uid);
  const [selectedType, setSelectedType] = useState<ExerciseType>(ExerciseType.PUSH_UPS);
  const [session, setSession] = useState<ExerciseSession | null>(null);
  const [reps, setReps] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [bonusMinutes, setBonusMinutes] = useState<number | null>(null);

  const routine = useMemo(() => ExerciseService.getExerciseRoutine(selectedType), [selectedType]);

  const startSession = () => {
    const nextSession = ExerciseService.createSession(
      childId ?? 'demo-child',
      familyId ?? 'demo-family',
      selectedType
    );
    setSession(nextSession);
    setReps(0);
    setBonusMinutes(null);
  };

  const completeRep = () => {
    setReps((current) => current + 1);
  };

  const finishSession = async () => {
    if (!session) {
      Alert.alert('Start first', 'Create an exercise session before verifying.');
      return;
    }

    try {
      setVerifying(true);

      const completedSession = ExerciseService.completeSession(session, reps);

      if (familyId && childId) {
        await setDoc(
          doc(firestoreDb, 'families', familyId, 'exercises', completedSession.sessionId),
          {
            ...completedSession,
            repsPerformed: reps,
            status: 'COMPLETED',
          }
        );

        const verifyExerciseSession = httpsCallable(functions, 'verifyExerciseSession');
        const response = await verifyExerciseSession({
          sessionId: completedSession.sessionId,
          familyId,
          childId,
          exerciseType: selectedType,
          repsPerformed: reps,
        });

        const awarded =
          (response.data as { bonusMinutesAwarded?: number })?.bonusMinutesAwarded ??
          Math.min(reps, 30);
        setBonusMinutes(awarded);
        setSession(ExerciseService.verifySession(completedSession, awarded));
        Alert.alert('Exercise verified', `${awarded} bonus minutes awarded.`);
      } else {
        const localBonus = ExerciseService.calculateBonusMinutes(selectedType, reps, {
          ruleId: 'demo-rule',
          familyId: 'demo-family',
          exerciseType: selectedType,
          minutesPerRep: 1,
          dailyMaxMinutes: 30,
          weeklyMaxMinutes: 120,
          active: true,
        });
        setBonusMinutes(localBonus);
        setSession(ExerciseService.verifySession(completedSession, localBonus));
        Alert.alert('Demo exercise complete', `${localBonus} bonus minutes earned in demo mode.`);
      }
    } catch (error) {
      console.error('Exercise verification failed:', error);
      Alert.alert('Verification failed', 'Could not verify the exercise session right now.');
    } finally {
      setVerifying(false);
    }
  };

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

        <Text style={styles.title}>Exercise Bonus</Text>
        <Text style={styles.subtitle}>
          Complete reps or movement time to earn bonus screen-time minutes.
        </Text>

        <View style={styles.metricsRow}>
          <View style={styles.metricPill}>
            <Ionicons name="repeat-outline" size={14} color="#0B4A9A" />
            <Text style={styles.metricText}>{reps} reps</Text>
          </View>
          <View style={styles.metricPill}>
            <Ionicons name="trophy-outline" size={14} color="#0B4A9A" />
            <Text style={styles.metricText}>{bonusMinutes ?? 0} bonus min</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Choose an exercise</Text>
        <View style={styles.exerciseList}>
          {EXERCISE_TYPES.map((type) => {
            const item = ExerciseService.getExerciseRoutine(type);
            const active = selectedType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[styles.exerciseCard, active && styles.exerciseCardActive]}
                activeOpacity={0.9}
                onPress={() => setSelectedType(type)}
              >
                <View style={styles.exerciseCardHeader}>
                  <Text style={styles.exerciseTitle}>{item.name}</Text>
                  <Ionicons
                    name={active ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={active ? '#0B4A9A' : '#B2BECE'}
                  />
                </View>
                <Text style={styles.exerciseDesc}>{item.description}</Text>
                <Text style={styles.exerciseMeta}>
                  {item.targetReps
                    ? `${item.targetReps} reps target`
                    : `${item.targetDurationSeconds ?? 0}s target`}{' '}
                  • {item.difficulty} difficulty
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Routine instructions</Text>
        <Text style={styles.instructions}>{routine.instructions}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={startSession} activeOpacity={0.9}>
          <Ionicons name="play-outline" size={16} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Start exercise session</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Live rep counter</Text>
        <View style={styles.counterCard}>
          <Text style={styles.counterValue}>{reps}</Text>
          <Text style={styles.counterLabel}>reps completed</Text>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={completeRep}
            activeOpacity={0.9}
          >
            <Ionicons name="add-outline" size={16} color="#0B4A9A" />
            <Text style={styles.secondaryButtonText}>Add rep</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, (!session || verifying) && styles.buttonDisabled]}
            onPress={finishSession}
            activeOpacity={0.9}
            disabled={!session || verifying}
          >
            <Ionicons name="checkmark-outline" size={16} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>
              {verifying ? 'Verifying...' : 'Finish & verify'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {session?.verified && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Verification result</Text>
          <Text style={styles.resultText}>{ExerciseService.formatSessionForDisplay(session)}</Text>
          <Text style={styles.resultMeta}>
            Bonus minutes granted: {session.bonusMinutesEarned ?? 0}
          </Text>
        </View>
      )}
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
  exerciseList: {
    gap: 10,
  },
  exerciseCard: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderWidth: 1,
    borderColor: '#DCE5F3',
  },
  exerciseCardActive: {
    borderColor: '#0B4A9A',
    backgroundColor: '#F0F6FF',
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseTitle: {
    color: '#1A2B48',
    fontSize: 15,
    fontWeight: '700',
  },
  exerciseDesc: {
    marginTop: 4,
    color: '#61718D',
    fontSize: 13,
    lineHeight: 18,
  },
  exerciseMeta: {
    marginTop: 8,
    color: '#2B4C7D',
    fontSize: 12,
    fontWeight: '600',
  },
  instructions: {
    color: '#61718D',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 14,
  },
  primaryButton: {
    backgroundColor: '#0B4A9A',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#0B4A9A',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#0B4A9A',
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  counterCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 22,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#DCE5F3',
  },
  counterValue: {
    color: '#0B4A9A',
    fontSize: 42,
    fontWeight: '800',
  },
  counterLabel: {
    marginTop: 4,
    color: '#61718D',
    fontSize: 13,
  },
  resultText: {
    color: '#1A2B48',
    fontSize: 14,
    lineHeight: 20,
  },
  resultMeta: {
    marginTop: 10,
    color: '#2B4C7D',
    fontWeight: '700',
  },
});
