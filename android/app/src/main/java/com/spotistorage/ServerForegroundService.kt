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
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

class ServerForegroundService : Service() {
    companion object {
        private const val CHANNEL_ID = "spotistorage_downloads_v2"
        private const val NOTIFICATION_ID = 1

        fun start(context: Context) {
            val intent = Intent(context, ServerForegroundService::class.java)
            context.startService(intent)
        }
    }

    private var wakeLock: PowerManager.WakeLock? = null
    @Volatile private var pollLoopRunning = false
    @Volatile private var isForeground = false

    override fun onCreate() {
        super.onCreate()
        createChannel()
        PythonServerManager.start(applicationContext)

        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "SpotiStorage::download").apply {
            setReferenceCounted(false)
        }
        startProgressPolling()
    }

    private fun startProgressPolling() {
        if (pollLoopRunning) return
        pollLoopRunning = true
        Thread({
            var lastText = ""
            while (pollLoopRunning) {
                val (active, done, total) = fetchProgress()

                if (active && !isForeground) {
                    wakeLock?.acquire(30 * 60 * 1000L)
                    try {
                        startForeground(NOTIFICATION_ID, buildNotification(getString(R.string.notification_idle)))
                        isForeground = true
                    } catch (e: Exception) {
                        wakeLock?.let { if (it.isHeld) it.release() }
                    }
                } else if (!active && isForeground) {
                    isForeground = false
                    stopForeground(STOP_FOREGROUND_REMOVE)
                    wakeLock?.let { if (it.isHeld) it.release() }
                }

                if (isForeground) {
                    val text = if (total > 0) "Downloading $done/$total" else getString(R.string.notification_idle)
                    if (text != lastText) {
                        updateNotification(text)
                        lastText = text
                    }
                }
                Thread.sleep(if (active) 2000L else 8000L)
            }
        }, "spotistorage-notif-poll").apply { isDaemon = true }.start()
    }

    private fun fetchProgress(): Triple<Boolean, Int, Int> = try {
        val conn = URL("${AppConfig.BASE_URL}/api/downloads").openConnection() as HttpURLConnection
        conn.connectTimeout = 1000
        conn.readTimeout = 1000
        conn.setRequestProperty("X-SpotiStorage-Token", PythonServerManager.apiToken)
        val body = conn.inputStream.bufferedReader().use { it.readText() }
        conn.disconnect()
        val jobs = JSONArray(body)
        var active = 0
        var done = 0
        for (i in 0 until jobs.length()) {
            when (jobs.getJSONObject(i).optString("status")) {
                "queued", "downloading" -> active++
                "completed" -> done++
            }
        }
        Triple(active > 0, done, jobs.length())
    } catch (e: IOException) {
        Triple(false, 0, 0)
    } catch (e: org.json.JSONException) {
        Triple(false, 0, 0)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

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
                NotificationManager.IMPORTANCE_DEFAULT,
            )
            (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                .createNotificationChannel(channel)
        }
    }

    private fun buildNotification(text: String): Notification {
        val openApp = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.app_name))
            .setContentText(text)
            .setSmallIcon(android.R.drawable.stat_sys_download)
            .setContentIntent(openApp)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .build()
    }

    private fun updateNotification(text: String) {
        (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
            .notify(NOTIFICATION_ID, buildNotification(text))
    }
}
