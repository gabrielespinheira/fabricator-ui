package dev.fabricator.ui

import androidx.compose.runtime.*
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
import kotlin.concurrent.thread

private var notificationTray: TrayIcon? = null

@Composable
actual fun rememberFabricatorServices(): FabricatorServices = remember { object : FabricatorServices {
    override fun selectFiles(multiple: Boolean, mimeTypes: List<String>, result: (FabricatorServiceResult<List<FabricatorFile>>) -> Unit) {
        SwingUtilities.invokeLater {
            val picker = JFileChooser().apply { isMultiSelectionEnabled = multiple }
            if (picker.showOpenDialog(null) != JFileChooser.APPROVE_OPTION) { result(FabricatorServiceResult.Cancelled); return@invokeLater }
            val files = if (multiple) picker.selectedFiles.toList() else listOf(picker.selectedFile)
            result(FabricatorServiceResult.Success(files.map { file -> FabricatorFile(file.name, file.toURI().toString(), file.length(), Files.probeContentType(file.toPath())) }))
        }
    }
    override fun writeClipboard(text: String): FabricatorServiceResult<Unit> {
        Toolkit.getDefaultToolkit().systemClipboard.setContents(StringSelection(text), null)
        return FabricatorServiceResult.Success(Unit)
    }
    override fun openLink(url: String): FabricatorServiceResult<Unit> {
        if (!Desktop.isDesktopSupported() || !Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) return FabricatorServiceResult.Unavailable("This desktop has no URL handler.")
        return try { Desktop.getDesktop().browse(URI(url)); FabricatorServiceResult.Success(Unit) } catch (error: IOException) { FabricatorServiceResult.Failure(error.message ?: "Unable to open URL") }
    }
    override fun haptic(): FabricatorServiceResult<Unit> = FabricatorServiceResult.Unavailable("Desktop haptics are not provided by the JVM.")
    override fun notify(title: String, message: String): FabricatorServiceResult<Unit> {
        if (!SystemTray.isSupported()) return FabricatorServiceResult.Unavailable("The current desktop session has no system tray.")
        if (notificationTray == null) {
            val image = BufferedImage(24, 24, BufferedImage.TYPE_INT_ARGB)
            val graphics = image.createGraphics()
            graphics.color = java.awt.Color(23, 23, 23)
            graphics.fillRoundRect(2, 2, 20, 20, 6, 6)
            graphics.dispose()
            val tray = TrayIcon(image, "Fabricator UI").apply { isImageAutoSize = true }
            SystemTray.getSystemTray().add(tray)
            notificationTray = tray
        }
        notificationTray?.displayMessage(title, message, TrayIcon.MessageType.INFO)
        return FabricatorServiceResult.Success(Unit)
    }
    override fun playSound(name: String): FabricatorServiceResult<Unit> {
        val recipe = FabricatorGenerated.sounds.firstOrNull { it.name == name } ?: return FabricatorServiceResult.Failure("Unknown Fabricator sound: $name")
        thread(name = "fabricator-sound", isDaemon = true) {
            val samples = synthesizeFabricatorSound(recipe, FabricatorGenerated.soundMasterLevel)
            val bytes = ByteArray(samples.size * 2)
            samples.forEachIndexed { index, sample -> bytes[index * 2] = (sample.toInt() and 255).toByte(); bytes[index * 2 + 1] = (sample.toInt() shr 8).toByte() }
            AudioSystem.getSourceDataLine(AudioFormat(44100f, 16, 1, true, false)).use { line -> line.open(); line.start(); line.write(bytes, 0, bytes.size); line.drain() }
        }
        return FabricatorServiceResult.Success(Unit)
    }
    override fun today(): CivilDate { val date = LocalDate.now(); return CivilDate(date.year, date.monthValue, date.dayOfMonth) }
} }

