package dev.fabricator.ui

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.net.Uri
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import dev.fabricator.ui.generated.FabricatorGenerated
import dev.fabricator.ui.models.CivilDate
import java.time.LocalDate
import kotlin.concurrent.thread

@Composable
actual fun rememberFabricatorServices(): FabricatorServices {
    val context = LocalContext.current
    var pending by remember { mutableStateOf<((FabricatorServiceResult<List<FabricatorFile>>) -> Unit)?>(null) }
    fun returnFiles(uris: List<Uri>) {
        val files = uris.map { uri ->
            context.contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
            var name = uri.lastPathSegment ?: uri.toString()
            var size: Long? = null
            context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE), null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) { name = cursor.getString(0); if (!cursor.isNull(1)) size = cursor.getLong(1) }
            }
            FabricatorFile(name, uri.toString(), size, context.contentResolver.getType(uri))
        }
        pending?.invoke(if (files.isEmpty()) FabricatorServiceResult.Cancelled else FabricatorServiceResult.Success(files))
        pending = null
    }
    val multiple = rememberLauncherForActivityResult(ActivityResultContracts.OpenMultipleDocuments(), ::returnFiles)
    val single = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { returnFiles(listOfNotNull(it)) }
    return remember(context, multiple, single) { object : FabricatorServices {
        override fun selectFiles(multipleSelection: Boolean, mimeTypes: List<String>, result: (FabricatorServiceResult<List<FabricatorFile>>) -> Unit) {
            pending = result
            if (multipleSelection) multiple.launch(mimeTypes.toTypedArray()) else single.launch(mimeTypes.toTypedArray())
        }
        override fun writeClipboard(text: String): FabricatorServiceResult<Unit> {
            context.getSystemService(ClipboardManager::class.java).setPrimaryClip(ClipData.newPlainText("Fabricator UI", text))
            return FabricatorServiceResult.Success(Unit)
        }
        override fun openLink(url: String): FabricatorServiceResult<Unit> {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            if (intent.resolveActivity(context.packageManager) == null) return FabricatorServiceResult.Unavailable("No application can open this URL.")
            context.startActivity(intent)
            return FabricatorServiceResult.Success(Unit)
        }
        override fun haptic(): FabricatorServiceResult<Unit> {
            val vibrator = context.getSystemService(Vibrator::class.java)
            if (!vibrator.hasVibrator()) return FabricatorServiceResult.Unavailable("This device has no haptic actuator.")
            vibrator.vibrate(VibrationEffect.createOneShot(15, VibrationEffect.DEFAULT_AMPLITUDE))
            return FabricatorServiceResult.Success(Unit)
        }
        override fun playSound(name: String): FabricatorServiceResult<Unit> {
            val recipe = FabricatorGenerated.sounds.firstOrNull { it.name == name } ?: return FabricatorServiceResult.Failure("Unknown Fabricator sound: $name")
            thread(name = "fabricator-sound", isDaemon = true) {
                val samples = synthesizeFabricatorSound(recipe, FabricatorGenerated.soundMasterLevel)
                val track = AudioTrack.Builder().setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION).build()).setAudioFormat(AudioFormat.Builder().setSampleRate(44100).setEncoding(AudioFormat.ENCODING_PCM_16BIT).setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build()).setTransferMode(AudioTrack.MODE_STATIC).setBufferSizeInBytes(samples.size * 2).build()
                track.write(samples, 0, samples.size)
                track.setNotificationMarkerPosition(samples.size)
                track.setPlaybackPositionUpdateListener(object : AudioTrack.OnPlaybackPositionUpdateListener { override fun onMarkerReached(track: AudioTrack) { track.release() }; override fun onPeriodicNotification(track: AudioTrack) = Unit })
                track.play()
            }
            return FabricatorServiceResult.Success(Unit)
        }
        override fun notify(title: String, message: String): FabricatorServiceResult<Unit> {
            if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return FabricatorServiceResult.Unavailable("Allow notifications in Android settings first.")
            val manager = context.getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(NotificationChannel("fabricator", "Fabricator UI", NotificationManager.IMPORTANCE_DEFAULT))
            manager.notify(1, Notification.Builder(context, "fabricator").setContentTitle(title).setContentText(message).setSmallIcon(android.R.drawable.ic_dialog_info).setAutoCancel(true).build())
            return FabricatorServiceResult.Success(Unit)
        }
        override fun today(): CivilDate { val date = LocalDate.now(); return CivilDate(date.year, date.monthValue, date.dayOfMonth) }
    } }
}

