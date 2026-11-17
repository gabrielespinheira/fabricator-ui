package dev.fabricator.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.drawscope.clipRect
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.*
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.OffsetMapping
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.input.TransformedText
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import dev.fabricator.ui.models.*

@Composable
fun FabricatorAudioPlayer(uri: String, title: String, modifier: Modifier = Modifier) {
    val session = rememberFabricatorMediaSession(uri)
    val state by session.state
    DisposableEffect(session) { onDispose { session.close() } }
    FabricatorCard(modifier) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            FabricatorButton({ if (state.isPlaying) session.pause() else session.play() }, Modifier.semantics { contentDescription = if (state.isPlaying) "Pause" else "Play" }, size = FabricatorSize.Icon) { FabricatorIcon(if (state.isPlaying) "pause" else "play") }
            Column(Modifier.weight(1f)) { FabricatorText(title, weight = FontWeight.Medium); FabricatorSlider(state.positionSeconds, session::seek, range = 0f..maxOf(1f, state.durationSeconds), label = "Playback position") }
            FabricatorText("${formatTime(state.positionSeconds.toInt())} / ${formatTime(state.durationSeconds.toInt())}", muted = true, size = 11)
        }
        if (state.error != null) FabricatorAlert("Playback failed", state.error, role = FabricatorRole.Destructive)
    }
}

