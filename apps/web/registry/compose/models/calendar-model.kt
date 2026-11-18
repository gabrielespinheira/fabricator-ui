package dev.fabricator.ui.models

import kotlin.math.floor
import kotlin.math.roundToInt

class CalendarRecurrenceError(message: String) : IllegalArgumentException(message)
class CalendarTimeError(message: String) : IllegalArgumentException(message)
enum class CalendarGapPolicy { ShiftForward, Reject }
enum class CalendarOverlapPolicy { Earlier, Later }
data class CalendarWallTime(val date: CivilDate, val minute: Int, val offsetSeconds: Int = 0)
data class CalendarResolvedTime(val date: CivilDate, val minute: Int, val epochMilliseconds: Long, val offsetSeconds: Int, val wasShiftedByGap: Boolean = false)
interface CalendarTimeZone {
    fun resolve(date: CivilDate, minute: Int, zoneId: String, gap: CalendarGapPolicy = CalendarGapPolicy.ShiftForward, overlap: CalendarOverlapPolicy = CalendarOverlapPolicy.Earlier): CalendarResolvedTime
    fun fromInstant(epochMilliseconds: Long, zoneId: String): CalendarWallTime
}
object UtcCalendarTimeZone : CalendarTimeZone {
    override fun resolve(date: CivilDate, minute: Int, zoneId: String, gap: CalendarGapPolicy, overlap: CalendarOverlapPolicy): CalendarResolvedTime {
        if (zoneId != "UTC") throw CalendarTimeError("Provide a time-zone adapter for $zoneId.")
        require(minute in 0..1439)
        return CalendarResolvedTime(date, minute, date.epochDay * 86400000L + minute * 60000L, 0)
    }
    override fun fromInstant(epochMilliseconds: Long, zoneId: String): CalendarWallTime {
        if (zoneId != "UTC") throw CalendarTimeError("Provide a time-zone adapter for $zoneId.")
        val epochDay = floor(epochMilliseconds / 86400000.0).toInt()
        return CalendarWallTime(CivilDate.fromEpochDay(epochDay), ((epochMilliseconds - epochDay * 86400000L) / 60000).toInt())
    }
}
data class CalendarRecurrenceDay(val weekday: Int, val position: Int? = null)
data class CalendarRecurrenceDate(val date: CivilDate, val minute: Int = 0, val second: Int = 0, val dateOnly: Boolean = false, val zoneId: String? = null, val isUtc: Boolean = false)
data class CalendarRecurrenceRule(
    val frequency: EventRecurrence, val interval: Int = 1, val count: Int? = null,
    val until: CalendarRecurrenceDate? = null, val byDay: List<CalendarRecurrenceDay> = emptyList(),
    val byMonthDay: List<Int> = emptyList(), val byMonth: List<Int> = emptyList(), val weekStart: Int = 0,
    val exclusions: List<CalendarRecurrenceDate> = emptyList(),
)
private val calendarWeekdayCodes = listOf("MO", "TU", "WE", "TH", "FR", "SA", "SU")

private fun parseRecurrenceDate(value: String, zoneId: String? = null): CalendarRecurrenceDate {
    val match = Regex("^(\\d{4})(\\d{2})(\\d{2})(?:T(\\d{2})(\\d{2})(\\d{2})(Z)?)?$").matchEntire(value) ?: throw CalendarRecurrenceError("Invalid recurrence date: $value")
    val parts = match.groupValues
    val minute = if (parts[4].isEmpty()) 0 else (parseTime("${parts[4]}:${parts[5]}") ?: throw CalendarRecurrenceError("Invalid recurrence time: $value"))
    val second = parts[6].toIntOrNull() ?: 0
    if (second !in 0..59) throw CalendarRecurrenceError("Invalid recurrence seconds: $value")
    return CalendarRecurrenceDate(CivilDate(parts[1].toInt(), parts[2].toInt(), parts[3].toInt()), minute, second, parts[4].isEmpty(), zoneId, parts[7] == "Z")
}

