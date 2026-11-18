import SwiftUI

public enum FabricatorCalendarCaptionLayout: Sendable { case label, dropdown }

private struct FabricatorCalendarOptions {
    var caption: FabricatorCalendarCaptionLayout
    var count: Int
    var showsWeekNumbers: Bool
    var showsOutsideDays: Bool
    var fixedWeeks: Bool
    var reference: Date
    var disabled: Set<Date>
    var required: Bool
    var minimum: Int
    var maximum: Int?
    var excludesDisabled: Bool
    var autoFocus: Bool
}
private struct FabricatorCalendarCell: Hashable { var month: Date; var day: Date }

public struct FabricatorCalendarView: View {
    @Environment(\.fabricatorTheme) private var theme
    @Binding private var value: FabricatorCalendar.Selection
    @State private var displayedMonth: Date
    @State private var viewportWidth: CGFloat = 0
    @FocusState private var focusedCell: FabricatorCalendarCell?
    public var allowedRange: ClosedRange<Date>?
    private var calendar: Calendar
    private var formatters: [String: DateFormatter]
    private var options: FabricatorCalendarOptions
    var onSelect: ((FabricatorCalendar.Selection) -> Void)?

    public init(selection: Binding<Date>, allowedRange: ClosedRange<Date>? = nil, calendar: Calendar = .current, captionLayout: FabricatorCalendarCaptionLayout = .label, numberOfMonths: Int = 1, showsWeekNumbers: Bool = false, showsOutsideDays: Bool = true, fixedWeeks: Bool = false, defaultMonth: Date? = nil, referenceDate: Date = .now, disabledDates: Set<Date> = [], autoFocus: Bool = false) {
        let binding = Binding<FabricatorCalendar.Selection>(get: { .single(selection.wrappedValue) }, set: { value in
            guard case .single(let date) = value, let date else { preconditionFailure("A required date cannot be cleared") }; selection.wrappedValue = date
        })
        self.init(value: binding, allowedRange: allowedRange, calendar: calendar, defaultMonth: defaultMonth, options: FabricatorCalendarOptions(caption: captionLayout, count: numberOfMonths, showsWeekNumbers: showsWeekNumbers, showsOutsideDays: showsOutsideDays, fixedWeeks: fixedWeeks, reference: referenceDate, disabled: disabledDates, required: true, minimum: 0, maximum: nil, excludesDisabled: false, autoFocus: autoFocus))
    }
    public init(selection: Binding<Date?>, allowedRange: ClosedRange<Date>? = nil, calendar: Calendar = .current, captionLayout: FabricatorCalendarCaptionLayout = .label, numberOfMonths: Int = 1, showsWeekNumbers: Bool = false, showsOutsideDays: Bool = true, fixedWeeks: Bool = false, defaultMonth: Date? = nil, referenceDate: Date = .now, disabledDates: Set<Date> = [], isRequired: Bool = false, autoFocus: Bool = false) {
        let binding = Binding<FabricatorCalendar.Selection>(get: { .single(selection.wrappedValue) }, set: { value in guard case .single(let date) = value else { preconditionFailure("Calendar selection mode changed") }; selection.wrappedValue = date })
        self.init(value: binding, allowedRange: allowedRange, calendar: calendar, defaultMonth: defaultMonth, options: FabricatorCalendarOptions(caption: captionLayout, count: numberOfMonths, showsWeekNumbers: showsWeekNumbers, showsOutsideDays: showsOutsideDays, fixedWeeks: fixedWeeks, reference: referenceDate, disabled: disabledDates, required: isRequired, minimum: 0, maximum: nil, excludesDisabled: false, autoFocus: autoFocus))
    }
    public init(selection: Binding<Set<Date>>, allowedRange: ClosedRange<Date>? = nil, calendar: Calendar = .current, captionLayout: FabricatorCalendarCaptionLayout = .label, numberOfMonths: Int = 1, showsWeekNumbers: Bool = false, showsOutsideDays: Bool = true, fixedWeeks: Bool = false, defaultMonth: Date? = nil, referenceDate: Date = .now, disabledDates: Set<Date> = [], isRequired: Bool = false, minimumCount: Int = 0, maximumCount: Int? = nil, autoFocus: Bool = false) {
        let binding = Binding<FabricatorCalendar.Selection>(get: { .multiple(selection.wrappedValue) }, set: { value in guard case .multiple(let dates) = value else { preconditionFailure("Calendar selection mode changed") }; selection.wrappedValue = dates })
        self.init(value: binding, allowedRange: allowedRange, calendar: calendar, defaultMonth: defaultMonth, options: FabricatorCalendarOptions(caption: captionLayout, count: numberOfMonths, showsWeekNumbers: showsWeekNumbers, showsOutsideDays: showsOutsideDays, fixedWeeks: fixedWeeks, reference: referenceDate, disabled: disabledDates, required: isRequired, minimum: minimumCount, maximum: maximumCount, excludesDisabled: false, autoFocus: autoFocus))
    }
    public init(selection: Binding<FabricatorDateRange?>, allowedRange: ClosedRange<Date>? = nil, calendar: Calendar = .current, captionLayout: FabricatorCalendarCaptionLayout = .label, numberOfMonths: Int = 1, showsWeekNumbers: Bool = false, showsOutsideDays: Bool = true, fixedWeeks: Bool = false, defaultMonth: Date? = nil, referenceDate: Date = .now, disabledDates: Set<Date> = [], isRequired: Bool = false, minimumDays: Int = 0, maximumDays: Int? = nil, excludesDisabled: Bool = false, autoFocus: Bool = false) {
        let binding = Binding<FabricatorCalendar.Selection>(get: { .range(selection.wrappedValue) }, set: { value in guard case .range(let range) = value else { preconditionFailure("Calendar selection mode changed") }; selection.wrappedValue = range })
        self.init(value: binding, allowedRange: allowedRange, calendar: calendar, defaultMonth: defaultMonth, options: FabricatorCalendarOptions(caption: captionLayout, count: numberOfMonths, showsWeekNumbers: showsWeekNumbers, showsOutsideDays: showsOutsideDays, fixedWeeks: fixedWeeks, reference: referenceDate, disabled: disabledDates, required: isRequired, minimum: minimumDays, maximum: maximumDays, excludesDisabled: excludesDisabled, autoFocus: autoFocus))
    }
    private init(value: Binding<FabricatorCalendar.Selection>, allowedRange: ClosedRange<Date>?, calendar: Calendar, defaultMonth: Date?, options: FabricatorCalendarOptions) {
        precondition(options.count > 0 && options.minimum >= 0 && (options.maximum.map { $0 > 0 && $0 >= options.minimum } ?? true), "Calendar counts and limits must be valid")
        _value = value; self.allowedRange = allowedRange; self.calendar = calendar; self.options = options
        formatters = Dictionary(uniqueKeysWithValues: ["MMMM yyyy", "EEEEEE", "EEEE", "EEEE, MMMM d, yyyy", "yyyy-MM-dd"].map { pattern in
            let formatter = DateFormatter(); formatter.calendar = calendar; formatter.locale = calendar.locale ?? .current; formatter.timeZone = calendar.timeZone; formatter.dateFormat = pattern
            return (pattern, formatter)
        })
        let month = defaultMonth ?? value.wrappedValue.anchor ?? options.reference
        _displayedMonth = State(initialValue: Self.clampMonth(month, range: Self.navigationRange(allowedRange, options: options, calendar: calendar), count: options.count, calendar: calendar))
    }

