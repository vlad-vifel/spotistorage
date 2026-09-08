package com.spotistorage

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import org.json.JSONArray
import java.net.HttpURLConnection
import java.net.URL

class ServerForegroundService : Service() {
    companion object {
        private const val CHANNEL_ID = "spotistorage_downloads_v2"
        private const val NOTIFICATION_ID = 1
        private const val SUMMARY_NOTIFICATION_ID = 2
        const val EXTRA_NAVIGATE_TO = "navigate_to"

        fun start(context: Context) {
            val intent = Intent(context, ServerForegroundService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
    }

    private var wakeLock: PowerManager.WakeLock? = null
    @Volatile private var pollLoopRunning = false
    @Volatile private var wasDownloading = false

    override fun onCreate() {
        super.onCreate()
        createChannel()
        PythonServerManager.start(applicationContext)
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "SpotiStorage::download").apply {
            setReferenceCounted(false)
        }
        startForeground(NOTIFICATION_ID, buildProgressNotification(getString(R.string.notification_idle)))
        startProgressPolling()
    }

    private fun startProgressPolling() {
        if (pollLoopRunning) return
        pollLoopRunning = true
        Thread({
            var lastText = ""
            while (pollLoopRunning) {
                val (active, done, failed, total) = fetchProgress()

                if (active && !wasDownloading) {
                    wasDownloading = true
                    if (wakeLock?.isHeld == false) wakeLock?.acquire()
                } else if (!active && wasDownloading) {
                    wasDownloading = false
                    wakeLock?.let { if (it.isHeld) it.release() }
                    if (done > 0 || failed > 0) postSummaryNotification(done, failed)
                }

                val text = if (active && total > 0) {
                    getString(R.string.notification_downloading, done, total)
                } else {
                    getString(R.string.notification_idle)
                }
                if (text != lastText) {
                    (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                        .notify(NOTIFICATION_ID, buildProgressNotification(text))
                    lastText = text
                }
                Thread.sleep(if (active) 2000L else 8000L)
            }
        }, "spotistorage-notif-poll").apply { isDaemon = true }.start()
    }

    private data class Progress(val active: Boolean, val done: Int, val failed: Int, val total: Int)

    private fun fetchProgress(): Progress = try {
        val conn = URL("${AppConfig.BASE_URL}/api/downloads").openConnection() as HttpURLConnection
        conn.connectTimeout = 1500
        conn.readTimeout = 1500
        conn.setRequestProperty("X-SpotiStorage-Token", PythonServerManager.apiToken)
        val body = conn.inputStream.bufferedReader().use { it.readText() }
        conn.disconnect()
        val jobs = JSONArray(body)
        var active = 0; var done = 0; var failed = 0
        for (i in 0 until jobs.length()) {
            when (jobs.getJSONObject(i).optString("status")) {
                "queued", "downloading" -> active++
                "completed" -> done++
                "failed" -> failed++
            }
        }
        Progress(active > 0, done, failed, jobs.length())
    } catch (e: Exception) {
        Progress(false, 0, 0, 0)
    }

    private fun buildProgressNotification(text: String): Notification {
        val intent = Intent(this, MainActivity::class.java).apply {
            putExtra(EXTRA_NAVIGATE_TO, "/library")
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pi = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.app_name))
            .setContentText(text)
            .setSmallIcon(android.R.drawable.stat_sys_download)
            .setContentIntent(pi)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .build()
    }

    private fun postSummaryNotification(done: Int, failed: Int) {
        val navigateTo = if (failed > 0) "/errors" else "/library"
        val intent = Intent(this, MainActivity::class.java).apply {
            putExtra(EXTRA_NAVIGATE_TO, navigateTo)
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pi = PendingIntent.getActivity(this, SUMMARY_NOTIFICATION_ID, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val text = when {
            failed > 0 -> getString(R.string.notification_done_with_errors, done, failed)
            else -> getString(R.string.notification_done, done)
        }
        val n = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.app_name))
            .setContentText(text)
            .setSmallIcon(android.R.drawable.stat_sys_download_done)
            .setContentIntent(pi)
            .setAutoCancel(true)
            .build()
        (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).notify(SUMMARY_NOTIFICATION_ID, n)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        pollLoopRunning = false
        wakeLock?.let { if (it.isHeld) it.release() }
        super.onDestroy()
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                getString(R.string.notification_channel_name),
                NotificationManager.IMPORTANCE_LOW,
            )
            (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                .createNotificationChannel(channel)
        }
    }
}
