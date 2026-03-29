package com.parentalcontrol.app

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Process
import android.os.StatFs
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.Calendar

class UsageStatsModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "UsageStatsModule"

  @ReactMethod
  fun isUsageAccessGranted(promise: Promise) {
    try {
      val appOps = reactContext.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
      val mode = appOps.checkOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS,
        Process.myUid(),
        reactContext.packageName
      )
      promise.resolve(mode == AppOpsManager.MODE_ALLOWED)
    } catch (e: Exception) {
      promise.reject("USAGE_ACCESS_CHECK_FAILED", e)
    }
  }

  @ReactMethod
  fun openUsageAccessSettings() {
    val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    reactContext.startActivity(intent)
  }

  @ReactMethod
  fun getDailyUsageStats(promise: Promise) {
    try {
      val usageStatsManager =
        reactContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager

      val now = System.currentTimeMillis()
      val calendar = Calendar.getInstance().apply {
        set(Calendar.HOUR_OF_DAY, 0)
        set(Calendar.MINUTE, 0)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
      }
      val startOfDay = calendar.timeInMillis

      // Use aggregated usage for the current day. This is more reliable than INTERVAL_BEST.
      val aggregated = usageStatsManager.queryAndAggregateUsageStats(startOfDay, now)
      val usageByPackage = HashMap<String, Pair<Long, Long>>()

      aggregated.forEach { (packageName, usage) ->
        val duration = usage.totalTimeInForeground
        if (duration <= 0L) return@forEach
        if (packageName == reactContext.packageName) return@forEach

        val current = usageByPackage[packageName]
        val totalDuration = (current?.first ?: 0L) + duration
        val lastUsed = maxOf(current?.second ?: 0L, usage.lastTimeUsed)
        usageByPackage[packageName] = Pair(totalDuration, lastUsed)
      }

      // Fallback for devices that return empty aggregation despite granted permission.
      if (usageByPackage.isEmpty()) {
        val stats = usageStatsManager.queryUsageStats(
          UsageStatsManager.INTERVAL_DAILY,
          startOfDay,
          now
        )

        stats.forEach { usage ->
          val duration = usage.totalTimeInForeground
          val packageName = usage.packageName
          if (duration <= 0L) return@forEach
          if (packageName == reactContext.packageName) return@forEach

          val current = usageByPackage[packageName]
          val totalDuration = (current?.first ?: 0L) + duration
          val lastUsed = maxOf(current?.second ?: 0L, usage.lastTimeUsed)
          usageByPackage[packageName] = Pair(totalDuration, lastUsed)
        }
      }

      val result = Arguments.createMap()
      usageByPackage.forEach { (packageName, usage) ->
        val entry = Arguments.createMap()
        entry.putDouble("duration", usage.first.toDouble())
        entry.putDouble("lastUsed", usage.second.toDouble())
        result.putMap(packageName, entry)
      }

      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("USAGE_STATS_FETCH_FAILED", e)
    }
  }

  @ReactMethod
  fun getStorageStats(promise: Promise) {
    try {
      val path = android.os.Environment.getDataDirectory().path
      val stat = StatFs(path)
      val totalBytes = stat.totalBytes
      val freeBytes = stat.availableBytes
      val usedBytes = (totalBytes - freeBytes).coerceAtLeast(0L)

      val result = Arguments.createMap()
      result.putDouble("totalBytes", totalBytes.toDouble())
      result.putDouble("freeBytes", freeBytes.toDouble())
      result.putDouble("usedBytes", usedBytes.toDouble())
      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("STORAGE_STATS_FETCH_FAILED", e)
    }
  }
}
