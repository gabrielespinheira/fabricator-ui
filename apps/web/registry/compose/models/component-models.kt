package dev.fabricator.ui.models

import kotlin.math.abs
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.round

enum class SortDirection { Ascending, Descending }
data class TableSort(val columnId: String, val direction: SortDirection = SortDirection.Ascending)
enum class TablePinSide { Start, End }
data class TableCellEdit(val rowId: String, val columnId: String, val draft: String, val error: String? = null)
data class TableState(
    val query: String = "", val sort: TableSort? = null, val page: Int = 0,
    val pageSize: Int = 10, val selectedIds: Set<String> = emptySet(), val hiddenColumns: Set<String> = emptySet(),
    val columnOrder: List<String> = emptyList(), val pinnedColumns: Map<String, TablePinSide> = emptyMap(),
    val columnWidths: Map<String, Float> = emptyMap(), val columnFilters: Map<String, String> = emptyMap(),
    val showsColumnFilters: Boolean = false, val editing: TableCellEdit? = null,
)
data class TableColumn<T>(
    val id: String, val title: String, val value: (T) -> String,
    val numericValue: ((T) -> Double)? = null, val canSort: Boolean = true,
    val editValue: (T) -> String = value, val update: ((T, String) -> T)? = null,
    val validate: (String) -> String? = { null },
)
data class TableResult<T>(val rows: List<T>, val totalRows: Int, val pageCount: Int, val page: Int)

fun <T> resolveTable(rows: List<T>, state: TableState, columns: List<TableColumn<T>>): TableResult<T> {
    require(state.pageSize > 0)
    val query = state.query.trim().lowercase()
    val filtered = rows.filter { row ->
        (query.isEmpty() || columns.any { it.value(row).lowercase().contains(query) }) &&
            state.columnFilters.all { (id, filter) -> filter.isBlank() || columns.firstOrNull { it.id == id }?.value(row)?.contains(filter.trim(), ignoreCase = true) == true }
    }
    val sort = state.sort
    val column = columns.firstOrNull { it.id == sort?.columnId && it.canSort }
    val sorted = if (sort != null && column != null) {
        filtered.sortedWith { left, right ->
            val number = column.numericValue
            val result = if (number == null) column.value(left).compareTo(column.value(right), ignoreCase = true) else number(left).compareTo(number(right))
            if (sort.direction == SortDirection.Ascending) result else -result
        }
    } else filtered
    val pageCount = max(1, (sorted.size + state.pageSize - 1) / state.pageSize)
    val page = state.page.coerceIn(0, pageCount - 1)
    return TableResult(sorted.drop(page * state.pageSize).take(state.pageSize), sorted.size, pageCount, page)
}
fun toggleTableSelection(state: TableState, id: String): TableState = state.copy(selectedIds = if (id in state.selectedIds) state.selectedIds - id else state.selectedIds + id)
fun cycleTableSort(state: TableState, id: String): TableState = state.copy(page = 0, sort = when {
    state.sort?.columnId != id -> TableSort(id)
    state.sort.direction == SortDirection.Ascending -> TableSort(id, SortDirection.Descending)
    else -> null
})

fun <T> resolveTableColumns(columns: List<TableColumn<T>>, state: TableState): List<TableColumn<T>> {
    val ordered = columns.filterNot { it.id in state.hiddenColumns }.sortedBy { column -> state.columnOrder.indexOf(column.id).let { if (it < 0) state.columnOrder.size + columns.indexOf(column) else it } }
    return ordered.filter { state.pinnedColumns[it.id] == TablePinSide.Start } + ordered.filter { it.id !in state.pinnedColumns } + ordered.filter { state.pinnedColumns[it.id] == TablePinSide.End }
}
fun resizeTableColumn(state: TableState, id: String, width: Float): TableState {
    require(width.isFinite())
    return state.copy(columnWidths = state.columnWidths + (id to width.coerceIn(64f, 480f)))
}
sealed class TableEditResult<out T> {
    data class Updated<T>(val rows: List<T>) : TableEditResult<T>()
    data class Rejected(val message: String) : TableEditResult<Nothing>()
}
fun <T> editTableCell(rows: List<T>, rowId: (T) -> String, id: String, column: TableColumn<T>, value: String): TableEditResult<T> {
    val index = rows.indexOfFirst { rowId(it) == id }
    if (index < 0) return TableEditResult.Rejected("This row no longer exists.")
    val update = column.update ?: return TableEditResult.Rejected("This column is read only.")
    val error = column.validate(value)
    if (error != null) return TableEditResult.Rejected(error)
    return TableEditResult.Updated(rows.mapIndexed { position, row -> if (position == index) update(row, value) else row })
}

