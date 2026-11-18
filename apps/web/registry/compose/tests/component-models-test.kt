package dev.fabricator.ui.models

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ComponentModelsTest {
    private data class Invoice(val id: String, val customer: String, val amount: Double)
    private val invoices = listOf(
        Invoice("a", "Ada", 90.0), Invoice("b", "Bea", 12.0),
        Invoice("c", "Ada", 12.0), Invoice("d", "Dee", 150.0),
    )

    @Test fun tableFiltersBeforeSortingAndPagination() {
        val result = resolveTable(
            invoices, TableState(query = "ada", sort = TableSort("amount", SortDirection.Ascending), pageSize = 1),
            listOf(TableColumn("customer", "Customer", { it.customer }), TableColumn("amount", "Amount", { it.amount.toString() }, { it.amount })),
        )
        assertEquals(listOf("c"), result.rows.map { it.id })
        assertEquals(2, result.totalRows)
        assertEquals(2, result.pageCount)
    }

    @Test fun tableRetainsSelectionWhenRowsAreFiltered() {
        val state = TableState(selectedIds = setOf("a", "b"))
        assertEquals(setOf("b"), toggleTableSelection(state, "a").selectedIds)
        assertEquals(setOf("a", "b", "c"), toggleTableSelection(state, "c").selectedIds)
        assertEquals(0, resolveTable(invoices, state.copy(page = 10, pageSize = 25), listOf(TableColumn("customer", "Customer", { it.customer }))).page)
    }

    @Test fun tablePinningPreservesOrderAndVisibilityWithoutChangingData() {
        val columns = listOf(TableColumn<Invoice>("customer", "Customer", { it.customer }), TableColumn("amount", "Amount", { it.amount.toString() }), TableColumn("id", "Invoice", { it.id }))
        val state = TableState(columnOrder = listOf("amount", "id", "customer"), pinnedColumns = mapOf("customer" to TablePinSide.Start, "id" to TablePinSide.End))
        assertEquals(listOf("customer", "amount", "id"), resolveTableColumns(columns, state).map { it.id })
        assertEquals(listOf("customer", "amount"), resolveTableColumns(columns, state.copy(hiddenColumns = setOf("id"))).map { it.id })
        assertEquals(listOf("a", "b", "c", "d"), resolveTable(invoices, state, columns).rows.map { it.id })
        assertEquals(64f, resizeTableColumn(state, "amount", 1f).columnWidths["amount"])
        assertEquals(480f, resizeTableColumn(state, "amount", 1000f).columnWidths["amount"])
    }

    @Test fun tableEditingValidatesBeforeUpdatingAndKeepsOtherRows() {
        val column = TableColumn<Invoice>("amount", "Amount", { "$${it.amount}" }, numericValue = { it.amount }, editValue = { it.amount.toString() }, update = { row, value -> row.copy(amount = value.toDouble()) }, validate = { value -> if (value.toDoubleOrNull()?.let { it >= 0 && it.isFinite() } == true) null else "Enter a positive amount." })
        val invalid = editTableCell(invoices, { it.id }, "b", column, "-4")
        assertTrue(invalid is TableEditResult.Rejected)
        val valid = editTableCell(invoices, { it.id }, "b", column, "45.50")
        assertTrue(valid is TableEditResult.Updated)
        assertEquals(45.5, valid.rows[1].amount)
        assertEquals(invoices[0], valid.rows[0])
        assertEquals(12.0, invoices[1].amount)
        assertTrue(editTableCell(invoices, { it.id }, "missing", column, "5") is TableEditResult.Rejected)
    }

    @Test fun tableColumnFiltersCombineWithGlobalSearchBeforePagination() {
        val columns = listOf(TableColumn<Invoice>("customer", "Customer", { it.customer }), TableColumn("amount", "Amount", { it.amount.toString() }))
        val filtered = resolveTable(invoices, TableState(query = "ada", columnFilters = mapOf("amount" to "12"), pageSize = 1), columns)
        assertEquals(listOf("c"), filtered.rows.map { it.id })
        assertEquals(1, filtered.totalRows)
        assertEquals(0, filtered.page)
    }

    @Test fun dateArithmeticHandlesLeapDaysAndYearBoundaries() {
        assertEquals(CivilDate(2024, 2, 29), CivilDate(2024, 2, 28).plusDays(1))
        assertEquals(CivilDate(2025, 1, 1), CivilDate(2024, 12, 31).plusDays(1))
        assertEquals(CivilDate(2023, 2, 28), CivilDate(2023, 1, 31).plusMonths(1))
        assertEquals(3, CivilDate(1970, 1, 1).weekday)
        assertEquals(CivilDate(1969, 12, 31), CivilDate.fromEpochDay(-1))
        assertFailsWith<IllegalArgumentException> { CivilDate(2023, 2, 29) }
    }

    @Test fun calendarGridHasStableSixWeeksWithAdjacentDays() {
        val days = createCalendarGrid(CivilDate(2026, 11, 1))
        assertEquals(42, days.size)
        assertEquals(0, days.first().weekday)
        assertEquals(CivilDate(2026, 10, 26), days.first())
        assertEquals(days.first().plusDays(41), days.last())
    }

    @Test fun recurrencePreservesLocalWallClockAcrossDstViaZoneBoundary() {
        val original = CalendarEvent("review", "Review", CivilDate(2026, 3, 22), 9 * 60, 60, recurrence = EventRecurrence.Weekly)
        val occurrences = expandEvent(original, CivilDate(2026, 3, 1), CivilDate(2026, 4, 5))
        assertEquals(listOf(22, 29, 5), occurrences.map { it.date.day })
        assertTrue(occurrences.all { it.startMinute == 540 && it.durationMinutes == 60 })
    }

    @Test fun timeParsingRejectsImpossibleTimesAndClampsSteps() {
        assertEquals(9 * 60 + 30, parseTime("09:30"))
        assertEquals(null, parseTime("24:00"))
        assertEquals(null, parseTime("9:74"))
        assertEquals("00:05", formatTime(stepTime(23 * 60 + 55, 10)))
        assertEquals("23:55", formatTime(stepTime(5, -10)))
    }

    @Test fun editorCommandsPreserveSelectionAndUndoRedo() {
        val original = EditorState("Hello world", 6, 11)
        val bold = applyEditorCommand(original, EditorCommand.Bold)
        assertEquals("Hello world", bold.text)
        assertEquals("Hello **world**", serializeEditorMarkdown(bold.document))
        assertEquals("world", bold.text.substring(bold.selectionStart, bold.selectionEnd))
        val history = EditorHistory(original).apply(EditorCommand.Bold)
        assertEquals(original, history.undo().current)
        assertEquals(bold, history.undo().redo().current)
        assertEquals("# Hello world", serializeEditorMarkdown(applyEditorCommand(original, EditorCommand.Heading).document))
    }

    @Test fun fileTreeSearchKeepsAncestorsAndExpandsOnlySelectedFolders() {
        val tree = listOf(FileNode("src", "src", children = listOf(FileNode("button", "button.kt"), FileNode("theme", "theme.kt"))))
        assertEquals(listOf("src"), flattenFileTree(tree, emptySet()).map { it.node.id })
        assertEquals(listOf("src", "button", "theme"), flattenFileTree(tree, setOf("src")).map { it.node.id })
        assertEquals(listOf("src", "button"), flattenFileTree(tree, emptySet(), "button").map { it.node.id })
    }

    @Test fun chartDomainsIncludeNegativeValuesAndHitTestingUsesNearestPoint() {
        val domain = resolveChartDomain(listOf(-20.0, 80.0))
        assertEquals(-20.0, domain.minimum)
        assertEquals(80.0, domain.maximum)
        assertEquals(0.8f, domain.normalize(60.0))
        assertEquals(1, findNearestPoint(listOf(ChartPoint(0f, 1f), ChartPoint(0.4f, 0.3f), ChartPoint(1f, 0f)), 0.5f, 0.3f))
        assertTrue(resolveChartDomain(listOf(3.0, 3.0)).maximum > 3.0)
    }

    @Test fun formsValidateOnSubmitAndPasswordsAreNeverTrimmed() {
        val state = FormState(mapOf("email" to "bad", "password" to "  secret  "))
        val result = validateForm(state, mapOf("email" to listOf(FormRule.Email), "password" to listOf(FormRule.MinimumLength(8))))
        assertTrue(result.submitted)
        assertEquals(setOf("email"), result.errors.keys)
        assertEquals("  secret  ", result.values["password"])
        assertFalse(result.isValid)
    }

    @Test fun numberInputClampsWithoutFloatingPointStepDrift() {
        assertEquals(0.3, stepNumber(0.2, 0.1, 0.0, 1.0))
        assertEquals(1.0, stepNumber(0.9, 0.5, 0.0, 1.0))
        assertEquals(0.0, stepNumber(0.2, -0.5, 0.0, 1.0))
    }
}