fun parseEventRecurrence(text: String): CalendarRecurrenceRule {
    val lines = text.lines().filter { it.isNotBlank() }
    val ruleText = lines.firstOrNull { it.startsWith("RRULE:") || it.startsWith("FREQ=") }?.removePrefix("RRULE:") ?: throw CalendarRecurrenceError("A recurrence needs an RRULE.")
    val parts = ruleText.split(';').associate { part -> val split = part.split('=', limit = 2); if (split.size != 2) throw CalendarRecurrenceError("Invalid recurrence field: $part"); split[0].uppercase() to split[1] }
    val unsupported = parts.keys - setOf("FREQ", "INTERVAL", "COUNT", "UNTIL", "BYDAY", "BYMONTHDAY", "BYMONTH", "WKST")
    if (unsupported.isNotEmpty()) throw CalendarRecurrenceError("Unsupported recurrence fields: ${unsupported.joinToString()}")
    fun integer(key: String, default: Int): Int = parts[key]?.toIntOrNull() ?: if (key in parts) throw CalendarRecurrenceError("Invalid $key") else default
    fun integers(key: String): List<Int> = parts[key]?.split(',')?.map { it.toIntOrNull() ?: throw CalendarRecurrenceError("Invalid $key") }.orEmpty()
    fun weekday(value: String): Int = calendarWeekdayCodes.indexOf(value).also { if (it < 0) throw CalendarRecurrenceError("Invalid weekday: $value") }
    val frequency = when (parts["FREQ"]) { "DAILY" -> EventRecurrence.Daily; "WEEKLY" -> EventRecurrence.Weekly; "MONTHLY" -> EventRecurrence.Monthly; "YEARLY" -> EventRecurrence.Yearly; else -> throw CalendarRecurrenceError("Unsupported recurrence frequency") }
    val interval = integer("INTERVAL", 1)
    val count = if ("COUNT" in parts) integer("COUNT", 1) else null
    val monthDays = integers("BYMONTHDAY")
    val months = integers("BYMONTH")
    val days = parts["BYDAY"]?.split(',')?.map { value -> val match = Regex("^([+-]?\\d{1,2})?([A-Z]{2})$").matchEntire(value) ?: throw CalendarRecurrenceError("Invalid BYDAY: $value"); val position = match.groupValues[1].toIntOrNull(); if (position == 0) throw CalendarRecurrenceError("Weekday positions cannot be zero."); CalendarRecurrenceDay(weekday(match.groupValues[2]), position) }.orEmpty()
    if (interval < 1 || count != null && count < 1 || months.any { it !in 1..12 } || monthDays.any { it == 0 || it !in -31..31 }) throw CalendarRecurrenceError("Recurrence values are outside their valid range.")
    val exclusions = mutableListOf<CalendarRecurrenceDate>()
    for (line in lines) {
        if (line == ruleText || line == "RRULE:$ruleText") continue
        if (!line.startsWith("EXDATE")) throw CalendarRecurrenceError("Unsupported recurrence line: $line")
        val prefix = line.substringBefore(':')
        val zoneId = Regex("TZID=([^;:]+)").find(prefix)?.groupValues?.get(1)
        line.substringAfter(':').split(',').forEach { exclusions += parseRecurrenceDate(it, zoneId) }
    }
    return CalendarRecurrenceRule(frequency, interval, count, parts["UNTIL"]?.let(::parseRecurrenceDate), days, monthDays, months, parts["WKST"]?.let(::weekday) ?: 0, exclusions)
}

fun formatEventRecurrence(rule: CalendarRecurrenceRule): String {
    fun basic(date: CalendarRecurrenceDate): String = date.date.toString().replace("-", "") + if (date.dateOnly) "" else "T${formatTime(date.minute).replace(":", "")}${date.second.toString().padStart(2, '0')}${if (date.isUtc) "Z" else ""}"
    val parts = mutableListOf("FREQ=${rule.frequency.name.uppercase()}")
    if (rule.interval > 1) parts += "INTERVAL=${rule.interval}"
    if (rule.byMonth.isNotEmpty()) parts += "BYMONTH=${rule.byMonth.joinToString(",")}"
    if (rule.byMonthDay.isNotEmpty()) parts += "BYMONTHDAY=${rule.byMonthDay.joinToString(",")}"
    if (rule.byDay.isNotEmpty()) parts += "BYDAY=${rule.byDay.joinToString(",") { "${it.position ?: ""}${calendarWeekdayCodes[it.weekday]}" }}"
    if (rule.count != null) parts += "COUNT=${rule.count}"
    if (rule.until != null) parts += "UNTIL=${basic(rule.until)}"
    if (rule.weekStart != 0) parts += "WKST=${calendarWeekdayCodes[rule.weekStart]}"
    val lines = mutableListOf("RRULE:${parts.joinToString(";")}")
    rule.exclusions.groupBy { when { it.zoneId != null -> "EXDATE;TZID=${it.zoneId}"; it.dateOnly -> "EXDATE;VALUE=DATE"; else -> "EXDATE" } }.forEach { (prefix, values) -> lines += "$prefix:${values.joinToString(",", transform = ::basic)}" }
    return lines.joinToString("\n")
}

