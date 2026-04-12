/**
 * Firebase Cloud Functions for Parental Control
 * Handles device pairing, monitoring, and communication
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

// ============================================================================
// PAIRING FUNCTIONS
// ============================================================================

/**
 * Cloud Function: Confirm Device Pairing
 * Called by child device after scanning parent's QR code
 *
 * Request body:
 * {
 *   childId: string
 *   parentId: string
 *   token: string
 *   childDeviceName: string
 * }
 *
 * Response:
 * {
 *   id: string
 *   parentId: string
 *   childId: string
 *   childDeviceName: string
 *   status: 'confirmed'
 *   confirmedAt: number
 * }
 */
export const confirmDevicePairing = functions.https.onCall(
  async (
    data: {
      childId: string;
      parentId: string;
      token: string;
      childDeviceName: string;
    },
    context: functions.https.CallableContext
  ) => {
    try {
      // Verify user is authenticated
      if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'User must be authenticated to confirm pairing'
        );
      }

      const { childId, parentId, token, childDeviceName } = data;

      // Validate input
      if (!childId || !parentId || !token) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Missing required fields: childId, parentId, token'
        );
      }

      // Validate token format (32 alphanumeric characters)
      if (!/^[A-Z0-9]{32}$/.test(token)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid token format');
      }

      // Find pairing session with this token
      const pairingSessionsRef = db.collection('pairingSessions');
      const sessionQuery = await pairingSessionsRef
        .where('token', '==', token)
        .where('parentId', '==', parentId)
        .where('status', '==', 'active')
        .limit(1)
        .get();

      if (sessionQuery.empty) {
        throw new functions.https.HttpsError(
          'not-found',
          'Pairing session not found or already expired'
        );
      }

      const sessionDoc = sessionQuery.docs[0];
      const sessionData = sessionDoc.data();

      // Check if token has expired (5 minutes)
      const now = admin.firestore.Timestamp.now();
      const expiresAt = sessionData.expiresAt as admin.firestore.Timestamp;

      if (now.toMillis() > expiresAt.toMillis()) {
        // Mark session as expired
        await sessionDoc.ref.update({ status: 'expired' });
        throw new functions.https.HttpsError('deadline-exceeded', 'Pairing token has expired');
      }

      // Check if child is already paired with this parent
      const existingPairingRef = db.collection('devicePairings');
      const existingQuery = await existingPairingRef
        .where('childId', '==', childId)
        .where('parentId', '==', parentId)
        .where('status', '==', 'confirmed')
        .limit(1)
        .get();

      if (!existingQuery.empty) {
        throw new functions.https.HttpsError(
          'already-exists',
          'Child device is already paired with this parent'
        );
      }

      // Create device pairing record
      const pairingRef = db.collection('devicePairings');
      const newPairingDoc = await pairingRef.add({
        parentId,
        childId,
        childDeviceName: childDeviceName || 'Unknown Device',
        token,
        status: 'confirmed',
        createdAt: admin.firestore.Timestamp.now(),
        confirmedAt: admin.firestore.Timestamp.now(),
        expiresAt: sessionData.expiresAt,
      });

      // Mark session as used
      await sessionDoc.ref.update({
        status: 'used',
        usedAt: admin.firestore.Timestamp.now(),
      });

      // Add pairing relationship to parent's device doc
      const parentDeviceRef = db
        .collection('users')
        .doc(parentId)
        .collection('devices')
        .doc(sessionData.parentDeviceId);

      const pairedChildrenRef = parentDeviceRef.collection('pairedChildren');
      await pairedChildrenRef.doc(childId).set({
        childId,
        childDeviceName: childDeviceName || 'Unknown Device',
        pairingId: newPairingDoc.id,
        pairedAt: admin.firestore.Timestamp.now(),
        status: 'active',
      });

      // Add pairing relationship to child's doc
      const childDeviceRef = db
        .collection('users')
        .doc(childId)
        .collection('devices')
        .doc('default');

      await childDeviceRef.set(
        {
          pairedParentId: parentId,
          pairedParentDeviceId: sessionData.parentDeviceId,
          pairingId: newPairingDoc.id,
          pairedAt: admin.firestore.Timestamp.now(),
        },
        { merge: true }
      );

      return {
        id: newPairingDoc.id,
        parentId,
        childId,
        childDeviceName: childDeviceName || 'Unknown Device',
        status: 'confirmed',
        confirmedAt: Date.now(),
      };
    } catch (error: any) {
      console.error('Error confirming device pairing:', error);

      // Re-throw HttpsError as-is
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      // Wrap any other errors
      throw new functions.https.HttpsError('internal', 'Failed to confirm device pairing');
    }
  }
);

