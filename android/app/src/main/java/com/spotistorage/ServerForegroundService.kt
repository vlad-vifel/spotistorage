package com.spotistorage

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import kotlin.math.roundToInt
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class ServerForegroundService : Service() {
    companion object {
        private const val CHANNEL_ID = "spotistorage_downloads_v2"
        private const val NOTIFICATION_ID = 1
        private const val LEGACY_SUMMARY_NOTIFICATION_ID = 2
        const val EXTRA_NAVIGATE_TO = "navigate_to"

        fun start(context: Context) {
            val intent = Intent(context, ServerForegroundService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun clearLegacySummary(context: Context) {
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.cancel(LEGACY_SUMMARY_NOTIFICATION_ID)
        }
    }

    private var wakeLock: PowerManager.WakeLock? = null
    @Volatile private var pollLoopRunning = false

    override fun onCreate() {
        super.onCreate()
        createChannel()
        PythonServerManager.start(applicationContext)
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "SpotiStorage::download").apply {
            setReferenceCounted(false)
        }
        startAsForeground(buildPreparingNotification())
        startProgressPolling()
    }

    private fun startProgressPolling() {
        if (pollLoopRunning) return
        pollLoopRunning = true
        Thread({
            var sawActiveDownload = false
            var unavailablePolls = 0
            while (pollLoopRunning) {
                val progress = fetchProgress()
                if (!progress.available) {
                    unavailablePolls++
                    if (unavailablePolls >= 10) {
                        stopWithoutBatch()
                        return@Thread
                    }
                    Thread.sleep(1_000L)
                    continue
                }
                unavailablePolls = 0
                if (!progress.active) {
                    if (sawActiveDownload || progress.done + progress.failed + progress.cancelled > 0) {
                        finishBatch(progress)
                    } else {
                        stopWithoutBatch()
                    }
                    return@Thread
                }

                sawActiveDownload = true
                if (wakeLock?.isHeld == false) wakeLock?.acquire()
                updateProgressNotification(progress)
                Thread.sleep(1_000L)
            }
        }, "spotistorage-notif-poll").apply { isDaemon = true }.start()
    }

    private data class Progress(
        val available: Boolean,
        val active: Boolean,
        val done: Int,
        val failed: Int,
        val cancelled: Int,
        val total: Int,
        val percent: Int,
        val currentTrack: String?,
    )

    private fun fetchProgress(): Progress = try {
        val conn = URL("${AppConfig.BASE_URL}/api/downloads/summary").openConnection() as HttpURLConnection
        conn.connectTimeout = 1_500
        conn.readTimeout = 1_500
        conn.setRequestProperty("X-SpotiStorage-Token", PythonServerManager.apiToken)
        val body = conn.inputStream.bufferedReader().use { it.readText() }
        conn.disconnect()

        val summary = JSONObject(body)
        Progress(
            available = true,
            active = summary.optBoolean("active"),
            done = summary.optInt("done"),
            failed = summary.optInt("failed"),
            cancelled = summary.optInt("cancelled"),
            total = summary.optInt("total"),
            percent = (summary.optDouble("percent", 0.0).coerceIn(0.0, 1.0) * 100).roundToInt(),
            currentTrack = summary.optString("current_track").takeIf { it.isNotBlank() },
        )
    } catch (e: Exception) {
        Progress(false, false, 0, 0, 0, 0, 0, null)
    }

    private fun updateProgressNotification(progress: Progress) {
        val text = getString(R.string.notification_downloading, progress.done, progress.total)
        val detail = progress.currentTrack?.let { getString(R.string.notification_current_track, it) }
            ?: getString(R.string.notification_preparing)
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(text)
            .setContentText(detail)
            .setSmallIcon(android.R.drawable.stat_sys_download)
            .setContentIntent(contentIntent("/library", NOTIFICATION_ID))
            .setCategory(NotificationCompat.CATEGORY_PROGRESS)
            .setProgress(100, progress.percent, false)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build()
        (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).notify(NOTIFICATION_ID, notification)
    }

    private fun buildPreparingNotification(): Notification = NotificationCompat.Builder(this, CHANNEL_ID)
        .setContentTitle(getString(R.string.app_name))
        .setContentText(getString(R.string.notification_preparing))
        .setSmallIcon(android.R.drawable.stat_sys_download)
        .setContentIntent(contentIntent("/library", NOTIFICATION_ID))
        .setCategory(NotificationCompat.CATEGORY_PROGRESS)
        .setProgress(0, 0, true)
        .setOngoing(true)
        .setOnlyAlertOnce(true)
        .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
        .build()

    private fun finishBatch(progress: Progress) {
        releaseWakeLock()
        val text = when {
            progress.failed > 0 && progress.cancelled > 0 -> getString(
                R.string.notification_done_with_issues, progress.done, progress.failed, progress.cancelled
            )
            progress.failed > 0 -> getString(R.string.notification_done_with_errors, progress.done, progress.failed)
            progress.cancelled > 0 -> getString(R.string.notification_done_with_cancelled, progress.done, progress.cancelled)
            else -> getString(R.string.notification_done, progress.done)
        }
        val navigateTo = if (progress.failed > 0) "/errors" else "/library"
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.app_name))
            .setContentText(text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text))
            .setSmallIcon(android.R.drawable.stat_sys_download_done)
            .setContentIntent(contentIntent(navigateTo, NOTIFICATION_ID))
            .setAutoCancel(true)
            .setOnlyAlertOnce(false)
            .build()
        (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).notify(NOTIFICATION_ID, notification)
        stopForeground(STOP_FOREGROUND_DETACH)
        pollLoopRunning = false
        stopSelf()
    }

    private fun stopWithoutBatch() {
        releaseWakeLock()
        (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).cancel(NOTIFICATION_ID)
        stopForeground(STOP_FOREGROUND_REMOVE)
        pollLoopRunning = false
        stopSelf()
    }

    private fun contentIntent(navigateTo: String, requestCode: Int): PendingIntent {
        val intent = Intent(this, MainActivity::class.java).apply {
            putExtra(EXTRA_NAVIGATE_TO, navigateTo)
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        return PendingIntent.getActivity(this, requestCode, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }

    private fun startAsForeground(notification: Notification) {
        startForeground(
            NOTIFICATION_ID,
            notification,
            ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC,
        )
    }

    private fun releaseWakeLock() {
        wakeLock?.let { if (it.isHeld) it.release() }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_NOT_STICKY

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        pollLoopRunning = false
        releaseWakeLock()
        super.onDestroy()
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                getString(R.string.notification_channel_name),
                NotificationManager.IMPORTANCE_LOW,
            )
            (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(channel)
        }
    }
}
