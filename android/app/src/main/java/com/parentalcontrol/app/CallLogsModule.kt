package com.parentalcontrol.app

import android.provider.CallLog
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.Calendar

class CallLogsModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "CallLogsModule"

  @ReactMethod
  fun getCallLogs(promise: Promise) {
    try {
      val resolver = reactContext.contentResolver
      val projection = arrayOf(
        CallLog.Calls._ID,
        CallLog.Calls.NUMBER,
        CallLog.Calls.CACHED_NAME,
        CallLog.Calls.TYPE,
        CallLog.Calls.DURATION,
        CallLog.Calls.DATE,
      )
      val selection = "${CallLog.Calls.DATE} >= ?"
      val selectionArgs = arrayOf(getStartOfDay().toString())
      val sortOrder = "${CallLog.Calls.DATE} DESC"
      val cursor = resolver.query(CallLog.Calls.CONTENT_URI, projection, selection, selectionArgs, sortOrder)

      val result = Arguments.createArray()
      cursor?.use { rows ->
        val idIndex = rows.getColumnIndexOrThrow(CallLog.Calls._ID)
        val numberIndex = rows.getColumnIndexOrThrow(CallLog.Calls.NUMBER)
        val nameIndex = rows.getColumnIndexOrThrow(CallLog.Calls.CACHED_NAME)
        val typeIndex = rows.getColumnIndexOrThrow(CallLog.Calls.TYPE)
        val durationIndex = rows.getColumnIndexOrThrow(CallLog.Calls.DURATION)
        val dateIndex = rows.getColumnIndexOrThrow(CallLog.Calls.DATE)

        while (rows.moveToNext()) {
          val call = Arguments.createMap()
          call.putString("id", rows.getLong(idIndex).toString())
          call.putString("phoneNumber", rows.getString(numberIndex) ?: "")

          val contactName = rows.getString(nameIndex)
          if (!contactName.isNullOrBlank()) {
            call.putString("contactName", contactName)
          }

          call.putString("callType", mapCallType(rows.getInt(typeIndex)))
          call.putDouble("duration", rows.getLong(durationIndex).toDouble())
          call.putDouble("timestamp", rows.getLong(dateIndex).toDouble())
          result.pushMap(call)
        }
      }

      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("CALL_LOGS_FETCH_FAILED", error)
    }
  }

  private fun mapCallType(type: Int): String {
    return when (type) {
      CallLog.Calls.INCOMING_TYPE -> "incoming"
      CallLog.Calls.OUTGOING_TYPE -> "outgoing"
      CallLog.Calls.MISSED_TYPE,
      CallLog.Calls.REJECTED_TYPE,
      CallLog.Calls.BLOCKED_TYPE,
      CallLog.Calls.VOICEMAIL_TYPE -> "missed"
      else -> "missed"
    }
  }

  private fun getStartOfDay(): Long {
    return Calendar.getInstance().apply {
      set(Calendar.HOUR_OF_DAY, 0)
      set(Calendar.MINUTE, 0)
      set(Calendar.SECOND, 0)
      set(Calendar.MILLISECOND, 0)
    }.timeInMillis
  }
}