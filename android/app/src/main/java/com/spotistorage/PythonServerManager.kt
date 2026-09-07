package com.spotistorage

import android.content.Context
import android.util.Log
import com.chaquo.python.PyException
import com.chaquo.python.Python
import com.chaquo.python.android.AndroidPlatform
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

object PythonServerManager {
    private const val TAG = "SpotiStoragePython"
    @Volatile private var started = false

    val apiToken: String by lazy { java.util.UUID.randomUUID().toString() }

    @Synchronized
    fun start(context: Context) {
        if (started) return
        started = true

        if (!Python.isStarted()) {
            Python.start(AndroidPlatform(context))
        }
        val py = Python.getInstance()
        val nativeLibDir = context.applicationInfo.nativeLibraryDir

        val environ = py.getModule("os")["environ"]
        environ?.callAttr("__setitem__", "SPOTISTORAGE_CONFIG_DIR", context.filesDir.absolutePath)
        environ?.callAttr("__setitem__", "SPOTISTORAGE_PLATFORM", "android")
        environ?.callAttr("__setitem__", "SPOTISTORAGE_PORT", AppConfig.PORT.toString())
        environ?.callAttr("__setitem__", "SPOTISTORAGE_API_TOKEN", apiToken)
        environ?.callAttr("__setitem__", "SPOTISTORAGE_FFMPEG_DIR", "$nativeLibDir/libffmpeg.so")
        environ?.callAttr("__setitem__", "SPOTISTORAGE_QUICKJS_PATH", "$nativeLibDir/libquickjs.so")

        Thread({
            try {
                py.getModule("app.server").callAttr("run")
            } catch (e: PyException) {
                Log.e(TAG, "backend crashed", e)
            } catch (e: Throwable) {
                Log.e(TAG, "unexpected error starting backend", e)
            }
        }, "spotistorage-python").apply { isDaemon = true }.start()
    }

    fun waitUntilReady(timeoutMs: Long = 20_000, pollMs: Long = 250): Boolean {
        val deadline = System.currentTimeMillis() + timeoutMs
        while (System.currentTimeMillis() < deadline) {
            if (isHealthy()) return true
            Thread.sleep(pollMs)
        }
        return false
    }

    private fun isHealthy(): Boolean = try {
        (URL("${AppConfig.BASE_URL}/api/health").openConnection() as HttpURLConnection).run {
            connectTimeout = 500
            readTimeout = 500
            val ok = responseCode == 200
            disconnect()
            ok
        }
    } catch (e: IOException) {
        false
    }
}
