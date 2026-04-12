import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { RootState } from '../store';
import { HomeworkService } from '../services/homework.service';
import { HomeworkSession } from '../../types/homework';

const DEMO_HOMEWORK_SESSIONS: HomeworkSession[] = [
  {
    sessionId: 'hw-demo-1',
    childId: 'demo-child',
    familyId: 'demo-family',
    startedAt: Date.now() - 1000 * 60 * 60 * 4,
    preImageUri: 'https://example.com/pre-1.jpg',
    postImageUri: 'https://example.com/post-1.jpg',
    status: 'REVIEW_PENDING',
    earnedPoints: 100,
    analysis: {
      analysisId: 'analysis-demo-1',
      sessionId: 'hw-demo-1',
      preImageOCRText: 'Math worksheet page 1',
      postImageOCRText: 'Math worksheet page 1 completed',
      writingDensityDifference: 68,
      pageAlignment: 'SAME_PAGE',
      completionEstimate: 'COMPLETE',
      confidenceScore: 92,
      duplicateImageDetected: false,
      generatedAt: Date.now() - 1000 * 60 * 20,
      model: 'gemini-2.5-flash',
    },
  },
  {
    sessionId: 'hw-demo-2',
    childId: 'demo-child',
    familyId: 'demo-family',
    startedAt: Date.now() - 1000 * 60 * 60 * 8,
    preImageUri: 'https://example.com/pre-2.jpg',
    postImageUri: 'https://example.com/post-2.jpg',
    status: 'REVIEW_PENDING',
    earnedPoints: 75,
    analysis: {
      analysisId: 'analysis-demo-2',
      sessionId: 'hw-demo-2',
      preImageOCRText: 'Reading log',
      postImageOCRText: 'Reading log plus summary',
      writingDensityDifference: 40,
      pageAlignment: 'SAME_PAGE',
      completionEstimate: 'LIKELY_COMPLETE',
      confidenceScore: 74,
      duplicateImageDetected: false,
      generatedAt: Date.now() - 1000 * 60 * 50,
      model: 'gemini-2.5-flash',
    },
  },
];

