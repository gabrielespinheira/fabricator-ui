package dev.fabricator.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import dev.fabricator.ui.models.CivilDate

data class FabricatorFile(val name: String, val uri: String, val size: Long?, val mimeType: String?)
sealed class FabricatorServiceResult<out T> {
    data class Success<T>(val value: T) : FabricatorServiceResult<T>()
    data object Cancelled : FabricatorServiceResult<Nothing>()
    data class Unavailable(val reason: String) : FabricatorServiceResult<Nothing>()
    data class Failure(val message: String) : FabricatorServiceResult<Nothing>()
}
data class FabricatorMediaState(val isPlaying: Boolean = false, val positionSeconds: Float = 0f, val durationSeconds: Float = 0f, val error: String? = null)
interface FabricatorMediaSession {
    val state: State<FabricatorMediaState>
    fun play()
    fun pause()
    fun seek(seconds: Float)
    fun close()
}
interface FabricatorServices {
    fun selectFiles(multiple: Boolean, mimeTypes: List<String>, result: (FabricatorServiceResult<List<FabricatorFile>>) -> Unit)
    fun writeClipboard(text: String): FabricatorServiceResult<Unit>
    fun openLink(url: String): FabricatorServiceResult<Unit>
    fun playSound(name: String): FabricatorServiceResult<Unit>
    fun haptic(): FabricatorServiceResult<Unit>
    fun notify(title: String, message: String): FabricatorServiceResult<Unit>
    fun today(): CivilDate
}
val LocalFabricatorServices = staticCompositionLocalOf<FabricatorServices> { error("Provide FabricatorServices for native integrations.") }

@Composable expect fun rememberFabricatorServices(): FabricatorServices
