package dev.fabricator.ui

import dev.fabricator.ui.models.CalendarTimeZone
import dev.fabricator.ui.models.CivilDate

expect fun getFabricatorCalendarTimeZone(): CalendarTimeZone
expect fun getFabricatorToday(): CivilDate
expect fun getFabricatorNowEpochMilliseconds(): Long
expect fun getFabricatorCalendarTimeZoneIds(): List<String>
