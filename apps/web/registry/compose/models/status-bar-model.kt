package dev.fabricator.ui

import kotlin.math.floor
import kotlin.math.roundToInt

fun formatFabricatorStatusUptime(uptime: Double?): String {
    if (uptime == null) return "No data"
    val percentage = (uptime * 1000).roundToInt() / 10.0
    return (if (percentage % 1 == 0.0) percentage.toInt().toString() else percentage.toString()) + "% uptime"
}

data class FabricatorStatusPeriod(val id: String, val label: String, val status: String? = null, val note: String? = null)
data class FabricatorStatusDefinition(val label: String, val role: String? = null)
data class FabricatorResolvedStatus(val key: String, val label: String, val role: String, val opacity: Float = 1f)
data class FabricatorStatusPill(val id: String, val index: Int, val x: Float, val width: Float, val radius: Float, val status: FabricatorResolvedStatus)
data class FabricatorStatusBarModel(val pills: List<FabricatorStatusPill>, val first: Int, val gap: Float, val uptime: Double?, val statuses: List<FabricatorResolvedStatus>)
val fabricatorStatusDefinitions: Map<String, FabricatorStatusDefinition> = mapOf("operational" to FabricatorStatusDefinition("Operational", "success"), "degraded" to FabricatorStatusDefinition("Degraded", "warning"), "outage" to FabricatorStatusDefinition("Outage", "destructive"), "maintenance" to FabricatorStatusDefinition("Maintenance", "info"))

fun resolveFabricatorStatusBar(data: List<FabricatorStatusPeriod>, width: Float, definitions: Map<String, FabricatorStatusDefinition> = emptyMap()): FabricatorStatusBarModel {
    require(width.isFinite() && width >= 0)
    if (data.isEmpty()) return FabricatorStatusBarModel(emptyList(), 0, 3f, null, emptyList())
    val configured = fabricatorStatusDefinitions.toMutableMap()
    definitions.forEach { (key, definition) -> configured[key] = definition.copy(role = definition.role ?: configured[key]?.role) }
    val resolved = linkedMapOf<String, FabricatorResolvedStatus>()
    var added = 0
    fun nextColor(): String { val index = added++; return if (index < 8) "chart-series-${index + 1}" else "muted-foreground" }
    configured.forEach { (key, definition) -> if (key != "none") resolved[key] = FabricatorResolvedStatus(key, definition.label, definition.role ?: nextColor()) }
    for (period in data) { val key = period.status?.takeIf(String::isNotBlank) ?: "none"; if (key != "none" && key !in resolved) resolved[key] = FabricatorResolvedStatus(key, key, nextColor()) }
    val empty = definitions["none"]
    resolved["none"] = FabricatorResolvedStatus("none", empty?.label ?: "No data", empty?.role ?: "muted-foreground", if (empty?.role == null) .3f else 1f)
    val count = data.size
    fun pillWidth(gap: Float, shown: Int) = (width - gap * (shown - 1)) / shown
    var gap = if (pillWidth(3f, count) >= 6f) 3f else 2f
    val shown = if (pillWidth(gap, count) >= 4f) count else { gap = 2f; minOf(count, maxOf(1, floor((width + 2) / 6).toInt())) }
    val first = count - shown
    val step = (width + gap) / shown
    val pills = data.drop(first).mapIndexed { position, period ->
        val x = (position * step).roundToInt().toFloat()
        val pill = maxOf(1f, ((position + 1) * step).roundToInt() - gap - x)
        FabricatorStatusPill(period.id, first + position, x, pill, minOf(4f, pill / 2), resolved.getValue(period.status?.takeIf(String::isNotBlank) ?: "none"))
    }
    val observed = pills.filter { it.status.key != "none" }
    val uptime = if (observed.isEmpty()) null else observed.count { it.status.key == "operational" }.toDouble() / observed.size
    val keys = pills.map { it.status.key }.toSet()
    return FabricatorStatusBarModel(pills, first, gap, uptime, resolved.values.filter { it.key in keys })
}
