import SwiftUI

struct FabricatorDatePickerGrid: View {
    @Environment(\.fabricatorTheme) private var theme
    @State private var cursor: Date
    @State private var direction = 1
    @State private var hovered: Date?
    @State private var viewportWidth: CGFloat = 0
    @FocusState private var hasFocus: Bool
    @Namespace private var selectionSpace
    @Namespace private var hoverSpace
    var selection: Date?
    var granularity: FabricatorDateGranularity
    var allowedRange: ClosedRange<Date>?
    var calendar: Calendar
    var referenceDate: Date
    var label: String
    var onSelect: (Date) -> Void
    private var formatter: DateFormatter
    private var fullFormatter: DateFormatter

    init(selection: Date?, granularity: FabricatorDateGranularity, allowedRange: ClosedRange<Date>?, calendar: Calendar, referenceDate: Date, label: String, defaultFocus: Date? = nil, onSelect: @escaping (Date) -> Void) {
        precondition(granularity != .day, "Day selection uses Calendar")
        self.selection = selection; self.granularity = granularity; self.allowedRange = allowedRange; self.calendar = calendar; self.referenceDate = referenceDate; self.label = label; self.onSelect = onSelect
        _cursor = State(initialValue: FabricatorDateGrid.start(defaultFocus ?? selection ?? referenceDate, granularity: granularity, calendar: calendar))
        formatter = Self.makeFormatter(granularity == .month ? "MMM" : "yyyy", calendar: calendar)
        fullFormatter = Self.makeFormatter(granularity == .month ? "MMMM yyyy" : "yyyy", calendar: calendar)
    }
    private var page: Date { FabricatorDateGrid.page(containing: cursor, granularity: granularity, calendar: calendar) }
    private var values: [Date] { FabricatorDateGrid.values(containing: cursor, granularity: granularity, calendar: calendar) }
    private var title: String { let year = calendar.component(.year, from: page); return granularity == .month ? String(year) : "\(year)–\(year + 11)" }
    private var selected: Date? { selection.map { FabricatorDateGrid.start($0, granularity: granularity, calendar: calendar) } }
    private var current: Date { FabricatorDateGrid.start(referenceDate, granularity: granularity, calendar: calendar) }
    private var cellHeight: CGFloat { max(theme.minimumHitSize, theme.controlHeight) }
    static func minimumWidth(theme: FabricatorTheme, granularity: FabricatorDateGranularity, calendar: Calendar) -> CGFloat {
        let labels = granularity == .month ? calendar.shortMonthSymbols : ["8888"]
        let font = FabricatorFontAdapter.withMonospacedDigits(theme.resolveFont(theme.text(), weight: .semibold))
        guard let width = labels.map({ FabricatorFontAdapter.measureTextWidth($0, font: font) }).max() else { preconditionFailure("Calendar has no month labels") }
        let titleFont = FabricatorFontAdapter.withMonospacedDigits(theme.resolveFont(theme.text(), weight: .medium))
        let titleWidth = FabricatorFontAdapter.measureTextWidth(granularity == .month ? "8888" : "8888–8888", font: titleFont)
        let headerWidth = titleWidth + max(theme.minimumHitSize, theme.minimumControlHeight(28)) * 2 + theme.space(8) * 6
        return max(headerWidth, 3 * max(64, width + theme.space(12) * 2) + theme.space(4) * 2 + theme.space(8) * 2)
    }
    var body: some View {
        ScrollView(.horizontal) {
        VStack(spacing: theme.space(8)) {
            HStack(spacing: theme.space(8)) {
                FabricatorButton("", icon: "chevron-left", variant: .ghost, size: .iconSm) { move(-12) }.accessibilityLabel(granularity == .month ? "Previous year" : "Previous years")
                Spacer(minLength: 0)
                Text(title).font(theme.font(theme.text(), weight: .medium)).monospacedDigit().fixedSize(horizontal: true, vertical: false).transaction { $0.animation = nil }.accessibilityAddTraits(.isHeader)
                Spacer(minLength: 0)
                FabricatorButton("", icon: "chevron-right", variant: .ghost, size: .iconSm) { move(12) }.accessibilityLabel(granularity == .month ? "Next year" : "Next years")
            }
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: theme.space(4)), count: 3), spacing: theme.space(4)) {
                ForEach(values, id: \.self) { date in cell(date) }
            }.id(page).transition(.asymmetric(insertion: theme.hasMotion ? .offset(x: CGFloat(direction) * theme.space(8)).combined(with: .opacity) : .identity, removal: .identity))
        }.padding(theme.space(8)).frame(width: max(viewportWidth, Self.minimumWidth(theme: theme, granularity: granularity, calendar: calendar)))
        }.fixedSize(horizontal: false, vertical: true)
            .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { viewportWidth = $0 }
            .focusable(true, interactions: .edit).focused($hasFocus).focusEffectDisabled()
            .onKeyPress(keys: [.leftArrow, .rightArrow, .upArrow, .downArrow, .pageUp, .pageDown]) { press in
                switch press.key { case .leftArrow: move(-1); case .rightArrow: move(1); case .upArrow: move(-3); case .downArrow: move(3); case .pageUp: move(-12); default: move(12) }; return .handled
            }
            .onKeyPress(keys: [.return, .space]) { _ in if isSelectable(cursor) { onSelect(cursor) }; return .handled }
            .task { await Task.yield(); hasFocus = true }
            .accessibilityElement(children: .contain).accessibilityLabel("\(label), \(title)").accessibilityIdentifier("fabricator-date-picker-grid")
    }
    private func cell(_ date: Date) -> some View {
        let isSelected = selected == date
        let isHighlighted = hovered == date || (hovered == nil && hasFocus && cursor == date)
        return Button { onSelect(date) } label: {
            Text(formatter.string(from: date)).font(theme.font(theme.text(), weight: isSelected ? .semibold : date == current ? .medium : .regular)).monospacedDigit().fixedSize(horizontal: true, vertical: false)
                .foregroundStyle(theme.color(isSelected || isHighlighted || date == current ? "foreground" : "muted-foreground"))
                .padding(.horizontal, theme.space(12)).frame(maxWidth: .infinity, minHeight: cellHeight)
                .background {
                    if isSelected { RoundedRectangle(cornerRadius: theme.radius()).fill(theme.color("active")).matchedGeometryEffect(id: "selection", in: selectionSpace) }
                    else if isHighlighted { RoundedRectangle(cornerRadius: theme.radius()).fill(theme.color("hover")).matchedGeometryEffect(id: "hover", in: hoverSpace) }
                }.contentShape(Rectangle())
        }.buttonStyle(FabricatorDateGridCellStyle()).focusable(false).disabled(!isSelectable(date)).opacity(isSelectable(date) ? 1 : 0.5)
            .onHover { entered in withAnimation(theme.animation("glide")) { hovered = entered ? date : nil } }
            .accessibilityLabel(fullFormatter.string(from: date)).accessibilityValue(date == current ? "Current \(granularity.rawValue)" : "")
            .accessibilityAddTraits(isSelected ? .isSelected : []).accessibilityIdentifier("fabricator-date-picker-cell-\(calendar.component(.year, from: date))-\(calendar.component(.month, from: date))")
    }
    private func isSelectable(_ date: Date) -> Bool { FabricatorDateGrid.isSelectable(date, granularity: granularity, allowedRange: allowedRange, calendar: calendar) }
    private func move(_ amount: Int) {
        direction = amount > 0 ? 1 : -1
        withAnimation(theme.animation("move")) { cursor = FabricatorDateGrid.move(cursor, amount: amount, granularity: granularity, calendar: calendar); hovered = nil }
        hasFocus = true
    }
    private static func makeFormatter(_ pattern: String, calendar: Calendar) -> DateFormatter {
        let formatter = DateFormatter(); formatter.calendar = calendar; formatter.timeZone = calendar.timeZone; formatter.locale = calendar.locale ?? .current; formatter.dateFormat = pattern; return formatter
    }
}

private struct FabricatorDateGridCellStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View { configuration.label }
}
