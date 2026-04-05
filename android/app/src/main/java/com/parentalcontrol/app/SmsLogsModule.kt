package com.parentalcontrol.app

import android.provider.Telephony
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.Calendar

class SmsLogsModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "SmsLogsModule"

  @ReactMethod
  fun getSmsLogs(promise: Promise) {
    try {
      val resolver = reactContext.contentResolver
      val projection = arrayOf(
        Telephony.Sms._ID,
        Telephony.Sms.ADDRESS,
        Telephony.Sms.BODY,
        Telephony.Sms.DATE,
        Telephony.Sms.TYPE,
      )
      val selection = "${Telephony.Sms.DATE} >= ?"
      val selectionArgs = arrayOf(getStartOfDay().toString())
      val sortOrder = "${Telephony.Sms.DATE} DESC"
      val cursor = resolver.query(
        Telephony.Sms.CONTENT_URI,
        projection,
        selection,
        selectionArgs,
        sortOrder
      )

      val result = Arguments.createArray()
      cursor?.use { rows ->
        val idIndex = rows.getColumnIndexOrThrow(Telephony.Sms._ID)
        val addressIndex = rows.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
        val bodyIndex = rows.getColumnIndexOrThrow(Telephony.Sms.BODY)
        val dateIndex = rows.getColumnIndexOrThrow(Telephony.Sms.DATE)
        val typeIndex = rows.getColumnIndexOrThrow(Telephony.Sms.TYPE)

        while (rows.moveToNext()) {
          val message = Arguments.createMap()
          message.putString("id", rows.getLong(idIndex).toString())
          message.putString("phoneNumber", rows.getString(addressIndex) ?: "")
          message.putString("messagePreview", rows.getString(bodyIndex) ?: "")
          message.putDouble("timestamp", rows.getLong(dateIndex).toDouble())
          message.putString("messageType", mapMessageType(rows.getInt(typeIndex)))
          result.pushMap(message)
        }
      }

      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("SMS_LOGS_FETCH_FAILED", error)
    }
  }

  private fun mapMessageType(type: Int): String {
    return when (type) {
      Telephony.Sms.MESSAGE_TYPE_SENT -> "sent"
      Telephony.Sms.MESSAGE_TYPE_OUTBOX -> "sent"
      else -> "received"
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
