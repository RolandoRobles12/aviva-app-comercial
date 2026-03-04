package com.promotoresavivatunegocio_1

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import java.util.Calendar

object AttendanceAlarmScheduler {

    private const val TAG = "AttendanceAlarmScheduler"

    private const val REQUEST_CODE_ENTRY = 1001
    private const val REQUEST_CODE_EXIT = 1002

    /** Programa las alarmas de entrada (9 AM) y salida (6 PM) */
    fun scheduleAll(context: Context) {
        scheduleAlarm(context, AttendanceReminderReceiver.TYPE_ENTRY, hour = 9, requestCode = REQUEST_CODE_ENTRY)
        scheduleAlarm(context, AttendanceReminderReceiver.TYPE_EXIT, hour = 18, requestCode = REQUEST_CODE_EXIT)
    }

    /** Cancela ambas alarmas (p.ej. al cerrar sesión) */
    fun cancelAll(context: Context) {
        cancelAlarm(context, AttendanceReminderReceiver.TYPE_ENTRY, REQUEST_CODE_ENTRY)
        cancelAlarm(context, AttendanceReminderReceiver.TYPE_EXIT, REQUEST_CODE_EXIT)
    }

    /**
     * Llamado desde [AttendanceReminderReceiver] para reprogramar al día siguiente
     * después de que la alarma dispara.
     */
    fun rescheduleAlarm(context: Context, type: String) {
        when (type) {
            AttendanceReminderReceiver.TYPE_ENTRY ->
                scheduleAlarm(context, type, hour = 9, requestCode = REQUEST_CODE_ENTRY)
            AttendanceReminderReceiver.TYPE_EXIT ->
                scheduleAlarm(context, type, hour = 18, requestCode = REQUEST_CODE_EXIT)
        }
    }

    // -------------------------------------------------------------------------

    private fun scheduleAlarm(context: Context, type: String, hour: Int, requestCode: Int) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

        val pendingIntent = buildPendingIntent(context, type, requestCode)

        val trigger = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
            // Si ya pasó la hora de hoy, programar para mañana
            if (timeInMillis <= System.currentTimeMillis()) add(Calendar.DAY_OF_YEAR, 1)
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP, trigger.timeInMillis, pendingIntent
                )
            } else {
                alarmManager.setExact(
                    AlarmManager.RTC_WAKEUP, trigger.timeInMillis, pendingIntent
                )
            }
            Log.d(TAG, "Alarma '$type' programada para ${trigger.time}")
        } catch (e: SecurityException) {
            // El usuario negó SCHEDULE_EXACT_ALARM; usar alarma inexacta como fallback
            Log.w(TAG, "Sin permiso de alarma exacta, usando inexacta: ${e.message}")
            alarmManager.set(AlarmManager.RTC_WAKEUP, trigger.timeInMillis, pendingIntent)
        }
    }

    private fun cancelAlarm(context: Context, type: String, requestCode: Int) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarmManager.cancel(buildPendingIntent(context, type, requestCode))
        Log.d(TAG, "Alarma '$type' cancelada")
    }

    private fun buildPendingIntent(context: Context, type: String, requestCode: Int): PendingIntent {
        val intent = Intent(context, AttendanceReminderReceiver::class.java).apply {
            putExtra(AttendanceReminderReceiver.EXTRA_REMINDER_TYPE, type)
        }
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
        return PendingIntent.getBroadcast(context, requestCode, intent, flags)
    }
}
