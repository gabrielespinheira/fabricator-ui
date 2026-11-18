import SwiftUI

public struct FabricatorTimeInput: View {
    @Environment(\.fabricatorTheme) private var theme
    @Environment(\.isEnabled) private var isEnabled
    @State private var input: FabricatorTimeInputState
    @State private var isPresented = false
    @State private var isHovered = false
    @State private var shouldFocusWheel = false
    @State private var fieldWidth: CGFloat = 0
    @FocusState private var isFocused: Bool
    @Binding public var selection: Date?
    public var label: String
    public var placeholder: String
    public var isInvalid: Bool
    public var hourCycle: FabricatorHourCycle?
    public var hasSeconds: Bool
    public var step: Int
    public var allowedRange: ClosedRange<FabricatorTimeOfDay>?
    private var calendar: Calendar
    private var referenceDate: Date
    private var allowsEmptyValue: Bool
    private struct Configuration: Hashable { var cycle: FabricatorHourCycle; var hasSeconds: Bool; var calendar: Calendar }
    public init(_ label: String = "Time", selection: Binding<Date>, placeholder: String = "Choose time", isInvalid: Bool = false, hourCycle: FabricatorHourCycle? = nil, hasSeconds: Bool = false, step: Int = 1, allowedRange: ClosedRange<FabricatorTimeOfDay>? = nil, calendar: Calendar = .current, referenceDate: Date = .now) {
        self.init(label, selection: Binding<Date?>(get: { selection.wrappedValue }, set: { date in guard let date else { preconditionFailure("A required time cannot be cleared") }; selection.wrappedValue = date }), placeholder: placeholder, isInvalid: isInvalid, hourCycle: hourCycle, hasSeconds: hasSeconds, step: step, allowedRange: allowedRange, calendar: calendar, referenceDate: referenceDate, allowsEmptyValue: false)
    }
    public init(_ label: String = "Time", selection: Binding<Date?>, placeholder: String = "Choose time", isInvalid: Bool = false, hourCycle: FabricatorHourCycle? = nil, hasSeconds: Bool = false, step: Int = 1, allowedRange: ClosedRange<FabricatorTimeOfDay>? = nil, calendar: Calendar = .current, referenceDate: Date = .now) {
        self.init(label, selection: selection, placeholder: placeholder, isInvalid: isInvalid, hourCycle: hourCycle, hasSeconds: hasSeconds, step: step, allowedRange: allowedRange, calendar: calendar, referenceDate: referenceDate, allowsEmptyValue: true)
    }
    private init(_ label: String, selection: Binding<Date?>, placeholder: String, isInvalid: Bool, hourCycle: FabricatorHourCycle?, hasSeconds: Bool, step: Int, allowedRange: ClosedRange<FabricatorTimeOfDay>?, calendar: Calendar, referenceDate: Date, allowsEmptyValue: Bool) {
        self.label = label; _selection = selection; self.placeholder = placeholder; self.isInvalid = isInvalid; self.hourCycle = hourCycle; self.hasSeconds = hasSeconds; self.step = step; self.allowedRange = allowedRange; self.calendar = calendar; self.referenceDate = referenceDate; self.allowsEmptyValue = allowsEmptyValue
        let value = selection.wrappedValue.map { FabricatorTimeOfDay($0, calendar: calendar).normalized(hasSeconds: hasSeconds) }
        _input = State(initialValue: FabricatorTimeInputState(value: value, text: FabricatorTimeInputModel.format(value, hourCycle: hourCycle ?? .resolve(calendar.locale ?? .current), hasSeconds: hasSeconds)))
    }
    private var cycle: FabricatorHourCycle { hourCycle ?? .resolve(calendar.locale ?? .current) }
    private var time: FabricatorTimeOfDay? { selection.map { FabricatorTimeOfDay($0, calendar: calendar).normalized(hasSeconds: hasSeconds) } }
    private var configuration: Configuration { Configuration(cycle: cycle, hasSeconds: hasSeconds, calendar: calendar) }
    private var preview: FabricatorTimeTextCommit { FabricatorTimeInputModel.commit(input.text, hourCycle: cycle, allowedRange: allowedRange) }
    private var shouldBlockSubmission: Bool { preview.text != input.text || preview.isInvalid || (!allowsEmptyValue && preview.value == nil) }
    public var body: some View {
        HStack(spacing: theme.space(8)) {
            Button { isFocused = true; open(focusWheel: false) } label: { FabricatorIcon("clock-3", size: theme.icon(16), strokeWidth: isFocused ? 2 : 1.5).foregroundStyle(theme.color(isFocused ? "foreground" : "muted-foreground")) }
                .buttonStyle(.plain).accessibilityLabel("Open \(label)").accessibilityValue(isPresented ? "Expanded" : "Collapsed")
            TextField("", text: $input.text, prompt: Text(placeholder).foregroundStyle(theme.color("muted-foreground")))
                .textFieldStyle(.plain).monospacedDigit().autocorrectionDisabled().focused($isFocused)
                .frame(minWidth: minimumTextWidth).accessibilityLabel(label).accessibilityHint(input.isInvalid || isInvalid ? "Invalid time. Opens time wheel." : "Type a time or use the time wheel.")
                .onSubmit { commitText(); isPresented = false }.submitScope(shouldBlockSubmission)
                .onChange(of: isFocused) { wasFocused, focused in if wasFocused && !focused && isEnabled { commitText() } }
                .onKeyPress(keys: [.upArrow, .downArrow]) { _ in commitText(); open(focusWheel: true); return .handled }
                .onKeyPress(.escape) { guard isPresented else { return .ignored }; isPresented = false; return .handled }
                .simultaneousGesture(TapGesture().onEnded { open(focusWheel: false) })
        }.modifier(FabricatorInputFrame(isFocused: isFocused, isInvalid: isInvalid || input.isInvalid, isHovered: isHovered)).onHover { isHovered = $0 }
            .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { fieldWidth = $0 }
            .fabricatorPopup(isPresented: $isPresented, minimumWidth: max(fieldWidth, FabricatorTimeWheel.getMinimumWidth(theme: theme, hourCycle: cycle, hasSeconds: hasSeconds) + theme.space(8)), preservesTextFocus: true, onDismiss: restoreFocus) {
                FabricatorTimeWheel(selection: Binding(get: { selection ?? referenceDate }, set: { pick($0) }), hourCycle: cycle, hasSeconds: hasSeconds, step: step, allowedRange: allowedRange, calendar: calendar, label: "Choose \(label)", autoFocus: shouldFocusWheel, onFocus: { isFocused = false })
                    .disabled(!isPresented)
                    .padding(theme.space(4)).frame(maxWidth: .infinity, alignment: .leading)
                    .fabricatorSurface(radius: "xl", elevation: "surface-3", fill: theme.color("surface-3"))
                    .onKeyPress(keys: [.return, .escape]) { _ in isPresented = false; return .handled }
            }
            .onChange(of: selection) { _, _ in input.synchronize(time, text: format(time)) }
            .onChange(of: configuration) { _, _ in input = FabricatorTimeInputState(value: time, text: format(time)) }
            .onChange(of: isEnabled) { _, enabled in if !enabled { isPresented = false; isFocused = false } }
    }
    private var minimumTextWidth: CGFloat {
        let widest = FabricatorTimeInputModel.format(FabricatorTimeOfDay(hours: 22, minutes: 0), hourCycle: cycle, hasSeconds: hasSeconds)
        return FabricatorFontAdapter.measureTextWidth(widest, font: FabricatorFontAdapter.withMonospacedDigits(theme.resolveFont(theme.text(), weight: .regular)))
    }
    private func format(_ value: FabricatorTimeOfDay?) -> String { FabricatorTimeInputModel.format(value, hourCycle: cycle, hasSeconds: hasSeconds) }
    private func commitText() {
        let value = input.commit(preview, allowsEmptyValue: allowsEmptyValue, hasSeconds: hasSeconds)
        if value != time { selection = value.map { $0.makeDate(on: selection ?? referenceDate, calendar: calendar) } }
    }
    private func pick(_ date: Date) {
        guard isPresented && isEnabled else { return }
        let value = FabricatorTimeOfDay(date, calendar: calendar).normalized(hasSeconds: hasSeconds)
        input = FabricatorTimeInputState(value: value, text: format(value))
        if value != time { selection = value.makeDate(on: selection ?? referenceDate, calendar: calendar) }
    }
    private func open(focusWheel: Bool) { guard isEnabled else { return }; shouldFocusWheel = focusWheel; if focusWheel { isFocused = false }; isPresented = true }
    private func restoreFocus() { guard !isPresented else { return }; shouldFocusWheel = false; if isEnabled { isFocused = true } }
}