    private var padding: CGFloat { theme.space(12) }
    private var visualSize: CGFloat { theme.minimumControlHeight(32) }
    private var preferredSlot: CGFloat { max(theme.minimumHitSize, visualSize) }
    private var columnCount: Int { options.showsWeekNumbers ? 8 : 7 }
    private var showsMonthsInRow: Bool { options.count == 1 || viewportWidth >= CGFloat(options.count * columnCount) * visualSize + CGFloat(options.count - 1) * theme.space(16) + padding * 2 }
    private var slot: CGFloat {
        guard viewportWidth > 0 else { return preferredSlot }
        let count = showsMonthsInRow ? options.count : 1
        let available = viewportWidth - padding * 2 - CGFloat(count - 1) * theme.space(16)
        return max(visualSize, min(preferredSlot, available / CGFloat(count * columnCount)))
    }
    private var monthWidth: CGFloat { CGFloat(columnCount) * slot }
    private var preferredWidth: CGFloat { CGFloat(options.count * columnCount) * preferredSlot + CGFloat(options.count - 1) * theme.space(16) + padding * 2 }
    private var months: [Date] { (0..<options.count).map { adding(.month, $0, to: displayedMonth) } }
    private var navigationBounds: ClosedRange<Date>? { Self.navigationRange(allowedRange, options: options, calendar: calendar) }
    private var captionTheme: FabricatorTheme { var copy = theme; copy.density = .compact; return copy }

