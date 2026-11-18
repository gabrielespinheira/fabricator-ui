package dev.fabricator.ui

import androidx.compose.foundation.Image
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.toComposeImageBitmap
import androidx.compose.ui.layout.ContentScale
import java.io.IOException
import java.net.URI
import java.nio.file.Files
import java.nio.file.Path
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.jetbrains.skia.Image as SkiaImage

@Composable
actual fun FabricatorNativeImage(uri: String, description: String, modifier: Modifier) {
    var bitmap by remember(uri) { mutableStateOf<ImageBitmap?>(null) }
    var error by remember(uri) { mutableStateOf<String?>(null) }
    LaunchedEffect(uri) {
        try {
            bitmap = withContext(Dispatchers.IO) {
                val source = URI(uri)
                val bytes = if (source.scheme == "file") Files.readAllBytes(Path.of(source)) else source.toURL().openStream().use { it.readBytes() }
                SkiaImage.makeFromEncoded(bytes).toComposeImageBitmap()
            }
        } catch (failure: IOException) { error = failure.message ?: "Unable to load image." } catch (failure: IllegalArgumentException) { error = failure.message ?: "Unsupported image source." }
    }
    val image = bitmap
    if (image != null) Image(image, description, modifier, contentScale = ContentScale.Fit)
    else if (error != null) FabricatorText(error.orEmpty(), modifier, color = LocalFabricatorTheme.current.color("destructive-text"))
    else FabricatorSpinner(modifier)
}
