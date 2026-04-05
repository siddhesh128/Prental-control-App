import {
  ref as dbRef,
  push,
  query as dbQuery,
  orderByChild,
  startAt,
  endAt,
  get,
  onValue,
  off,
  remove,
  set,
} from 'firebase/database';
import { db } from '../config/firebase';

export interface CallRecord {
  id?: string;
  phoneNumber: string;
  callType: 'incoming' | 'outgoing' | 'missed';
  duration: number;
  timestamp: number;
  contactName?: string;
}

export interface MessageRecord {
  id?: string;
  phoneNumber: string;
  messageType: 'sent' | 'received';
  timestamp: number;
  contactName?: string;
  messagePreview?: string;
}

export class CommunicationService {
  static async logCallRecord(userId: string, record: CallRecord): Promise<void> {
    try {
      const callRecord = {
        ...record,
        timestamp: record.timestamp || Date.now(),
      };

      if (record.id) {
        await set(dbRef(db, `callHistory/${userId}/${record.id}`), callRecord);
        return;
      }

      await push(dbRef(db, `callHistory/${userId}`), callRecord);
    } catch (error) {
      console.error('Error logging call record:', error);
      throw error;
    }
  }

  static async logMessageRecord(userId: string, record: MessageRecord): Promise<void> {
    try {
      const messageRecord = {
        ...record,
        timestamp: record.timestamp || Date.now(),
      };

      if (record.id) {
        await set(dbRef(db, `messageHistory/${userId}/${record.id}`), messageRecord);
        return;
      }

      await push(dbRef(db, `messageHistory/${userId}`), messageRecord);
    } catch (error) {
      console.error('Error logging message record:', error);
      throw error;
    }
  }

  static async getCallHistory(
    userId: string,
    startTime?: number,
    endTime?: number
  ): Promise<CallRecord[]> {
    try {
      const queryConstraints: any[] = [orderByChild('timestamp')];
      if (startTime) {
        queryConstraints.push(startAt(startTime));
      }
      if (endTime) {
        queryConstraints.push(endAt(endTime));
      }

      const snapshot = await get(dbQuery(dbRef(db, `callHistory/${userId}`), ...queryConstraints));

      const calls: CallRecord[] = [];
      snapshot.forEach((child) => {
        calls.push({ id: child.key ?? undefined, ...(child.val() as CallRecord) });
      });

      return calls.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error fetching call history:', error);
      throw error;
    }
  }

  static async getMessageHistory(
    userId: string,
    startTime?: number,
    endTime?: number
  ): Promise<MessageRecord[]> {
    try {
      const queryConstraints: any[] = [orderByChild('timestamp')];
      if (startTime) {
        queryConstraints.push(startAt(startTime));
      }
      if (endTime) {
        queryConstraints.push(endAt(endTime));
      }

      const snapshot = await get(
        dbQuery(dbRef(db, `messageHistory/${userId}`), ...queryConstraints)
      );

      const messages: MessageRecord[] = [];
      snapshot.forEach((child) => {
        messages.push({ id: child.key ?? undefined, ...(child.val() as MessageRecord) });
      });

      return messages.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error fetching message history:', error);
      throw error;
    }
  }

  static subscribeToCallHistory(
    userId: string,
    callback: (records: CallRecord[]) => void
  ): () => void {
    const callRef = dbRef(db, `callHistory/${userId}`);

    onValue(callRef, (snapshot) => {
      const records: CallRecord[] = [];
      snapshot.forEach((child) => {
        records.push({ id: child.key ?? undefined, ...(child.val() as CallRecord) });
      });
      callback(records.sort((a, b) => b.timestamp - a.timestamp));
    });

    return () => off(callRef);
  }

  static subscribeToMessageHistory(
    userId: string,
    callback: (records: MessageRecord[]) => void
  ): () => void {
    const messageRef = dbRef(db, `messageHistory/${userId}`);

    onValue(messageRef, (snapshot) => {
      const records: MessageRecord[] = [];
      snapshot.forEach((child) => {
        records.push({ id: child.key ?? undefined, ...(child.val() as MessageRecord) });
      });
      callback(records.sort((a, b) => b.timestamp - a.timestamp));
    });

    return () => off(messageRef);
  }

  static async deleteCallRecord(userId: string, recordId: string): Promise<void> {
    try {
      await remove(dbRef(db, `callHistory/${userId}/${recordId}`));
    } catch (error) {
      console.error('Error deleting call record:', error);
      throw error;
    }
  }

  static async deleteMessageRecord(userId: string, recordId: string): Promise<void> {
    try {
      await remove(dbRef(db, `messageHistory/${userId}/${recordId}`));
    } catch (error) {
      console.error('Error deleting message record:', error);
      throw error;
    }
  }
}

export default CommunicationService;