    public var body: some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal) {
                Group {
                    if showsMonthsInRow {
                        HStack(alignment: .top, spacing: theme.space(16)) { ForEach(months, id: \.self) { month in monthView(month) } }.fixedSize(horizontal: true, vertical: true)
                    } else {
                        VStack(spacing: theme.space(16)) { ForEach(months, id: \.self) { month in monthView(month) } }.fixedSize(horizontal: true, vertical: true)
                    }
                }.overlay(alignment: .top) {
                    HStack { navigationButton(-1); Spacer(minLength: 0); navigationButton(1) }.frame(height: preferredSlot)
                }.padding(padding)
            }.fixedSize(horizontal: false, vertical: true).frame(maxWidth: preferredWidth, alignment: .leading)
                .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { viewportWidth = $0 }
                .task { if options.autoFocus { await Task.yield(); focusInitialDay() } }
                .onChange(of: focusedCell) { _, cell in if let cell { proxy.scrollTo(cell, anchor: .center) } }
                .onChange(of: allowedRange) { _, _ in displayedMonth = Self.clampMonth(displayedMonth, range: navigationBounds, count: options.count, calendar: calendar) }
        }.accessibilityElement(children: .contain).accessibilityLabel("Calendar")
    }
    private func monthView(_ month: Date) -> some View {
        let days = FabricatorCalendar.monthDays(containing: month, calendar: calendar, fixedWeeks: options.fixedWeeks)
        return VStack(spacing: 0) {
            caption(month).frame(height: preferredSlot).padding(.horizontal, preferredSlot)
            HStack(spacing: 0) {
                if options.showsWeekNumbers { Color.clear.frame(width: slot, height: theme.text(20)) }
                ForEach(0..<7, id: \.self) { index in
                    let day = days[index]
                    Text(format(day, "EEEEEE")).font(theme.font(12.8)).foregroundStyle(theme.color("muted-foreground")).frame(width: slot, height: theme.text(20)).accessibilityLabel(format(day, "EEEE")).accessibilityAddTraits(.isHeader)
                }
            }.padding(.top, theme.space(16))
            ForEach(Array(stride(from: 0, to: days.count, by: 7)), id: \.self) { start in
                HStack(spacing: 0) {
                    if options.showsWeekNumbers { let number = calendar.component(.weekOfYear, from: days[start]); Text(String(number)).font(theme.font(12.8)).foregroundStyle(theme.color("muted-foreground")).frame(width: slot, height: slot).accessibilityLabel("Week \(number)") }
                    ForEach(0..<7, id: \.self) { index in dayView(days[start + index], month: month, column: index) }
                }
            }
        }.frame(width: monthWidth)
    }
    @ViewBuilder private func caption(_ month: Date) -> some View {
        if options.caption == .label { Text(format(month, "MMMM yyyy")).font(theme.font(theme.text(14), weight: .medium)).lineLimit(1).accessibilityAddTraits(.isHeader) }
        else {
            HStack(spacing: theme.space(6)) {
                let labels = calendar.shortStandaloneMonthSymbols
                let monthValue = calendar.component(.month, from: month) - 1
                let disabled = Set(labels.indices.filter { !canChoose(month: $0 + 1, year: calendar.component(.year, from: month)) }.map { labels[$0] })
                captionSelect("Choose month", options: labels, selection: Binding(get: { labels[monthValue] }, set: { label in
                    guard let index = labels.firstIndex(of: label) else { preconditionFailure("Unknown calendar month") }
                    setMonth(index + 1, year: calendar.component(.year, from: month), replacing: month)
                }), disabled: disabled).frame(width: selectorWidth(labels[monthValue]))
                let years = yearOptions(month)
                let year = String(calendar.component(.year, from: month))
                captionSelect("Choose year", options: years, selection: Binding(get: { year }, set: { label in
                    guard let year = Int(label) else { preconditionFailure("Unknown calendar year") }
                    setMonth(monthValue + 1, year: year, replacing: month)
                })).frame(width: selectorWidth(year))
            }
        }
    }
    private func captionSelect(_ label: String, options: [String], selection: Binding<String>, disabled: Set<String> = []) -> FabricatorSelect {
        let font = theme.resolveFont(theme.text(), weight: .semibold)
        guard let textWidth = options.map({ FabricatorFontAdapter.measureTextWidth($0, font: font) }).max() else { preconditionFailure("Calendar caption options cannot be empty") }
        var select = FabricatorSelect(label, options: options, selection: selection, disabledOptions: disabled)
        select.labelWeight = .medium; select.triggerDensity = .compact; select.minimumPopupWidth = max(96, textWidth + theme.icon() + theme.space(8) * 4 + theme.space(4) * 2); select.maximumPopupHeight = theme.space(32) * 7.5
        return select
    }
    private func selectorWidth(_ label: String) -> CGFloat { FabricatorFontAdapter.measureTextWidth(label, font: captionTheme.resolveFont(captionTheme.text(), weight: .medium)) + captionTheme.icon() + captionTheme.space(8) * 2 + captionTheme.space(10) * 2 }
    private func dayView(_ day: Date, month: Date, column: Int) -> some View {
        let outside = !calendar.isDate(day, equalTo: month, toGranularity: .month)
        let selected = FabricatorCalendar.isSelected(day, in: value, calendar: calendar)
        let role = FabricatorCalendar.rangePosition(day, in: value, calendar: calendar)
        let enabled = FabricatorCalendar.isSelectable(day, allowedRange: allowedRange, disabledDates: options.disabled, calendar: calendar)
        let today = calendar.isDate(day, inSameDayAs: options.reference)
        let cell = FabricatorCalendarCell(month: month, day: day)
        return ZStack {
            if role == .middle {
                UnevenRoundedRectangle(topLeadingRadius: column == 0 ? theme.radius() : 0, bottomLeadingRadius: column == 0 ? theme.radius() : 0, bottomTrailingRadius: column == 6 ? theme.radius() : 0, topTrailingRadius: column == 6 ? theme.radius() : 0).fill(theme.color("active")).frame(width: slot, height: visualSize).opacity(enabled ? 1 : 0.5)
            } else if role == .start || role == .end {
                Rectangle().fill(theme.color("active")).frame(width: slot / 2, height: visualSize).offset(x: role == .start ? slot / 4 : -slot / 4).opacity(enabled ? 1 : 0.5)
            }
            Button { focusedCell = cell; select(day) } label: { Text(String(calendar.component(.day, from: day))).font(theme.font(theme.text())).frame(width: visualSize, height: visualSize) }
                .buttonStyle(FabricatorCalendarButtonStyle(isSelected: selected && role != .middle, isToday: today && role != .middle, isOutside: outside, hasFocus: focusedCell == cell, slot: slot))
                .disabled(!enabled || (outside && !options.showsOutsideDays)).focusable(true, interactions: .edit).focused($focusedCell, equals: cell).focusEffectDisabled()
                .onKeyPress(keys: [.return, .space]) { _ in select(day); return .handled }
                .onKeyPress(keys: [.leftArrow, .rightArrow, .upArrow, .downArrow, .home, .end, .pageUp, .pageDown]) { press in navigate(press, from: day); return .handled }
                .accessibilityLabel(format(day, "EEEE, MMMM d, yyyy")).accessibilityValue(today ? "Today" : "")
                .accessibilityAddTraits(selected ? .isSelected : [])
                .accessibilityIdentifier("fabricator-calendar-day-\(format(day, "yyyy-MM-dd"))")
        }.frame(width: slot, height: slot).id(cell).opacity(outside && !options.showsOutsideDays ? 0 : 1).allowsHitTesting(!outside || options.showsOutsideDays).accessibilityHidden(outside && !options.showsOutsideDays)
    }
    private func navigationButton(_ direction: Int) -> some View {
        Button { displayedMonth = adding(.month, direction, to: displayedMonth) } label: { FabricatorIcon(direction < 0 ? "chevron-left" : "chevron-right", size: theme.icon()).frame(width: visualSize, height: visualSize) }
            .buttonStyle(FabricatorCalendarButtonStyle(slot: preferredSlot)).disabled(!canMove(direction)).accessibilityLabel(direction < 0 ? "Previous month" : "Next month")
    }
    private func select(_ day: Date) {
        let next = FabricatorCalendar.select(day, from: value, isRequired: options.required, minimum: options.minimum, maximum: options.maximum, allowedRange: allowedRange, disabledDates: options.disabled, excludesDisabled: options.excludesDisabled, calendar: calendar)
        value = next; onSelect?(next)
    }
    private func navigate(_ press: KeyPress, from day: Date) {
        let direction: FabricatorCalendar.Navigation
        switch press.key {
        case .leftArrow: direction = .previousDay
        case .rightArrow: direction = .nextDay
        case .upArrow: direction = .previousWeek
        case .downArrow: direction = .nextWeek
        case .home: direction = .weekStart
        case .end: direction = .weekEnd
        case .pageUp: direction = press.modifiers.contains(.shift) ? .previousYear : .previousMonth
        default: direction = press.modifiers.contains(.shift) ? .nextYear : .nextMonth
        }
        guard let target = FabricatorCalendar.navigationTarget(from: day, direction: direction, allowedRange: allowedRange ?? navigationBounds, disabledDates: options.disabled, calendar: calendar) else { return }
        if let month = months.first(where: { calendar.isDate($0, equalTo: target, toGranularity: .month) }) { focusedCell = FabricatorCalendarCell(month: month, day: target) }
        else { displayedMonth = Self.clampMonth(target, range: navigationBounds, count: options.count, calendar: calendar); focusedCell = FabricatorCalendarCell(month: startMonth(target), day: target) }
    }
    private func focusInitialDay() {
        let candidate = value.anchor ?? options.reference
        let day = calendar.startOfDay(for: candidate)
        if let month = months.first(where: { calendar.isDate($0, equalTo: day, toGranularity: .month) }), FabricatorCalendar.isSelectable(day, allowedRange: allowedRange, disabledDates: options.disabled, calendar: calendar) { focusedCell = FabricatorCalendarCell(month: month, day: day); return }
        for month in months {
            if let day = FabricatorCalendar.monthDays(containing: month, calendar: calendar).first(where: { calendar.isDate($0, equalTo: month, toGranularity: .month) && FabricatorCalendar.isSelectable($0, allowedRange: allowedRange, disabledDates: options.disabled, calendar: calendar) }) { focusedCell = FabricatorCalendarCell(month: month, day: day); return }
        }
    }
    private func canMove(_ offset: Int) -> Bool { let target = adding(.month, offset, to: displayedMonth); return Self.clampMonth(target, range: navigationBounds, count: options.count, calendar: calendar) == target }
    private func yearOptions(_ month: Date) -> [String] {
        guard let bounds = navigationBounds else { preconditionFailure("Calendar dropdowns need a year range") }
        return (calendar.component(.year, from: bounds.lowerBound)...calendar.component(.year, from: bounds.upperBound)).map(String.init)
    }
    private func canChoose(month: Int, year: Int) -> Bool {
        guard let date = calendar.date(from: DateComponents(year: year, month: month, day: 1)), let interval = calendar.dateInterval(of: .month, for: date) else { return false }
        guard let bounds = navigationBounds else { return true }
        return interval.end > bounds.lowerBound && interval.start <= bounds.upperBound
    }
    private func setMonth(_ month: Int, year: Int, replacing captionMonth: Date) {
        guard let date = calendar.date(from: DateComponents(year: year, month: month, day: 1)) else { preconditionFailure("Calendar did not resolve a caption selection") }
        guard let offset = calendar.dateComponents([.month], from: displayedMonth, to: captionMonth).month else { preconditionFailure("Calendar did not resolve a caption offset") }
        displayedMonth = Self.clampMonth(adding(.month, -offset, to: date), range: navigationBounds, count: options.count, calendar: calendar)
    }
    private func format(_ date: Date, _ pattern: String) -> String { guard let formatter = formatters[pattern] else { preconditionFailure("Unknown calendar date format") }; return formatter.string(from: date) }
    private func adding(_ component: Calendar.Component, _ count: Int, to date: Date) -> Date { guard let date = calendar.date(byAdding: component, value: count, to: date) else { preconditionFailure("Calendar could not navigate") }; return date }
    private func startMonth(_ date: Date) -> Date { guard let interval = calendar.dateInterval(of: .month, for: date) else { preconditionFailure("Calendar did not resolve a month") }; return interval.start }
    private static func navigationRange(_ allowed: ClosedRange<Date>?, options: FabricatorCalendarOptions, calendar: Calendar) -> ClosedRange<Date>? {
        if let allowed { return allowed }
        guard options.caption == .dropdown else { return nil }
        guard let year = calendar.dateInterval(of: .year, for: options.reference), let start = calendar.date(byAdding: .year, value: -100, to: year.start) else { preconditionFailure("Calendar did not resolve its year dropdown") }
        return start...year.end.addingTimeInterval(-1)
    }
    private static func clampMonth(_ date: Date, range: ClosedRange<Date>?, count: Int, calendar: Calendar) -> Date {
        guard let month = calendar.dateInterval(of: .month, for: date)?.start else { preconditionFailure("Calendar did not resolve a month") }
        guard let range else { return month }
        guard let first = calendar.dateInterval(of: .month, for: range.lowerBound)?.start, let last = calendar.dateInterval(of: .month, for: range.upperBound)?.start, let limit = calendar.date(byAdding: .month, value: 1 - count, to: last) else { preconditionFailure("Calendar did not resolve navigation bounds") }
        return min(max(month, first), max(first, limit))
    }
}

