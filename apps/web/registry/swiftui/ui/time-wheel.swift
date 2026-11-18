import SwiftUI

public struct FabricatorTimeWheel: View {
    @Environment(\.fabricatorTheme) private var theme
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.fabricatorPopupAvailableHeight) private var availableHeight
    @FocusState private var focusedColumn: FabricatorTimeWheelModel.Component?
    @Binding public var selection: Date
    public var hourCycle: FabricatorHourCycle?
    public var hasSeconds: Bool
    public var step: Int
    public var allowedRange: ClosedRange<FabricatorTimeOfDay>?
    public var label: String
    public var height: CGFloat?
    public var autoFocus: Bool
    private var onFocus: () -> Void
    private var calendar: Calendar
    private struct Configuration: Hashable { var cycle: FabricatorHourCycle; var hasSeconds: Bool; var step: Int; var range: ClosedRange<FabricatorTimeOfDay>?; var calendar: Calendar }
    public init(selection: Binding<Date>, hourCycle: FabricatorHourCycle? = nil, hasSeconds: Bool = false, step: Int = 1, allowedRange: ClosedRange<FabricatorTimeOfDay>? = nil, calendar: Calendar = .current, label: String = "Time", height: CGFloat? = nil, autoFocus: Bool = false, onFocus: @escaping () -> Void = {}) {
        _selection = selection; self.hourCycle = hourCycle; self.hasSeconds = hasSeconds; self.step = step; self.allowedRange = allowedRange; self.calendar = calendar; self.label = label
        self.height = height; self.autoFocus = autoFocus
        self.onFocus = onFocus
    }
    private var cycle: FabricatorHourCycle { hourCycle ?? .resolve(calendar.locale ?? .current) }
    private var time: FabricatorTimeOfDay { FabricatorTimeOfDay(selection, calendar: calendar).normalized(hasSeconds: hasSeconds) }
    private var rowHeight: CGFloat { theme.minimumControlHeight(32, textStep: 16) }
    private var wheelHeight: CGFloat { max(rowHeight, min(height ?? rowHeight * 7, availableHeight - theme.space(8))) }
    private var columns: [FabricatorTimeWheelModel.Component] { [.hours, .minutes] + (hasSeconds ? [.seconds] : []) + (cycle == .twelve ? [.meridiem] : []) }
    public var body: some View {
        HStack(spacing: theme.space(4)) {
            makeColumn(.hours, values: FabricatorTimeWheelModel.getHourValues(cycle), value: cycle == .twelve ? time.hour12 : time.hours)
            makeColumn(.minutes, values: FabricatorTimeWheelModel.getMinuteValues(step: step), value: time.minutes)
            if hasSeconds { makeColumn(.seconds, values: FabricatorTimeWheelModel.getMinuteValues(step: 1), value: time.seconds) }
            if cycle == .twelve { makeColumn(.meridiem, values: [0, 1], value: time.meridiem) }
        }.padding(.horizontal, theme.space(4)).frame(height: wheelHeight)
            .background { RoundedRectangle(cornerRadius: theme.radius()).fill(theme.color("active")).frame(height: rowHeight).allowsHitTesting(false) }
            .opacity(isEnabled ? 1 : 0.5)
            .id(Configuration(cycle: cycle, hasSeconds: hasSeconds, step: step, range: allowedRange, calendar: calendar))
            .accessibilityElement(children: .contain).accessibilityLabel(label)
            .task(id: autoFocus) { if autoFocus && isEnabled { await Task.yield(); focusedColumn = .hours } }
    }
    private func makeColumn(_ component: FabricatorTimeWheelModel.Component, values: [Int], value: Int) -> some View {
        FabricatorTimeWheelColumn(component: component, values: values, value: value, rowHeight: rowHeight, height: wheelHeight, width: Self.measureColumnWidth(for: component, theme: theme), hourCycle: cycle, focus: $focusedColumn, onFocus: onFocus, onMoveFocus: { moveFocus(from: component, isBackward: $0) }) { next in
            let changed = time.changing(component, to: next, hourCycle: cycle, hasSeconds: hasSeconds).clamped(to: allowedRange, hasSeconds: hasSeconds)
            if changed != time { selection = changed.makeDate(on: selection, calendar: calendar) }
        }
    }
    private func moveFocus(from component: FabricatorTimeWheelModel.Component, isBackward: Bool) -> Bool {
        guard let index = columns.firstIndex(of: component) else { preconditionFailure("Focused time column is not in the wheel") }
        let next = index + (isBackward ? -1 : 1)
        guard columns.indices.contains(next) else { return false }
        focusedColumn = columns[next]; return true
    }
    static func getMinimumWidth(theme: FabricatorTheme, hourCycle: FabricatorHourCycle, hasSeconds: Bool) -> CGFloat {
        let columns: [FabricatorTimeWheelModel.Component] = [.hours, .minutes] + (hasSeconds ? [.seconds] : []) + (hourCycle == .twelve ? [.meridiem] : [])
        return columns.reduce(theme.space(4) * CGFloat(columns.count + 1)) { $0 + measureColumnWidth(for: $1, theme: theme) }
    }
    private static func measureColumnWidth(for component: FabricatorTimeWheelModel.Component, theme: FabricatorTheme) -> CGFloat {
        let font = FabricatorFontAdapter.withMonospacedDigits(theme.resolveFont(theme.text(16), weight: .semibold))
        let labels = component == .meridiem ? ["AM", "PM"] : ["88"]
        guard let measured = labels.map({ FabricatorFontAdapter.measureTextWidth($0, font: font) }).max() else { preconditionFailure("A time column must have labels") }
        return max(theme.space(48), theme.minimumHitSize, measured + theme.space(6) * 2)
    }
}

