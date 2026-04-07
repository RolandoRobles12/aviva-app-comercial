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

    /**
     * Programa las alarmas de entrada y salida para el siguiente día laborable.
     * Horario: Lun–Vie entrada 9:00 / salida 18:00 · Sáb entrada 9:00 / salida 14:00
     * Domingo: sin alarma.
     */
    fun scheduleAll(context: Context) {
        scheduleNextOccurrence(context, AttendanceReminderReceiver.TYPE_ENTRY, REQUEST_CODE_ENTRY, advanceDay = false)
        scheduleNextOccurrence(context, AttendanceReminderReceiver.TYPE_EXIT,  REQUEST_CODE_EXIT,  advanceDay = false)
    }

    /** Cancela ambas alarmas (p.ej. al cerrar sesión) */
    fun cancelAll(context: Context) {
        cancelAlarm(context, AttendanceReminderReceiver.TYPE_ENTRY, REQUEST_CODE_ENTRY)
        cancelAlarm(context, AttendanceReminderReceiver.TYPE_EXIT, REQUEST_CODE_EXIT)
    }

    /**
     * Llamado desde [AttendanceReminderReceiver] tras disparar la alarma.
     * Siempre avanza al menos un día para no re-disparar el mismo día.
     */
    fun rescheduleAlarm(context: Context, type: String) {
        when (type) {
            AttendanceReminderReceiver.TYPE_ENTRY ->
                scheduleNextOccurrence(context, type, REQUEST_CODE_ENTRY, advanceDay = true)
            AttendanceReminderReceiver.TYPE_EXIT ->
                scheduleNextOccurrence(context, type, REQUEST_CODE_EXIT,  advanceDay = true)
        }
    }

    // -------------------------------------------------------------------------

    /**
     * Calcula el próximo disparo válido y programa la alarma.
     * @param advanceDay  si es true, empieza desde mañana (usado en reschedule).
     *                    si es false, puede disparar hoy si la hora aún no pasó.
     */
    private fun scheduleNextOccurrence(context: Context, type: String, requestCode: Int, advanceDay: Boolean) {
        val cal = Calendar.getInstance().apply {
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
            if (advanceDay) add(Calendar.DAY_OF_YEAR, 1)
        }

        // Buscar el siguiente día laborable (máx 7 intentos)
        repeat(7) {
            val dow = cal.get(Calendar.DAY_OF_WEEK)
            if (dow == Calendar.SUNDAY) {
                // Domingo → saltar al lunes
                cal.add(Calendar.DAY_OF_YEAR, 1)
                return@repeat
            }
            // Hora de la alarma según día y tipo
            val hour = if (type == AttendanceReminderReceiver.TYPE_EXIT && dow == Calendar.SATURDAY) 14 else
                       if (type == AttendanceReminderReceiver.TYPE_EXIT) 18 else 9
            cal.set(Calendar.HOUR_OF_DAY, hour)

            if (cal.timeInMillis > System.currentTimeMillis()) {
                // Hora futura válida → programar y salir
                fireAlarm(context, type, requestCode, cal)
                return
            }
            // La hora ya pasó hoy → probar el día siguiente
            cal.add(Calendar.DAY_OF_YEAR, 1)
        }
        Log.w(TAG, "No se encontró próximo día laborable en 7 días para '$type'")
    }

    private fun fireAlarm(context: Context, type: String, requestCode: Int, cal: Calendar) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val pendingIntent = buildPendingIntent(context, type, requestCode)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, cal.timeInMillis, pendingIntent)
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, cal.timeInMillis, pendingIntent)
            }
            Log.d(TAG, "Alarma '$type' programada para ${cal.time}")
        } catch (e: SecurityException) {
            Log.w(TAG, "Sin permiso de alarma exacta, usando inexacta: ${e.message}")
            alarmManager.set(AlarmManager.RTC_WAKEUP, cal.timeInMillis, pendingIntent)
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
