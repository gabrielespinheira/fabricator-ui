package dev.fabricator.ui

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class StatusBarModelTest {
    @Test fun narrowBarsKeepLatestPeriodsAndNeverTurnHistoryIntoShareSegments() {
        val periods = List(30) { FabricatorStatusPeriod("day:$it", "Day $it", "operational") }
        val model = resolveFabricatorStatusBar(periods, 40f)
        assertEquals(24, model.first)
        assertEquals(listOf(24, 25, 26, 27, 28, 29), model.pills.map { it.index })
        assertEquals(2f, model.gap)
        assertTrue(model.pills.all { it.width >= 4f })
        assertEquals(0f, model.pills.first().x)
        assertEquals(40f, model.pills.last().x + model.pills.last().width)
    }

    @Test fun uptimeExcludesNoDataAndUsesVisibleHistory() {
        val periods = listOf(FabricatorStatusPeriod("a", "Monday", "operational"), FabricatorStatusPeriod("b", "Tuesday", null), FabricatorStatusPeriod("c", "Wednesday", "outage", "Database incident"), FabricatorStatusPeriod("d", "Thursday", "operational"))
        val model = resolveFabricatorStatusBar(periods, 200f)
        assertEquals(2.0 / 3.0, model.uptime)
        assertEquals("66.7% uptime", formatFabricatorStatusUptime(model.uptime))
        assertEquals("100% uptime", formatFabricatorStatusUptime(1.0))
        assertEquals("none", model.pills[1].status.key)
        assertEquals(.3f, model.pills[1].status.opacity)
        assertEquals("destructive", model.pills[2].status.role)
        assertEquals(null, resolveFabricatorStatusBar(listOf(FabricatorStatusPeriod("a", "Monday")), 40f).uptime)
    }

    @Test fun configurationRenamesStatusesWithoutReusingSeriesColors() {
        val model = resolveFabricatorStatusBar(listOf(FabricatorStatusPeriod("a", "Today", "degraded")), 100f, mapOf("degraded" to FabricatorStatusDefinition("Slow responses", "warning")))
        assertEquals("Slow responses", model.pills.single().status.label)
        assertEquals("warning", model.pills.single().status.role)
        assertEquals(3f, model.gap)
        assertEquals(4f, model.pills.single().radius)
    }
}
