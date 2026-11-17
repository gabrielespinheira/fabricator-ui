import SwiftUI

private struct FabricatorEditingCell: Identifiable { var rowID: String; var column: FabricatorTableColumn; var value: String; var id: String { rowID + ":" + column.id } }
private enum FabricatorTableEntry: Identifiable {
    case group(String, Int)
    case row(FabricatorTableRow)
    var id: String { switch self { case .group(let name, _): "group:" + name; case .row(let row): "row:" + row.id } }
}

public struct FabricatorDataTable: View {
    public var columns: [FabricatorTableColumn]
    @Binding public var rows: [FabricatorTableRow]
    @Binding public var state: FabricatorTableState
    @Binding public var selectedRows: Set<String>
    public var searchPlaceholder: String
    public var referenceDate: Date?
    private var allowsEditing: Bool
    public init(columns: [FabricatorTableColumn], rows: [FabricatorTableRow], state: Binding<FabricatorTableState>, selectedRows: Binding<Set<String>>, searchPlaceholder: String = "Filter records…", referenceDate: Date? = nil) { self.columns = columns; _rows = .constant(rows); _state = state; _selectedRows = selectedRows; allowsEditing = false; self.searchPlaceholder = searchPlaceholder; self.referenceDate = referenceDate }
    public init(columns: [FabricatorTableColumn], rows: Binding<[FabricatorTableRow]>, state: Binding<FabricatorTableState>, selectedRows: Binding<Set<String>>, searchPlaceholder: String = "Filter records…", referenceDate: Date? = nil) { self.columns = columns; _rows = rows; _state = state; _selectedRows = selectedRows; allowsEditing = true; self.searchPlaceholder = searchPlaceholder; self.referenceDate = referenceDate }
    public var body: some View {
        let now = referenceDate ?? .now
        // Query outside pointer, cell focus and viewport state, once per data/state update.
        FabricatorDataTableContent(columns: columns, rows: $rows, state: $state, selectedRows: $selectedRows, allowsEditing: allowsEditing, searchPlaceholder: searchPlaceholder, referenceDate: now, filteredRows: FabricatorDataTableEngine.query(rows, columns: columns, state: state, referenceDate: now))
    }
}

