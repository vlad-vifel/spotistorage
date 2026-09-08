package com.spotistorage

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.Settings
import android.view.ViewGroup
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.ProgressBar
import androidx.activity.addCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updatePadding

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var loadingOverlay: ProgressBar
    private var pendingNavigation: String? = null

    private val folderPicker = registerForActivityResult(ActivityResultContracts.OpenDocumentTree()) { uri ->
        onFolderPicked(uri)
    }
    private val notificationPermission = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        runJs("window.__onPermissionResult && window.__onPermissionResult('notifications', $granted)")
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true)
        }

        WindowCompat.setDecorFitsSystemWindows(window, false)

        val root = FrameLayout(this)
        webView = buildWebView()
        loadingOverlay = ProgressBar(this).apply { isIndeterminate = true }
        root.addView(webView, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        root.addView(
            loadingOverlay,
            FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT)
                .apply { gravity = android.view.Gravity.CENTER },
        )
        androidx.core.view.ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            val ime = insets.getInsets(WindowInsetsCompat.Type.ime())
            view.updatePadding(top = bars.top, bottom = maxOf(bars.bottom, ime.bottom))
            insets
        }
        setContentView(root)

        onBackPressedDispatcher.addCallback(this) {
            if (webView.canGoBack()) webView.goBack() else {
                isEnabled = false
                onBackPressedDispatcher.onBackPressed()
            }
        }

        pendingNavigation = intent?.getStringExtra(ServerForegroundService.EXTRA_NAVIGATE_TO)
        ServerForegroundService.start(this)
        Thread({
            val ready = PythonServerManager.waitUntilReady()
            runOnUiThread {
                loadingOverlay.visibility = if (ready) android.view.View.GONE else android.view.View.VISIBLE
                if (ready) webView.loadUrl(AppConfig.BASE_URL) else webView.loadData(
                    "<html><body style='background:#09090b;color:#f4f4f5;font-family:sans-serif'>" +
                        "Backend failed to start. Please restart the app.</body></html>",
                    "text/html", "utf-8",
                )
            }
        }, "spotistorage-wait-ready").apply { isDaemon = true }.start()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val page = intent.getStringExtra(ServerForegroundService.EXTRA_NAVIGATE_TO) ?: return
        runJs("window.__navigateTo && window.__navigateTo('${escapeJs(page)}')")
    }

    override fun onResume() {
        super.onResume()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            runJs("window.__onPermissionResult && window.__onPermissionResult('storage', ${Environment.isExternalStorageManager()})")
        }
    }

    private fun buildWebView(): WebView = WebView(this).apply {
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        webViewClient = ExternalLinkWebViewClient()
        addJavascriptInterface(AndroidBridge(this@MainActivity), "AndroidBridge")
    }

    private inner class ExternalLinkWebViewClient : WebViewClient() {
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            val host = request.url.host
            if (host == "127.0.0.1" || host == "localhost") return false
            startActivity(Intent(Intent.ACTION_VIEW, request.url))
            return true
        }

        override fun onPageFinished(view: WebView, url: String) {
            pendingNavigation?.let { page ->
                view.evaluateJavascript("window.__pendingNavigation='${escapeJs(page)}';window.__navigateTo&&window.__navigateTo('${escapeJs(page)}')", null)
                pendingNavigation = null
            }
        }
    }

    private fun runJs(script: String) {
        runOnUiThread { webView.evaluateJavascript(script, null) }
    }

    private fun escapeJs(s: String): String = s.replace("\\", "\\\\").replace("'", "\\'")

    fun launchFolderPicker() {
        folderPicker.launch(null)
    }

    fun launchStoragePermissionRequest() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return
        val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION, Uri.parse("package:$packageName"))
        startActivity(intent)
    }

    private fun hasNotificationPermission(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true
        return ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS) ==
            android.content.pm.PackageManager.PERMISSION_GRANTED
    }

    fun checkNotificationPermission() {
        runJs("window.__onPermissionResult && window.__onPermissionResult('notifications', ${hasNotificationPermission()})")
    }

    fun launchNotificationPermissionRequest() {
        if (hasNotificationPermission()) {
            runJs("window.__onPermissionResult && window.__onPermissionResult('notifications', true)")
        } else {
            notificationPermission.launch(android.Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    private fun onFolderPicked(uri: Uri?) {
        if (uri == null) {
            runJs("window.__onFolderPicked && window.__onFolderPicked('')")
            return
        }
        val path = SafPathResolver.resolvePath(this, uri) ?: ""
        runJs("window.__onFolderPicked && window.__onFolderPicked('${escapeJs(path)}')")
    }
}