private fun matchesRecurrenceDate(date: CivilDate, anchor: CivilDate, rule: CalendarRecurrenceRule): Boolean {
    if (rule.byMonth.isNotEmpty() && date.month !in rule.byMonth) return false
    val dayInMonth = rule.byMonthDay.isEmpty() || rule.byMonthDay.any { if (it > 0) date.day == it else date.day == daysInMonth(date.year, date.month) + it + 1 }
    fun matchesDay(): Boolean = rule.byDay.any { day -> date.weekday == day.weekday && when { day.position == null -> true; day.position > 0 -> (date.day - 1) / 7 + 1 == day.position; else -> (daysInMonth(date.year, date.month) - date.day) / 7 + 1 == -day.position } }
    return when (rule.frequency) {
        EventRecurrence.Daily -> (date.epochDay - anchor.epochDay) % rule.interval == 0 && dayInMonth && (rule.byDay.isEmpty() || rule.byDay.any { it.weekday == date.weekday })
        EventRecurrence.Weekly -> {
            val week = anchor.plusDays(-((anchor.weekday - rule.weekStart + 7) % 7))
            (date.epochDay - week.epochDay) / 7 % rule.interval == 0 && (if (rule.byDay.isEmpty()) date.weekday == anchor.weekday else rule.byDay.any { it.weekday == date.weekday })
        }
        EventRecurrence.Monthly -> ((date.year - anchor.year) * 12 + date.month - anchor.month) % rule.interval == 0 && when { rule.byMonthDay.isNotEmpty() -> dayInMonth; rule.byDay.isNotEmpty() -> matchesDay(); else -> date.day == anchor.day }
        EventRecurrence.Yearly -> (date.year - anchor.year) % rule.interval == 0 && (rule.byMonth.isNotEmpty() || date.month == anchor.month) && when { rule.byMonthDay.isNotEmpty() -> dayInMonth; rule.byDay.isNotEmpty() -> matchesDay(); else -> date.day == anchor.day }
        EventRecurrence.None -> date == anchor
    }
}

fun expandCalendarRecurrence(event: CalendarEvent, from: CivilDate, through: CivilDate, timeZone: CalendarTimeZone = UtcCalendarTimeZone): List<CalendarEvent> {
    require(from <= through)
    val end = minOf(through, event.recurrenceEnd ?: through)
    if (event.date > end) return emptyList()
    val rule = event.recurrenceRule?.let(::parseEventRecurrence) ?: CalendarRecurrenceRule(event.recurrence)
    val rangeStart = timeZone.resolve(from, 0, event.timeZoneId).epochMilliseconds
    val rangeEnd = timeZone.resolve(through, 1439, event.timeZoneId).epochMilliseconds + 60000
    if (rule.frequency == EventRecurrence.None) {
        val start = timeZone.resolve(event.date, event.startMinute, event.timeZoneId).epochMilliseconds
        return if (start < rangeEnd && start + event.durationMinutes * 60000L > rangeStart && event.date !in event.excludedDates) listOf(event) else emptyList()
    }
    val occurrences = mutableListOf<CalendarEvent>()
    var index = 0
    var day = if (rule.count == null) CivilDate.fromEpochDay(maxOf(event.date.epochDay, from.epochDay - (event.durationMinutes + 1439) / 1440 - 1)) else event.date
    while (day <= end) {
        if (matchesRecurrenceDate(day, event.date, rule)) {
            if (rule.count != null && index >= rule.count) break
            val start = timeZone.resolve(day, event.startMinute, event.timeZoneId)
            val until = rule.until
            if (until != null && (if (until.dateOnly) day > until.date else start.epochMilliseconds > timeZone.resolve(until.date, until.minute, if (until.isUtc) "UTC" else until.zoneId ?: event.timeZoneId).epochMilliseconds + until.second * 1000)) break
            index += 1
            val excluded = day in event.excludedDates || rule.exclusions.any { exclusion -> if (exclusion.dateOnly) day == exclusion.date else start.epochMilliseconds == timeZone.resolve(exclusion.date, exclusion.minute, if (exclusion.isUtc) "UTC" else exclusion.zoneId ?: event.timeZoneId).epochMilliseconds + exclusion.second * 1000 }
            if (!excluded && start.epochMilliseconds < rangeEnd && start.epochMilliseconds + event.durationMinutes * 60000L > rangeStart) occurrences += event.copy(id = "${event.id}::$day", date = day, recurringEventId = event.id, originalDate = day)
        }
        if (day == end) break
        day = day.plusDays(1)
    }
    return occurrences
}

