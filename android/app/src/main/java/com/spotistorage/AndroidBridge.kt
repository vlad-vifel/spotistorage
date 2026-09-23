package com.spotistorage

import android.webkit.JavascriptInterface

class AndroidBridge(private val activity: MainActivity) {

    @JavascriptInterface
    fun pickLibraryFolder() {
        activity.runOnUiThread { activity.launchFolderPicker() }
    }

    @JavascriptInterface
    fun requestStoragePermission() {
        activity.runOnUiThread { activity.launchStoragePermissionRequest() }
    }

    @JavascriptInterface
    fun checkStoragePermission() {
        activity.runOnUiThread { activity.checkStoragePermission() }
    }

    @JavascriptInterface
    fun requestNotificationPermission() {
        activity.runOnUiThread { activity.launchNotificationPermissionRequest() }
    }

    @JavascriptInterface
    fun checkNotificationPermission() {
        activity.runOnUiThread { activity.checkNotificationPermission() }
    }

    @JavascriptInterface
    fun startDownloadService() {
        ServerForegroundService.start(activity.applicationContext)
    }

    @JavascriptInterface
    fun getApiToken(): String = PythonServerManager.apiToken
}
