package dev.fabricator.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

@Composable expect fun rememberFabricatorMediaSession(uri: String): FabricatorMediaSession
@Composable expect fun FabricatorNativeVideo(uri: String, modifier: Modifier = Modifier)