private struct FabricatorDataTableContent: View {
    @Environment(\.fabricatorTheme) private var theme
    var columns: [FabricatorTableColumn]
    @Binding var rows: [FabricatorTableRow]
    @Binding var state: FabricatorTableState
    @Binding var selectedRows: Set<String>
    var allowsEditing: Bool
    var searchPlaceholder: String
    var referenceDate: Date?
    var filteredRows: [FabricatorTableRow]
    @State private var editingCell: FabricatorEditingCell?
    @State private var editingColumn: FabricatorTableColumn?
    @State private var filterColumn: FabricatorTableColumn?
    @State private var selectedCell: String?
    @State private var resizingColumn: String?
    @State private var hoveredRow: String?
    @State private var scrollingWidth: CGFloat = 0
    @State private var initialColumnWidth = 140.0
    private var visibleColumns: [FabricatorTableColumn] { FabricatorDataTableEngine.orderedColumns(columns, state: state) }
    private var pageCount: Int { max(1, (filteredRows.count + state.pageSize - 1) / state.pageSize) }
    private var pageRows: [FabricatorTableRow] { Array(filteredRows.dropFirst(min(state.page, pageCount - 1) * state.pageSize).prefix(state.pageSize)) }
    private var rowHeight: CGFloat { max(theme.minimumHitSize, theme.minimumControlHeight(48)) - 1 }
    private var headerHeight: CGFloat { max(theme.minimumHitSize, theme.minimumControlHeight(36)) }
    private var entries: [FabricatorTableEntry] {
        guard let groupBy = state.groupBy else { return pageRows.map(FabricatorTableEntry.row) }
        var result: [FabricatorTableEntry] = [], previous: String?
        for row in pageRows { let group = row.cells[groupBy, default: ""]; if previous != group { result.append(.group(group, filteredRows.filter { $0.cells[groupBy, default: ""] == group }.count)); previous = group }; if !state.collapsedGroups.contains(group) { result.append(.row(row)) } }
        return result
    }
    public var body: some View {
        VStack(alignment: .leading, spacing: theme.space(12)) {
            toolbar
            if !state.filters.isEmpty { FabricatorFlowLayout(spacing: 6) { ForEach(state.filters.keys.sorted(), id: \.self) { id in if let filter = state.filters[id] { Button { state.filters[id] = nil } label: { FabricatorBadge("\(title(for: id)): \(filter.operation.rawValue) \(filter.value)", variant: .outline, icon: "x") }.buttonStyle(.plain).accessibilityLabel("Remove filter on \(title(for: id))") } }; FabricatorButton("Clear filters", variant: .ghost, size: .xs) { state.filters = [:] } } }
            HStack(spacing: 0) {
                let leading = visibleColumns.filter { state.leadingPinnedColumns.contains($0.id) }
                tableSlice(leading, includesSelection: true)
                    .background(theme.color("card")).overlay(alignment: .trailing) { if !leading.isEmpty { Rectangle().fill(theme.color("border").opacity(0.6)).frame(width: 1) } }.zIndex(1)
                ScrollView(.horizontal, showsIndicators: true) { tableSlice(visibleColumns.filter { !state.leadingPinnedColumns.contains($0.id) && !state.trailingPinnedColumns.contains($0.id) }, includesSelection: false, minimumWidth: scrollingWidth) }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { scrollingWidth = $0 }
                    .accessibilityIdentifier("fabricator-data-table-columns")
                let trailing = visibleColumns.filter { state.trailingPinnedColumns.contains($0.id) && !state.leadingPinnedColumns.contains($0.id) }
                if !trailing.isEmpty { tableSlice(trailing, includesSelection: false).background(theme.color("card")).overlay(alignment: .leading) { Rectangle().fill(theme.color("border")).frame(width: 0.5) }.zIndex(1) }
            }.clipShape(RoundedRectangle(cornerRadius: theme.radius("xl"))).fabricatorSurface()
                .overlay { if filteredRows.isEmpty { Text("No matching records.").font(theme.bodyFont).foregroundStyle(theme.color("muted-foreground")).padding(theme.space(16)).frame(maxWidth: .infinity, maxHeight: .infinity).padding(.top, headerHeight) } }
            ViewThatFits(in: .horizontal) { HStack { footerLabel; Spacer(); pagination }; VStack(alignment: .leading, spacing: 8) { footerLabel; pagination } }
        }.accessibilityElement(children: .contain).accessibilityLabel("Data table")
            .onChange(of: state.query) { _, _ in state.page = 0 }.onChange(of: state.filters) { _, _ in state.page = 0 }.onChange(of: filteredRows.count) { _, _ in state.page = min(state.page, pageCount - 1) }
            .popover(item: $editingCell) { cell in FabricatorCellEditor(cell: cell, onCancel: { editingCell = nil }) { value in edit(cell, value: value); editingCell = nil }.presentationCompactAdaptation(.popover) }
            .popover(item: $editingColumn) { column in FabricatorColumnEditor(column: column) { title, type, options, editable in state.columnTitles[column.id] = title; state.columnTypes[column.id] = type; state.columnOptions[column.id] = options; if editable { state.readOnlyColumns.remove(column.id) } else { state.readOnlyColumns.insert(column.id) }; editingColumn = nil }.presentationCompactAdaptation(.popover) }
            .popover(item: $filterColumn) { column in FabricatorTableFilterEditor(column: column, initial: state.filters[column.id]) { filter in state.filters[column.id] = filter; filterColumn = nil }.presentationCompactAdaptation(.popover) }
    }
    private var toolbar: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: theme.space(8)) { FabricatorSearch(searchPlaceholder, query: $state.query).frame(maxWidth: 280); Spacer(minLength: theme.space(8)); tableActions }
            VStack(alignment: .leading, spacing: theme.space(8)) { FabricatorSearch(searchPlaceholder, query: $state.query); HStack { Spacer(); tableActions } }
        }
    }
    private var tableActions: some View {
        HStack(spacing: 10) {
            if !selectedRows.isEmpty { FabricatorButton("Copy \(selectedRows.count)", icon: "copy", variant: .outline, size: .sm) { copyRows() }; if allowsEditing { FabricatorButton("Delete", icon: "trash", variant: .destructive, size: .sm) { rows.removeAll { selectedRows.contains($0.id) }; selectedRows = [] } } }
            Menu { ForEach(columns) { column in Toggle(title(for: column.id), isOn: Binding(get: { !state.hiddenColumns.contains(column.id) }, set: { if $0 { state.hiddenColumns.remove(column.id) } else { state.hiddenColumns.insert(column.id) } })).disabled(visibleColumns.count == 1 && !state.hiddenColumns.contains(column.id)) }; Divider(); Button("Reset column layout") { state.hiddenColumns = []; state.leadingPinnedColumns = []; state.trailingPinnedColumns = []; state.columnWidths = [:]; state.columnOrder = [] } } label: { HStack(spacing: theme.space(6)) { FabricatorIcon("columns-3", size: theme.icon(14)); Text("Columns") } }.menuStyle(.borderlessButton).buttonStyle(FabricatorButtonStyle(variant: .ghost, size: .sm, hasLeadingIcon: true))
        }
    }
    private var footerLabel: some View { Text("\(selectedRows.count) of \(filteredRows.count) rows selected").font(theme.font(theme.text(12))).foregroundStyle(theme.color("muted-foreground")) }
    private var pagination: some View { HStack(spacing: 10) { Menu("\(state.pageSize) per page") { ForEach(Array(Set([state.pageSize, 10, 20, 50, 100])).sorted(), id: \.self) { count in Button(String(count)) { state.pageSize = count; state.page = 0 } } }.menuStyle(.borderlessButton).font(theme.font(11)); FabricatorPagination(page: $state.page, pageCount: pageCount) } }
    private func tableSlice(_ slice: [FabricatorTableColumn], includesSelection: Bool, minimumWidth: CGFloat = 0) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) { if includesSelection { selectionHeader.frame(width: selectionWidth, height: headerHeight) }; ForEach(slice) { column in columnHeader(column).frame(width: width(for: column.id), height: headerHeight) }; Spacer(minLength: 0) }.background(theme.color("card")); tableSeparator
            ForEach(entries) { entry in
                switch entry {
                case .group(let group, let count): HStack(spacing: 0) { if includesSelection { Color.clear.frame(width: selectionWidth) }; ForEach(slice) { column in if column.id == visibleColumns.first?.id { Button { if state.collapsedGroups.contains(group) { state.collapsedGroups.remove(group) } else { state.collapsedGroups.insert(group) } } label: { HStack(spacing: theme.space(6)) { FabricatorIcon(state.collapsedGroups.contains(group) ? "chevron-right" : "chevron-down", size: theme.icon(14)); Text(group.isEmpty ? "Empty" : column.optionLabels[group, default: group]).lineLimit(1); Text("\(count)").foregroundStyle(theme.color("muted-foreground")) }.font(theme.font(theme.text(12), weight: .medium)).padding(.horizontal, theme.space(12)).frame(width: width(for: column.id), alignment: .leading) }.buttonStyle(.plain) } else { Color.clear.frame(width: width(for: column.id)) } }; Spacer(minLength: 0) }.frame(height: headerHeight).background(theme.color("hover")); tableSeparator
                case .row(let row): HStack(spacing: 0) { if includesSelection { tableCheckbox(Binding(get: { selectedRows.contains(row.id) }, set: { if $0 { selectedRows.insert(row.id) } else { selectedRows.remove(row.id) } })).accessibilityLabel("Select row \(row.id)") }; ForEach(slice) { column in cell(row, column: column).frame(width: width(for: column.id), height: rowHeight) }; Spacer(minLength: 0) }.frame(height: rowHeight).background(selectedRows.contains(row.id) ? theme.color("active") : hoveredRow == row.id ? theme.color("hover") : .clear).onHover { hoveredRow = $0 ? row.id : (hoveredRow == row.id ? nil : hoveredRow) }; tableSeparator
                }
            }
            if filteredRows.isEmpty { Color.clear.frame(height: theme.space(288)) }
            if !state.aggregates.isEmpty { HStack(spacing: 0) { if includesSelection { Color.clear.frame(width: selectionWidth) }; ForEach(slice) { column in aggregateCell(column).frame(width: width(for: column.id), height: headerHeight) }; Spacer(minLength: 0) }.background(theme.color("card")) }
        }.frame(width: max(minimumWidth, slice.reduce(includesSelection ? selectionWidth : 0) { $0 + width(for: $1.id) }))
    }
    private var selectionWidth: CGFloat { max(theme.minimumHitSize, 44) }
    private var tableSeparator: some View { Rectangle().fill(theme.color("border").opacity(0.6)).frame(height: 1).accessibilityHidden(true) }
    private var selectionHeader: some View {
        let ids = Set(filteredRows.map(\.id)), count = selectedRows.intersection(ids).count
        return tableCheckbox(Binding(get: { !ids.isEmpty && count == ids.count }, set: { if $0 { selectedRows.formUnion(ids) } else { selectedRows.subtract(ids) } }), isIndeterminate: count > 0 && count < ids.count).accessibilityLabel("Select all filtered rows")
    }
    private func tableCheckbox(_ value: Binding<Bool>, isIndeterminate: Bool = false) -> some View {
        // Balance the shared labeled control's trailing label gap around its glyph.
        FabricatorCheckbox("", isOn: value, isIndeterminate: isIndeterminate)
            .frame(width: theme.icon() + 2 + theme.space(8), alignment: .leading)
            .padding(.leading, theme.space(8)).frame(width: selectionWidth)
    }
    private func columnHeader(_ column: FabricatorTableColumn) -> some View {
        HStack(spacing: 4) {
            Button { state.sort(by: column.id, type: column.type) } label: {
                HStack(spacing: theme.space(6)) {
                    sortIcon(column)
                    Text(column.title).lineLimit(1)
                }.frame(maxWidth: .infinity, minHeight: headerHeight, alignment: .leading).contentShape(Rectangle())
            }.buttonStyle(FabricatorDataTableSortStyle()).accessibilityLabel("Sort by \(column.title)").accessibilityValue(state.sortDescriptor(for: column.id).map { $0.ascending ? "Ascending" : "Descending" } ?? "Not sorted")
            Menu { columnActions(column) } label: { FabricatorIcon("ellipsis", size: theme.icon(14)).frame(width: 24, height: headerHeight).contentShape(Rectangle()) }.menuStyle(.borderlessButton).foregroundStyle(theme.color("muted-foreground")).accessibilityLabel("Configure \(column.title)")
            Rectangle().fill(theme.color("foreground").opacity(resizingColumn == column.id ? 1 : 0.25)).frame(width: 2, height: theme.space(16)).frame(width: 8, height: headerHeight).contentShape(Rectangle()).gesture(DragGesture().onChanged { value in if resizingColumn != column.id { resizingColumn = column.id; initialColumnWidth = width(for: column.id) }; state.columnWidths[column.id] = max(column.type.minimumWidth, initialColumnWidth + value.translation.width) }.onEnded { _ in resizingColumn = nil }).accessibilityLabel("Resize \(column.title)").accessibilityValue("\(Int(width(for: column.id))) points").accessibilityAdjustableAction { direction in state.columnWidths[column.id] = max(column.type.minimumWidth, width(for: column.id) + (direction == .increment ? 16 : -16)) }
        }.font(theme.font(theme.text(), weight: .semibold)).foregroundStyle(theme.color("foreground")).padding(.leading, theme.space(12))
    }
    private func sortIcon(_ column: FabricatorTableColumn) -> some View {
        let descriptor = state.sortDescriptor(for: column.id)
        let isSorted = descriptor != nil
        let ascending = descriptor?.ascending ?? true
        let icon: String = switch column.type {
        case .text: "type"
        case .number: "hash"
        case .currency: "dollar-sign"
        case .percent: "percent"
        case .progress: "gauge"
        case .date: "calendar"
        case .status: "circle-dot"
        case .tags: "tag"
        case .person: "circle-user-round"
        case .link: "link"
        case .email: "mail"
        case .boolean: "square-check"
        }
        return ZStack {
            FabricatorIcon(icon, size: theme.icon(14), strokeWidth: 1.75).opacity(isSorted ? 0 : 1).scaleEffect(isSorted ? 0.5 : 1)
            FabricatorIcon("arrow-up", size: theme.icon(14), strokeWidth: 1.75).foregroundStyle(theme.color("foreground")).rotationEffect(.degrees(ascending ? 0 : 180)).opacity(isSorted ? 1 : 0).scaleEffect(isSorted ? 1 : 0.5)
        }.frame(width: theme.icon(16), height: theme.icon(16)).foregroundStyle(theme.color("muted-foreground"))
            .animation(theme.animation("move"), value: isSorted).animation(theme.animation("move"), value: ascending).accessibilityHidden(true)
    }
    @ViewBuilder private func columnActions(_ column: FabricatorTableColumn) -> some View {
        Button("Edit column…") { editingColumn = column }
        Button("Filter…") { filterColumn = column }
        Button("Sort ascending") { state.sortKey = column.id; state.ascending = true; state.sortDescriptors = [] }
        Button("Sort descending") { state.sortKey = column.id; state.ascending = false; state.sortDescriptors = [] }
        Button("Add to sort") { if state.sortDescriptors.isEmpty, let key = state.sortKey { state.sortDescriptors = [FabricatorTableSort(key, ascending: state.ascending)] }; state.sortDescriptors.removeAll { $0.columnID == column.id }; state.sortDescriptors.append(FabricatorTableSort(column.id)) }
        Button(state.groupBy == column.id ? "Ungroup rows" : "Group by this column") { state.groupBy = state.groupBy == column.id ? nil : column.id }
        Divider()
        Button("Pin to leading edge") { pin(column.id, leading: true) }
        Button("Pin to trailing edge") { pin(column.id, leading: false) }
        Button("Unpin") { state.leadingPinnedColumns.removeAll { $0 == column.id }; state.trailingPinnedColumns.removeAll { $0 == column.id } }
        Button("Move column left") { moveColumn(column.id, offset: -1) }
        Button("Move column right") { moveColumn(column.id, offset: 1) }
        Menu("Calculate") { Button("None") { state.aggregates[column.id] = nil }; ForEach(FabricatorTableAggregate.allCases, id: \.self) { operation in Button(operation.rawValue.capitalized) { state.aggregates[column.id] = operation } } }
        Divider(); Button("Hide column") { state.hiddenColumns.insert(column.id) }.disabled(visibleColumns.count == 1)
    }
    @ViewBuilder private func cell(_ row: FabricatorTableRow, column: FabricatorTableColumn) -> some View {
        if column.type == .boolean && allowsEditing && column.isEditable {
            tableCheckbox(Binding(get: { row.cells[column.id] == "true" }, set: { edit(FabricatorEditingCell(rowID: row.id, column: column, value: row.cells[column.id, default: ""]), value: String($0)) }))
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .accessibilityLabel(column.title).accessibilityIdentifier("fabricator-data-table-cell-\(row.id)-\(column.id)")
        } else { valueCell(row, column: column) }
    }
    private func valueCell(_ row: FabricatorTableRow, column: FabricatorTableColumn) -> some View {
        let value = row.cells[column.id, default: ""], id = row.id + ":" + column.id
        return FabricatorDataTableCell(value, column: column, isHighlighted: hoveredRow == row.id || selectedRows.contains(row.id), referenceDate: referenceDate)
            .padding(.horizontal, theme.space(12)).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: alignment(for: column)).contentShape(Rectangle()).overlay { if selectedCell == id { Rectangle().strokeBorder(theme.color("focus-ring"), lineWidth: 1) } }.onTapGesture { selectedCell = id }.onTapGesture(count: 2) { beginEdit(row, column: column) }.focusable().onKeyPress(.return) { beginEdit(row, column: column); return .handled }.contextMenu {
            Button("Copy cell") { FabricatorClipboard.copy(value) }
            Button("Edit cell") { beginEdit(row, column: column) }.disabled(!allowsEditing || !column.isEditable)
            Button("Clear cell") { edit(FabricatorEditingCell(rowID: row.id, column: column, value: value), value: "") }.disabled(!allowsEditing || !column.isEditable)
        }.accessibilityElement(children: .combine).accessibilityIdentifier("fabricator-data-table-cell-\(row.id)-\(column.id)").accessibilityLabel("\(column.title): \(FabricatorDataTableEngine.format(value, column: column, referenceDate: referenceDate))").accessibilityHint(allowsEditing && column.isEditable && column.type != .boolean ? "Double tap to edit" : "")
    }
    private func aggregateCell(_ column: FabricatorTableColumn) -> some View {
        HStack(spacing: theme.space(6)) { if let operation = state.aggregates[column.id] { Text(operation.rawValue.capitalized).foregroundStyle(theme.color("muted-foreground")); Text(FabricatorDataTableEngine.formatAggregate(filteredRows.map { $0.cells[column.id, default: ""] }, operation: operation, column: column)).font(theme.font(theme.text(12), weight: .medium)).foregroundStyle(theme.color("foreground")).monospacedDigit() } }.font(theme.font(theme.text(12))).lineLimit(1).padding(.horizontal, theme.space(12)).frame(maxWidth: .infinity, alignment: alignment(for: column))
    }
    private func title(for id: String) -> String { state.columnTitles[id] ?? columns.first { $0.id == id }?.title ?? id }
    private func alignment(for column: FabricatorTableColumn) -> Alignment { switch column.type.cellAlignment { case .start: .leading; case .center: .center; case .end: .trailing } }
    private func width(for id: String) -> Double {
        guard let column = columns.first(where: { $0.id == id }) else { preconditionFailure("Unknown Data Table column: \(id)") }
        let type = state.columnTypes[id] ?? column.type
        let width = state.columnWidths[id] ?? type.defaultWidth
        precondition(width.isFinite && width >= 0, "Column widths must be finite and nonnegative")
        return max(type.minimumWidth, width)
    }
    private func beginEdit(_ row: FabricatorTableRow, column: FabricatorTableColumn) { guard allowsEditing, column.isEditable else { return }; editingCell = FabricatorEditingCell(rowID: row.id, column: column, value: row.cells[column.id, default: ""]) }
    private func edit(_ cell: FabricatorEditingCell, value: String) { guard allowsEditing, let index = rows.firstIndex(where: { $0.id == cell.rowID }) else { return }; rows[index].cells[cell.column.id] = value }
    private func pin(_ id: String, leading: Bool) { state.leadingPinnedColumns.removeAll { $0 == id }; state.trailingPinnedColumns.removeAll { $0 == id }; if leading { state.leadingPinnedColumns.append(id) } else { state.trailingPinnedColumns.append(id) } }
    private func moveColumn(_ id: String, offset: Int) { var order = visibleColumns.map(\.id); guard let index = order.firstIndex(of: id), order.indices.contains(index + offset) else { return }; order.swapAt(index, index + offset); state.columnOrder = order; state.leadingPinnedColumns = order.filter { state.leadingPinnedColumns.contains($0) }; state.trailingPinnedColumns = order.filter { state.trailingPinnedColumns.contains($0) } }
    private func copyRows() { let output = filteredRows.filter { selectedRows.contains($0.id) }.map { row in visibleColumns.map { column in row.cells[column.id, default: ""].replacingOccurrences(of: "\t", with: " ").replacingOccurrences(of: "\n", with: " ") }.joined(separator: "\t") }.joined(separator: "\n"); FabricatorClipboard.copy(output) }
}