private struct FabricatorTimeWheelColumn: View {
    @Environment(\.fabricatorTheme) private var theme
    @Environment(\.isEnabled) private var isEnabled
    @State private var settler = FabricatorTimeWheelSettler()
    @State private var viewportSize = CGSize.zero
    @Namespace private var scrollSpace
    let component: FabricatorTimeWheelModel.Component
    let values: [Int]
    let value: Int
    let rowHeight: CGFloat
    let height: CGFloat
    let width: CGFloat
    let hourCycle: FabricatorHourCycle
    let focus: FocusState<FabricatorTimeWheelModel.Component?>.Binding
    let onFocus: () -> Void
    let onMoveFocus: (Bool) -> Bool
    let onValueChange: (Int) -> Void
    private struct Layout: Hashable { var width: CGFloat; var height: CGFloat; var rowHeight: CGFloat }
    init(component: FabricatorTimeWheelModel.Component, values: [Int], value: Int, rowHeight: CGFloat, height: CGFloat, width: CGFloat, hourCycle: FabricatorHourCycle, focus: FocusState<FabricatorTimeWheelModel.Component?>.Binding, onFocus: @escaping () -> Void, onMoveFocus: @escaping (Bool) -> Bool, onValueChange: @escaping (Int) -> Void) {
        self.component = component; self.values = values; self.value = value; self.rowHeight = rowHeight; self.height = height; self.width = width; self.hourCycle = hourCycle; self.focus = focus; self.onMoveFocus = onMoveFocus; self.onValueChange = onValueChange
        self.onFocus = onFocus
    }
    private var selected: Int { values[FabricatorTimeWheelModel.findNearestIndex(in: values, to: value)] }
    private var hasFocus: Bool { focus.wrappedValue == component }
    var body: some View {
        let columnWidth = width, columnHeight = height, selectedValue = selected
        let space = scrollSpace, hasMotion = theme.hasMotion, perspective = columnWidth / theme.space(240)
        return ScrollViewReader { proxy in
        ScrollView(.vertical) {
            VStack(spacing: 0) {
                Color.clear.frame(height: (columnHeight - rowHeight) / 2)
                ForEach(values, id: \.self) { row in
                    Text(formatLabel(row)).font(theme.font(theme.text(16), weight: row == selectedValue ? .semibold : .regular)).monospacedDigit().fixedSize(horizontal: true, vertical: false)
                        .foregroundStyle(theme.color(row == selectedValue ? "foreground" : "muted-foreground"))
                        .animation(theme.animation("feedback"), value: row == selectedValue)
                        .frame(width: columnWidth, height: rowHeight).contentShape(Rectangle()).onTapGesture { if isEnabled { settler.stop(); onFocus(); focus.wrappedValue = component; onValueChange(row) } }
                        .visualEffect { content, proxy in
                            content.rotation3DEffect(.degrees(FabricatorTimeWheelModel.getTiltAngle(offset: proxy.frame(in: .named(space)).midY - columnHeight / 2, height: columnHeight, hasMotion: hasMotion)), axis: (x: 1, y: 0, z: 0), perspective: perspective)
                        }.accessibilityHidden(true).id(row)
                }
                Color.clear.frame(height: (columnHeight - rowHeight) / 2)
            }.onGeometryChange(for: CGFloat.self) { -$0.frame(in: .named(space)).minY } action: { offset in
                settler.offset = offset; settle()
            }
        }.scrollIndicators(.hidden).scrollTargetBehavior(FabricatorTimeWheelSnap(rowHeight: rowHeight, count: values.count))
            .frame(width: columnWidth, height: columnHeight).coordinateSpace(name: space)
            .onGeometryChange(for: CGSize.self) { $0.size } action: { viewportSize = $0 }
            .modifier(FabricatorTimeWheelScrollActivity(onStart: { settler.begin() }, onEnd: settle))
            .mask(LinearGradient(stops: [.init(color: .clear, location: 0), .init(color: .black.opacity(0.15), location: 0.15), .init(color: .black.opacity(0.6), location: 0.5 - rowHeight * 1.5 / height), .init(color: .black, location: 0.5 - rowHeight / 2 / height), .init(color: .black, location: 0.5 + rowHeight / 2 / height), .init(color: .black.opacity(0.6), location: 0.5 + rowHeight * 1.5 / height), .init(color: .black.opacity(0.15), location: 0.85), .init(color: .clear, location: 1)], startPoint: .top, endPoint: .bottom))
            .overlay { if hasFocus { RoundedRectangle(cornerRadius: theme.radius()).strokeBorder(theme.color("focus-ring"), lineWidth: 1) } }
            .scrollDisabled(!isEnabled).allowsHitTesting(isEnabled)
            .focusable(isEnabled, interactions: .edit).focused(focus, equals: component).focusEffectDisabled()
            .onKeyPress(keys: [.tab]) { press in guard isEnabled else { return .ignored }; return onMoveFocus(press.modifiers.contains(.shift)) ? .handled : .ignored }
            .onKeyPress(keys: [.upArrow, .downArrow, .pageUp, .pageDown, .home, .end]) { press in
                guard isEnabled else { return .ignored }
                settler.stop(); onFocus()
                let page = component == .meridiem ? 1 : 5
                let amount: Int = switch press.key { case .upArrow: -1; case .downArrow: 1; case .pageUp: -page; case .pageDown: page; case .home: -values.count; default: values.count }
                onValueChange(FabricatorTimeWheelModel.move(in: values, from: value, by: amount)); return .handled
            }
            .onChange(of: value) { _, next in
                settler.stop()
                let index = FabricatorTimeWheelModel.findNearestIndex(in: values, to: next)
                guard abs(settler.offset - CGFloat(index) * rowHeight) >= 0.5 else { return }
                withAnimation(theme.animation("move")) { proxy.scrollTo(values[index], anchor: .center) }
            }
            .onChange(of: isEnabled) { _, enabled in if !enabled { settler.stop(); if hasFocus { focus.wrappedValue = nil } } }
            .task(id: Layout(width: viewportSize.width, height: viewportSize.height, rowHeight: rowHeight)) {
                guard viewportSize.width > 0 && viewportSize.height > 0 else { return }
                settler.stop(); let generation = settler.generation
                await Task.yield()
                guard !Task.isCancelled && generation == settler.generation else { return }
                let index = FabricatorTimeWheelModel.findNearestIndex(in: values, to: selectedValue)
                guard abs(settler.offset - CGFloat(index) * rowHeight) >= 0.5 else { return }
                proxy.scrollTo(selectedValue, anchor: .center)
            }
            .onDisappear { settler.stop(); if hasFocus { focus.wrappedValue = nil } }
            .accessibilityElement(children: .ignore).accessibilityLabel(component.label).accessibilityValue(formatLabel(selected))
            .accessibilityAdjustableAction { direction in if isEnabled { settler.stop(); onFocus(); onValueChange(FabricatorTimeWheelModel.move(in: values, from: value, by: direction == .increment ? 1 : -1)) } }
            .accessibilityIdentifier("fabricator-time-wheel-\(component.rawValue)")
        }
    }
    private func settle() {
        settler.schedule {
            guard isEnabled else { return }
            let row = values[FabricatorTimeWheelModel.getSnapIndex(offset: settler.offset, rowHeight: rowHeight, count: values.count)]
            if row != value { onValueChange(row) }
        }
    }
    private func formatLabel(_ value: Int) -> String { component == .meridiem ? (value == 0 ? "AM" : "PM") : component == .hours && hourCycle == .twelve ? String(value) : FabricatorTimeOfDay.pad(value) }
}

