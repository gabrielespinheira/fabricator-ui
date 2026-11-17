package dev.fabricator.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.hoverable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.input.key.*
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import dev.fabricator.ui.models.*
import dev.fabricator.ui.generated.FabricatorGenerated
import kotlin.math.roundToInt

enum class FabricatorCalendarView { Month, Week, Day, Agenda }

@Composable
fun FabricatorEventCalendar(events: List<CalendarEvent>, onEventsChange: (List<CalendarEvent>) -> Unit, modifier: Modifier = Modifier, initialDate: CivilDate = getFabricatorToday(), initialTimeZoneId: String = "UTC") {
    var history by remember { mutableStateOf(CalendarHistory(events)) }
    SideEffect { if (events != history.events) history = history.replace(events) }
    val zones = remember { getFabricatorCalendarTimeZone() }
    val timeZoneOptions = remember { getFabricatorCalendarTimeZoneIds().map { FabricatorOption(it, it) } }
    var displayTimeZone by remember(initialTimeZoneId) { mutableStateOf(initialTimeZoneId) }
    var date by remember { mutableStateOf(initialDate) }
    var view by remember { mutableStateOf(FabricatorCalendarView.Month) }
    var editing by remember { mutableStateOf<CalendarEvent?>(null) }
    var title by remember { mutableStateOf("") }
    var eventDate by remember { mutableStateOf(date) }
    var startMinute by remember { mutableIntStateOf(540) }
    var duration by remember { mutableDoubleStateOf(60.0) }
    var recurrence by remember { mutableStateOf(EventRecurrence.None) }
    var recurrenceText by remember { mutableStateOf("") }
    var timeZone by remember { mutableStateOf("UTC") }
    var scope by remember { mutableStateOf(CalendarRecurrenceScope.This) }
    var description by remember { mutableStateOf("") }
    var color by remember { mutableStateOf("blue") }
    var error by remember { mutableStateOf<String?>(null) }
    var serial by remember { mutableIntStateOf(events.size) }
    val from = when (view) { FabricatorCalendarView.Month -> createCalendarGrid(date).first(); FabricatorCalendarView.Week -> date.plusDays(-date.weekday); else -> date }
    val through = when (view) { FabricatorCalendarView.Month -> from.plusDays(41); FabricatorCalendarView.Week -> from.plusDays(6); FabricatorCalendarView.Day -> date; FabricatorCalendarView.Agenda -> date.plusDays(30) }
    val occurrences = remember(history.events, from, through, displayTimeZone) {
        val paddedStart = CivilDate.fromEpochDay(maxOf(CivilDate(1, 1, 1).epochDay, from.epochDay - 2))
        val paddedEnd = CivilDate.fromEpochDay(minOf(CivilDate(9999, 12, 31).epochDay, through.epochDay + 2))
        expandCalendarEvents(history.events, paddedStart, paddedEnd, zones).map { projectCalendarEvent(it, displayTimeZone, zones) }.filter { it.start.date <= through && it.end.date >= from }
    }
    fun commit(next: CalendarHistory) { history = next; onEventsChange(next.events) }
    fun edit(event: CalendarEvent) { editing = event; title = event.title; eventDate = event.date; startMinute = event.startMinute; duration = event.durationMinutes.toDouble(); recurrence = event.recurrence; recurrenceText = event.recurrenceRule.orEmpty(); timeZone = event.timeZoneId; description = event.description; color = event.color; scope = CalendarRecurrenceScope.This; error = null }
    fun create(day: CivilDate = date, minute: Int = 540) { do { serial += 1 } while (history.events.any { it.id == "event:$serial" }); edit(CalendarEvent("event:$serial", "", day, minute, timeZoneId = displayTimeZone)) }
    fun move(event: CalendarDisplayEvent, days: Int, minutes: Int) { val moved = moveCalendarDisplayEvent(event, displayTimeZone, days, minutes, zones); if (moved.recurringEventId != null) edit(moved) else commit(history.apply(CalendarCommand.Update(moved))) }
    fun resize(event: CalendarDisplayEvent, minutes: Int) { val resized = resizeCalendarEvent(event.event, minutes); if (resized.recurringEventId != null) edit(resized) else commit(history.apply(CalendarCommand.Update(resized))) }
    fun save() {
        val original = editing ?: return
        try {
            if (recurrenceText.isNotBlank()) parseEventRecurrence(recurrenceText)
            zones.resolve(eventDate, startMinute, timeZone)
            val updated = original.copy(title = title, date = eventDate, startMinute = startMinute, durationMinutes = duration.toInt(), recurrence = recurrence, recurrenceRule = recurrenceText.takeIf(String::isNotBlank), timeZoneId = timeZone, description = description, color = color)
            val command = when { original.recurringEventId != null -> CalendarCommand.EditOccurrence(original.recurringEventId, original.originalDate ?: original.date, updated, scope); history.events.any { it.id == original.id } -> CalendarCommand.Update(updated); else -> CalendarCommand.Add(updated) }
            commit(history.apply(command))
            editing = null
        } catch (invalid: CalendarRecurrenceError) { error = invalid.message } catch (invalid: CalendarTimeError) { error = invalid.message }
    }
    Column(modifier, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        FlowRow(verticalArrangement = Arrangement.Center) {
            FabricatorButton("Previous", { date = if (view == FabricatorCalendarView.Month) date.plusMonths(-1) else date.plusDays(if (view == FabricatorCalendarView.Week) -7 else -1) }, variant = FabricatorVariant.Outline)
            FabricatorButton("${date.year}-${date.month}", { date = initialDate }, variant = FabricatorVariant.Ghost)
            FabricatorButton("Next", { date = if (view == FabricatorCalendarView.Month) date.plusMonths(1) else date.plusDays(if (view == FabricatorCalendarView.Week) 7 else 1) }, variant = FabricatorVariant.Outline)
            FabricatorSelect(view.name, { view = FabricatorCalendarView.valueOf(it) }, FabricatorCalendarView.entries.map { FabricatorOption(it.name, it.name) }, Modifier.width(140.dp))
            FabricatorCombobox(displayTimeZone, { displayTimeZone = it }, timeZoneOptions, Modifier.width(220.dp).semantics { contentDescription = "Display time zone" }, "Time zone")
            FabricatorButton("Add event", { create() })
            FabricatorButton("Undo", { commit(history.undo()) }, variant = FabricatorVariant.Ghost, enabled = history.past.isNotEmpty())
            FabricatorButton("Redo", { commit(history.redo()) }, variant = FabricatorVariant.Ghost, enabled = history.future.isNotEmpty())
        }
        when (view) {
            FabricatorCalendarView.Month -> {
                CalendarMonthGrid(date, occurrences, { date = it }, ::edit)
                CalendarAgenda(layoutCalendarDay(occurrences, date).map { it.event }, ::edit)
            }
            FabricatorCalendarView.Week -> CalendarTimeGrid((0..6).map { from.plusDays(it) }, occurrences, ::edit, ::create, ::move, ::resize)
            FabricatorCalendarView.Day -> CalendarTimeGrid(listOf(date), occurrences, ::edit, ::create, ::move, ::resize)
            FabricatorCalendarView.Agenda -> CalendarAgenda(occurrences, ::edit)
        }
    }
    FabricatorDialog(editing != null, { editing = null }, if (history.events.any { it.id == editing?.id } || editing?.recurringEventId != null) "Edit event" else "New event") {
        Column(Modifier.heightIn(max = 500.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            FabricatorField("Title", required = true) { FabricatorInput(title, { title = it }) }
            FabricatorField("Date") { FabricatorDatePicker(eventDate, { eventDate = it }) }
            FabricatorField("Time") { FabricatorTimeInput(startMinute, { startMinute = it }) }
            FabricatorField("Duration in minutes") { FabricatorNumberField(duration, { duration = it }, minimum = 5.0, maximum = 1440.0, step = 5.0) }
            FabricatorField("Time zone") { FabricatorInput(timeZone, { timeZone = it }, placeholder = "Europe/Lisbon") }
            FabricatorField("Color") { FabricatorSelect(color, { color = it }, FabricatorGenerated.calendarColors.map { FabricatorOption(it, it.replaceFirstChar { letter -> letter.uppercase() }) }) }
            FabricatorField("Repeats") { FabricatorSelect(recurrence.name, { recurrence = EventRecurrence.valueOf(it); recurrenceText = "" }, EventRecurrence.entries.map { FabricatorOption(it.name, it.name) }) }
            FabricatorField("Recurrence rule", description = "Optional RRULE and EXDATE lines.") { FabricatorTextarea(recurrenceText, { recurrenceText = it }) }
            if (editing?.recurringEventId != null) FabricatorField("Apply changes to") { FabricatorSelect(scope.name, { scope = CalendarRecurrenceScope.valueOf(it) }, CalendarRecurrenceScope.entries.map { FabricatorOption(it.name, when (it) { CalendarRecurrenceScope.This -> "This event"; CalendarRecurrenceScope.ThisAndFollowing -> "This and following"; CalendarRecurrenceScope.All -> "All events" }) }) }
            FabricatorField("Description") { FabricatorTextarea(description, { description = it }) }
            if (error != null) FabricatorAlert("Unable to save event", error, role = FabricatorRole.Destructive)
            Row {
                if (history.events.any { it.id == editing?.id } || editing?.recurringEventId != null) FabricatorButton("Delete", { editing?.let { event -> val command = event.recurringEventId?.let { CalendarCommand.DeleteOccurrence(it, event.originalDate ?: event.date, scope) } ?: CalendarCommand.Delete(event.id); commit(history.apply(command)) }; editing = null }, variant = FabricatorVariant.Destructive)
                FabricatorButton("Save event", ::save, enabled = title.isNotBlank())
            }
        }
    }
}

@Composable
private fun CalendarMonthGrid(month: CivilDate, events: List<CalendarDisplayEvent>, onSelectDate: (CivilDate) -> Unit, onSelectEvent: (CalendarEvent) -> Unit) {
    val theme = LocalFabricatorTheme.current
    Column {
        Row { listOf("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun").forEach { FabricatorText(it, Modifier.weight(1f).padding(4.dp), muted = true, size = 11) } }
        createCalendarGrid(month).chunked(7).forEach { week -> Row { week.forEach { day ->
            Column(Modifier.weight(1f).heightIn(min = 94.dp).background(if (day == month) theme.color("accent") else Color.Transparent).clickable { onSelectDate(day) }.padding(3.dp)) {
                FabricatorText(day.day.toString(), muted = day.month != month.month, size = 11)
                val dayEvents = layoutCalendarDay(events, day).map { it.event }
                dayEvents.take(2).forEach { event -> CalendarMonthChip(event, onSelectEvent) }
                if (dayEvents.size > 2) FabricatorText("+${dayEvents.size - 2} more", muted = true, size = 11)
            }
        } }; FabricatorSeparator() }
    }
}

@Composable
private fun CalendarAgenda(events: List<CalendarDisplayEvent>, onSelect: (CalendarEvent) -> Unit) {
    if (events.isEmpty()) { FabricatorEmpty("No events", "Choose another day or add an event.", icon = "calendar"); return }
    val theme = LocalFabricatorTheme.current
    events.groupBy { it.start.date }.forEach { (date, entries) -> FabricatorText(date.toString(), weight = FontWeight.SemiBold, size = 12); entries.forEach { event -> FabricatorItem(event.event.title, description = "${formatTime(event.start.minute)}–${formatTime(event.end.minute)} · UTC${if (event.start.offsetSeconds >= 0) "+" else "−"}${formatTime(kotlin.math.abs(event.start.offsetSeconds) / 60)}", leading = { Box(Modifier.size(8.dp).background(theme.color("calendar-color-${event.event.color}"), RoundedCornerShape(4.dp))) }, onClick = { onSelect(event.event) }) } }
}

private data class CalendarChipColors(val fill: Color, val background: Color, val text: Color)

private fun calendarChipColors(theme: FabricatorThemeValues, event: CalendarEvent, isSolid: Boolean, isHovered: Boolean): CalendarChipColors {
    require(event.color in FabricatorGenerated.calendarColors) { "Unsupported calendar color: ${event.color}" }
    val fill = theme.color("calendar-color-${event.color}")
    if (isSolid) return CalendarChipColors(fill, fill, theme.color("calendar-color-${event.color}-foreground"))
    val start = getFabricatorCalendarTimeZone().resolve(event.date, event.startMinute, event.timeZoneId).epochMilliseconds
    val isPast = start + event.durationMinutes * 60000L < getFabricatorNowEpochMilliseconds()
    val wash = FabricatorGenerated.calendarChipWash.getValue(if (theme.isDark) "dark" else "light").getValue(if (isPast) "past" else if (isHovered) "hover" else "rest")
    return CalendarChipColors(fill, fill.copy(alpha = fill.alpha * wash), theme.color("calendar-color-${event.color}-text"))
}

@Composable
private fun CalendarMonthChip(event: CalendarDisplayEvent, onSelect: (CalendarEvent) -> Unit) {
    val theme = LocalFabricatorTheme.current
    val interactions = remember { MutableInteractionSource() }
    val hovered by interactions.collectIsHoveredAsState()
    val colors = calendarChipColors(theme, event.event, false, hovered)
    Box(Modifier.fillMaxWidth().padding(top = 3.dp).background(colors.background, RoundedCornerShape(theme.radius("sm"))).hoverable(interactions).clickable(interactionSource = interactions, indication = null) { onSelect(event.event) }.padding(3.dp).semantics { contentDescription = "${event.event.title}, ${formatTime(event.start.minute)}" }) { FabricatorText(event.event.title, color = colors.text, size = 11, maxLines = 1) }
}

@Composable
private fun CalendarTimeGrid(days: List<CivilDate>, events: List<CalendarDisplayEvent>, onSelect: (CalendarEvent) -> Unit, onCreate: (CivilDate, Int) -> Unit, onMove: (CalendarDisplayEvent, Int, Int) -> Unit, onResize: (CalendarDisplayEvent, Int) -> Unit) {
    val theme = LocalFabricatorTheme.current
    val density = LocalDensity.current
    Column(Modifier.height(560.dp).verticalScroll(rememberScrollState())) {
        Row { Spacer(Modifier.width(44.dp)); days.forEach { day -> FabricatorText("${day.month}/${day.day}", Modifier.weight(1f), muted = true, size = 11) } }
        Box(Modifier.fillMaxWidth().height(56.dp * 24)) {
            Column { repeat(24) { hour -> Row(Modifier.height(56.dp), verticalAlignment = Alignment.Top) { FabricatorText("${hour.toString().padStart(2, '0')}:00", Modifier.width(44.dp), muted = true, size = 11); Column { FabricatorSeparator(); Spacer(Modifier.weight(1f)) } } } }
            Row(Modifier.fillMaxSize().padding(start = 44.dp)) { days.forEach { day ->
                BoxWithConstraints(Modifier.weight(1f).fillMaxHeight()) {
                    val width = maxWidth
                    val dayPixels = with(density) { width.toPx() }
                    Column { repeat(48) { halfHour -> Box(Modifier.fillMaxWidth().height(28.dp).clickable { onCreate(day, halfHour * 30) }) } }
                    layoutCalendarDay(events, day).forEach { placement -> key(placement.event.event.id) {
                        CalendarEventTile(placement, width / placement.laneCount, dayPixels, onSelect, onMove, onResize)
                    } }
                }
            } }
        }
    }
}

@Composable
private fun CalendarEventTile(placement: CalendarEventPlacement, laneWidth: androidx.compose.ui.unit.Dp, dayWidthPixels: Float, onSelect: (CalendarEvent) -> Unit, onMove: (CalendarDisplayEvent, Int, Int) -> Unit, onResize: (CalendarDisplayEvent, Int) -> Unit) {
    val theme = LocalFabricatorTheme.current
    val density = LocalDensity.current
    val minutePixels = with(density) { 56.dp.toPx() } / 60
    var dragX by remember { mutableFloatStateOf(0f) }
    var dragY by remember { mutableFloatStateOf(0f) }
    var resizeY by remember { mutableFloatStateOf(0f) }
    var focused by remember { mutableStateOf(false) }
    val interactions = remember { MutableInteractionSource() }
    val hovered by interactions.collectIsHoveredAsState()
    val latest by rememberUpdatedState(placement.event)
    val move by rememberUpdatedState(onMove)
    val resize by rememberUpdatedState(onResize)
    val x = laneWidth * placement.lane + with(density) { dragX.toDp() }
    val y = (placement.startMinute / 60f * 56).dp + with(density) { dragY.toDp() }
    val height = maxOf(28.dp, ((placement.endMinute - placement.startMinute) / 60f * 56).dp + with(density) { resizeY.toDp() })
    val colors = calendarChipColors(theme, latest.event, focused || dragX != 0f || dragY != 0f || resizeY != 0f, hovered)
    Box(Modifier.offset(x, y).width(laneWidth).height(height).padding(horizontal = 2.dp)
        .background(colors.background, RoundedCornerShape(theme.radius("sm")))
        .border(if (focused) 1.dp else 0.dp, if (focused) theme.color("ring") else Color.Transparent, RoundedCornerShape(theme.radius("sm")))
        .onFocusChanged { focused = it.isFocused }
        .onPreviewKeyEvent { event ->
            if (event.type != KeyEventType.KeyDown) false else when (event.key) {
                Key.DirectionUp -> { if (event.isShiftPressed) resize(latest, -15) else move(latest, 0, -15); true }
                Key.DirectionDown -> { if (event.isShiftPressed) resize(latest, 15) else move(latest, 0, 15); true }
                Key.DirectionLeft -> { move(latest, -1, 0); true }
                Key.DirectionRight -> { move(latest, 1, 0); true }
                else -> false
            }
        }
        .hoverable(interactions)
        .clickable(interactionSource = interactions, indication = null, role = Role.Button) { onSelect(latest.event) }
        .pointerInput(dayWidthPixels, minutePixels) {
            detectDragGestures(onDragEnd = {
                val days = (dragX / dayWidthPixels).roundToInt()
                val minutes = (dragY / minutePixels).roundToInt()
                dragX = 0f; dragY = 0f
                if (days != 0 || minutes != 0) move(latest, days, minutes)
            }, onDragCancel = { dragX = 0f; dragY = 0f }) { pointer, delta -> pointer.consume(); dragX += delta.x; dragY += delta.y }
        }
        .semantics {
            contentDescription = "${latest.event.title}, ${formatTime(latest.start.minute)} to ${formatTime(latest.end.minute)}"
            customActions = listOf(CustomAccessibilityAction("Move 15 minutes earlier") { move(latest, 0, -15); true }, CustomAccessibilityAction("Move 15 minutes later") { move(latest, 0, 15); true }, CustomAccessibilityAction("Increase duration by 15 minutes") { resize(latest, 15); true }, CustomAccessibilityAction("Decrease duration by 15 minutes") { resize(latest, -15); true })
        }) {
        Box(Modifier.align(Alignment.CenterStart).width(3.dp).fillMaxHeight().background(colors.fill, RoundedCornerShape(theme.radius("sm"))))
        Column(Modifier.padding(4.dp)) { FabricatorText(latest.event.title, color = colors.text, size = 11, weight = FontWeight.Medium, maxLines = 1); if (placement.endMinute - placement.startMinute >= 45) FabricatorText(formatTime(latest.start.minute), color = colors.text, size = 11) }
        Box(Modifier.align(Alignment.BottomCenter).width(24.dp).height(12.dp).pointerInput(minutePixels) {
            detectDragGestures(onDragEnd = { val minutes = (resizeY / minutePixels).roundToInt(); resizeY = 0f; if (minutes != 0) resize(latest, minutes) }, onDragCancel = { resizeY = 0f }) { pointer, delta -> pointer.consume(); resizeY += delta.y }
        }, contentAlignment = Alignment.Center) { Box(Modifier.width(16.dp).height(2.dp).background(colors.text, RoundedCornerShape(1.dp))) }
    }
}
