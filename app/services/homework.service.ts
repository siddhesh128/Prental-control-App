/**
 * Homework Session Management Service
 * Handles image uploads, session lifecycle, and Cloud Function calls
 */

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firestoreDb, storage } from '../config/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { HomeworkSession } from '../../types/homework';
import { HomeworkAnalyzerService } from './ai/homework-analyzer';

export class HomeworkService {
  /**
   * Create a new homework session
   */
  static async createSession(childId: string, familyId: string): Promise<HomeworkSession> {
    const session: HomeworkSession = {
      sessionId: `hw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      childId,
      familyId,
      startedAt: Date.now(),
      preImageUri: '',
      postImageUri: '',
      status: 'IN_PROGRESS',
    };

    return session;
  }

  /**
   * Upload pre-homework notebook image
   */
  static async uploadPreImage(
    sessionId: string,
    childId: string,
    familyId: string,
    imageUri: string
  ): Promise<string> {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();

      const storageRef = ref(storage, `homework/${familyId}/${childId}/${sessionId}/pre-image.jpg`);

      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);

      return downloadUrl;
    } catch (error) {
      console.error('Error uploading pre-image:', error);
      throw error;
    }
  }

  /**
   * Upload post-homework notebook image
   */
  static async uploadPostImage(
    sessionId: string,
    childId: string,
    familyId: string,
    imageUri: string
  ): Promise<string> {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();

      const storageRef = ref(
        storage,
        `homework/${familyId}/${childId}/${sessionId}/post-image.jpg`
      );

      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);

      return downloadUrl;
    } catch (error) {
      console.error('Error uploading post-image:', error);
      throw error;
    }
  }

  /**
   * Save homework session to Firestore
   */
  static async saveSession(session: HomeworkSession): Promise<void> {
    try {
      const sessionRef = doc(
        firestoreDb,
        'families',
        session.familyId,
        'homework',
        session.sessionId
      );

      await setDoc(sessionRef, {
        ...session,
      });
    } catch (error) {
      console.error('Error saving homework session:', error);
      throw error;
    }
  }

  /**
   * Analyze homework session (calls Genkit service)
   */
  static async analyzeSession(session: HomeworkSession): Promise<HomeworkSession> {
    try {
      const analysisResult = await HomeworkAnalyzerService.analyzeHomeworkSession(
        { url: session.preImageUri },
        { url: session.postImageUri }
      );

      return {
        ...session,
        status: 'REVIEW_PENDING',
        analysis: {
          analysisId: `analysis_${Date.now()}`,
          sessionId: session.sessionId,
          preImageOCRText: '',
          postImageOCRText: '',
          writingDensityDifference: analysisResult.writingDensityDifference,
          pageAlignment: 'SAME_PAGE',
          completionEstimate: analysisResult.completion,
          confidenceScore: analysisResult.confidence,
          duplicateImageDetected: false,
          generatedAt: Date.now(),
          model: 'gemini-2.5-flash',
        },
      };
    } catch (error) {
      console.error('Error analyzing homework:', error);
      throw error;
    }
  }

  /**
   * Mark homework as reviewed by parent
   */
  static async submitParentReview(
    sessionId: string,
    familyId: string,
    decision: 'APPROVED' | 'REJECTED',
    guardianId: string,
    pointsAwarded?: number
  ): Promise<void> {
    try {
      const sessionRef = doc(firestoreDb, 'families', familyId, 'homework', sessionId);

      await updateDoc(sessionRef, {
        status: decision === 'APPROVED' ? 'APPROVED' : 'REJECTED',
        parentReview: {
          decision,
          reviewedBy: guardianId,
          reviewedAt: Date.now(),
          pointsAwarded,
        },
      });
    } catch (error) {
      console.error('Error submitting parent review:', error);
      throw error;
    }
  }

  /**
   * Auto-approve homework based on confidence threshold
   */
  static shouldAutoApprove(confidenceScore: number, threshold: number = 85): boolean {
    return confidenceScore >= threshold;
  }
}
