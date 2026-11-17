package dev.fabricator.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.key.*
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import dev.fabricator.ui.models.*
import kotlin.math.*

data class FabricatorChartDatum(val label: String, val value: Double)
data class FabricatorChartSeries(val id: String, val title: String, val values: List<Double?>, val color: Color? = null)
data class FabricatorCandle(val label: String, val open: Double, val close: Double, val low: Double, val high: Double)
data class FabricatorSankeyNode(val id: String, val label: String, val column: Int)
data class FabricatorSankeyLink(val source: String, val target: String, val value: Double)
data class FabricatorHeatDay(val date: CivilDate, val value: Double)
enum class FabricatorCartesianKind { Line, Area, Bar, Composition, Bump }

private fun FabricatorThemeValues.chartColor(index: Int): Color = color(if (index < 8) "chart-series-${index + 1}" else "muted-foreground")

@Composable
fun FabricatorChartLegend(series: List<FabricatorChartSeries>, hidden: Set<String> = emptySet(), onHiddenChange: ((Set<String>) -> Unit)? = null) {
    val theme = LocalFabricatorTheme.current
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) { series.forEachIndexed { index, item ->
        val content: @Composable RowScope.() -> Unit = {
            Box(Modifier.size(8.dp).background(if (item.id in hidden) theme.color("muted") else item.color ?: theme.chartColor(index), RoundedCornerShape(2.dp)))
            FabricatorText(item.title, muted = item.id in hidden, size = 12)
        }
        if (onHiddenChange == null) Row(Modifier.padding(horizontal = 8.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp), content = content)
        else FabricatorButton({ onHiddenChange(if (item.id in hidden) hidden - item.id else hidden + item.id) }, Modifier.semantics { selected = item.id !in hidden }, FabricatorVariant.Ghost, content = content)
    } }
}