/**
 * Cloud Function: Validate Pairing Token
 * Called by child device while scanning to verify token validity
 *
 * Request body:
 * {
 *   token: string
 *   parentId: string
 * }
 *
 * Response:
 * {
 *   valid: boolean
 *   timeRemaining: number (seconds)
 *   message: string
 * }
 */
export const validatePairingToken = functions.https.onCall(async (data: { token: string; parentId: string }, context: functions.https.CallableContext) => {
  try {
    const { token, parentId } = data;

    // Validate input
    if (!token || !parentId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields: token, parentId'
      );
    }

    // Find pairing session
    const pairingSessionsRef = db.collection('pairingSessions');
    const sessionQuery = await pairingSessionsRef
      .where('token', '==', token)
      .where('parentId', '==', parentId)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (sessionQuery.empty) {
      return {
        valid: false,
        timeRemaining: 0,
        message: 'Pairing session not found',
      };
    }

    const sessionData = sessionQuery.docs[0].data();
    const now = admin.firestore.Timestamp.now();
    const expiresAt = sessionData.expiresAt as admin.firestore.Timestamp;
    const timeRemainingMs = expiresAt.toMillis() - now.toMillis();

    // Token expired
    if (timeRemainingMs <= 0) {
      await sessionQuery.docs[0].ref.update({ status: 'expired' });
      return {
        valid: false,
        timeRemaining: 0,
        message: 'Pairing token has expired',
      };
    }

    const timeRemaining = Math.ceil(timeRemainingMs / 1000);

    return {
      valid: true,
      timeRemaining,
      message: `Token valid for ${timeRemaining} more seconds`,
    };
  } catch (error: any) {
    console.error('Error validating pairing token:', error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError('internal', 'Failed to validate pairing token');
  }
});

/**
 * Cloud Function: Generate Pairing Code
 * Called by parent device to generate a new QR code for pairing
 *
 * Returns a pairing session that can be encoded to QR
 *
 * Response:
 * {
 *   token: string
 *   expiresAt: number (milliseconds)
 *   qrData: string (JSON encoded pairing data)
 * }
 */
export const generatePairingCode = functions.https.onCall(
  async (
    data: { parentId: string; parentDeviceId: string },
    context: functions.https.CallableContext
  ) => {
    try {
      // Verify user is authenticated
      if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'User must be authenticated to generate pairing code'
        );
      }

      const { parentId, parentDeviceId } = data;

      // Validate input
      if (!parentId || !parentDeviceId) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Missing required fields: parentId, parentDeviceId'
        );
      }

      // Generate random token
      const token = PairingService.generateToken();

      // Set expiry to 5 minutes from now
      const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 5 * 60 * 1000));

      // Create pairing session
      const pairingSessionsRef = db.collection('pairingSessions');
      await pairingSessionsRef.add({
        parentId,
        parentDeviceId,
        token,
        createdAt: admin.firestore.Timestamp.now(),
        expiresAt,
        status: 'active',
      });

      // Create QR data
      const qrData = {
        parentId,
        parentDeviceId,
        token,
        expiresAt: expiresAt.toMillis(),
      };

      return {
        token,
        expiresAt: expiresAt.toMillis(),
        qrData: JSON.stringify(qrData),
      };
    } catch (error: any) {
      console.error('Error generating pairing code:', error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError('internal', 'Failed to generate pairing code');
    }
  }
);

