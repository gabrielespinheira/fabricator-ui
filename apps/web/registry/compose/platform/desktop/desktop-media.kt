package dev.fabricator.ui

import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.awt.SwingPanel
import dev.fabricator.ui.generated.FabricatorGenerated
import dev.fabricator.ui.models.CivilDate
import java.awt.Desktop
import java.awt.SystemTray
import java.awt.Toolkit
import java.awt.TrayIcon
import java.awt.datatransfer.StringSelection
import java.awt.image.BufferedImage
import java.io.IOException
import java.net.URI
import java.nio.file.Files
import java.time.LocalDate
import javax.sound.sampled.AudioFormat
import javax.sound.sampled.AudioSystem
import javax.swing.JFileChooser
import javax.swing.SwingUtilities
import javafx.application.Platform
import javafx.embed.swing.JFXPanel
import javafx.geometry.Pos
import javafx.scene.Scene
import javafx.scene.control.Button
import javafx.scene.control.Label
import javafx.scene.control.Slider
import javafx.scene.layout.BorderPane
import javafx.scene.layout.HBox
import javafx.scene.media.Media
import javafx.scene.media.MediaPlayer
import javafx.scene.media.MediaView
import javafx.util.Duration
import kotlin.concurrent.thread

/** JavaFX owns decoding and its native surface; Compose owns the surrounding Fabricator UI. */
private class DesktopFabricatorMediaSession(uri: String) : FabricatorMediaSession {
    override val state = mutableStateOf(FabricatorMediaState())
    var player: MediaPlayer? = null
        private set
    private var closed = false
    private var onReady: ((MediaPlayer) -> Unit)? = null
    init {
        if (SwingUtilities.isEventDispatchThread()) JFXPanel() else SwingUtilities.invokeAndWait { JFXPanel() }
        Platform.setImplicitExit(false)
        Platform.runLater {
            try {
                val created = MediaPlayer(Media(uri))
                player = created
                created.setOnReady { state.value = state.value.copy(durationSeconds = created.totalDuration.toSeconds().toFloat()); onReady?.invoke(created) }
                created.setOnPlaying { state.value = state.value.copy(isPlaying = true) }
                created.setOnPaused { state.value = state.value.copy(isPlaying = false) }
                created.setOnEndOfMedia { state.value = state.value.copy(isPlaying = false) }
                created.setOnError { state.value = state.value.copy(error = created.error?.message ?: "Unable to decode media", isPlaying = false) }
                created.currentTimeProperty().addListener { _, _, duration -> state.value = state.value.copy(positionSeconds = duration.toSeconds().toFloat()) }
                if (closed) created.dispose()
            } catch (error: javafx.scene.media.MediaException) { state.value = state.value.copy(error = error.message ?: "Unable to open media") }
        }
    }
    fun attach(onReady: (MediaPlayer) -> Unit) { this.onReady = onReady; Platform.runLater { player?.let(onReady) } }
    override fun play() { Platform.runLater { player?.play() } }
    override fun pause() { Platform.runLater { player?.pause() } }
    override fun seek(seconds: Float) { Platform.runLater { player?.seek(Duration.seconds(seconds.toDouble())) } }
    override fun close() { if (!closed) { closed = true; Platform.runLater { player?.dispose() } } }
}

@Composable
actual fun rememberFabricatorMediaSession(uri: String): FabricatorMediaSession {
    val session = remember(uri) { DesktopFabricatorMediaSession(uri) }
    DisposableEffect(session) { onDispose { session.close() } }
    return session
}

@Composable
actual fun FabricatorNativeVideo(uri: String, modifier: Modifier) {
    val session = remember(uri) { DesktopFabricatorMediaSession(uri) }
    val theme = LocalFabricatorTheme.current
    val background = if (theme.isDark) "#171717" else "#fafafa"
    DisposableEffect(session) { onDispose { session.close() } }
    SwingPanel(modifier = modifier, factory = {
        JFXPanel().apply {
            val panel = this
            session.attach { player ->
                val view = MediaView(player).apply { isPreserveRatio = true }
                val play = Button("Play").apply { setOnAction { if (player.status == MediaPlayer.Status.PLAYING) player.pause() else player.play() } }
                val position = Slider(0.0, maxOf(1.0, player.totalDuration.toSeconds()), 0.0)
                position.setOnMouseReleased { player.seek(Duration.seconds(position.value)) }
                val time = Label("00:00")
                player.currentTimeProperty().addListener { _, _, duration -> if (!position.isValueChanging) position.value = duration.toSeconds(); time.text = "${duration.toMinutes().toInt()}:${(duration.toSeconds().toInt() % 60).toString().padStart(2, '0')}" }
                player.statusProperty().addListener { _, _, status -> play.text = if (status == MediaPlayer.Status.PLAYING) "Pause" else "Play" }
                val controls = HBox(12.0, play, position, time).apply { alignment = Pos.CENTER; style = "-fx-padding: 8; -fx-background-color: $background;" }
                val layout = BorderPane(view).apply { bottom = controls; style = "-fx-background-color: $background;" }
                view.fitWidthProperty().bind(layout.widthProperty())
                view.fitHeightProperty().bind(layout.heightProperty().subtract(48))
                panel.scene = Scene(layout)
            }
        }
    })
}