fun expandCalendarEvents(events: List<CalendarEvent>, from: CivilDate, through: CivilDate, timeZone: CalendarTimeZone = UtcCalendarTimeZone): List<CalendarEvent> {
    val detached = events.filter { it.recurringEventId != null }
    val replacements = detached.mapNotNull { event -> event.originalDate?.let { "${event.recurringEventId}::$it" } }.toSet()
    return (events.filter { it.recurringEventId == null }.flatMap { expandEvent(it, from, through, timeZone) }.filterNot { it.id in replacements } + detached.flatMap { expandEvent(it, from, through, timeZone) }).sortedWith(compareBy({ it.date }, { it.startMinute }, { -it.durationMinutes }))
}

fun moveCalendarEvent(event: CalendarEvent, dayDelta: Int, minuteDelta: Int, snapMinutes: Int = 15): CalendarEvent {
    require(snapMinutes > 0)
    val total = ((event.startMinute + minuteDelta).toDouble() / snapMinutes).roundToInt() * snapMinutes
    val day = floor(total / 1440.0).toInt()
    return event.copy(date = event.date.plusDays(dayDelta + day), startMinute = total - day * 1440)
}
fun resizeCalendarEvent(event: CalendarEvent, deltaMinutes: Int, snapMinutes: Int = 5): CalendarEvent {
    require(snapMinutes > 0)
    return event.copy(durationMinutes = maxOf(snapMinutes, ((event.durationMinutes + deltaMinutes).toDouble() / snapMinutes).roundToInt() * snapMinutes))
}
enum class CalendarRecurrenceScope { This, ThisAndFollowing, All }
sealed class CalendarCommand {
    data class Add(val event: CalendarEvent) : CalendarCommand()
    data class Update(val event: CalendarEvent) : CalendarCommand()
    data class Delete(val id: String) : CalendarCommand()
    data class EditOccurrence(val seriesId: String, val originalDate: CivilDate, val event: CalendarEvent, val scope: CalendarRecurrenceScope) : CalendarCommand()
    data class DeleteOccurrence(val seriesId: String, val originalDate: CivilDate, val scope: CalendarRecurrenceScope) : CalendarCommand()
}
fun applyCalendarCommand(events: List<CalendarEvent>, command: CalendarCommand): List<CalendarEvent> = when (command) {
    is CalendarCommand.Add -> { require(events.none { it.id == command.event.id }); events + command.event }
    is CalendarCommand.Update -> { require(events.any { it.id == command.event.id }); events.map { if (it.id == command.event.id) command.event else it } }
    is CalendarCommand.Delete -> events.filterNot { it.id == command.id || it.recurringEventId == command.id }
    is CalendarCommand.EditOccurrence -> {
        val series = events.firstOrNull { it.id == command.seriesId } ?: throw CalendarRecurrenceError("The recurring series no longer exists.")
        when (command.scope) {
            CalendarRecurrenceScope.All -> events.map { if (it.id == series.id) command.event.copy(id = series.id, date = series.date.plusDays(command.event.date.epochDay - command.originalDate.epochDay)) else it }
            CalendarRecurrenceScope.This -> {
                val detachedId = "${series.id}::${command.originalDate}"
                events.filterNot { it.id == detachedId }.map { if (it.id == series.id) it.copy(excludedDates = it.excludedDates + command.originalDate) else it } + command.event.copy(id = detachedId, recurrence = EventRecurrence.None, recurrenceRule = null, recurringEventId = series.id, originalDate = command.originalDate)
            }
            CalendarRecurrenceScope.ThisAndFollowing -> {
                val newId = "${series.id}::following:${command.originalDate}"
                val rule = series.recurrenceRule?.let(::parseEventRecurrence)
                var before = 0
                if (rule?.count != null) { var day = series.date; while (day < command.originalDate) { if (matchesRecurrenceDate(day, series.date, rule)) before += 1; day = day.plusDays(1) } }
                val nextRule = if (rule?.count != null) formatEventRecurrence(rule.copy(count = maxOf(1, rule.count - before))) else series.recurrenceRule
                if (command.originalDate <= series.date) events.map { if (it.id == series.id) command.event.copy(id = series.id, recurringEventId = null, originalDate = null) else it }
                else events.map { when { it.id == series.id -> it.copy(recurrenceEnd = command.originalDate.plusDays(-1)); it.recurringEventId == series.id && it.originalDate?.let { date -> date >= command.originalDate } == true -> it.copy(id = "$newId::${it.originalDate}", recurringEventId = newId); else -> it } } + command.event.copy(id = newId, recurrenceRule = nextRule, recurringEventId = null, originalDate = null)
            }
        }
    }
    is CalendarCommand.DeleteOccurrence -> {
        val series = events.firstOrNull { it.id == command.seriesId } ?: throw CalendarRecurrenceError("The recurring series no longer exists.")
        when {
            command.scope == CalendarRecurrenceScope.All || command.scope == CalendarRecurrenceScope.ThisAndFollowing && command.originalDate <= series.date -> events.filterNot { it.id == series.id || it.recurringEventId == series.id }
            command.scope == CalendarRecurrenceScope.This -> events.filterNot { it.recurringEventId == series.id && it.originalDate == command.originalDate }.map { if (it.id == series.id) it.copy(excludedDates = it.excludedDates + command.originalDate) else it }
            else -> events.filterNot { it.recurringEventId == series.id && it.originalDate?.let { date -> date >= command.originalDate } == true }.map { if (it.id == series.id) it.copy(recurrenceEnd = command.originalDate.plusDays(-1)) else it }
        }
    }
}