@Composable
fun FabricatorCartesianChart(labels: List<String>, series: List<FabricatorChartSeries>, kind: FabricatorCartesianKind, modifier: Modifier = Modifier, selectedIndex: Int? = null, onSelect: (Int) -> Unit = {}) {
    val theme = LocalFabricatorTheme.current
    var hidden by remember { mutableStateOf<Set<String>>(emptySet()) }
    val visible = series.filter { it.id !in hidden }
    val isStacked = kind == FabricatorCartesianKind.Composition
    val totals = labels.indices.map { index -> visible.sumOf { it.values.getOrNull(index) ?: 0.0 } }
    val domain = resolveChartDomain(if (isStacked) totals else visible.flatMap { it.values.filterNotNull() })
    val grid = theme.color("border")
    val seriesColors = series.mapIndexed { index, item -> item.color ?: theme.chartColor(index) }
    Column(modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Canvas(Modifier.fillMaxWidth().height(220.dp).semantics {
            contentDescription = labels.mapIndexed { index, label -> "$label: " + visible.joinToString { "${it.title} ${it.values.getOrNull(index)?.toString() ?: "No data"}" } }.joinToString("; ")
            customActions = labels.mapIndexed { index, label -> CustomAccessibilityAction("Select $label") { onSelect(index); true } }
        }.onKeyEvent { event ->
            if (event.type != KeyEventType.KeyDown || labels.isEmpty()) false else when (event.key) {
                Key.DirectionRight -> { onSelect(((selectedIndex ?: -1) + 1).coerceIn(labels.indices)); true }
                Key.DirectionLeft -> { onSelect(((selectedIndex ?: labels.size) - 1).coerceIn(labels.indices)); true }
                Key.MoveHome -> { onSelect(0); true }
                Key.MoveEnd -> { onSelect(labels.lastIndex); true }
                else -> false
            }
        }.focusable().pointerInput(labels) { detectTapGestures { point -> if (labels.isNotEmpty()) onSelect((point.x / size.width * labels.size).toInt().coerceIn(labels.indices)) } }) {
            val inset = 8.dp.toPx()
            val width = size.width - inset * 2
            val height = size.height - inset * 2
            fun x(index: Int) = inset + (index + .5f) / max(1, labels.size) * width
            fun y(value: Double) = inset + (1f - domain.normalize(value)) * height
            repeat(5) { index -> val position = inset + height * index / 4; drawLine(grid, Offset(inset, position), Offset(size.width - inset, position), .5.dp.toPx()) }
            visible.forEach { item ->
                val seriesIndex = series.indexOf(item)
                val color = seriesColors[seriesIndex]
                when (kind) {
                    FabricatorCartesianKind.Bar -> item.values.forEachIndexed { index, value ->
                        if (value == null) return@forEachIndexed
                        val group = width / max(1, labels.size)
                        val bar = group * .75f / max(1, visible.size)
                        val left = x(index) - group * .375f + visible.indexOf(item) * bar
                        val zero = y(0.0)
                        drawRoundRect(color, Offset(left, min(y(value), zero)), Size(max(1f, bar - 3.dp.toPx()), max(1f, abs(zero - y(value)))), CornerRadius(3.dp.toPx()))
                    }
                    FabricatorCartesianKind.Composition -> item.values.forEachIndexed { index, value ->
                        if (value == null) return@forEachIndexed
                        val previous = visible.take(visible.indexOf(item)).sumOf { it.values.getOrNull(index) ?: 0.0 }
                        val bar = width / max(1, labels.size) * .65f
                        drawRect(color, Offset(x(index) - bar / 2, y(previous + value)), Size(bar, max(1f, y(previous) - y(previous + value))))
                    }
                    else -> {
                        fun point(index: Int, value: Double): Offset {
                            if (kind != FabricatorCartesianKind.Bump) return Offset(x(index), y(value))
                            val rank = visible.sortedByDescending { it.values.getOrNull(index) ?: Double.NEGATIVE_INFINITY }.indexOf(item)
                            return Offset(x(index), inset + (rank + .5f) / max(1, visible.size) * height)
                        }
                        val runs = mutableListOf<List<Pair<Int, Double>>>()
                        var run = mutableListOf<Pair<Int, Double>>()
                        item.values.forEachIndexed { index, value -> if (value == null) { if (run.isNotEmpty()) runs += run; run = mutableListOf() } else run += index to value }
                        if (run.isNotEmpty()) runs += run
                        for (segment in runs) {
                            val path = Path().apply { segment.forEachIndexed { index, (axis, value) -> val point = point(axis, value); if (index == 0) moveTo(point.x, point.y) else lineTo(point.x, point.y) } }
                            if (kind == FabricatorCartesianKind.Area) { val area = Path().apply { addPath(path); lineTo(x(segment.last().first), y(0.0)); lineTo(x(segment.first().first), y(0.0)); close() }; drawPath(area, color.copy(alpha = .15f)) }
                            drawPath(path, color, style = Stroke(if (kind == FabricatorCartesianKind.Bump) 4.dp.toPx() else 2.dp.toPx(), cap = StrokeCap.Round))
                        }
                        item.values.forEachIndexed { index, value -> if (value != null) drawCircle(color, if (selectedIndex == index) 5.dp.toPx() else 2.5.dp.toPx(), point(index, value)) }
                    }
                }
            }
            if (selectedIndex != null && selectedIndex in labels.indices) drawLine(grid, Offset(x(selectedIndex), 0f), Offset(x(selectedIndex), size.height), 1.dp.toPx())
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { labels.forEachIndexed { index, label -> if (index % max(1, labels.size / 6) == 0) FabricatorText(label, muted = true, size = 11) } }
        FabricatorChartLegend(series, hidden) { hidden = it }
        if (selectedIndex != null && selectedIndex in labels.indices) FabricatorText("${labels[selectedIndex]} · " + visible.joinToString { "${it.title}: ${it.values.getOrNull(selectedIndex)?.toString() ?: "No data"}" }, size = 12)
    }
}

@Composable fun FabricatorLineChart(labels: List<String>, series: List<FabricatorChartSeries>, modifier: Modifier = Modifier, selectedIndex: Int? = null, onSelect: (Int) -> Unit = {}) = FabricatorCartesianChart(labels, series, FabricatorCartesianKind.Line, modifier, selectedIndex, onSelect)
@Composable fun FabricatorAreaChart(labels: List<String>, series: List<FabricatorChartSeries>, modifier: Modifier = Modifier, selectedIndex: Int? = null, onSelect: (Int) -> Unit = {}) = FabricatorCartesianChart(labels, series, FabricatorCartesianKind.Area, modifier, selectedIndex, onSelect)
@Composable fun FabricatorBarChart(labels: List<String>, series: List<FabricatorChartSeries>, modifier: Modifier = Modifier, selectedIndex: Int? = null, onSelect: (Int) -> Unit = {}) = FabricatorCartesianChart(labels, series, FabricatorCartesianKind.Bar, modifier, selectedIndex, onSelect)
@Composable fun FabricatorCompositionChart(labels: List<String>, series: List<FabricatorChartSeries>, modifier: Modifier = Modifier, selectedIndex: Int? = null, onSelect: (Int) -> Unit = {}) = FabricatorCartesianChart(labels, series, FabricatorCartesianKind.Composition, modifier, selectedIndex, onSelect)
@Composable fun FabricatorBumpChart(labels: List<String>, series: List<FabricatorChartSeries>, modifier: Modifier = Modifier, selectedIndex: Int? = null, onSelect: (Int) -> Unit = {}) = FabricatorCartesianChart(labels, series, FabricatorCartesianKind.Bump, modifier, selectedIndex, onSelect)

@Composable
fun FabricatorPieChart(data: List<FabricatorChartDatum>, modifier: Modifier = Modifier, donut: Boolean = false, selectedIndex: Int? = null, onSelect: (Int) -> Unit = {}) {
    val theme = LocalFabricatorTheme.current
    val colors = data.indices.map { theme.chartColor(it) }
    val sum = data.sumOf { max(0.0, it.value) }.coerceAtLeast(.00001)
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Canvas(Modifier.size(220.dp).semantics { contentDescription = data.joinToString { "${it.label}: ${it.value}" }; customActions = data.mapIndexed { index, item -> CustomAccessibilityAction("Select ${item.label}") { onSelect(index); true } } }.pointerInput(data) {
            detectTapGestures { offset ->
                val angle = ((atan2(offset.y - size.height / 2, offset.x - size.width / 2) * 180 / PI + 450) % 360).toFloat()
                var accumulated = 0f
                val selected = data.indexOfFirst { item -> accumulated += (max(0.0, item.value) / sum * 360).toFloat(); angle <= accumulated }
                if (selected >= 0) onSelect(selected)
            }
        }) {
            var angle = -90f
            val stroke = if (donut) size.width * .16f else 0f
            data.forEachIndexed { index, item ->
                val sweep = (max(0.0, item.value) / sum * 360).toFloat()
                val inset = if (donut) stroke / 2 + 6.dp.toPx() else 6.dp.toPx()
                drawArc(colors[index], angle + .8f, max(0f, sweep - 1.6f), !donut, Offset(inset, inset), Size(size.width - inset * 2, size.height - inset * 2), style = if (donut) Stroke(stroke + if (index == selectedIndex) 4.dp.toPx() else 0f) else androidx.compose.ui.graphics.drawscope.Fill)
                angle += sweep
            }
        }
        FabricatorChartLegend(data.mapIndexed { index, item -> FabricatorChartSeries(index.toString(), item.label, listOf(item.value), colors[index]) })
        if (selectedIndex != null && selectedIndex in data.indices) FabricatorText("${data[selectedIndex].label}: ${data[selectedIndex].value}", weight = FontWeight.Medium)
    }
}
@Composable fun FabricatorDonutChart(data: List<FabricatorChartDatum>, modifier: Modifier = Modifier, selectedIndex: Int? = null, onSelect: (Int) -> Unit = {}) = FabricatorPieChart(data, modifier, true, selectedIndex, onSelect)