export default function HomeworkReviewScreen() {
  const familyId = useSelector((state: RootState) => state.family.family?.familyId);
  const currentUserRole = useSelector((state: RootState) => state.family.currentUserRole);
  const [sessions, setSessions] = useState<HomeworkSession[]>(DEMO_HOMEWORK_SESSIONS);
  const [processingSessionId, setProcessingSessionId] = useState<string | null>(null);

  const pendingSessions = useMemo(
    () => sessions.filter((session) => session.status === 'REVIEW_PENDING'),
    [sessions]
  );

  const reviewSession = async (session: HomeworkSession, decision: 'APPROVED' | 'REJECTED') => {
    try {
      setProcessingSessionId(session.sessionId);

      const pointsAwarded =
        decision === 'APPROVED' ? Math.round((session.analysis?.confidenceScore ?? 70) * 1.25) : 0;

      if (familyId) {
        const reviewHomework = httpsCallable(functions, 'reviewHomework');
        await reviewHomework({
          sessionId: session.sessionId,
          familyId,
          decision,
          pointsAwarded,
        });
      }

      setSessions((current) =>
        current.map((item) =>
          item.sessionId === session.sessionId
            ? {
                ...item,
                status: decision === 'APPROVED' ? 'APPROVED' : 'REJECTED',
                parentReview: {
                  reviewId: `review_${item.sessionId}`,
                  sessionId: item.sessionId,
                  reviewedBy: 'current-parent',
                  decision,
                  feedback: decision === 'APPROVED' ? 'Good work.' : 'Please revise and resubmit.',
                  pointsAwarded,
                  reviewedAt: Date.now(),
                },
              }
            : item
        )
      );

      Alert.alert(
        'Homework reviewed',
        decision === 'APPROVED' ? 'Points awarded.' : 'Marked for revision.'
      );
    } catch (error) {
      console.error('Homework review failed:', error);
      Alert.alert('Review failed', 'Could not update the homework decision right now.');
    } finally {
      setProcessingSessionId(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroIcon}>
            <Ionicons name="school-outline" size={24} color="#0B4A9A" />
          </View>
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles-outline" size={12} color="#0B4A9A" />
            <Text style={styles.heroBadgeText}>Phase 2</Text>
          </View>
        </View>

        <Text style={styles.title}>Homework Review</Text>
        <Text style={styles.subtitle}>
          Review AI homework checks, inspect confidence, and approve or reject submissions.
        </Text>

        <View style={styles.metricsRow}>
          <View style={styles.metricPill}>
            <Ionicons name="document-text-outline" size={14} color="#0B4A9A" />
            <Text style={styles.metricText}>{pendingSessions.length} pending</Text>
          </View>
          <View style={styles.metricPill}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#0B4A9A" />
            <Text style={styles.metricText}>{currentUserRole ?? 'PRIMARY_GUARDIAN'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Pending sessions</Text>

        {pendingSessions.map((session) => {
          const analysis = session.analysis;
          const autoApprove = HomeworkService.shouldAutoApprove(analysis?.confidenceScore ?? 0);

          return (
            <View key={session.sessionId} style={styles.sessionCard}>
              <View style={styles.sessionTopRow}>
                <View style={styles.sessionCopy}>
                  <Text style={styles.sessionTitle}>Session {session.sessionId}</Text>
                  <Text style={styles.sessionMeta}>
                    {analysis?.completionEstimate ?? 'LIKELY_COMPLETE'} •{' '}
                    {analysis?.confidenceScore ?? 0}% confidence
                  </Text>
                </View>
                <View style={[styles.statusBadge, autoApprove && styles.statusBadgeReady]}>
                  <Text style={styles.statusBadgeText}>{autoApprove ? 'AUTO OK' : 'REVIEW'}</Text>
                </View>
              </View>

              <View style={styles.analysisCard}>
                <View style={styles.analysisRow}>
                  <Text style={styles.analysisLabel}>Writing increase</Text>
                  <Text style={styles.analysisValue}>
                    {analysis?.writingDensityDifference ?? 0}%
                  </Text>
                </View>
                <View style={styles.analysisRow}>
                  <Text style={styles.analysisLabel}>Duplicate detected</Text>
                  <Text style={styles.analysisValue}>
                    {analysis?.duplicateImageDetected ? 'Yes' : 'No'}
                  </Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[
                    styles.rejectButton,
                    processingSessionId === session.sessionId && styles.disabledButton,
                  ]}
                  onPress={() => reviewSession(session, 'REJECTED')}
                  activeOpacity={0.9}
                  disabled={processingSessionId === session.sessionId}
                >
                  <Ionicons name="close-circle-outline" size={16} color="#D04D8A" />
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.approveButton,
                    processingSessionId === session.sessionId && styles.disabledButton,
                  ]}
                  onPress={() => reviewSession(session, 'APPROVED')}
                  activeOpacity={0.9}
                  disabled={processingSessionId === session.sessionId}
                >
                  <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.approveButtonText}>
                    {processingSessionId === session.sessionId
                      ? 'Saving...'
                      : `Approve ${Math.round((analysis?.confidenceScore ?? 70) * 1.25)} pts`}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
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
  sessionCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderWidth: 1,
    borderColor: '#DCE5F3',
    marginBottom: 12,
  },
  sessionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  sessionCopy: {
    flex: 1,
  },
  sessionTitle: {
    color: '#1A2B48',
    fontSize: 15,
    fontWeight: '700',
  },
  sessionMeta: {
    marginTop: 4,
    color: '#61718D',
    fontSize: 12,
  },
  statusBadge: {
    borderRadius: 999,
    backgroundColor: '#FFF4E6',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeReady: {
    backgroundColor: '#E8F9F1',
  },
  statusBadgeText: {
    color: '#1A2B48',
    fontSize: 11,
    fontWeight: '700',
  },
  analysisCard: {
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFE',
    padding: 12,
  },
  analysisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  analysisLabel: {
    color: '#61718D',
    fontSize: 13,
  },
  analysisValue: {
    color: '#1A2B48',
    fontSize: 13,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  rejectButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F2B3C5',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#FFF5F8',
  },
  rejectButtonText: {
    color: '#D04D8A',
    fontWeight: '700',
  },
  approveButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#0B4A9A',
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
