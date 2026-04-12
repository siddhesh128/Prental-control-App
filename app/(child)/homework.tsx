import React, { useMemo, useRef, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { RootState } from '../store';
import { HomeworkAnalyzerService } from '../services/ai/homework-analyzer';
import { HomeworkService } from '../services/homework.service';
import { HomeworkAnalysis, HomeworkSession } from '../../types/homework';

type CapturePhase = 'idle' | 'pre' | 'post' | 'review';

export default function ChildHomeworkScreen() {
  const familyId = useSelector((state: RootState) => state.family.family?.familyId);
  const childId = useSelector((state: RootState) => state.auth.user?.uid);
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<CapturePhase>('idle');
  const [session, setSession] = useState<HomeworkSession | null>(null);
  const [preImageUri, setPreImageUri] = useState<string | null>(null);
  const [postImageUri, setPostImageUri] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<HomeworkAnalysis | null>(null);
  const [analysisMessage, setAnalysisMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const hasSession = Boolean(session);

  const canAnalyze = useMemo(
    () => Boolean(preImageUri && postImageUri && session),
    [preImageUri, postImageUri, session]
  );

  const startSession = () => {
    const nextSession = HomeworkService.createSession(
      childId ?? 'demo-child',
      familyId ?? 'demo-family'
    );
    setSession(nextSession);
    setPhase('pre');
    setPreImageUri(null);
    setPostImageUri(null);
    setAnalysis(null);
    setAnalysisMessage('');
  };

  const captureCurrentPhoto = async () => {
    if (!cameraRef.current || !session) {
      return;
    }

    try {
      setLoading(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        skipProcessing: true,
      });
      if (!photo?.uri) {
        throw new Error('No photo was captured');
      }

      const shouldUpload = Boolean(familyId && childId);
      let resolvedUri = photo.uri;

      if (shouldUpload) {
        if (phase === 'pre') {
          resolvedUri = await HomeworkService.uploadPreImage(
            session.sessionId,
            childId!,
            familyId!,
            photo.uri
          );
        } else if (phase === 'post') {
          resolvedUri = await HomeworkService.uploadPostImage(
            session.sessionId,
            childId!,
            familyId!,
            photo.uri
          );
        }
      }

      if (phase === 'pre') {
        setPreImageUri(resolvedUri);
        setSession((current) => (current ? { ...current, preImageUri: resolvedUri } : current));
        setPhase('post');
      } else if (phase === 'post') {
        setPostImageUri(resolvedUri);
        setSession((current) =>
          current ? { ...current, postImageUri: resolvedUri, status: 'ANALYZING' } : current
        );
        setPhase('review');
      }
    } catch (error) {
      console.error('Homework capture failed:', error);
      Alert.alert('Capture failed', 'Could not take the photo. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const analyzeHomework = async () => {
    if (!session || !preImageUri || !postImageUri) {
      Alert.alert('Missing photos', 'Capture both homework photos first.');
      return;
    }

    try {
      setLoading(true);

      const fullSession: HomeworkSession = {
        ...session,
        preImageUri,
        postImageUri,
        status: 'ANALYZING',
      };

      if (familyId && childId) {
        await HomeworkService.saveSession(fullSession);

        const analyzeHomework = httpsCallable(functions, 'analyzeHomework');
        const response = await analyzeHomework({
          sessionId: fullSession.sessionId,
          familyId,
          childId,
          preImageUrl: preImageUri,
          postImageUrl: postImageUri,
        });

        const analysisPayload = (
          response.data as {
            analysis?: {
              confidence?: number;
              completion?: HomeworkAnalysis['completionEstimate'];
              writingDensityDifference?: number;
              message?: string;
            };
          }
        )?.analysis;

        const mappedAnalysis: HomeworkAnalysis = {
          analysisId: analysisPayload
            ? `analysis_${fullSession.sessionId}`
            : `analysis_${Date.now()}`,
          sessionId: fullSession.sessionId,
          preImageOCRText: '',
          postImageOCRText: '',
          writingDensityDifference: analysisPayload?.writingDensityDifference ?? 0,
          pageAlignment: 'SAME_PAGE',
          completionEstimate: analysisPayload?.completion ?? 'LIKELY_COMPLETE',
          confidenceScore: analysisPayload?.confidence ?? 0,
          duplicateImageDetected: false,
          generatedAt: Date.now(),
          model: 'gemini-2.5-flash',
        };

        setAnalysis(mappedAnalysis);
        setAnalysisMessage(
          analysisPayload?.message ?? 'Homework analysis sent to the family workspace.'
        );
        setSession({ ...fullSession, status: 'REVIEW_PENDING', analysis: mappedAnalysis });
      } else {
        const localResult = await HomeworkService.analyzeSession(fullSession);
        setSession(localResult);
        setAnalysis(localResult.analysis ?? null);
        setAnalysisMessage(
          'Demo analysis completed locally. Pair a family account to sync to Firebase.'
        );
      }

      setPhase('review');
      Alert.alert('Homework analyzed', 'Your parent can now review the result.');
    } catch (error) {
      console.error('Homework analysis failed:', error);
      Alert.alert('Analysis failed', 'Could not analyze homework right now.');
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setSession(null);
    setPhase('idle');
    setPreImageUri(null);
    setPostImageUri(null);
    setAnalysis(null);
    setAnalysisMessage('');
  };

  if (!permission?.granted) {
    return (
      <View style={styles.permissionScreen}>
        <View style={styles.permissionCard}>
          <Ionicons name="camera-outline" size={28} color="#0B4A9A" />
          <Text style={styles.permissionTitle}>Camera access needed</Text>
          <Text style={styles.permissionText}>
            Grant camera access to capture before and after homework photos.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={requestPermission}
            activeOpacity={0.9}
          >
            <Text style={styles.primaryButtonText}>Allow camera</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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

        <Text style={styles.title}>Homework Check-in</Text>
        <Text style={styles.subtitle}>
          Capture your notebook before and after homework, then send it for review.
        </Text>

        <View style={styles.metricsRow}>
          <View style={styles.metricPill}>
            <Ionicons name="camera-reverse-outline" size={14} color="#0B4A9A" />
            <Text style={styles.metricText}>
              {phase === 'idle' ? 'Ready' : phase.toUpperCase()}
            </Text>
          </View>
          <View style={styles.metricPill}>
            <Ionicons name="cloud-upload-outline" size={14} color="#0B4A9A" />
            <Text style={styles.metricText}>{familyId ? 'Family sync on' : 'Demo mode'}</Text>
          </View>
        </View>
      </View>

      {!hasSession ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Start a session</Text>
          <Text style={styles.helperText}>
            Use one session per homework assignment so the before and after photos stay grouped.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={startSession} activeOpacity={0.9}>
            <Ionicons name="play-outline" size={16} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Start homework session</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Capture photos</Text>
            <TouchableOpacity onPress={resetFlow} activeOpacity={0.85}>
              <Text style={styles.sectionAction}>Reset</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cameraFrame}>
            <CameraView ref={cameraRef} style={styles.camera} facing="back" />
            <View style={styles.cameraOverlay}>
              <Text style={styles.cameraLabel}>
                {phase === 'pre'
                  ? 'Capture BEFORE homework'
                  : phase === 'post'
                    ? 'Capture AFTER homework'
                    : 'Ready for review'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={captureCurrentPhoto}
            activeOpacity={0.9}
            disabled={loading || phase === 'review'}
          >
            <Ionicons name="camera-outline" size={16} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>
              {loading
                ? 'Working...'
                : phase === 'pre'
                  ? 'Take pre-photo'
                  : phase === 'post'
                    ? 'Take post-photo'
                    : 'Capture'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryButton,
              (!canAnalyze || loading) && styles.secondaryButtonDisabled,
            ]}
            onPress={analyzeHomework}
            activeOpacity={0.9}
            disabled={!canAnalyze || loading}
          >
            <Ionicons name="analytics-outline" size={16} color="#0B4A9A" />
            <Text style={styles.secondaryButtonText}>Analyze homework</Text>
          </TouchableOpacity>
        </View>
      )}

      {(preImageUri || postImageUri) && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Captured photos</Text>
          <View style={styles.previewGrid}>
            {preImageUri ? (
              <View style={styles.previewCard}>
                <Text style={styles.previewLabel}>Before</Text>
                <Image source={{ uri: preImageUri }} style={styles.previewImage} />
              </View>
            ) : null}
            {postImageUri ? (
              <View style={styles.previewCard}>
                <Text style={styles.previewLabel}>After</Text>
                <Image source={{ uri: postImageUri }} style={styles.previewImage} />
              </View>
            ) : null}
          </View>
        </View>
      )}

      {analysis && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Analysis result</Text>
          <View style={styles.analysisCard}>
            <View style={styles.analysisRow}>
              <Text style={styles.analysisLabel}>Completion</Text>
              <Text style={styles.analysisValue}>{analysis.completionEstimate}</Text>
            </View>
            <View style={styles.analysisRow}>
              <Text style={styles.analysisLabel}>Confidence</Text>
              <Text style={styles.analysisValue}>{analysis.confidenceScore}%</Text>
            </View>
            <View style={styles.analysisRow}>
              <Text style={styles.analysisLabel}>Writing increase</Text>
              <Text style={styles.analysisValue}>{analysis.writingDensityDifference}%</Text>
            </View>
            <Text style={styles.analysisNote}>
              {analysisMessage || 'Homework analysis ready for parent review.'}
            </Text>
          </View>
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
  permissionScreen: {
    flex: 1,
    backgroundColor: '#091A35',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  permissionCard: {
    width: '100%',
    borderRadius: 22,
    backgroundColor: '#F4F7FD',
    padding: 20,
    alignItems: 'center',
  },
  permissionTitle: {
    marginTop: 10,
    color: '#1A2B48',
    fontSize: 18,
    fontWeight: '700',
  },
  permissionText: {
    marginTop: 8,
    color: '#61718D',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
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
    color: '#BFD2F4',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#1A2B48',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionAction: {
    color: '#2B4C7D',
    fontWeight: '700',
  },
  helperText: {
    color: '#61718D',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  cameraFrame: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#DCE5F3',
    aspectRatio: 0.78,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: 'rgba(10, 27, 53, 0.78)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cameraLabel: {
    color: '#F6FAFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 14,
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
    marginTop: 10,
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
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryButtonDisabled: {
    opacity: 0.6,
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  previewCard: {
    flex: 1,
    minWidth: '48%',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderWidth: 1,
    borderColor: '#DCE5F3',
  },
  previewLabel: {
    color: '#4E5F7B',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#DCE5F3',
  },
  analysisCard: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderWidth: 1,
    borderColor: '#DCE5F3',
  },
  analysisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
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
  analysisNote: {
    marginTop: 10,
    color: '#2B4C7D',
    fontSize: 13,
    lineHeight: 18,
  },
});