@Composable
fun FabricatorCandlestickChart(data: List<FabricatorCandle>, modifier: Modifier = Modifier, selectedIndex: Int? = null, onSelect: (Int) -> Unit = {}) {
    val theme = LocalFabricatorTheme.current
    val domain = resolveChartDomain(data.flatMap { listOf(it.high, it.low) }, includeZero = false)
    val up = theme.color("success")
    val down = theme.color("destructive")
    Canvas(modifier.fillMaxWidth().height(240.dp).semantics { contentDescription = data.joinToString { "${it.label}: open ${it.open}, close ${it.close}, low ${it.low}, high ${it.high}" } }.pointerInput(data) { detectTapGestures { if (data.isNotEmpty()) onSelect((it.x / size.width * data.size).toInt().coerceIn(data.indices)) } }) {
        val step = size.width / max(1, data.size)
        fun y(value: Double) = (1 - domain.normalize(value)) * (size.height - 16.dp.toPx()) + 8.dp.toPx()
        data.forEachIndexed { index, item ->
            val color = if (item.close >= item.open) up else down
            val x = (index + .5f) * step
            drawLine(color, Offset(x, y(item.high)), Offset(x, y(item.low)), if (index == selectedIndex) 2.dp.toPx() else 1.dp.toPx())
            drawRect(color, Offset(x - step * .3f, min(y(item.open), y(item.close))), Size(step * .6f, max(2.dp.toPx(), abs(y(item.close) - y(item.open)))))
        }
    }
}