/**
 * Scheduled Function: Clean up expired pairing sessions
 * Runs every hour to remove expired pairing sessions
 */
export const cleanupExpiredPairings = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context: any) => {
    try {
      const now = admin.firestore.Timestamp.now();
      const pairingSessionsRef = db.collection('pairingSessions');

      // Find and delete expired sessions
      const expiredQuery = await pairingSessionsRef
        .where('expiresAt', '<', now)
        .where('status', '==', 'active')
        .get();

      const batch = db.batch();
      expiredQuery.docs.forEach((doc: any) => {
        batch.update(doc.ref, { status: 'expired' });
      });

      await batch.commit();

      console.log(`Cleaned up ${expiredQuery.docs.length} expired pairing sessions`);
      return null;
    } catch (error) {
      console.error('Error cleaning up expired pairings:', error);
      return null;
    }
  });

/**
 * Utility class for pairing operations
 */
class PairingService {
  private static readonly TOKEN_LENGTH = 32;

  static generateToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';
    for (let i = 0; i < this.TOKEN_LENGTH; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }
}

// ============================================================================
// MONITORING FUNCTIONS (Placeholder for future implementation)
// ============================================================================

/**
 * Cloud Function: Log device activity
 * Called by child device to log activities (app launches, website visits, etc)
 */
export const logDeviceActivity = functions.https.onCall(
  async (data: { childId: string; activity: any }, context: functions.https.CallableContext) => {
    try {
      if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
      }

      const { childId, activity } = data;

      if (!childId || !activity) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
      }

      // Store activity log
      const activitiesRef = db.collection('users').doc(childId).collection('activities');

      await activitiesRef.add({
        ...activity,
        timestamp: admin.firestore.Timestamp.now(),
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error logging device activity:', error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError('internal', 'Failed to log device activity');
    }
  }
);

/**
 * Firestore trigger: When a new pairing is created, initialize user relationship
 */
export const onPairingCreated = functions.firestore
  .document('devicePairings/{pairingId}')
  .onCreate(async (snap: any, context: any) => {
    try {
      const pairing = snap.data();

      // Initialize parent-child relationship if not exists
      const parentUserRef = db.collection('users').doc(pairing.parentId);
      const childrenRef = parentUserRef.collection('children');

      await childrenRef.doc(pairing.childId).set(
        {
          childId: pairing.childId,
          pairedAt: admin.firestore.Timestamp.now(),
          status: 'active',
        },
        { merge: true }
      );

      console.log(`Created parent-child relationship: ${pairing.parentId} -> ${pairing.childId}`);
      return null;
    } catch (error) {
      console.error('Error in onPairingCreated:', error);
      return null;
    }
  });

/**
 * Firestore trigger: When a pairing is deleted, update relationships
 */
export const onPairingDeleted = functions.firestore
  .document('devicePairings/{pairingId}')
  .onDelete(async (snap: any, context: any) => {
    try {
      const pairing = snap.data();

      // Mark child relationship as inactive
      const parentUserRef = db.collection('users').doc(pairing.parentId);
      const childrenRef = parentUserRef.collection('children');

      await childrenRef.doc(pairing.childId).update({
        status: 'inactive',
        unpairedAt: admin.firestore.Timestamp.now(),
      });

      console.log(`Deleted parent-child relationship: ${pairing.parentId} -> ${pairing.childId}`);
      return null;
    } catch (error) {
      console.error('Error in onPairingDeleted:', error);
      return null;
    }
  });

// ============================================================================
// FAMILY HIERARCHY FUNCTIONS
// ============================================================================

/**
 * Cloud Function: Add Family Member
 * Called by primary guardian to add co-guardian or caregiver to family
 */