private struct FabricatorCalendarButtonStyle: ButtonStyle {
    @Environment(\.fabricatorTheme) private var theme
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.isFocused) private var isFocused
    @State private var isHovered = false
    var isSelected = false
    var isToday = false
    var isOutside = false
    var hasFocus = false
    var slot: CGFloat
    func makeBody(configuration: Configuration) -> some View {
        let fill = isSelected ? theme.color("primary").opacity(isHovered ? 0.9 : 1) : isHovered ? theme.color("hover") : isToday ? theme.color("active") : .clear
        return configuration.label.background(fill, in: RoundedRectangle(cornerRadius: theme.radius()))
            .foregroundStyle(theme.color(isSelected ? "primary-foreground" : isOutside && !isHovered ? "muted-foreground" : "foreground"))
            .overlay { if hasFocus || isFocused { RoundedRectangle(cornerRadius: theme.radius()).strokeBorder(theme.color("focus-ring"), lineWidth: 1) } }
            .scaleEffect(configuration.isPressed && isEnabled ? theme.pressScale : 1).opacity(isEnabled ? 1 : 0.5)
            .animation(theme.animation("feedback"), value: configuration.isPressed).animation(theme.animation("feedback"), value: isHovered).animation(theme.animation("feedback"), value: isSelected)
            .frame(width: slot, height: slot).contentShape(Rectangle()).onHover { isHovered = $0 }
    }
}