private struct FabricatorTimeWheelSnap: ScrollTargetBehavior {
    var rowHeight: CGFloat
    var count: Int
    func updateTarget(_ target: inout ScrollTarget, context: TargetContext) {
        // Explicit programmatic anchors already identify the row to center.
        guard target.anchor == nil else { return }
        let index = FabricatorTimeWheelModel.getSnapIndex(offset: target.rect.minY, rowHeight: rowHeight, count: count)
        target.rect.origin.y = CGFloat(index) * rowHeight
    }
}

@MainActor private final class FabricatorTimeWheelSettler {
    private var task: Task<Void, Never>?
    private var hasUserIntent = false
    private(set) var generation = 0
    var offset: CGFloat = 0
    func begin() { hasUserIntent = true; task?.cancel(); task = nil; generation += 1 }
    func schedule(_ action: @escaping @MainActor () -> Void) {
        guard hasUserIntent else { return }
        task?.cancel()
        // Layout and programmatic centering must never publish a new value.
        task = Task {
            do { try await Task.sleep(for: .milliseconds(120)) }
            catch is CancellationError { return }
            catch { preconditionFailure("Time Wheel settling failed: \(error)") }
            hasUserIntent = false; action()
        }
    }
    func stop() { task?.cancel(); task = nil; hasUserIntent = false; generation += 1 }
}
