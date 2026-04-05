import { AppState, AppStateStatus, NativeModules, Platform } from 'react-native';
import BackgroundTimer from 'react-native-background-timer';
import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import { push, ref, runTransaction, update, set } from 'firebase/database';
import { db } from '../config/firebase';

const ACTIVE_SYNC_INTERVAL_MS = 15_000;
const BACKGROUND_SYNC_INTERVAL_MS = 60_000;

const sanitizeRealtimeDbKey = (key: string): string => key.replace(/[.#$/\[\]]/g, '_');

const sanitizeUsageStatsForRealtimeDb = (usageStats: Record<string, any>): Record<string, any> => {
  const sanitized: Record<string, any> = {};

  Object.entries(usageStats).forEach(([packageName, data]) => {
    const safeKey = sanitizeRealtimeDbKey(packageName);
    sanitized[safeKey] = {
      ...(data || {}),
      packageName,
    };
  });

  return sanitized;
};

class ChildBackgroundMonitorService {
  private intervalId: number | null = null;
  private currentUid: string | null = null;
  private appState: AppStateStatus = AppState.currentState;
  private appStateSubscription: { remove: () => void } | null = null;
  private lastScreenTimeSyncAt: number | null = null;
  private isSyncRunning = false;

  start(uid: string) {
    if (!uid) {
      return;
    }

    if (this.currentUid === uid && this.intervalId !== null) {
      return;
    }

    this.stop();
    this.currentUid = uid;
    this.lastScreenTimeSyncAt = null;

    this.requestPermissions().catch((error) => {
      console.warn('Background monitor permission request failed:', error);
    });

    this.appStateSubscription = AppState.addEventListener('change', this.onAppStateChange);
    this.startTicker();
    this.syncNow().catch((error) => {
      console.error('Initial background monitor sync failed:', error);
    });
  }

  stop() {
    if (this.intervalId !== null) {
      BackgroundTimer.clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    const uid = this.currentUid;
    this.currentUid = null;
    this.lastScreenTimeSyncAt = null;

    if (uid) {
      update(ref(db, `devices/${uid}`), {
        isOnline: false,
        lastUpdated: Date.now(),
      }).catch((error) => {
        console.warn('Failed to set offline state while stopping monitor:', error);
      });
    }
  }

  private onAppStateChange = (nextState: AppStateStatus) => {
    this.appState = nextState;

    const uid = this.currentUid;
    if (!uid) {
      return;
    }

    update(ref(db, `devices/${uid}`), {
      isOnline: true,
      appState: nextState,
      lastUpdated: Date.now(),
    }).catch((error) => {
      console.warn('Failed to update app state heartbeat:', error);
    });

    this.startTicker();
    this.syncNow().catch((error) => {
      console.warn('App state triggered sync failed:', error);
    });
  };

  private startTicker() {
    if (this.intervalId !== null) {
      BackgroundTimer.clearInterval(this.intervalId);
      this.intervalId = null;
    }

    const intervalMs =
      this.appState === 'active' ? ACTIVE_SYNC_INTERVAL_MS : BACKGROUND_SYNC_INTERVAL_MS;

    this.intervalId = BackgroundTimer.setInterval(() => {
      this.syncNow().catch((error) => {
        console.warn('Background monitor periodic sync failed:', error);
      });
    }, intervalMs) as unknown as number;
  }

  private async requestPermissions() {
    const foreground = await Location.getForegroundPermissionsAsync();
    if (foreground.status !== 'granted') {
      await Location.requestForegroundPermissionsAsync();
    }

    // Background location is Android-only in this app's current flow.
    if (Platform.OS === 'android') {
      const background = await Location.getBackgroundPermissionsAsync();
      if (background.status !== 'granted') {
        await Location.requestBackgroundPermissionsAsync();
      }
    }
  }

  private async syncNow() {
    const uid = this.currentUid;
    if (!uid || this.isSyncRunning) {
      return;
    }

    this.isSyncRunning = true;

    try {
      const batteryLevel = await Battery.getBatteryLevelAsync();
      const storageUsed = await this.getStorageUsed();
      const now = Date.now();
      const elapsedMs = this.lastScreenTimeSyncAt
        ? Math.max(0, now - this.lastScreenTimeSyncAt)
        : 0;
      this.lastScreenTimeSyncAt = now;

      await update(ref(db, `devices/${uid}`), {
        batteryLevel,
        storageUsed,
        isOnline: true,
        appState: this.appState,
        lastUpdated: now,
      });

      await this.syncAndroidSystemUsage(uid);

      // Keep fallback screen-time writes for non-Android only.
      // On Android, fallback creates misleading "1 app" data when UsageStats is temporarily empty.
      if (Platform.OS !== 'android' && elapsedMs > 0) {
        await runTransaction(ref(db, `screenTime/${uid}/Parental Control App`), (current) => {
          const existingDuration = Number(current?.duration || 0);
          return {
            duration: existingDuration + elapsedMs,
            lastUsed: now,
          };
        });
      }

      const location = await this.getLocationForSync();
      if (location) {
        await push(ref(db, `locations/${uid}`), {
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp: now,
        });
      }
    } finally {
      this.isSyncRunning = false;
    }
  }

  private async getStorageUsed(): Promise<number> {
    try {
      const usageModule = (NativeModules as any).UsageStatsModule;
      if (Platform.OS === 'android' && usageModule?.getStorageStats) {
        const storageStats = await usageModule.getStorageStats();
        return Number(storageStats?.usedBytes || 0);
      }

      const dirInfo = await FileSystem.getInfoAsync(FileSystem.documentDirectory || '');
      return 'size' in dirInfo && typeof dirInfo.size === 'number' ? Number(dirInfo.size) : 0;
    } catch (error) {
      console.warn('Failed to read storage stats, using zero fallback:', error);
      return 0;
    }
  }

  private async syncAndroidSystemUsage(uid: string): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    const usageModule = (NativeModules as any).UsageStatsModule;
    if (!usageModule?.getDailyUsageStats) {
      return false;
    }

    let accessGranted = false;
    if (usageModule?.isUsageAccessGranted) {
      try {
        accessGranted = !!(await usageModule.isUsageAccessGranted());
      } catch {
        accessGranted = false;
      }
    }

    let usageStats: Record<string, any> = {};
    try {
      const rawUsage = await usageModule.getDailyUsageStats();
      if (rawUsage && typeof rawUsage === 'object') {
        usageStats = rawUsage as Record<string, any>;
      }
    } catch (usageError) {
      console.warn('Failed to fetch daily usage stats:', usageError);
    }

    const usageValues = Object.values(usageStats) as {
      duration?: number;
      lastUsed?: number;
    }[];
    const totalFromUsageMap = usageValues.reduce(
      (acc, item) => acc + Number(item?.duration || 0),
      0
    );
    const latestUsageTimestamp = usageValues.reduce(
      (latest, item) => Math.max(latest, Number(item?.lastUsed || 0)),
      0
    );

    let appsUsedToday = Object.keys(usageStats).length;
    let totalScreenTimeMs = totalFromUsageMap;

    if (usageModule?.getDailyUsageSummary) {
      try {
        const summary = await usageModule.getDailyUsageSummary();
        if (summary && typeof summary === 'object') {
          appsUsedToday = Number(summary.appsUsedToday || appsUsedToday);
          totalScreenTimeMs = Number(summary.totalScreenTimeMs || totalScreenTimeMs);
        }
      } catch (summaryError) {
        console.warn('Failed to fetch usage summary:', summaryError);
      }
    }

    // Keep app-level usage map available for parent details and debugging.
    const sanitizedUsageStats = sanitizeUsageStatsForRealtimeDb(usageStats);
    await set(ref(db, `screenTime/${uid}`), sanitizedUsageStats);

    await update(ref(db, `devices/${uid}`), {
      screenTimeToday: totalScreenTimeMs,
      appsUsedToday,
      usageLastUpdated: Date.now(),
      screenTimeMapLastUsed: latestUsageTimestamp,
    });

    return accessGranted || usageValues.length > 0;
  }

  private async getLocationForSync(): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const permission = await Location.getForegroundPermissionsAsync();
      const hasPermission =
        permission.status === 'granted' ||
        (await Location.requestForegroundPermissionsAsync()).status === 'granted';

      if (!hasPermission) {
        return null;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };
    } catch {
      try {
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (!lastKnown) {
          return null;
        }

        return {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        };
      } catch {
        return null;
      }
    }
  }
}

const childBackgroundMonitorService = new ChildBackgroundMonitorService();
export default childBackgroundMonitorService;
