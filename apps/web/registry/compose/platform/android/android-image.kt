package dev.fabricator.ui

import android.graphics.BitmapFactory
import android.net.Uri
import androidx.compose.foundation.Image
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import java.io.IOException
import java.net.URI
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Composable
actual fun FabricatorNativeImage(uri: String, description: String, modifier: Modifier) {
    val context = LocalContext.current
    var bitmap by remember(uri) { mutableStateOf<ImageBitmap?>(null) }
    var error by remember(uri) { mutableStateOf<String?>(null) }
    LaunchedEffect(uri) {
        try {
            bitmap = withContext(Dispatchers.IO) {
                val input = if (uri.startsWith("https://") || uri.startsWith("http://")) URI(uri).toURL().openStream() else context.contentResolver.openInputStream(Uri.parse(uri))
                val stream = input ?: throw IOException("Image source is unavailable.")
                stream.use { BitmapFactory.decodeStream(it)?.asImageBitmap() ?: throw IOException("Unsupported image format.") }
            }
        } catch (failure: IOException) { error = failure.message ?: "Unable to load image." } catch (failure: SecurityException) { error = failure.message ?: "Image access was denied." }
    }
    val image = bitmap
    if (image != null) Image(image, description, modifier, contentScale = ContentScale.Fit)
    else if (error != null) FabricatorText(error.orEmpty(), modifier, color = LocalFabricatorTheme.current.color("destructive-text"))
    else FabricatorSpinner(modifier)
}
