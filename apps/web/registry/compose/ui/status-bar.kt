package dev.fabricator.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.input.key.*
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@Composable
fun FabricatorStatusBar(data: List<FabricatorStatusPeriod>, modifier: Modifier = Modifier, label: String = "Service uptime", statuses: Map<String, FabricatorStatusDefinition> = emptyMap(), onSelect: (Int?) -> Unit = {}) {
    val theme = LocalFabricatorTheme.current
    var active by remember { mutableStateOf<Int?>(null) }
    var tableOpen by remember { mutableStateOf(false) }
    if (data.isEmpty()) { FabricatorEmpty("No status history", modifier = modifier); return }
    BoxWithConstraints(modifier.fillMaxWidth()) {
        val availableWidth = maxWidth.value
        val model = remember(data, availableWidth, statuses) { resolveFabricatorStatusBar(data, availableWidth, statuses) }
        fun select(index: Int?) { active = index; onSelect(index) }
        val uptime = formatFabricatorStatusUptime(model.uptime)
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Canvas(Modifier.fillMaxWidth().height(32.dp).semantics {
                contentDescription = "$label, $uptime"
                customActions = model.pills.map { pill -> CustomAccessibilityAction("Inspect ${data[pill.index].label}: ${pill.status.label}") { select(pill.index); true } }
            }.onKeyEvent { event ->
                if (event.type != KeyEventType.KeyDown) false else when (event.key) {
                    Key.DirectionRight -> { select(((active ?: model.first - 1) + 1).coerceIn(model.first, data.lastIndex)); true }
                    Key.DirectionLeft -> { select(((active ?: data.size) - 1).coerceIn(model.first, data.lastIndex)); true }
                    Key.MoveHome -> { select(model.first); true }
                    Key.MoveEnd -> { select(data.lastIndex); true }
                    Key.Escape -> { select(null); true }
                    else -> false
                }
            }.focusable().pointerInput(model, availableWidth) { detectTapGestures { point -> val coordinate = point.x / size.width * availableWidth; val pill = model.pills.minByOrNull { kotlin.math.abs(it.x + it.width / 2 - coordinate) }; select(pill?.index) } }) {
                model.pills.forEach { pill ->
                    val color = theme.color(pill.status.role)
                    val alpha = pill.status.opacity * if (active == null || active == pill.index) 1f else .5f
                    val lift = if (active == pill.index) 2.dp.toPx() else 0f
                    drawRoundRect(color.copy(alpha = color.alpha * alpha), Offset(pill.x.dp.toPx(), -lift), Size(pill.width.dp.toPx(), size.height), CornerRadius(pill.radius.dp.toPx()))
                }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { FabricatorText(data[model.first].label, muted = true, size = 11); FabricatorText(uptime, muted = true, size = 11); FabricatorText(data.last().label, muted = true, size = 11) }
            FlowRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) { model.statuses.forEach { status -> Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) { Box(Modifier.size(8.dp).background(theme.color(status.role).copy(alpha = status.opacity), RoundedCornerShape(2.dp))); FabricatorText(status.label, muted = true, size = 11) } } }
            val selected = active?.let { index -> model.pills.firstOrNull { it.index == index } }
            if (selected != null) {
                val period = data[selected.index]
                Column(Modifier.semantics { liveRegion = LiveRegionMode.Polite }) { FabricatorText(period.label, weight = FontWeight.Medium); FabricatorText(selected.status.label, muted = true, size = 12); if (period.note != null) FabricatorText(period.note, muted = true, size = 12) }
            }
            FabricatorButton(if (tableOpen) "Hide data" else "Show data", { tableOpen = !tableOpen }, variant = FabricatorVariant.Ghost)
            if (tableOpen) FabricatorTable(listOf("Period", "Status", "Note"), data.map { period -> val single = resolveFabricatorStatusBar(listOf(period), 32f, statuses); listOf(period.label, single.pills.single().status.label, period.note.orEmpty()) })
        }
    }
}
