import SwiftUI

public struct FabricatorDatePicker: View {
    @Environment(\.fabricatorTheme) private var theme
    @Environment(\.isEnabled) private var isEnabled
    @State private var isPresented = false
    @State private var isHovered = false
    @State private var input: FabricatorDateInputState
    @State private var draftDay: Date?
    @State private var draftTime = Date.now
    @FocusState private var isFocused: Bool
    @Binding public var selection: Date?
    public var label: String
    public var placeholder: String
    public var isInvalid: Bool
    public var allowedRange: ClosedRange<Date>?
    public let granularity: FabricatorDateGranularity
    public let isEditable: Bool
    public let dateFormat: String?
    public let hasTime: Bool
    public let hasSeconds: Bool
    public let hourCycle: FabricatorHourCycle?
    public let step: Int
    public let timeLabel: String
    private var calendar: Calendar
    private var referenceDate: Date
    private var allowsEmptyValue: Bool
    private struct Configuration: Hashable { var calendar: Calendar; var granularity: FabricatorDateGranularity; var format: String?; var isEditable: Bool; var hasTime: Bool; var hasSeconds: Bool; var cycle: FabricatorHourCycle }
    private struct PanelIdentity: Hashable { var configuration: Configuration; var date: Date? }

    public init(_ label: String? = nil, selection: Binding<Date>, placeholder: String? = nil, isInvalid: Bool = false, allowedRange: ClosedRange<Date>? = nil, calendar: Calendar = .current, referenceDate: Date = .now, granularity: FabricatorDateGranularity = .day, isEditable: Bool = false, dateFormat: String? = nil, hasTime: Bool = false, hasSeconds: Bool = false, hourCycle: FabricatorHourCycle? = nil, step: Int = 1, timeLabel: String = "Choose time") {
        self.init(label, selection: Binding<Date?>(get: { selection.wrappedValue }, set: { date in guard let date else { preconditionFailure("A required date cannot be cleared") }; selection.wrappedValue = date }), placeholder: placeholder, isInvalid: isInvalid, allowedRange: allowedRange, calendar: calendar, referenceDate: referenceDate, granularity: granularity, isEditable: isEditable, dateFormat: dateFormat, hasTime: hasTime, hasSeconds: hasSeconds, hourCycle: hourCycle, step: step, timeLabel: timeLabel, allowsEmptyValue: false)
    }
    public init(_ label: String? = nil, selection: Binding<Date?>, placeholder: String? = nil, isInvalid: Bool = false, allowedRange: ClosedRange<Date>? = nil, calendar: Calendar = .current, referenceDate: Date = .now, granularity: FabricatorDateGranularity = .day, isEditable: Bool = false, dateFormat: String? = nil, hasTime: Bool = false, hasSeconds: Bool = false, hourCycle: FabricatorHourCycle? = nil, step: Int = 1, timeLabel: String = "Choose time") {
        self.init(label, selection: selection, placeholder: placeholder, isInvalid: isInvalid, allowedRange: allowedRange, calendar: calendar, referenceDate: referenceDate, granularity: granularity, isEditable: isEditable, dateFormat: dateFormat, hasTime: hasTime, hasSeconds: hasSeconds, hourCycle: hourCycle, step: step, timeLabel: timeLabel, allowsEmptyValue: true)
    }
    private init(_ label: String?, selection: Binding<Date?>, placeholder: String?, isInvalid: Bool, allowedRange: ClosedRange<Date>?, calendar: Calendar, referenceDate: Date, granularity: FabricatorDateGranularity, isEditable: Bool, dateFormat: String?, hasTime: Bool, hasSeconds: Bool, hourCycle: FabricatorHourCycle?, step: Int, timeLabel: String, allowsEmptyValue: Bool) {
        self.label = label ?? (granularity == .day ? "Pick a date" : "Choose \(granularity.rawValue)"); _selection = selection; self.placeholder = placeholder ?? granularity.placeholder; self.isInvalid = isInvalid; self.allowedRange = allowedRange; self.calendar = calendar; self.referenceDate = referenceDate; self.granularity = granularity; self.isEditable = isEditable; self.dateFormat = dateFormat; self.allowsEmptyValue = allowsEmptyValue
        self.hasTime = hasTime && granularity == .day; self.hasSeconds = hasSeconds; self.hourCycle = hourCycle; self.step = step; self.timeLabel = timeLabel
        if self.hasTime && placeholder == nil { self.placeholder = "Pick a date and time" }
        _input = State(initialValue: FabricatorDateInputState(value: selection.wrappedValue, text: selection.wrappedValue.map { Self.format($0, granularity: granularity, dateFormat: dateFormat, isEditable: isEditable, calendar: calendar, hasTime: hasTime && granularity == .day, hasSeconds: hasSeconds, hourCycle: hourCycle ?? .resolve(calendar.locale ?? .current)) } ?? ""))
    }
    public var body: some View {
        field.fabricatorPopup(isPresented: $isPresented, minimumWidth: popupWidth, onDismiss: restoreFocus) {
            panel.id(PanelIdentity(configuration: configuration, date: panelDate.map { FabricatorDateGrid.start($0, granularity: granularity == .day ? .month : granularity, calendar: calendar) }))
                .disabled(!isPresented)
                .fabricatorSurface(radius: "xl", elevation: "surface-3", fill: theme.color("surface-3"))
                .onKeyPress(.escape) { isPresented = false; return .handled }
        }
        .onChange(of: isEnabled) { _, enabled in if !enabled { isPresented = false; isFocused = false } }
        .onChange(of: selection) { _, value in input.synchronize(value, text: value.map(format) ?? "", granularity: granularity, calendar: calendar, hasTime: hasTime, hasSeconds: hasSeconds) }
        .onChange(of: configuration) { _, _ in input = FabricatorDateInputState(value: selection, text: selection.map(format) ?? "") }
    }
    @ViewBuilder private var field: some View {
        if isEditable {
            HStack(spacing: theme.space(8)) {
                TextField("", text: $input.text, prompt: Text(placeholder).foregroundStyle(theme.color("muted-foreground")))
                    .textFieldStyle(.plain).monospacedDigit().focused($isFocused).accessibilityLabel(label)
                    .accessibilityHint(input.isInvalid || isInvalid ? "Invalid date. \(openingHint)" : openingHint)
                    .onSubmit { commitText() }.submitScope(shouldBlockSubmission)
                    .onChange(of: isFocused) { wasFocused, focused in if wasFocused && !focused && isEnabled { commitText() } }
                    .onKeyPress(keys: [.downArrow]) { press in guard press.modifiers.contains(.option) else { return .ignored }; open(); return .handled }
                Button(action: open) { FabricatorIcon("calendar", size: theme.icon(14)) }
                    .buttonStyle(FabricatorButtonStyle(variant: .ghost, size: .iconXs, hasLeadingIcon: true))
                    .background(isPresented ? theme.color("active") : .clear, in: RoundedRectangle(cornerRadius: theme.radius()))
                    .padding(.trailing, (theme.controlHeight - theme.minimumControlHeight(24, textStep: 12)) / 2 - theme.space(10))
                    .accessibilityLabel("Open \(label)").accessibilityValue(isPresented ? "Expanded" : "Collapsed")
            }.modifier(FabricatorInputFrame(isFocused: isPresented || isFocused, isInvalid: isInvalid || input.isInvalid, isHovered: isHovered)).onHover { isHovered = $0 }
        } else {
            Button { if isPresented { isPresented = false } else { open() } } label: {
                HStack(spacing: theme.space(8)) {
                    Text(selection.map(format) ?? placeholder).monospacedDigit().foregroundStyle(theme.color(selection == nil ? "muted-foreground" : "foreground")).lineLimit(1)
                    Spacer(minLength: theme.space(8))
                    FabricatorIcon("calendar", size: theme.icon()).foregroundStyle(theme.color("muted-foreground"))
                }.modifier(FabricatorInputFrame(isFocused: isPresented || isFocused, isInvalid: isInvalid, isHovered: isHovered))
            }.buttonStyle(.plain).focused($isFocused).focusEffectDisabled().onHover { isHovered = $0 }
                .accessibilityLabel(label).accessibilityValue(selection.map(format) ?? "No \(granularity == .day ? "date" : granularity.rawValue) selected").accessibilityHint(isInvalid ? "Invalid date. \(openingHint)" : openingHint)
        }
    }
    private var cycle: FabricatorHourCycle { hourCycle ?? .resolve(calendar.locale ?? .current) }
    private var configuration: Configuration { Configuration(calendar: calendar, granularity: granularity, format: dateFormat, isEditable: isEditable, hasTime: hasTime, hasSeconds: hasSeconds, cycle: cycle) }
    private var openingHint: String { hasTime ? "Opens calendar and time wheel." : granularity == .day ? "Opens calendar." : "Opens \(granularity.rawValue) picker." }
    private var popupWidth: CGFloat { granularity == .day ? 7 * max(theme.minimumHitSize, theme.minimumControlHeight(32)) + theme.space(12) * 2 + (hasTime ? FabricatorTimeWheel.getMinimumWidth(theme: theme, hourCycle: cycle, hasSeconds: hasSeconds) + theme.space(8) + 1 : 0) : FabricatorDatePickerGrid.minimumWidth(theme: theme, granularity: granularity, calendar: calendar) }
    private var dateText: String { hasTime ? FabricatorTimeInputModel.splitDateTime(input.text).dateText : input.text }
    private var panelDate: Date? { isEditable ? Self.withEngine { try $0.parse(dateText, referenceDate: referenceDate, granularity: granularity, format: dateFormat, calendar: calendar) } ?? selection : selection }
    @ViewBuilder private var panel: some View {
        if granularity == .day { FabricatorDatePickerDayPanel(day: $draftDay, time: $draftTime, defaultMonth: panelDate, hasTime: hasTime, hasSeconds: hasSeconds, hourCycle: cycle, step: step, timeLabel: timeLabel, allowedRange: allowedRange, calendar: calendar, referenceDate: referenceDate, onDayChange: select, onTimeChange: selectTime, onTimeDone: { isPresented = false }) }
        else { FabricatorDatePickerGrid(selection: selection, granularity: granularity, allowedRange: allowedRange, calendar: calendar, referenceDate: referenceDate, label: label, defaultFocus: panelDate, onSelect: select) }
    }
    private var preview: FabricatorDateTextCommit {
        let commit = Self.withEngine { try $0.commit(dateText, referenceDate: referenceDate, granularity: granularity, format: dateFormat, allowedRange: allowedRange, calendar: calendar) }
        return hasTime ? FabricatorDateTimeInputModel.compose(commit, timeText: FabricatorTimeInputModel.splitDateTime(input.text).timeText, originalText: input.text, keptValue: selection, hourCycle: cycle, hasSeconds: hasSeconds, calendar: calendar) : commit
    }
    private var shouldBlockSubmission: Bool {
        let result = preview
        return result.isInvalid || (!allowsEmptyValue && result.value == nil) || result.text != input.text || !isSame(result.value, selection)
    }
    private func commitText() {
        let date = input.commit(preview, allowsEmptyValue: allowsEmptyValue)
        if !isSame(date, selection) { selection = date }
    }
    private func open() { if isEditable { commitText() }; draftDay = selection; draftTime = selection ?? referenceDate; isFocused = false; isPresented = true }
    private func restoreFocus() { if isEditable && isEnabled && !isPresented { isFocused = true } }
    private func select(_ date: Date) {
        guard isPresented && isEnabled else { return }
        draftDay = date
        let date = hasTime ? FabricatorTimeOfDay(draftTime, calendar: calendar).normalized(hasSeconds: hasSeconds).makeDate(on: date, calendar: calendar) : date
        commitValue(date)
        if !hasTime { isPresented = false }
    }
    private func selectTime(_ date: Date) {
        guard isPresented && isEnabled else { return }
        draftTime = date
        if let draftDay { commitValue(FabricatorTimeOfDay(date, calendar: calendar).makeDate(on: draftDay, calendar: calendar)) }
    }
    private func commitValue(_ date: Date) {
        input = FabricatorDateInputState(value: date, text: format(date))
        if !isSame(date, selection) { selection = date }
    }
    private func isSame(_ first: Date?, _ second: Date?) -> Bool { FabricatorDateInputState.isSame(first, second, granularity: granularity, calendar: calendar, hasTime: hasTime, hasSeconds: hasSeconds) }
    private func format(_ date: Date) -> String { Self.format(date, granularity: granularity, dateFormat: dateFormat, isEditable: isEditable, calendar: calendar, hasTime: hasTime, hasSeconds: hasSeconds, hourCycle: cycle) }
    private static func format(_ date: Date, granularity: FabricatorDateGranularity, dateFormat: String?, isEditable: Bool, calendar: Calendar, hasTime: Bool, hasSeconds: Bool, hourCycle: FabricatorHourCycle) -> String {
        let dateText = formatDay(date, granularity: granularity, dateFormat: dateFormat, isEditable: isEditable, calendar: calendar)
        return hasTime ? "\(dateText), \(FabricatorTimeInputModel.format(FabricatorTimeOfDay(date, calendar: calendar), hourCycle: hourCycle, hasSeconds: hasSeconds))" : dateText
    }
    private static func formatDay(_ date: Date, granularity: FabricatorDateGranularity, dateFormat: String?, isEditable: Bool, calendar: Calendar) -> String {
        if isEditable || dateFormat != nil { return withEngine { try $0.format(date, granularity: granularity, format: dateFormat, calendar: calendar) } }
        let formatter = DateFormatter(); formatter.calendar = calendar; formatter.timeZone = calendar.timeZone; formatter.locale = calendar.locale ?? .current; formatter.dateFormat = granularity.dateFormat; return formatter.string(from: date)
    }
    private static func withEngine<Value>(_ action: (FabricatorDatePickerEngineAdapter) throws -> Value) -> Value {
        do { return try action(FabricatorDatePickerEngineAdapter.shared.get()) }
        catch { preconditionFailure("Date Picker configuration failed: \(error.localizedDescription)") }
    }
}