data class CalendarDisplayEvent(val event: CalendarEvent, val start: CalendarWallTime, val end: CalendarWallTime)
data class CalendarEventPlacement(val event: CalendarDisplayEvent, val startMinute: Int, val endMinute: Int, val lane: Int, val laneCount: Int = 1)
fun projectCalendarEvent(event: CalendarEvent, displayTimeZoneId: String, timeZone: CalendarTimeZone): CalendarDisplayEvent {
    val start = timeZone.resolve(event.date, event.startMinute, event.timeZoneId).epochMilliseconds
    return CalendarDisplayEvent(event, timeZone.fromInstant(start, displayTimeZoneId), timeZone.fromInstant(start + event.durationMinutes * 60000L, displayTimeZoneId))
}
fun moveCalendarDisplayEvent(event: CalendarDisplayEvent, displayTimeZoneId: String, dayDelta: Int, minuteDelta: Int, timeZone: CalendarTimeZone): CalendarEvent {
    val moved = moveCalendarEvent(event.event.copy(date = event.start.date, startMinute = event.start.minute), dayDelta, minuteDelta)
    val start = timeZone.resolve(moved.date, moved.startMinute, displayTimeZoneId).epochMilliseconds
    val source = timeZone.fromInstant(start, event.event.timeZoneId)
    return event.event.copy(date = source.date, startMinute = source.minute)
}
fun layoutCalendarDay(events: List<CalendarDisplayEvent>, day: CivilDate): List<CalendarEventPlacement> {
    val segments = events.mapNotNull { event ->
        val start = (event.start.date.epochDay - day.epochDay) * 1440 + event.start.minute
        val wallEnd = (event.end.date.epochDay - day.epochDay) * 1440 + event.end.minute
        val end = if (wallEnd > start) wallEnd else start + event.event.durationMinutes
        if (end <= 0 || start >= 1440) null else CalendarEventPlacement(event, start.coerceAtLeast(0), end.coerceAtMost(1440), 0)
    }.sortedWith(compareBy({ it.startMinute }, { -it.endMinute }, { it.event.event.id }))
    val output = mutableListOf<CalendarEventPlacement>()
    val group = mutableListOf<CalendarEventPlacement>()
    val laneEnds = mutableListOf<Int>()
    var groupEnd = -1
    fun flush() { val count = laneEnds.size; output += group.map { it.copy(laneCount = count) }; group.clear(); laneEnds.clear() }
    for (segment in segments) {
        if (group.isNotEmpty() && segment.startMinute >= groupEnd) flush()
        val available = laneEnds.indexOfFirst { it <= segment.startMinute }
        val lane = if (available < 0) laneEnds.size else available
        if (available < 0) laneEnds += segment.endMinute else laneEnds[lane] = segment.endMinute
        group += segment.copy(lane = lane)
        groupEnd = if (group.size == 1) segment.endMinute else maxOf(groupEnd, segment.endMinute)
    }
    flush()
    return output
}
data class CalendarHistory(val events: List<CalendarEvent>, val past: List<List<CalendarEvent>> = emptyList(), val future: List<List<CalendarEvent>> = emptyList()) {
    fun apply(command: CalendarCommand): CalendarHistory { val next = applyCalendarCommand(events, command); return if (next == events) this else CalendarHistory(next, (past + listOf(events)).takeLast(100)) }
    fun replace(next: List<CalendarEvent>): CalendarHistory = if (next == events) this else CalendarHistory(next, (past + listOf(events)).takeLast(100))
    fun undo(): CalendarHistory = if (past.isEmpty()) this else CalendarHistory(past.last(), past.dropLast(1), listOf(events) + future)
    fun redo(): CalendarHistory = if (future.isEmpty()) this else CalendarHistory(future.first(), past + listOf(events), future.drop(1))
}