@Composable
fun FabricatorRadarChart(labels: List<String>, series: List<FabricatorChartSeries>, modifier: Modifier = Modifier) {
    val theme = LocalFabricatorTheme.current
    val colors = series.indices.map { series[it].color ?: theme.chartColor(it) }
    val grid = theme.color("border")
    val maximum = series.flatMap { it.values.filterNotNull() }.maxOrNull()?.coerceAtLeast(1.0) ?: 1.0
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Canvas(Modifier.size(240.dp).semantics { contentDescription = series.joinToString { item -> "${item.title}: " + labels.mapIndexed { index, label -> "$label ${item.values.getOrElse(index) { 0.0 }}" }.joinToString() } }) {
            fun point(index: Int, fraction: Float): Offset { val angle = index * 2 * PI / max(1, labels.size) - PI / 2; return center + Offset((cos(angle) * size.minDimension * .45 * fraction).toFloat(), (sin(angle) * size.minDimension * .45 * fraction).toFloat()) }
            repeat(4) { ring -> val path = Path().apply { labels.indices.forEach { index -> val point = point(index, (ring + 1) / 4f); if (index == 0) moveTo(point.x, point.y) else lineTo(point.x, point.y) }; close() }; drawPath(path, grid, style = Stroke(1.dp.toPx())) }
            labels.indices.forEach { drawLine(grid, center, point(it, 1f), .5.dp.toPx()) }
            series.forEachIndexed { index, item ->
                val path = Path().apply { var connected = false; item.values.forEachIndexed { axis, value -> if (value == null) connected = false else { val point = point(axis, (value / maximum).toFloat()); if (!connected) moveTo(point.x, point.y) else lineTo(point.x, point.y); connected = true } }; if (item.values.none { it == null }) close() }
                if (item.values.none { it == null }) drawPath(path, colors[index].copy(alpha = .15f))
                drawPath(path, colors[index], style = Stroke(2.dp.toPx()))
            }
        }
        FabricatorChartLegend(series)
    }
}

@Composable
fun FabricatorRadialChart(data: List<FabricatorChartDatum>, modifier: Modifier = Modifier, maximum: Double = 100.0) {
    val theme = LocalFabricatorTheme.current
    val colors = data.indices.map { theme.chartColor(it) }
    val track = theme.color("accent")
    Canvas(modifier.size(240.dp).semantics { contentDescription = data.joinToString { "${it.label}: ${it.value} of $maximum" } }) {
        val step = size.minDimension / max(2f, data.size * 2f + 2f)
        data.forEachIndexed { index, item -> val inset = step * (index + .5f); val bounds = Size(size.width - inset * 2, size.height - inset * 2); drawArc(track, -90f, 360f, false, Offset(inset, inset), bounds, style = Stroke(step * .65f, cap = StrokeCap.Round)); drawArc(colors[index], -90f, (item.value / maximum * 360).toFloat().coerceIn(0f, 360f), false, Offset(inset, inset), bounds, style = Stroke(step * .65f, cap = StrokeCap.Round)) }
    }
}