private struct FabricatorDatePickerDayPanel: View {
    @Environment(\.fabricatorTheme) private var theme
    @Environment(\.fabricatorPopupAvailableHeight) private var availableHeight
    @State private var calendarHeight: CGFloat?
    @Binding var day: Date?
    @Binding var time: Date
    var defaultMonth: Date?
    var hasTime: Bool
    var hasSeconds: Bool
    var hourCycle: FabricatorHourCycle
    var step: Int
    var timeLabel: String
    var allowedRange: ClosedRange<Date>?
    var calendar: Calendar
    var referenceDate: Date
    var onDayChange: (Date) -> Void
    var onTimeChange: (Date) -> Void
    var onTimeDone: () -> Void
    private var minimumCalendarWidth: CGFloat { 7 * theme.minimumControlHeight(32) + theme.space(24) }
    private var preferredCalendarWidth: CGFloat { 7 * max(theme.minimumHitSize, theme.minimumControlHeight(32)) + theme.space(24) }
    var body: some View {
        if hasTime {
            FabricatorHuggingScroll(maxHeight: availableHeight) {
            ViewThatFits(in: .horizontal) {
                HStack(spacing: 0) {
                    calendarView.frame(minWidth: minimumCalendarWidth, idealWidth: minimumCalendarWidth, maxWidth: preferredCalendarWidth)
                        .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { calendarHeight = $0 }
                    Rectangle().fill(theme.color("border")).frame(width: 1, height: calendarHeight)
                    wheel(height: calendarHeight.map { $0 - theme.space(16) }).padding(.horizontal, theme.space(4)).padding(.vertical, theme.space(8))
                }
                VStack(spacing: 0) {
                    calendarView
                    Rectangle().fill(theme.color("border")).frame(height: 1)
                    wheel(height: nil).padding(theme.space(4))
                }
            }
            }.accessibilityIdentifier("fabricator-date-picker-panel-scroll")
        } else { calendarView }
    }
    private var calendarView: some View {
        FabricatorCalendarView(selection: Binding(get: { day }, set: { if let date = $0 { onDayChange(date) } }), allowedRange: allowedRange, calendar: calendar, defaultMonth: defaultMonth, referenceDate: referenceDate, isRequired: true, autoFocus: true)
    }
    private func wheel(height: CGFloat?) -> some View {
        FabricatorTimeWheel(selection: Binding(get: { time }, set: { onTimeChange($0) }), hourCycle: hourCycle, hasSeconds: hasSeconds, step: step, calendar: calendar, label: timeLabel, height: height)
            .fixedSize(horizontal: true, vertical: false).accessibilityIdentifier("fabricator-date-picker-time-wheel")
            .onKeyPress(.return) { onTimeDone(); return .handled }
    }
}