private struct FabricatorDataTableSortStyle: ButtonStyle {
    @Environment(\.fabricatorTheme) private var theme
    @Environment(\.isFocused) private var isFocused
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.overlay {
            if isFocused { RoundedRectangle(cornerRadius: theme.radius("md")).strokeBorder(theme.color("focus-ring"), lineWidth: 1) }
        }.focusEffectDisabled()
    }
}

public struct FabricatorDataTableCell: View {
    @Environment(\.fabricatorTheme) private var theme
    public var value: String
    public var column: FabricatorTableColumn
    public var isHighlighted: Bool
    public var referenceDate: Date?
    public init(_ value: String, column: FabricatorTableColumn, isHighlighted: Bool = false, referenceDate: Date? = nil) { self.value = value; self.column = column; self.isHighlighted = isHighlighted; self.referenceDate = referenceDate }
    public var body: some View {
        Group {
            if value.isEmpty && column.type != .boolean { Text("–").foregroundStyle(theme.color("muted-foreground").opacity(0.6)) }
            else {
                switch column.type {
                case .status: FabricatorBadge(column.optionLabels[value, default: value], variant: variant(value), showsDot: true)
                case .tags: ScrollView(.horizontal, showsIndicators: false) { HStack(spacing: theme.space(4)) { ForEach(Array(value.split(separator: ",").enumerated()), id: \.offset) { _, tag in let key = tag.trimmingCharacters(in: .whitespaces); FabricatorBadge(column.optionLabels[key, default: key], variant: variant(key)) } } }.fixedSize(horizontal: false, vertical: true)
                case .person: HStack(spacing: theme.space(8)) { FabricatorAvatar(column.optionLabels[value, default: value], imageURL: column.optionImageURLs[value], size: theme.space(24)); Text(column.optionLabels[value, default: value]).lineLimit(1) }
                case .boolean: FabricatorIcon(value == "true" ? "check" : "minus", size: theme.icon(16)).foregroundStyle(value == "true" ? theme.color("foreground") : theme.color("muted-foreground").opacity(0.6))
                case .progress: let percent = min(100, max(0, Double(value) ?? 0)); HStack(spacing: theme.space(8)) { FabricatorProgress(value: percent / 100, label: column.title); Text("\(Int(percent.rounded()))%").font(theme.font(theme.text(12))).monospacedDigit().frame(minWidth: theme.text(12) * 2.5, alignment: .trailing) }
                case .link, .email: link
                default: Text(FabricatorDataTableEngine.format(value, column: column, referenceDate: referenceDate)).lineLimit(1).monospacedDigit()
                }
            }
        }.font(theme.font(theme.text(), weight: column.isPrimary ? .medium : .regular)).foregroundStyle(theme.color(column.isPrimary || isHighlighted ? "foreground" : "muted-foreground"))
    }
    private func variant(_ value: String) -> FabricatorBadgeVariant { FabricatorBadgeVariant(rawValue: column.optionColors[value, default: "secondary"]) ?? .secondary }
    @ViewBuilder private var link: some View {
        let address = column.type == .email ? "mailto:" + value : value
        if let url = URL(string: address) {
            Link(destination: url) { HStack(spacing: theme.space(4)) { Text(column.type == .link ? (url.host()?.replacingOccurrences(of: "^www\\.", with: "", options: .regularExpression) ?? value) : value).lineLimit(1); if column.type == .link { FabricatorIcon("arrow-up-right", size: 12).opacity(0.6) } } }.foregroundStyle(theme.color("primary-text"))
        } else { Text(value).lineLimit(1) }
    }
}

