package dev.fabricator.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import dev.fabricator.ui.generated.FabricatorGenerated

@Composable
fun FabricatorSounds(modifier: Modifier = Modifier) {
    val services = LocalFabricatorServices.current
    var message by remember { mutableStateOf<String?>(null) }
    Column(modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        FabricatorGenerated.sounds.forEach { sound -> FabricatorItem(sound.name.replaceFirstChar(Char::uppercase), description = sound.description, leading = { FabricatorIcon("volume-2") }, trailing = { FabricatorButton("Play", { message = when (val result = services.playSound(sound.name)) { is FabricatorServiceResult.Success -> null; is FabricatorServiceResult.Failure -> result.message; is FabricatorServiceResult.Unavailable -> result.reason; FabricatorServiceResult.Cancelled -> null } }, variant = FabricatorVariant.Outline) }) }
        if (message != null) FabricatorAlert("Sound unavailable", message, role = FabricatorRole.Warning)
    }
}