export const addFamilyMember = functions.https.onCall(
  async (
    data: {
      familyId: string;
      memberEmail: string;
      role: string;
      displayName: string;
    },
    context: functions.https.CallableContext
  ) => {
    try {
      if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
      }

      const { familyId, memberEmail, role, displayName } = data;

      // Validate input
      if (!familyId || !memberEmail || !role) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
      }

      // Check if caller is primary guardian
      const familyRef = db.collection('families').doc(familyId);
      const familyDoc = await familyRef.get();

      if (!familyDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Family not found');
      }

      if (familyDoc.data()?.primaryGuardianId !== context.auth.uid) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Only primary guardian can add members'
        );
      }

      // Create or get user by email
      let newUser = null;
      try {
        newUser = await auth.getUserByEmail(memberEmail);
      } catch (error) {
        // Create new user if doesn't exist
        newUser = await auth.createUser({
          email: memberEmail,
          emailVerified: false,
        });
      }

      // Add member to family
      const membersRef = familyRef.collection('members');
      await membersRef.doc(newUser.uid).set({
        userId: newUser.uid,
        role,
        displayName,
        email: memberEmail,
        addedAt: admin.firestore.Timestamp.now(),
      });

      return {
        success: true,
        memberId: newUser.uid,
        message: 'Family member added successfully',
      };
    } catch (error: any) {
      console.error('Error in addFamilyMember:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  }
);

/**
 * Cloud Function: Update Family Member Role
 */
export const updateFamilyMemberRole = functions.https.onCall(
  async (
    data: { familyId: string; memberId: string; newRole: string },
    context: functions.https.CallableContext
  ) => {
    try {
      if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
      }

      const { familyId, memberId, newRole } = data;

      // Check if caller is primary guardian
      const familyRef = db.collection('families').doc(familyId);
      const familyDoc = await familyRef.get();

      if (familyDoc.data()?.primaryGuardianId !== context.auth.uid) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Only primary guardian can update roles'
        );
      }

      // Update member role
      const memberRef = familyRef.collection('members').doc(memberId);
      await memberRef.update({
        role: newRole,
        updatedAt: admin.firestore.Timestamp.now(),
      });

      return { success: true, message: 'Role updated successfully' };
    } catch (error: any) {
      console.error('Error in updateFamilyMemberRole:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  }
);

// ============================================================================
// HOMEWORK ANALYSIS FUNCTIONS
// ============================================================================

/**
 * Cloud Function: Analyze Homework
 * Called by child app after uploading before/after homework images
 */
export const analyzeHomework = functions.https.onCall(
  async (
    data: {
      sessionId: string;
      familyId: string;
      childId: string;
      preImageUrl: string;
      postImageUrl: string;
    },
    context: functions.https.CallableContext
  ) => {
    try {
      if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
      }

      const { sessionId, familyId, childId, preImageUrl, postImageUrl } = data;

      // TODO: Call Gemini Vision API to analyze homework
      // For now, return a mock analysis
      const analysis = {
        analysisId: `analysis_${Date.now()}`,
        sessionId,
        confidence: 85,
        completion: 'COMPLETE',
        writingDensityDifference: 65,
        message: 'Analysis would call Gemini Vision API here',
      };

      // Store analysis in Firestore
      const sessionRef = db
        .collection('families')
        .doc(familyId)
        .collection('homework')
        .doc(sessionId);
      await sessionRef.update({
        status: 'REVIEW_PENDING',
        analysis,
        analyzedAt: admin.firestore.Timestamp.now(),
      });

      return { success: true, analysis };
    } catch (error: any) {
      console.error('Error in analyzeHomework:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  }
);

/**
 * Cloud Function: Review Homework
 * Called by parent guardian to approve/reject homework
 */
export const reviewHomework = functions.https.onCall(
  async (
    data: {
      sessionId: string;
      familyId: string;
      decision: string;
      pointsAwarded?: number;
    },
    context: functions.https.CallableContext
  ) => {
    try {
      if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
      }

      const { sessionId, familyId, decision, pointsAwarded } = data;

      // Update homework session
      const sessionRef = db
        .collection('families')
        .doc(familyId)
        .collection('homework')
        .doc(sessionId);
      await sessionRef.update({
        status: decision === 'APPROVED' ? 'APPROVED' : 'REJECTED',
        parentReview: {
          decision,
          reviewedBy: context.auth.uid,
          reviewedAt: admin.firestore.Timestamp.now(),
          pointsAwarded: pointsAwarded || 0,
        },
      });

      return { success: true, message: 'Homework reviewed' };
    } catch (error: any) {
      console.error('Error in reviewHomework:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  }
);

// ============================================================================
// EXERCISE VERIFICATION FUNCTIONS
// ============================================================================

/**
 * Cloud Function: Verify Exercise Session
 * Called by child app after completing exercise routine
 */
export const verifyExerciseSession = functions.https.onCall(
  async (
    data: {
      sessionId: string;
      familyId: string;
      childId: string;
      exerciseType: string;
      repsPerformed: number;
    },
    context: functions.https.CallableContext
  ) => {
    try {
      if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
      }

      const { sessionId, familyId, childId, exerciseType, repsPerformed } = data;

      // Calculate bonus minutes (1 minute per rep, capped at daily max)
      const bonusMinutes = Math.min(repsPerformed, 30); // 30 min daily cap

      // Update exercise session
      const sessionRef = db
        .collection('families')
        .doc(familyId)
        .collection('exercises')
        .doc(sessionId);
      await sessionRef.update({
        status: 'COMPLETED',
        verified: true,
        bonusMinutesEarned: bonusMinutes,
        verifiedAt: admin.firestore.Timestamp.now(),
      });

      // Award bonus minutes to child's screen time
      const rewardRef = db.collection('families').doc(familyId).collection('rewards').doc(childId);
      await rewardRef.update({
        bonusMinutesAvailable: admin.firestore.FieldValue.increment(bonusMinutes),
      });

      return {
        success: true,
        bonusMinutesAwarded: bonusMinutes,
        message: `Verified ${repsPerformed} reps - ${bonusMinutes} bonus minutes awarded`,
      };
    } catch (error: any) {
      console.error('Error in verifyExerciseSession:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  }
);

// ============================================================================
// TASK COMPLETION FUNCTIONS
// ============================================================================

/**
 * Cloud Function: Complete Task
 * Called by child app to mark a task as done
 */
export const completeTask = functions.https.onCall(
  async (
    data: { taskId: string; familyId: string; childId: string; pointsValue: number },
    context: functions.https.CallableContext
  ) => {
    try {
      if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
      }

      const { taskId, familyId, childId, pointsValue } = data;

      // Update task status
      const taskRef = db.collection('families').doc(familyId).collection('tasks').doc(taskId);
      await taskRef.update({
        status: 'SUBMITTED',
        submittedAt: admin.firestore.Timestamp.now(),
      });

      // Award points to child
      const walletRef = db.collection('families').doc(familyId).collection('rewards').doc(childId);
      await walletRef.update({
        totalPoints: admin.firestore.FieldValue.increment(pointsValue),
        lastUpdated: admin.firestore.Timestamp.now(),
      });

      return {
        success: true,
        pointsAwarded: pointsValue,
        message: 'Task submitted for review',
      };
    } catch (error: any) {
      console.error('Error in completeTask:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  }
);

/**
 * Cloud Function: Approve Task
 * Called by parent to approve completed task
 */
export const approveTask = functions.https.onCall(
  async (
    data: { taskId: string; familyId: string; childId: string },
    context: functions.https.CallableContext
  ) => {
    try {
      if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
      }

      const { taskId, familyId, childId } = data;

      // Update task status
      const taskRef = db.collection('families').doc(familyId).collection('tasks').doc(taskId);
      await taskRef.update({
        status: 'APPROVED',
        approvedAt: admin.firestore.Timestamp.now(),
        approvedBy: context.auth.uid,
      });

      return { success: true, message: 'Task approved' };
    } catch (error: any) {
      console.error('Error in approveTask:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  }
);