private struct FabricatorCellEditor: View {
    @Environment(\.fabricatorTheme) private var theme
    var cell: FabricatorEditingCell
    var onCancel: () -> Void
    var onSave: (String) -> Void
    @State private var text: String
    @State private var error: String?
    init(cell: FabricatorEditingCell, onCancel: @escaping () -> Void, onSave: @escaping (String) -> Void) { self.cell = cell; self.onCancel = onCancel; self.onSave = onSave; _text = State(initialValue: cell.column.type == .percent ? String((Double(cell.value) ?? 0) * 100) : cell.value) }
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            FabricatorLabel("Edit \(cell.column.title)")
            switch cell.column.type {
            case .boolean: FabricatorSwitch(cell.column.title, isOn: Binding(get: { text == "true" }, set: { text = String($0) }))
            case .date: DatePicker(cell.column.title, selection: Binding(get: { FabricatorDataTableEngine.parseDate(text) ?? .now }, set: { text = $0.ISO8601Format() }), displayedComponents: .date).datePickerStyle(.compact)
            case .status, .person: if !cell.column.options.isEmpty { FabricatorSelect("Select value", options: cell.column.options, selection: $text) } else { FabricatorInput("Value", text: $text) }
            case .tags: FabricatorMultiSelect(options: cell.column.options, selection: Binding(get: { FabricatorSelection(values: text.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }) }, set: { text = $0.values.joined(separator: ", ") }))
            default: FabricatorInput("Value", text: $text, isInvalid: error != nil).onSubmit(save)
            }
            if let error { Text(error).font(.caption).foregroundStyle(theme.color("destructive-text")) }
            HStack { FabricatorButton("Cancel", variant: .ghost, size: .sm, action: onCancel).keyboardShortcut(.cancelAction); Spacer(); FabricatorButton("Save", size: .sm, action: save).keyboardShortcut(.defaultAction) }
        }.padding(16).frame(width: 280)
    }
    private func save() { do { onSave(try FabricatorDataTableEngine.parseEdit(text, type: cell.column.type)) } catch { self.error = "Enter a valid \(cell.column.type.rawValue) value." } }
}
private struct FabricatorColumnEditor: View {
    var onSave: (String, FabricatorTableColumnType, [String], Bool) -> Void
    @State private var title: String
    @State private var type: String
    @State private var options: String
    @State private var isEditable: Bool
    init(column: FabricatorTableColumn, onSave: @escaping (String, FabricatorTableColumnType, [String], Bool) -> Void) { self.onSave = onSave; _title = State(initialValue: column.title); _type = State(initialValue: column.type.rawValue); _options = State(initialValue: column.options.joined(separator: ", ")); _isEditable = State(initialValue: column.isEditable) }
    var body: some View { VStack(alignment: .leading, spacing: 14) { FabricatorLabel("Column settings"); FabricatorField("Name") { FabricatorInput("Column name", text: $title) }; FabricatorField("Type") { FabricatorSelect("Column type", options: FabricatorTableColumnType.allCases.map(\.rawValue), selection: $type) }; if ["status", "tags", "person"].contains(type) { FabricatorField("Options", description: "Separate options with commas.") { FabricatorInput("Design, Engineering, Product", text: $options) } }; FabricatorCheckbox("Allow editing", isOn: $isEditable); FabricatorButton("Save column", size: .sm) { guard let type = FabricatorTableColumnType(rawValue: type) else { return }; onSave(title.trimmingCharacters(in: .whitespaces), type, options.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }, isEditable) }.disabled(title.trimmingCharacters(in: .whitespaces).isEmpty) }.padding(16).frame(width: 280) }
}
private struct FabricatorTableFilterEditor: View {
    var column: FabricatorTableColumn
    var onApply: (FabricatorTableFilter?) -> Void
    @State private var operation: String
    @State private var value: String
    @State private var to: String
    init(column: FabricatorTableColumn, initial: FabricatorTableFilter?, onApply: @escaping (FabricatorTableFilter?) -> Void) { self.column = column; self.onApply = onApply; _operation = State(initialValue: initial?.operation.rawValue ?? FabricatorDataTableEngine.operations(for: column.type).first?.rawValue ?? "contains"); _value = State(initialValue: initial?.value ?? ""); _to = State(initialValue: initial?.to ?? "") }
    var body: some View { VStack(alignment: .leading, spacing: 14) { FabricatorLabel("Filter \(column.title)"); FabricatorSelect("Condition", options: FabricatorDataTableEngine.operations(for: column.type).map(\.rawValue), selection: $operation); if !["empty", "notEmpty", "checked", "unchecked"].contains(operation) { if operation == "within" { FabricatorSelect("Date range", options: ["today", "yesterday", "pastWeek", "pastMonth", "pastYear", "thisMonth", "thisYear", "nextWeek", "nextMonth"], selection: $value) } else if !column.options.isEmpty { FabricatorMultiSelect(options: column.options, selection: Binding(get: { FabricatorSelection(values: value.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }) }, set: { value = $0.values.joined(separator: ",") })) } else { FabricatorInput(column.type == .date ? "YYYY-MM-DD" : "Value", text: $value) }; if operation == "between" { FabricatorInput(column.type == .date ? "Through YYYY-MM-DD" : "Through value", text: $to) } }; HStack { FabricatorButton("Clear", variant: .ghost, size: .sm) { onApply(nil) }; Spacer(); FabricatorButton("Apply", size: .sm) { guard let operation = FabricatorTableFilterOperation(rawValue: operation) else { return }; onApply(FabricatorTableFilter(operation: operation, value: value, to: to)) } } }.padding(16).frame(width: 290) }
}
