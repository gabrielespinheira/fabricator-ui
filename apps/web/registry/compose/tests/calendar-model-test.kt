package dev.fabricator.ui.models

import dev.fabricator.ui.getFabricatorCalendarTimeZone
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class CalendarModelTest {
    @Test fun monthlyRulesSkipMissingMonthDaysAndSupportPositionedWeekdays() {
        val monthEnd = CalendarEvent("billing", "Billing", CivilDate(2026, 1, 31), 540, recurrenceRule = "RRULE:FREQ=MONTHLY;COUNT=3")
        assertEquals(listOf(CivilDate(2026, 1, 31), CivilDate(2026, 3, 31), CivilDate(2026, 5, 31)), expandEvent(monthEnd, CivilDate(2026, 1, 1), CivilDate(2026, 6, 1)).map { it.date })
        val review = monthEnd.copy(date = CivilDate(2026, 11, 1), recurrenceRule = "RRULE:FREQ=MONTHLY;BYDAY=-1FR;COUNT=3")
        assertEquals(listOf(CivilDate(2026, 11, 27), CivilDate(2026, 12, 25), CivilDate(2027, 1, 29)), expandEvent(review, CivilDate(2026, 11, 1), CivilDate(2027, 2, 1)).map { it.date })
    }

    @Test fun exdatesDoNotIncreaseCountAndRuleRoundTrips() {
        val rule = "RRULE:FREQ=WEEKLY;BYDAY=MO,WE;COUNT=5\nEXDATE;VALUE=DATE:20261111"
        val event = CalendarEvent("standup", "Standup", CivilDate(2026, 11, 4), 540, recurrenceRule = rule)
        assertEquals(listOf(4, 9, 16, 18), expandEvent(event, CivilDate(2026, 11, 1), CivilDate(2026, 12, 1)).map { it.date.day })
        assertEquals(parseEventRecurrence(rule), parseEventRecurrence(formatEventRecurrence(parseEventRecurrence(rule))))
        assertFailsWith<CalendarRecurrenceError> { parseEventRecurrence("FREQ=HOURLY") }
        assertFailsWith<CalendarRecurrenceError> { parseEventRecurrence("FREQ=WEEKLY;INTERVAL=0") }
    }

    @Test fun weeklyWallTimeUsesRealZoneRulesAcrossDst() {
        val zone = getFabricatorCalendarTimeZone()
        val event = CalendarEvent("review", "Review", CivilDate(2026, 3, 22), 540, recurrence = EventRecurrence.Weekly, timeZoneId = "Europe/Lisbon")
        val dates = expandEvent(event, CivilDate(2026, 3, 22), CivilDate(2026, 3, 29), zone)
        val instants = dates.map { zone.resolve(it.date, it.startMinute, it.timeZoneId).epochMilliseconds }
        assertEquals((7 * 24 - 1) * 3600000L, instants[1] - instants[0])
        assertTrue(dates.all { it.startMinute == 540 })
    }

    @Test fun zoneAdapterMakesGapAndOverlapPoliciesExplicit() {
        val zone = getFabricatorCalendarTimeZone()
        val shifted = zone.resolve(CivilDate(2026, 3, 29), 90, "Europe/Lisbon")
        assertEquals(150, shifted.minute)
        assertTrue(shifted.wasShiftedByGap)
        assertFailsWith<CalendarTimeError> { zone.resolve(CivilDate(2026, 3, 29), 90, "Europe/Lisbon", CalendarGapPolicy.Reject) }
        val earlier = zone.resolve(CivilDate(2026, 10, 25), 90, "Europe/Lisbon", overlap = CalendarOverlapPolicy.Earlier)
        val later = zone.resolve(CivilDate(2026, 10, 25), 90, "Europe/Lisbon", overlap = CalendarOverlapPolicy.Later)
        assertEquals(3600000L, later.epochMilliseconds - earlier.epochMilliseconds)
    }

    @Test fun eventMoveResizeAndUndoKeepElapsedDurationAndRestoreSnapshots() {
        val event = CalendarEvent("night", "Release", CivilDate(2026, 11, 15), 1430, 60)
        val moved = moveCalendarEvent(event, 0, 30, snapMinutes = 5)
        assertEquals(CivilDate(2026, 11, 16), moved.date)
        assertEquals(20, moved.startMinute)
        assertEquals(60, moved.durationMinutes)
        assertEquals(5, resizeCalendarEvent(event, -200).durationMinutes)
        val history = CalendarHistory(listOf(event)).apply(CalendarCommand.Update(moved))
        assertEquals(listOf(event), history.undo().events)
        assertEquals(listOf(moved), history.undo().redo().events)
    }

    @Test fun oneOccurrenceEditExcludesOriginalAndCreatesDetachedException() {
        val event = CalendarEvent("review", "Review", CivilDate(2026, 11, 2), 540, recurrence = EventRecurrence.Weekly)
        val original = CivilDate(2026, 11, 9)
        val edited = event.copy(date = original.plusDays(1), startMinute = 600)
        val history = CalendarHistory(listOf(event)).apply(CalendarCommand.EditOccurrence("review", original, edited, CalendarRecurrenceScope.This))
        assertEquals(2, history.events.size)
        assertEquals(setOf(original), history.events.first().excludedDates)
        val occurrences = expandCalendarEvents(history.events, CivilDate(2026, 11, 1), CivilDate(2026, 11, 30))
        assertTrue(occurrences.none { it.date == original })
        assertEquals(1, occurrences.count { it.date == original.plusDays(1) })
        assertEquals(listOf(event), history.undo().events)
    }

    @Test fun overlappingEventsUseReusableLanesAndIndependentGroups() {
        val day = CivilDate(2026, 11, 15)
        val events = listOf(CalendarEvent("a", "A", day, 540, 60), CalendarEvent("b", "B", day, 570, 60), CalendarEvent("c", "C", day, 600, 60), CalendarEvent("d", "D", day, 660, 60))
        val displayed = events.map { projectCalendarEvent(it, "UTC", UtcCalendarTimeZone) }
        val placements = layoutCalendarDay(displayed, day)
        assertEquals(listOf(0, 1, 0, 0), placements.map { it.lane })
        assertEquals(listOf(2, 2, 2, 1), placements.map { it.laneCount })
        val overnight = CalendarEvent("overnight", "Overnight", day.plusDays(-1), 1410, 120)
        val clipped = layoutCalendarDay(listOf(projectCalendarEvent(overnight, "UTC", UtcCalendarTimeZone)), day).single()
        assertEquals(0, clipped.startMinute)
        assertEquals(90, clipped.endMinute)
        assertEquals(listOf(overnight), expandCalendarEvents(listOf(overnight), day, day))
    }

    @Test fun displayZoneAndPointerMovePreserveTheEventSourceZone() {
        val zones = getFabricatorCalendarTimeZone()
        val event = CalendarEvent("review", "Review", CivilDate(2026, 3, 29), 540, timeZoneId = "Europe/Lisbon")
        val displayed = projectCalendarEvent(event, "UTC", zones)
        assertEquals(480, displayed.start.minute)
        val moved = moveCalendarDisplayEvent(displayed, "UTC", 1, 30, zones)
        assertEquals("Europe/Lisbon", moved.timeZoneId)
        assertEquals(CivilDate(2026, 3, 30), moved.date)
        assertEquals(570, moved.startMinute)
    }

    @Test fun scopedDeleteAndFollowingEditsPreserveCountAndUndo() {
        val event = CalendarEvent("series", "Weekly", CivilDate(2026, 11, 2), 540, recurrenceRule = "RRULE:FREQ=WEEKLY;COUNT=4")
        val deleted = CalendarHistory(listOf(event)).apply(CalendarCommand.DeleteOccurrence("series", CivilDate(2026, 11, 9), CalendarRecurrenceScope.This))
        assertEquals(listOf(2, 16, 23), expandCalendarEvents(deleted.events, CivilDate(2026, 11, 1), CivilDate(2026, 12, 1)).map { it.date.day })
        val futureDeleted = CalendarHistory(listOf(event)).apply(CalendarCommand.DeleteOccurrence("series", CivilDate(2026, 11, 16), CalendarRecurrenceScope.ThisAndFollowing))
        assertEquals(listOf(2, 9), expandCalendarEvents(futureDeleted.events, CivilDate(2026, 11, 1), CivilDate(2026, 12, 1)).map { it.date.day })
        assertEquals(listOf(event), futureDeleted.undo().events)
        val changed = event.copy(date = CivilDate(2026, 11, 16), startMinute = 600)
        val split = CalendarHistory(listOf(event)).apply(CalendarCommand.EditOccurrence("series", changed.date, changed, CalendarRecurrenceScope.ThisAndFollowing))
        assertEquals(listOf(2, 9, 16, 23), expandCalendarEvents(split.events, CivilDate(2026, 11, 1), CivilDate(2026, 12, 1)).map { it.date.day })
        assertEquals(listOf(540, 540, 600, 600), expandCalendarEvents(split.events, CivilDate(2026, 11, 1), CivilDate(2026, 12, 1)).map { it.startMinute })
    }
}