data class CivilDate(val year: Int, val month: Int, val day: Int) : Comparable<CivilDate> {
    init { require(year in 1..9999 && month in 1..12 && day in 1..daysInMonth(year, month)) }
    val epochDay: Int get() {
        val adjustedYear = year - if (month <= 2) 1 else 0
        val era = adjustedYear / 400
        val yearOfEra = adjustedYear - era * 400
        val adjustedMonth = month + if (month > 2) -3 else 9
        val dayOfYear = (153 * adjustedMonth + 2) / 5 + day - 1
        return era * 146097 + yearOfEra * 365 + yearOfEra / 4 - yearOfEra / 100 + dayOfYear - 719468
    }
    /** Monday is zero, matching the Fabricator calendar's week origin. */
    val weekday: Int get() = ((epochDay + 3) % 7 + 7) % 7
    override fun compareTo(other: CivilDate): Int = epochDay.compareTo(other.epochDay)
    fun plusDays(count: Int): CivilDate = fromEpochDay(epochDay + count)
    fun plusMonths(count: Int): CivilDate {
        val total = year * 12 + month - 1 + count
        val nextYear = floor(total / 12.0).toInt()
        val nextMonth = total - nextYear * 12 + 1
        return CivilDate(nextYear, nextMonth, min(day, daysInMonth(nextYear, nextMonth)))
    }
    override fun toString(): String = "${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}"
    companion object {
        fun fromEpochDay(epochDay: Int): CivilDate {
            val shifted = epochDay + 719468
            val era = floor(shifted / 146097.0).toInt()
            val dayOfEra = shifted - era * 146097
            val yearOfEra = (dayOfEra - dayOfEra / 1460 + dayOfEra / 36524 - dayOfEra / 146096) / 365
            var year = yearOfEra + era * 400
            val dayOfYear = dayOfEra - (365 * yearOfEra + yearOfEra / 4 - yearOfEra / 100)
            val monthPart = (5 * dayOfYear + 2) / 153
            val day = dayOfYear - (153 * monthPart + 2) / 5 + 1
            val month = monthPart + if (monthPart < 10) 3 else -9
            year += if (month <= 2) 1 else 0
            return CivilDate(year, month, day)
        }
    }
}
fun daysInMonth(year: Int, month: Int): Int = when (month) {
    2 -> if (year % 4 == 0 && (year % 100 != 0 || year % 400 == 0)) 29 else 28
    4, 6, 9, 11 -> 30
    else -> 31
}
fun createCalendarGrid(month: CivilDate): List<CivilDate> {
    val first = month.copy(day = 1)
    val start = first.plusDays(-first.weekday)
    return List(42) { start.plusDays(it) }
}
enum class EventRecurrence { None, Daily, Weekly, Monthly, Yearly }
data class CalendarEvent(
    val id: String, val title: String, val date: CivilDate, val startMinute: Int,
    val durationMinutes: Int = 60, val recurrence: EventRecurrence = EventRecurrence.None,
    val recurrenceEnd: CivilDate? = null, val description: String = "", val colorIndex: Int = 0,
    val timeZoneId: String = "UTC", val recurrenceRule: String? = null,
    val excludedDates: Set<CivilDate> = emptySet(), val recurringEventId: String? = null, val originalDate: CivilDate? = null,
    val color: String = "blue",
) {
    init { require(startMinute in 0..1439 && durationMinutes > 0) }
}
/** Recurrences are local wall-clock events. Conversion to instants belongs to the time-zone adapter. */
fun expandEvent(event: CalendarEvent, from: CivilDate, through: CivilDate, timeZone: CalendarTimeZone = UtcCalendarTimeZone): List<CalendarEvent> = expandCalendarRecurrence(event, from, through, timeZone)
fun parseTime(value: String): Int? {
    val parts = value.split(':')
    if (parts.size != 2) return null
    val hours = parts[0].toIntOrNull() ?: return null
    val minutes = parts[1].toIntOrNull() ?: return null
    return if (hours in 0..23 && minutes in 0..59) hours * 60 + minutes else null
}
fun formatTime(minutes: Int): String = "${(minutes / 60).toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}"
fun stepTime(minutes: Int, step: Int): Int = ((minutes + step) % 1440 + 1440) % 1440
fun stepNumber(value: Double, step: Double, minimum: Double, maximum: Double): Double = (round((value + step) * 1e10) / 1e10).coerceIn(minimum, maximum)

