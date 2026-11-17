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
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.provider.OpenableColumns
import android.widget.MediaController
import android.widget.VideoView
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import dev.fabricator.ui.generated.FabricatorGenerated
import dev.fabricator.ui.models.CivilDate
import java.io.IOException
import java.time.LocalDate
import kotlin.concurrent.thread
import kotlinx.coroutines.delay

private class AndroidFabricatorMediaSession(context: Context, uri: String) : FabricatorMediaSession {
    override val state = mutableStateOf(FabricatorMediaState())
    private var prepared = false
    private var closed = false
    private val player = MediaPlayer().apply {
        setAudioAttributes(AudioAttributes.Builder().setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build())
        setOnPreparedListener { prepared = true; state.value = state.value.copy(durationSeconds = it.duration / 1000f) }
        setOnCompletionListener { state.value = state.value.copy(isPlaying = false) }
        setOnErrorListener { _, what, extra -> state.value = state.value.copy(error = "MediaPlayer error $what ($extra)", isPlaying = false); true }
        try { setDataSource(context, Uri.parse(uri)); prepareAsync() } catch (error: IOException) { state.value = state.value.copy(error = error.message ?: "Unable to open audio") }
    }
    override fun play() { if (prepared && !closed) { player.start(); state.value = state.value.copy(isPlaying = true) } }
    override fun pause() { if (prepared && !closed) { player.pause(); state.value = state.value.copy(isPlaying = false) } }
    override fun seek(seconds: Float) { if (prepared && !closed) player.seekTo((seconds * 1000).toInt()) }
    override fun close() { if (!closed) { closed = true; player.release() } }
    fun poll() { if (prepared && !closed) state.value = state.value.copy(positionSeconds = player.currentPosition / 1000f, isPlaying = player.isPlaying) }
}

@Composable
actual fun rememberFabricatorMediaSession(uri: String): FabricatorMediaSession {
    val context = LocalContext.current
    val session = remember(context, uri) { AndroidFabricatorMediaSession(context, uri) }
    LaunchedEffect(session) { while (true) { session.poll(); delay(200) } }
    DisposableEffect(session) { onDispose { session.close() } }
    return session
}

@Composable
actual fun FabricatorNativeVideo(uri: String, modifier: Modifier) {
    AndroidView(factory = { context -> VideoView(context).apply { val controls = MediaController(context); controls.setAnchorView(this); setMediaController(controls); setVideoURI(Uri.parse(uri)); setOnPreparedListener { controls.show() } } }, modifier = modifier, update = { video -> if (video.tag != uri) { video.tag = uri; video.setVideoURI(Uri.parse(uri)) } }, onRelease = { it.stopPlayback() })
}
