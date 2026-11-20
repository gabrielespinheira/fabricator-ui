package dev.fabricator.gallery

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import dev.fabricator.ui.*

@Composable
internal fun GooeyDemo() {
    val theme = LocalFabricatorTheme.current
    var mode by remember { mutableStateOf(FabricatorGooeyMode.Expressive) }
    var waviness by remember { mutableFloatStateOf(.35f) }
    var tab by remember { mutableStateOf("Overview") }
    var volume by remember { mutableFloatStateOf(.45f) }
    var isSplit by remember { mutableStateOf(false) }
    var isMelted by remember { mutableStateOf(false) }
    val morph by animateFloatAsState(if (isSplit) 1f else 0f, tween(theme.duration("move"), easing = theme.easing("move")), label = "Morph")
    val melt by animateFloatAsState(if (isMelted) 1f else 0f, tween(theme.duration("move"), easing = theme.easing("move")), label = "Melt")

    FabricatorGooeyProvider(mode, waviness) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            FabricatorSelect(mode.name, { mode = FabricatorGooeyMode.valueOf(it) }, FabricatorGooeyMode.entries.map { FabricatorOption(it.name, it.name) })
            FabricatorSlider(waviness, { waviness = it }, label = "Waviness", gooey = FabricatorGooeyOptions(isEnabled = false))
            FabricatorText("Move · Tabs")
            FabricatorTabs(tab, { tab = it }, listOf("Overview", "Activity", "Files").map { FabricatorTab(it, it) }) { FabricatorText(it) }
            FabricatorText("Bend · Slider")
            FabricatorSlider(volume, { volume = it }, label = "Volume")
            FabricatorText("Morph · Button")
            Box(Modifier.size(176.dp, 64.dp), contentAlignment = Alignment.Center) {
                FabricatorGooey(Modifier.fillMaxSize(), FabricatorGooeyEffect.Morph, morph, fill = theme.color("muted"))
                Row {
                    FabricatorButton("Add", onClick = { isSplit = !isSplit }, variant = FabricatorVariant.Ghost)
                    if (isSplit) FabricatorButton("Import", onClick = { isSplit = false }, variant = FabricatorVariant.Ghost)
                }
            }
            FabricatorText("Melt · Badge")
            Box(Modifier.size(176.dp, 64.dp), contentAlignment = Alignment.Center) {
                FabricatorGooey(Modifier.fillMaxSize(), FabricatorGooeyEffect.Melt, melt, fill = theme.color("info-surface-4"), accentFill = theme.color("success-surface-4"))
                Row { FabricatorBadge("Draft", variant = FabricatorVariant.Outline); FabricatorBadge("Ready", variant = FabricatorVariant.Outline) }
            }
            FabricatorButton("Blend badges", onClick = { isMelted = !isMelted }, variant = FabricatorVariant.Outline)
        }
    }
}