@Composable
fun FabricatorFunnelChart(data: List<FabricatorChartDatum>, modifier: Modifier = Modifier, onSelect: (Int) -> Unit = {}) {
    val theme = LocalFabricatorTheme.current
    val maximum = data.maxOfOrNull { it.value }?.coerceAtLeast(1.0) ?: 1.0
    val colors = data.indices.map { theme.chartColor(it) }
    Column(modifier) {
        Canvas(Modifier.fillMaxWidth().height(240.dp).semantics { contentDescription = data.joinToString { "${it.label}: ${it.value}" }; customActions = data.mapIndexed { index, item -> CustomAccessibilityAction("Select ${item.label}") { onSelect(index); true } } }.pointerInput(data) { detectTapGestures { if (data.isNotEmpty()) onSelect((it.y / size.height * data.size).toInt().coerceIn(data.indices)) } }) {
            val height = size.height / max(1, data.size)
            data.forEachIndexed { index, item ->
                val top = (max(0.0, item.value) / maximum * size.width).toFloat()
                val bottom = (max(0.0, data.getOrNull(index + 1)?.value ?: item.value) / maximum * size.width).toFloat()
                val y = index * height
                val path = Path().apply { moveTo((size.width - top) / 2, y); lineTo((size.width + top) / 2, y); lineTo((size.width + bottom) / 2, y + height - 3.dp.toPx()); lineTo((size.width - bottom) / 2, y + height - 3.dp.toPx()); close() }
                drawPath(path, colors[index])
            }
        }
        FabricatorChartLegend(data.mapIndexed { index, item -> FabricatorChartSeries(index.toString(), "${item.label} · ${item.value}", listOf(item.value), colors[index]) })
    }
}

@Composable
fun FabricatorHeatCalendar(data: List<FabricatorHeatDay>, modifier: Modifier = Modifier, onSelect: (CivilDate) -> Unit = {}) {
    val theme = LocalFabricatorTheme.current
    val values = data.associate { it.date.epochDay to it.value }
    val first = data.minByOrNull { it.date }?.date ?: return
    val last = data.maxBy { it.date }.date
    val start = first.plusDays(-first.weekday)
    val count = (last.epochDay - start.epochDay) / 7 + 1
    val maximum = data.maxOf { it.value }.coerceAtLeast(1.0)
    val color = theme.color("primary")
    val track = theme.color("accent")
    Canvas(modifier.fillMaxWidth().height(112.dp).semantics { contentDescription = data.joinToString { "${it.date}: ${it.value}" }; customActions = data.map { day -> CustomAccessibilityAction("Select ${day.date}") { onSelect(day.date); true } } }.pointerInput(data) { detectTapGestures { val week = (it.x / size.width * count).toInt(); val day = (it.y / size.height * 7).toInt(); onSelect(start.plusDays(week * 7 + day)) } }) {
        val cell = min(size.width / count, size.height / 7)
        repeat(count * 7) { index -> val value = values[start.epochDay + index] ?: 0.0; drawRoundRect(if (value == 0.0) track else color.copy(alpha = (.2 + .8 * value / maximum).toFloat()), Offset(index / 7 * cell, index % 7 * cell), Size(cell - 3f, cell - 3f), CornerRadius(2.dp.toPx())) }
    }
}

