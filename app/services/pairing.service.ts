/**
 * Pairing Service - Handles QR code generation and device pairing
 */

import { httpsCallable, getFunctions } from 'firebase/functions';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';

export interface PairingToken {
  parentId: string;
  parentDeviceId: string;
  token: string;
  expiresAt: number; // Unix timestamp
  role: 'parent' | 'child';
}

export interface PairingData {
  parentId: string;
  parentDeviceId: string;
  token: string;
  expiresAt: number;
}

export interface DevicePairing {
  id: string;
  parentId: string;
  childId: string;
  childDeviceName: string;
  token: string;
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt: number;
  confirmedAt?: number;
  expiresAt: number;
}

export class PairingService {
  private static readonly TOKEN_LENGTH = 32;
  private static readonly EXPIRY_DURATION = 5 * 60 * 1000; // 5 minutes
  private static readonly FUNCTIONS = getFunctions();
  private static readonly FIRESTORE = getFirestore();

  private static isCallableUnavailable(error: any): boolean {
    const code = error?.code ?? '';
    return code.includes('not-found') || code.includes('unimplemented');
  }

  /**
   * Generate a unique pairing token
   */
  static generateToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';
    for (let i = 0; i < this.TOKEN_LENGTH; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  /**
   * Generate pairing data for QR code
   */
  static generatePairingData(parentId: string, parentDeviceId: string): PairingData {
    const token = this.generateToken();
    const expiresAt = Date.now() + this.EXPIRY_DURATION;

    return {
      parentId,
      parentDeviceId,
      token,
      expiresAt,
    };
  }

  /**
   * Convert pairing data to QR code string (JSON encoded)
   */
  static encodePairingData(data: PairingData): string {
    return JSON.stringify(data);
  }

  /**
   * Parse QR code string back to pairing data
   */
  static decodePairingData(qrData: string): PairingData | null {
    try {
      const data = JSON.parse(qrData);

      // Validate required fields
      if (!data.parentId || !data.token || !data.expiresAt) {
        return null;
      }

      return data as PairingData;
    } catch (error) {
      console.error('Failed to decode pairing data:', error);
      return null;
    }
  }

  /**
   * Check if pairing token is still valid
   */
  static isTokenValid(expiresAt: number): boolean {
    return Date.now() < expiresAt;
  }

  /**
   * Get time remaining for token (in seconds)
   */
  static getTimeRemaining(expiresAt: number): number {
    const remaining = expiresAt - Date.now();
    return Math.max(0, Math.ceil(remaining / 1000));
  }

  /**
   * Validate pairing token format
   */
  static validateToken(token: string): boolean {
    const regex = /^[A-Z0-9]{32}$/;
    return regex.test(token);
  }

  /**
   * Create pairing session in Firestore
   */
  static async createPairingSession(parentId: string, parentDeviceId: string): Promise<string> {
    const data = this.generatePairingData(parentId, parentDeviceId);

    try {
      const generatePairingCodeFn = httpsCallable(this.FUNCTIONS, 'generatePairingCode');
      const response = await generatePairingCodeFn({
        parentId,
        parentDeviceId,
      });

      const responseData = response.data as {
        token: string;
        expiresAt: number;
        qrData: string;
      };

      if (!responseData?.qrData) {
        throw new Error('Invalid pairing response');
      }

      return responseData.qrData;
    } catch (error) {
      if (this.isCallableUnavailable(error)) {
        const pairingsRef = collection(this.FIRESTORE, 'pairingSessions');
        await addDoc(pairingsRef, {
          parentId,
          parentDeviceId,
          token: data.token,
          createdAt: Timestamp.now(),
          expiresAt: Timestamp.fromMillis(data.expiresAt),
          status: 'active',
        });

        return this.encodePairingData(data);
      }

      console.error('Failed to create pairing session:', error);
      throw new Error('Failed to create pairing session');
    }
  }

  /**
   * Confirm pairing between parent and child
   */
  static async confirmPairing(
    childId: string,
    parentId: string,
    token: string,
    childDeviceName: string
  ): Promise<DevicePairing> {
    try {
      // Validate token is in correct format
      if (!this.validateToken(token)) {
        throw new Error('Invalid token format');
      }

      // Call Cloud Function to confirm pairing
      const confirmPairingFn = httpsCallable(this.FUNCTIONS, 'confirmDevicePairing');

      const response = await confirmPairingFn({
        childId,
        parentId,
        token,
        childDeviceName,
      });

      return response.data as DevicePairing;
    } catch (error) {
      if (this.isCallableUnavailable(error)) {
        const sessionsRef = collection(this.FIRESTORE, 'pairingSessions');
        const sessionQuery = query(
          sessionsRef,
          where('token', '==', token),
          where('parentId', '==', parentId),
          where('status', '==', 'active')
        );
        const sessionSnapshot = await getDocs(sessionQuery);

        if (sessionSnapshot.empty) {
          throw new Error('Pairing session not found or expired.');
        }

        const sessionDoc = sessionSnapshot.docs[0];
        const sessionData = sessionDoc.data();
        const expiresAt = sessionData.expiresAt?.toMillis
          ? sessionData.expiresAt.toMillis()
          : sessionData.expiresAt;

        if (!this.isTokenValid(expiresAt)) {
          await updateDoc(doc(this.FIRESTORE, 'pairingSessions', sessionDoc.id), {
            status: 'expired',
            expiredAt: Timestamp.now(),
          });
          throw new Error('Pairing token has expired.');
        }

        const pairingsRef = collection(this.FIRESTORE, 'devicePairings');
        const pairingDoc = await addDoc(pairingsRef, {
          parentId,
          childId,
          childDeviceName: childDeviceName || 'Child Device',
          token,
          status: 'confirmed',
          createdAt: Timestamp.now(),
          confirmedAt: Timestamp.now(),
          expiresAt: sessionData.expiresAt,
        });

        await updateDoc(doc(this.FIRESTORE, 'pairingSessions', sessionDoc.id), {
          status: 'used',
          usedAt: Timestamp.now(),
        });

        return {
          id: pairingDoc.id,
          parentId,
          childId,
          childDeviceName: childDeviceName || 'Child Device',
          token,
          status: 'confirmed',
          createdAt: Date.now(),
          confirmedAt: Date.now(),
          expiresAt,
        };
      }

      console.error('Failed to confirm pairing:', error);
      throw new Error('Failed to confirm pairing. Token may be expired or invalid.');
    }
  }

  /**
   * Validate pairing token before confirming
   */
  static async validatePairingToken(token: string, parentId: string): Promise<boolean> {
    try {
      const pairingsRef = collection(this.FIRESTORE, 'pairingSessions');
      const q = query(
        pairingsRef,
        where('token', '==', token),
        where('parentId', '==', parentId),
        where('status', '==', 'active')
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return false;
      }

      const pairingDoc = snapshot.docs[0];
      const data = pairingDoc.data();

      // Check if token has expired
      const expiresAt = data.expiresAt.toMillis ? data.expiresAt.toMillis() : data.expiresAt;
      if (!this.isTokenValid(expiresAt)) {
        // Mark as expired
        await updateDoc(doc(this.FIRESTORE, 'pairingSessions', pairingDoc.id), {
          status: 'expired',
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to validate token:', error);
      return false;
    }
  }

  /**
   * Get pairing session by token
   */
  static async getPairingSession(token: string): Promise<any | null> {
    try {
      const pairingsRef = collection(this.FIRESTORE, 'pairingSessions');
      const q = query(pairingsRef, where('token', '==', token), where('status', '==', 'active'));

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      const data = snapshot.docs[0].data();
      const expiresAt = data.expiresAt.toMillis ? data.expiresAt.toMillis() : data.expiresAt;

      // Check expiration
      if (!this.isTokenValid(expiresAt)) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to get pairing session:', error);
      return null;
    }
  }

  /**
   * Get all pairings for a parent
   */
  static async getParentPairings(parentId: string): Promise<DevicePairing[]> {
    try {
      const pairingsRef = collection(this.FIRESTORE, 'devicePairings');
      const q = query(
        pairingsRef,
        where('parentId', '==', parentId),
        where('status', '==', 'confirmed')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as DevicePairing
      );
    } catch (error) {
      console.error('Failed to get parent pairings:', error);
      return [];
    }
  }

  /**
   * Get confirmed pairing by token (used by parent screen to detect successful child linking)
   */
  static async getConfirmedPairingByToken(
    token: string,
    parentId?: string
  ): Promise<DevicePairing | null> {
    try {
      const pairingsRef = collection(this.FIRESTORE, 'devicePairings');
      const constraints = [where('token', '==', token), where('status', '==', 'confirmed')];
      if (parentId) {
        constraints.push(where('parentId', '==', parentId));
      }

      const q = query(pairingsRef, ...constraints);
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      return {
        id: snapshot.docs[0].id,
        ...(snapshot.docs[0].data() as Omit<DevicePairing, 'id'>),
      };
    } catch (error) {
      console.error('Failed to get confirmed pairing by token:', error);
      return null;
    }
  }

  /**
   * Check if a child device is already paired
   */
  static async getChildConfirmedPairing(childId: string): Promise<DevicePairing | null> {
    try {
      const pairingsRef = collection(this.FIRESTORE, 'devicePairings');
      const q = query(
        pairingsRef,
        where('childId', '==', childId),
        where('status', '==', 'confirmed')
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return null;
      }

      return {
        id: snapshot.docs[0].id,
        ...(snapshot.docs[0].data() as Omit<DevicePairing, 'id'>),
      };
    } catch (error) {
      console.error('Failed to get child confirmed pairing:', error);
      return null;
    }
  }

  /**
   * Unpair a device
   */
  static async unpairDevice(pairingId: string): Promise<void> {
    try {
      const pairingRef = doc(this.FIRESTORE, 'devicePairings', pairingId);
      await deleteDoc(pairingRef);
    } catch (error) {
      console.error('Failed to unpair device:', error);
      throw new Error('Failed to unpair device');
    }
  }

  /**
   * Reject a pairing request
   */
  static async rejectPairing(pairingId: string): Promise<void> {
    try {
      const pairingRef = doc(this.FIRESTORE, 'devicePairings', pairingId);
      await updateDoc(pairingRef, {
        status: 'rejected',
        rejectedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Failed to reject pairing:', error);
      throw new Error('Failed to reject pairing');
    }
  }

  /**
   * Get pending pairings for a parent (requires approval)
   */
  static async getPendingPairings(parentId: string): Promise<DevicePairing[]> {
    try {
      const pairingsRef = collection(this.FIRESTORE, 'devicePairings');
      const q = query(
        pairingsRef,
        where('parentId', '==', parentId),
        where('status', '==', 'pending')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as DevicePairing
      );
    } catch (error) {
      console.error('Failed to get pending pairings:', error);
      return [];
    }
  }

  /**
   * Approve a pending pairing (parent action)
   */
  static async approvePairing(pairingId: string): Promise<void> {
    try {
      const pairingRef = doc(this.FIRESTORE, 'devicePairings', pairingId);
      await updateDoc(pairingRef, {
        status: 'confirmed',
        confirmedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Failed to approve pairing:', error);
      throw new Error('Failed to approve pairing');
    }
  }
}

export default PairingService;