data class FileNode(val id: String, val name: String, val children: List<FileNode>? = null)
data class FileTreeRow(val node: FileNode, val depth: Int)
fun flattenFileTree(nodes: List<FileNode>, expandedIds: Set<String>, query: String = ""): List<FileTreeRow> {
    val normalized = query.trim().lowercase()
    fun matches(node: FileNode): Boolean = node.name.lowercase().contains(normalized) || node.children?.any(::matches) == true
    fun flatten(children: List<FileNode>, depth: Int): List<FileTreeRow> = children.flatMap { node ->
        if (normalized.isNotEmpty() && !matches(node)) emptyList() else {
            val nested = node.children
            listOf(FileTreeRow(node, depth)) + if (nested != null && (node.id in expandedIds || normalized.isNotEmpty())) flatten(nested, depth + 1) else emptyList()
        }
    }
    return flatten(nodes, 0)
}
data class ChartPoint(val x: Float, val y: Float)
data class ChartDomain(val minimum: Double, val maximum: Double) {
    fun normalize(value: Double): Float = ((value - minimum) / (maximum - minimum)).toFloat()
}
fun resolveChartDomain(values: List<Double>, includeZero: Boolean = true): ChartDomain {
    val finite = values.filter { it.isFinite() }
    if (finite.isEmpty()) return ChartDomain(0.0, 1.0)
    var minimum = finite.min()
    var maximum = finite.max()
    if (minimum == maximum) { minimum -= max(abs(minimum) * 0.1, 1.0); maximum += max(abs(maximum) * 0.1, 1.0) }
    if (includeZero) { minimum = min(minimum, 0.0); maximum = max(maximum, 0.0) }
    return ChartDomain(minimum, maximum)
}
fun findNearestPoint(points: List<ChartPoint>, x: Float, y: Float): Int? = points.indices.minByOrNull { index ->
    val point = points[index]
    (point.x - x) * (point.x - x) + (point.y - y) * (point.y - y)
}

sealed class FormRule {
    data object Required : FormRule()
    data object Email : FormRule()
    data class MinimumLength(val length: Int) : FormRule()
    data class Matches(val field: String) : FormRule()
}
data class FormState(val values: Map<String, String> = emptyMap(), val errors: Map<String, String> = emptyMap(), val submitted: Boolean = false) {
    val isValid: Boolean get() = errors.isEmpty()
    fun change(field: String, value: String): FormState = copy(values = values + (field to value), errors = errors - field)
}
fun validateForm(state: FormState, rules: Map<String, List<FormRule>>): FormState {
    val errors = rules.mapNotNull { (field, constraints) ->
        val value = state.values[field].orEmpty()
        val error = constraints.firstNotNullOfOrNull { rule -> when (rule) {
            FormRule.Required -> if (value.isBlank()) "This field is required." else null
            FormRule.Email -> if (!Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$").matches(value)) "Enter a valid email address." else null
            is FormRule.MinimumLength -> if (value.length < rule.length) "Use at least ${rule.length} characters." else null
            is FormRule.Matches -> if (value != state.values[rule.field]) "Values must match." else null
        } }
        error?.let { field to it }
    }.toMap()
    return state.copy(errors = errors, submitted = true)
}
