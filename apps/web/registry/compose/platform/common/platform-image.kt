package dev.fabricator.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

@Composable expect fun FabricatorNativeImage(uri: String, description: String, modifier: Modifier = Modifier)