@Composable
fun FabricatorTreemap(data: List<FabricatorChartDatum>, modifier: Modifier = Modifier, onSelect: (Int) -> Unit = {}) {
    val sum = data.sumOf { max(0.0, it.value) }.coerceAtLeast(.00001)
    val theme = LocalFabricatorTheme.current
    val colors = data.indices.map { theme.chartColor(it) }
    Canvas(modifier.fillMaxWidth().height(240.dp).semantics { contentDescription = data.joinToString { "${it.label}: ${it.value}" }; customActions = data.mapIndexed { index, item -> CustomAccessibilityAction("Select ${item.label}") { onSelect(index); true } } }.pointerInput(data) { detectTapGestures { point -> var x = 0f; var y = 0f; var width = size.width.toFloat(); var height = size.height.toFloat(); var remaining = sum; for ((index, item) in data.withIndex()) { val fraction = (max(0.0, item.value) / remaining).toFloat(); val cellWidth = if (width >= height) width * fraction else width; val cellHeight = if (width < height) height * fraction else height; if (point.x in x..x + cellWidth && point.y in y..y + cellHeight) { onSelect(index); break }; if (width >= height) { x += cellWidth; width -= cellWidth } else { y += cellHeight; height -= cellHeight }; remaining -= max(0.0, item.value) } } }) {
        var origin = Offset.Zero; var bounds = size; var remaining = sum
        data.forEachIndexed { index, item -> val fraction = (max(0.0, item.value) / remaining).toFloat(); val cell = if (bounds.width >= bounds.height) Size(bounds.width * fraction, bounds.height) else Size(bounds.width, bounds.height * fraction); drawRoundRect(colors[index], origin + Offset(2f, 2f), Size(max(0f, cell.width - 4f), max(0f, cell.height - 4f)), CornerRadius(4.dp.toPx())); if (bounds.width >= bounds.height) { origin += Offset(cell.width, 0f); bounds = bounds.copy(width = bounds.width - cell.width) } else { origin += Offset(0f, cell.height); bounds = bounds.copy(height = bounds.height - cell.height) }; remaining -= max(0.0, item.value) }
    }
}

@Composable
fun FabricatorSankeyChart(nodes: List<FabricatorSankeyNode>, links: List<FabricatorSankeyLink>, modifier: Modifier = Modifier) {
    val theme = LocalFabricatorTheme.current
    val colors = nodes.indices.map { theme.chartColor(it) }
    val columns = nodes.groupBy { it.column }
    val maximumColumn = nodes.maxOfOrNull { it.column }?.coerceAtLeast(1) ?: 1
    val maximumValue = links.maxOfOrNull { it.value }?.coerceAtLeast(1.0) ?: 1.0
    Column(modifier) {
        Canvas(Modifier.fillMaxWidth().height(240.dp).semantics { contentDescription = links.joinToString { link -> "${nodes.first { it.id == link.source }.label} to ${nodes.first { it.id == link.target }.label}: ${link.value}" } }) {
            fun position(node: FabricatorSankeyNode): Offset { val column = columns.getValue(node.column); return Offset(12.dp.toPx() + (size.width - 24.dp.toPx()) * node.column / maximumColumn, (column.indexOf(node) + .5f) / column.size * size.height) }
            links.forEach { link -> val source = nodes.firstOrNull { it.id == link.source } ?: return@forEach; val target = nodes.firstOrNull { it.id == link.target } ?: return@forEach; val start = position(source); val end = position(target); val path = Path().apply { moveTo(start.x, start.y); cubicTo((start.x + end.x) / 2, start.y, (start.x + end.x) / 2, end.y, end.x, end.y) }; drawPath(path, colors[nodes.indexOf(source)].copy(alpha = .3f), style = Stroke((link.value / maximumValue * 28).toFloat().dp.toPx(), cap = StrokeCap.Round)) }
            nodes.forEachIndexed { index, node -> val point = position(node); drawRoundRect(colors[index], Offset(point.x - 4.dp.toPx(), point.y - 18.dp.toPx()), Size(8.dp.toPx(), 36.dp.toPx()), CornerRadius(3.dp.toPx())) }
        }
        FabricatorChartLegend(nodes.mapIndexed { index, node -> FabricatorChartSeries(node.id, node.label, emptyList(), colors[index]) })
    }
}
