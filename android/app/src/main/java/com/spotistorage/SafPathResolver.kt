package com.spotistorage

import android.content.Context
import android.net.Uri
import android.os.Environment
import android.os.storage.StorageManager
import android.provider.DocumentsContract

object SafPathResolver {

    fun resolvePath(context: Context, treeUri: Uri): String? {
        val docId = try {
            DocumentsContract.getTreeDocumentId(treeUri)
        } catch (e: IllegalArgumentException) {
            return null
        }
        val separator = docId.indexOf(':')
        if (separator < 0) return null
        val volumeId = docId.substring(0, separator)
        val relativePath = docId.substring(separator + 1)

        if (volumeId.equals("primary", ignoreCase = true)) {
            val base = Environment.getExternalStorageDirectory().path
            return if (relativePath.isEmpty()) base else "$base/$relativePath"
        }

        val storageManager = context.getSystemService(Context.STORAGE_SERVICE) as? StorageManager
            ?: return null
        for (volume in storageManager.storageVolumes) {
            if (volume.uuid?.equals(volumeId, ignoreCase = true) == true) {
                val dir = volume.directory ?: continue
                return if (relativePath.isEmpty()) dir.path else "${dir.path}/$relativePath"
            }
        }
        return null
    }
}
