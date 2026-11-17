package dev.fabricator.ui

import dev.fabricator.ui.models.*
import java.time.DateTimeException
import java.time.Instant
import java.time.LocalDateTime
import java.time.LocalDate
import java.time.ZoneId

actual fun getFabricatorCalendarTimeZone(): CalendarTimeZone = JavaTimeCalendarTimeZone
actual fun getFabricatorToday(): CivilDate { val date = LocalDate.now(); return CivilDate(date.year, date.monthValue, date.dayOfMonth) }
actual fun getFabricatorNowEpochMilliseconds(): Long = System.currentTimeMillis()
actual fun getFabricatorCalendarTimeZoneIds(): List<String> = ZoneId.getAvailableZoneIds().sorted()

/** Android API26 and desktop use the same java.time SDK adapter and IANA rules. */
private object JavaTimeCalendarTimeZone : CalendarTimeZone {
    override fun resolve(date: CivilDate, minute: Int, zoneId: String, gap: CalendarGapPolicy, overlap: CalendarOverlapPolicy): CalendarResolvedTime {
        require(minute in 0..1439)
        return try {
            val zone = ZoneId.of(zoneId)
            val local = LocalDateTime.of(date.year, date.month, date.day, minute / 60, minute % 60)
            val offsets = zone.rules.getValidOffsets(local)
            var resolved = local
            val offset = when {
                offsets.isEmpty() -> {
                    if (gap == CalendarGapPolicy.Reject) throw CalendarTimeError("${date} ${formatTime(minute)} does not exist in $zoneId.")
                    val transition = requireNotNull(zone.rules.getTransition(local))
                    resolved = local.plusSeconds(transition.duration.seconds)
                    transition.offsetAfter
                }
                overlap == CalendarOverlapPolicy.Later -> offsets.last()
                else -> offsets.first()
            }
            CalendarResolvedTime(CivilDate(resolved.year, resolved.monthValue, resolved.dayOfMonth), resolved.hour * 60 + resolved.minute, resolved.toInstant(offset).toEpochMilli(), offset.totalSeconds, resolved != local)
        } catch (error: DateTimeException) { throw CalendarTimeError("Unable to resolve time in $zoneId: ${error.message}") }
    }
    override fun fromInstant(epochMilliseconds: Long, zoneId: String): CalendarWallTime = try {
        val local = Instant.ofEpochMilli(epochMilliseconds).atZone(ZoneId.of(zoneId))
        CalendarWallTime(CivilDate(local.year, local.monthValue, local.dayOfMonth), local.hour * 60 + local.minute, local.offset.totalSeconds)
    } catch (error: DateTimeException) { throw CalendarTimeError("Unable to read time in $zoneId: ${error.message}") }
}
