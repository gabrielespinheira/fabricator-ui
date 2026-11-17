package dev.fabricator.ui

import androidx.compose.foundation.ScrollState
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.state.ToggleableState
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import dev.fabricator.ui.models.*

@Composable
fun <T> FabricatorDataTable(
    rows: List<T>, columns: List<TableColumn<T>>, rowId: (T) -> String,
    state: TableState, onStateChange: (TableState) -> Unit, modifier: Modifier = Modifier,
    selectable: Boolean = true, onRowClick: ((T) -> Unit)? = null,
    groupBy: ((T) -> String)? = null, cell: (@Composable (T, TableColumn<T>) -> Unit)? = null,
    onRowsChange: ((List<T>) -> Unit)? = null,
) {
    val result = remember(rows, columns, state) { resolveTable(rows, state, columns) }
    val visible = remember(columns, state.hiddenColumns, state.pinnedColumns, state.columnOrder) { resolveTableColumns(columns, state) }
    val scroll = rememberScrollState()
    val theme = LocalFabricatorTheme.current
    var columnsOpen by remember { mutableStateOf(false) }
    fun pin(id: String, side: TablePinSide?) { onStateChange(state.copy(pinnedColumns = if (side == null) state.pinnedColumns - id else state.pinnedColumns + (id to side))) }
    val pageIds = result.rows.map(rowId).toSet()
    val selectedPageIds = state.selectedIds.intersect(pageIds)
    val selection = when { selectedPageIds.isEmpty() -> ToggleableState.Off; selectedPageIds.size == pageIds.size -> ToggleableState.On; else -> ToggleableState.Indeterminate }
    Column(modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FabricatorSearch(state.query, { onStateChange(state.copy(query = it, page = 0)) }, Modifier.weight(1f))
            FabricatorToggle(state.showsColumnFilters, { onStateChange(state.copy(showsColumnFilters = it)) }) { FabricatorIcon("list-filter", description = "Toggle column filters") }
            Box {
                FabricatorButton("Columns", { columnsOpen = true }, variant = FabricatorVariant.Outline)
                FabricatorDropdownMenu(columnsOpen, { columnsOpen = false }) {
                    columns.forEach { column ->
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            FabricatorCheckbox(column.id !in state.hiddenColumns, { shown -> onStateChange(state.copy(hiddenColumns = if (shown) state.hiddenColumns - column.id else state.hiddenColumns + column.id)) }, Modifier.weight(1f), label = column.title)
                            FabricatorButton({ pin(column.id, if (state.pinnedColumns[column.id] == TablePinSide.Start) null else TablePinSide.Start) }, Modifier.semantics { contentDescription = "Pin ${column.title} to start" }, if (state.pinnedColumns[column.id] == TablePinSide.Start) FabricatorVariant.Secondary else FabricatorVariant.Ghost, FabricatorSize.Icon) { FabricatorIcon("panel-left", size = 14.dp) }
                            FabricatorButton({ pin(column.id, if (state.pinnedColumns[column.id] == TablePinSide.End) null else TablePinSide.End) }, Modifier.semantics { contentDescription = "Pin ${column.title} to end" }, if (state.pinnedColumns[column.id] == TablePinSide.End) FabricatorVariant.Secondary else FabricatorVariant.Ghost, FabricatorSize.Icon) { FabricatorIcon("panel-right", size = 14.dp) }
                        }
                        FabricatorField("${column.title} width") { FabricatorNumberField((state.columnWidths[column.id] ?: 160f).toDouble(), { onStateChange(resizeTableColumn(state, column.id, it.toFloat())) }, minimum = 64.0, maximum = 480.0, step = 8.0) }
                    }
                }
            }
        }
        FabricatorPinnedTableRow(visible, state, scroll, Modifier.fillMaxWidth().background(theme.color("muted")), leading = if (selectable) { { FabricatorCheckbox(selection, { next -> onStateChange(state.copy(selectedIds = if (next == ToggleableState.On) state.selectedIds + pageIds else state.selectedIds - pageIds)) }, Modifier.width(48.dp), enabled = result.rows.isNotEmpty()) } } else null) { column ->
            FabricatorContextMenu(content = {
                FabricatorButton({ if (column.canSort) onStateChange(cycleTableSort(state, column.id)) }, Modifier.fillMaxWidth(), FabricatorVariant.Ghost, enabled = column.canSort) {
                    FabricatorText(column.title, Modifier.weight(1f), weight = FontWeight.Medium, size = 12)
                    if (state.sort?.columnId == column.id) FabricatorIcon(if (state.sort.direction == SortDirection.Ascending) "arrow-up" else "arrow-down", size = 12.dp)
                }
            }, menu = {
                FabricatorMenuItem("Pin to start", { pin(column.id, TablePinSide.Start) }, icon = "panel-left")
                FabricatorMenuItem("Pin to end", { pin(column.id, TablePinSide.End) }, icon = "panel-right")
                FabricatorMenuItem("Unpin", { pin(column.id, null) })
                FabricatorMenuItem("Hide column", { onStateChange(state.copy(hiddenColumns = state.hiddenColumns + column.id)) })
            })
        }
        if (state.showsColumnFilters) FabricatorPinnedTableRow(visible, state, scroll, Modifier.fillMaxWidth(), leading = if (selectable) { { Spacer(Modifier.width(48.dp)) } } else null) { column ->
            FabricatorInput(state.columnFilters[column.id].orEmpty(), { onStateChange(state.copy(columnFilters = state.columnFilters + (column.id to it), page = 0)) }, Modifier.padding(horizontal = 4.dp), "Filter ${column.title}")
        }
        LazyColumn(Modifier.heightIn(max = 420.dp).fillMaxWidth()) {
            val groups = if (groupBy == null) mapOf("" to result.rows) else result.rows.groupBy(groupBy)
            groups.forEach { (group, groupRows) ->
                if (group.isNotEmpty()) item(key = "group:$group") { FabricatorText("$group (${groupRows.size})", Modifier.padding(12.dp), weight = FontWeight.SemiBold) }
                items(groupRows, key = rowId) { row ->
                    FabricatorSeparator()
                    FabricatorPinnedTableRow(visible, state, scroll, Modifier.fillMaxWidth().heightIn(min = 48.dp).background(if (rowId(row) in state.selectedIds) theme.color("accent") else Color.Transparent), leading = if (selectable) { { FabricatorCheckbox(rowId(row) in state.selectedIds, { onStateChange(toggleTableSelection(state, rowId(row))) }, Modifier.width(48.dp)) } } else null) { column ->
                        Box(Modifier.padding(horizontal = 8.dp, vertical = 4.dp)) {
                            when {
                                cell != null -> cell(row, column)
                                column.update != null && onRowsChange != null -> FabricatorButton(column.value(row), { onStateChange(state.copy(editing = TableCellEdit(rowId(row), column.id, column.editValue(row)))) }, Modifier.semantics { contentDescription = "Edit ${column.title}: ${column.value(row)}" }, FabricatorVariant.Ghost)
                                onRowClick != null -> FabricatorButton(column.value(row), { onRowClick(row) }, variant = FabricatorVariant.Ghost)
                                else -> FabricatorText(column.value(row))
                            }
                        }
                    }
                }
            }
            if (result.rows.isEmpty()) item { FabricatorEmpty("No results", "Try changing the filters.") }
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            FabricatorText("${state.selectedIds.size} of ${result.totalRows} rows selected", muted = true, size = 11)
            FabricatorSelect(state.pageSize.toString(), { onStateChange(state.copy(pageSize = it.toInt(), page = 0)) }, listOf(5, 10, 25, 50).map { FabricatorOption(it.toString(), "$it rows") }, Modifier.width(130.dp))
        }
        FabricatorPagination(result.page, result.pageCount, { onStateChange(state.copy(page = it)) })
    }
    val editing = state.editing
    val column = columns.firstOrNull { it.id == editing?.columnId }
    FabricatorDialog(editing != null, { onStateChange(state.copy(editing = null)) }, "Edit ${column?.title.orEmpty()}") {
        if (editing != null && column != null) {
            FabricatorField(column.title, error = editing.error) { FabricatorInput(editing.draft, { onStateChange(state.copy(editing = editing.copy(draft = it, error = null))) }, Modifier.fillMaxWidth(), isInvalid = editing.error != null) }
            FabricatorButton("Save", {
                when (val update = editTableCell(rows, rowId, editing.rowId, column, editing.draft)) {
                    is TableEditResult.Updated -> { onRowsChange?.invoke(update.rows); onStateChange(state.copy(editing = null)) }
                    is TableEditResult.Rejected -> onStateChange(state.copy(editing = editing.copy(error = update.message)))
                }
            })
        }
    }
}

@Composable
private fun <T> FabricatorPinnedTableRow(columns: List<TableColumn<T>>, state: TableState, scroll: ScrollState, modifier: Modifier = Modifier, leading: (@Composable () -> Unit)? = null, cell: @Composable (TableColumn<T>) -> Unit) {
    val start = columns.filter { state.pinnedColumns[it.id] == TablePinSide.Start }
    val center = columns.filter { it.id !in state.pinnedColumns }
    val end = columns.filter { state.pinnedColumns[it.id] == TablePinSide.End }
    @Composable fun cells(items: List<TableColumn<T>>) { items.forEach { column -> Box(Modifier.width((state.columnWidths[column.id] ?: 160f).dp).clipToBounds()) { cell(column) } } }
    Row(modifier, verticalAlignment = Alignment.CenterVertically) {
        leading?.invoke()
        cells(start)
        Row(Modifier.weight(1f).clipToBounds().horizontalScroll(scroll), verticalAlignment = Alignment.CenterVertically) { cells(center) }
        cells(end)
    }
}
