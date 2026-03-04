package com.promotoresavivatunegocio_1

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat

class AttendanceReminderReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "AttendanceReminderReceiver"
        const val EXTRA_REMINDER_TYPE = "reminder_type"
        const val TYPE_ENTRY = "entry"
        const val TYPE_EXIT = "exit"
        private const val NOTIF_ID_ENTRY = 9001
        private const val NOTIF_ID_EXIT = 9002
        private const val CHANNEL_ID = "reminder_notifications"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val type = intent.getStringExtra(EXTRA_REMINDER_TYPE) ?: return
        Log.d(TAG, "Alarma recibida: $type")

        // Crear el canal si no existe (Android 8.0+ lo requiere)
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            && nm.getNotificationChannel(CHANNEL_ID) == null
        ) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Recordatorios de asistencia",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Recordatorios de entrada y salida"
                enableVibration(true)
            }
            nm.createNotificationChannel(channel)
            Log.d(TAG, "Canal $CHANNEL_ID creado")
        }

        val (title, message, notifId) = when (type) {
            TYPE_ENTRY -> Triple(
                "Registro de entrada",
                "No olvides registrar tu entrada del día",
                NOTIF_ID_ENTRY
            )
            TYPE_EXIT -> Triple(
                "Registro de salida",
                "No olvides registrar tu salida del día",
                NOTIF_ID_EXIT
            )
            else -> return
        }

        val tapIntent = PendingIntent.getActivity(
            context, notifId,
            Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            },
            PendingIntent.FLAG_UPDATE_CURRENT or
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notifications_24)
            .setContentTitle(title)
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(tapIntent)
            .build()

        nm.notify(notifId, notification)

        // Reprogramar la alarma para el día siguiente
        AttendanceAlarmScheduler.rescheduleAlarm(context, type)
    }
}
