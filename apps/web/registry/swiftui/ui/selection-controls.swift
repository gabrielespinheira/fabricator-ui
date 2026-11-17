import SwiftUI

public struct FabricatorCheckbox: View {
    @Binding public var isOn: Bool
    public var title: String
    public var isIndeterminate: Bool
    public var isInvalid: Bool

    public init(_ title: String, isOn: Binding<Bool>, isIndeterminate: Bool = false, isInvalid: Bool = false) {
        self.title = title; _isOn = isOn; self.isIndeterminate = isIndeterminate; self.isInvalid = isInvalid
    }

    public var body: some View {
        Toggle(isOn: $isOn) { Text(title) }
            .toggleStyle(FabricatorCheckboxStyle(isIndeterminate: isIndeterminate, isInvalid: isInvalid))
            .accessibilityValue(isIndeterminate ? "Mixed" : isOn ? "Checked" : "Unchecked")
    }
}

public struct FabricatorCheckboxStyle: ToggleStyle {
    public var isIndeterminate: Bool
    public var isInvalid: Bool

    public init(isIndeterminate: Bool = false, isInvalid: Bool = false) {
        self.isIndeterminate = isIndeterminate; self.isInvalid = isInvalid
    }

    public func makeBody(configuration: Configuration) -> some View {
        Button { configuration.isOn.toggle() } label: { configuration.label }
            .buttonStyle(FabricatorCheckboxButtonStyle(isOn: configuration.isOn, isIndeterminate: isIndeterminate, isInvalid: isInvalid))
            .accessibilityAddTraits(.isToggle)
            .accessibilityAddTraits(configuration.isOn || isIndeterminate ? .isSelected : [])
            .accessibilityValue(isIndeterminate ? "Mixed" : configuration.isOn ? "Checked" : "Unchecked")
    }
}

private struct FabricatorCheckboxButtonStyle: ButtonStyle {
    @Environment(\.fabricatorTheme) private var theme
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.isFocused) private var isFocused
    @State private var isHovered = false
    var isOn: Bool
    var isIndeterminate: Bool
    var isInvalid: Bool

    func makeBody(configuration: Configuration) -> some View {
        let isFilled = isOn || isIndeterminate
        let role = isInvalid ? "destructive" : "primary"
        let border = isInvalid || isFilled ? theme.color(role) : theme.color("foreground").opacity(isHovered && isEnabled ? 0.45 : 0.25)
        return HStack(spacing: theme.space(8)) {
            RoundedRectangle(cornerRadius: 6)
                .fill(isFilled ? theme.color(role) : .clear)
                .overlay { RoundedRectangle(cornerRadius: 6).strokeBorder(border, lineWidth: 1.5) }
                .overlay { FabricatorCheckboxIndicator(isOn: isOn, isIndeterminate: isIndeterminate).foregroundStyle(theme.color("primary-foreground")) }
                .frame(width: theme.icon() + 2, height: theme.icon() + 2)
                .overlay { if isFocused { RoundedRectangle(cornerRadius: 9).strokeBorder(theme.color("focus-ring"), lineWidth: 1).padding(-3) } }
                .scaleEffect(configuration.isPressed && isEnabled && theme.hasMotion ? 0.9 : 1)
                .animation(theme.animation("feedback"), value: configuration.isPressed)
                .animation(theme.animation("feedback"), value: isFilled)
                .animation(theme.animation("feedback"), value: isInvalid)
                .animation(theme.animation("feedback"), value: isHovered)
            configuration.label.modifier(FabricatorTextMetrics(size: theme.text(), weight: .medium, lineHeight: 1.375))
                .foregroundStyle(theme.color(isInvalid ? "destructive-text" : "foreground"))
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, minHeight: theme.icon() + 2, alignment: .leading)
        .modifier(FabricatorSelectionHitArea(visualHeight: theme.icon() + 2))
        .opacity(isEnabled ? 1 : 0.5).onHover { isHovered = $0 }.focusEffectDisabled()
    }
}

private enum FabricatorCheckboxMark: Equatable { case none, check, minus }

private struct FabricatorCheckboxIndicator: View {
    @Environment(\.fabricatorTheme) private var theme
    var isOn: Bool
    var isIndeterminate: Bool
    @State private var visibility: CGFloat = 0
    @State private var checkProgress: CGFloat = 0
    @State private var minusProgress: CGFloat = 0
    @State private var revision = 0
    private var mark: FabricatorCheckboxMark { isIndeterminate ? .minus : isOn ? .check : .none }

    var body: some View {
        let size = theme.icon() - 4
        ZStack {
            FabricatorCheckboxPath(isMinus: false).trim(from: 0, to: checkProgress).stroke(style: StrokeStyle(lineWidth: size / 8, lineCap: .round, lineJoin: .round))
            FabricatorCheckboxPath(isMinus: true).trim(from: 0, to: minusProgress).stroke(style: StrokeStyle(lineWidth: size / 8, lineCap: .round, lineJoin: .round))
        }
        .frame(width: size, height: size).scaleEffect(0.6 + 0.4 * visibility)
        .opacity(visibility).blur(radius: theme.hasMotion ? 2 * (1 - visibility) : 0)
        .allowsHitTesting(false).accessibilityHidden(true)
        .onAppear { updateMark(animated: false) }
        .onChange(of: mark) { updateMark(animated: true) }
    }

    private func updateMark(animated: Bool) {
        revision += 1
        let currentRevision = revision
        let next = mark
        let isLeaving = next == .none
        withAnimation(animated ? theme.animation("feedback", easing: isLeaving ? .exit : .enter, isExiting: isLeaving) : nil, completionCriteria: .removed) {
            visibility = isLeaving ? 0 : 1
        } completion: {
            guard isLeaving && currentRevision == revision else { return }
            checkProgress = 0; minusProgress = 0
        }
        guard !isLeaving else { return }
        withAnimation(animated ? theme.animation(next == .check ? "move" : "feedback", easing: next == .check ? .enter : .exit, isExiting: next != .check) : nil) { checkProgress = next == .check ? 1 : 0 }
        withAnimation(animated ? theme.animation(next == .minus ? "move" : "feedback", easing: next == .minus ? .enter : .exit, isExiting: next != .minus) : nil) { minusProgress = next == .minus ? 1 : 0 }
    }
}

private struct FabricatorCheckboxPath: Shape {
    var isMinus: Bool
    func path(in rect: CGRect) -> Path {
        var path = Path()
        // Contract 10: use the web's short-leg-first path, not an icon's reverse path.
        if isMinus {
            path.move(to: CGPoint(x: 5, y: 12)); path.addLine(to: CGPoint(x: 19, y: 12))
        } else {
            path.move(to: CGPoint(x: 4, y: 12)); path.addLine(to: CGPoint(x: 9, y: 17)); path.addLine(to: CGPoint(x: 20, y: 6))
        }
        return path.applying(CGAffineTransform(scaleX: rect.width / 24, y: rect.height / 24).concatenating(CGAffineTransform(translationX: rect.minX, y: rect.minY)))
    }
}

public struct FabricatorSwitch: View {
    @Binding public var isOn: Bool
    public var title: String
    public var isInvalid: Bool

    public init(_ title: String, isOn: Binding<Bool>, isInvalid: Bool = false) {
        self.title = title; _isOn = isOn; self.isInvalid = isInvalid
    }

    public var body: some View { Toggle(title, isOn: $isOn).toggleStyle(FabricatorSwitchStyle(isInvalid: isInvalid)) }
}

public struct FabricatorSwitchStyle: ToggleStyle {
    public var isInvalid: Bool
    public init(isInvalid: Bool = false) { self.isInvalid = isInvalid }
    public func makeBody(configuration: Configuration) -> some View {
        Button { configuration.isOn.toggle() } label: { configuration.label }
            .buttonStyle(FabricatorSwitchButtonStyle(isOn: configuration.isOn, isInvalid: isInvalid))
            .accessibilityAddTraits(.isToggle)
            .accessibilityAddTraits(configuration.isOn ? .isSelected : [])
            .accessibilityValue(configuration.isOn ? "On" : "Off")
    }
}

private struct FabricatorSwitchButtonStyle: ButtonStyle {
    @Environment(\.fabricatorTheme) private var theme
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.isFocused) private var isFocused
    @State private var isHovered = false
    var isOn: Bool
    var isInvalid: Bool

    func makeBody(configuration: Configuration) -> some View {
        let isPressed = configuration.isPressed && isEnabled
        let isHovering = isHovered && isEnabled
        let trackHeight = theme.space(20)
        let thumb = trackHeight - 4
        let stretch: CGFloat = theme.hasMotion ? (isPressed ? 4 : isHovering ? 2 : 0) : 0
        let squash: CGFloat = theme.hasMotion && isPressed ? 4 : 0
        return HStack(spacing: theme.space(10)) {
            configuration.label.modifier(FabricatorTextMetrics(size: theme.text(), weight: .medium, lineHeight: 1.375))
                .foregroundStyle(theme.color(isInvalid ? "destructive-text" : "foreground")).fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: theme.space(8))
            Capsule().fill(theme.color(isOn ? "primary" : "accent").opacity(isOn && isHovering ? 0.9 : 1))
                .overlay {
                    // The canonical overlay is black in light mode and white in dark mode.
                    if !isOn && isHovering { Capsule().fill((theme.colorScheme == .dark ? Color.white : Color.black).opacity(0.1)) }
                }
                .animation(theme.animation("feedback"), value: isOn).animation(theme.animation("feedback"), value: isHovered)
                .frame(width: trackHeight + theme.space(14), height: trackHeight)
                .overlay(alignment: .leading) {
                    Capsule().fill(theme.color(isOn ? "primary-foreground" : "switchThumb"))
                        .frame(width: thumb + stretch, height: thumb - squash)
                        .shadow(color: .black.opacity(0.15), radius: 1, y: 1)
                        .overlay { Capsule().strokeBorder(Color.black.opacity(0.04), lineWidth: 0.5) }
                        .offset(x: (isOn ? theme.space(14) : 0) - (isOn ? stretch : 0)).padding(2)
                        .animation(theme.animation("move"), value: isOn)
                        .animation(theme.animation("move"), value: isPressed)
                        .animation(theme.animation("move"), value: isHovered)
                }
                .overlay {
                    if isFocused || isInvalid { Capsule().strokeBorder(isInvalid ? theme.color("destructive").opacity(0.5) : theme.color("ring"), lineWidth: 1).padding(-3) }
                }
        }
        .frame(minHeight: trackHeight).modifier(FabricatorSelectionHitArea(visualHeight: trackHeight))
        .opacity(isEnabled ? 1 : 0.5).onHover { isHovered = $0 }.focusEffectDisabled()
    }
}

public struct FabricatorRadioGroup: View {
    @Environment(\.fabricatorTheme) private var theme
    @Environment(\.isEnabled) private var isEnabled
    public var options: [String]
    @Binding public var selection: String
    public var isInvalid: Bool

    public init(_ options: [String], selection: Binding<String>, isInvalid: Bool = false) {
        self.options = options; _selection = selection; self.isInvalid = isInvalid
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: theme.space(16)) {
            ForEach(options, id: \.self) { option in
                Button { selection = option } label: { Text(option) }
                    .buttonStyle(FabricatorRadioButtonStyle(option: option, isSelected: selection == option, isInvalid: isInvalid))
                    .accessibilityAddTraits(selection == option ? .isSelected : [])
                    .accessibilityValue(selection == option ? "Selected" : "Not selected")
            }
        }
        .overlayPreferenceValue(FabricatorRadioBounds.self) { anchors in
            GeometryReader { geometry in
                FabricatorRadioDot(selection: selection, frames: anchors.mapValues { geometry[$0] }, isInvalid: isInvalid)
                    .opacity(isEnabled ? 1 : 0.5)
            }.allowsHitTesting(false).accessibilityHidden(true)
        }
        .accessibilityElement(children: .contain)
    }
}

private struct FabricatorRadioButtonStyle: ButtonStyle {
    @Environment(\.fabricatorTheme) private var theme
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.isFocused) private var isFocused
    @State private var isHovered = false
    var option: String
    var isSelected: Bool
    var isInvalid: Bool

    func makeBody(configuration: Configuration) -> some View {
        let role = isInvalid ? "destructive" : "primary"
        return HStack(spacing: theme.space(8)) {
            Circle().strokeBorder(isSelected || isInvalid ? theme.color(role) : theme.color("foreground").opacity(isHovered && isEnabled ? 0.45 : 0.25), lineWidth: 1.5)
                .animation(theme.animation("feedback"), value: isSelected)
                .animation(theme.animation("feedback"), value: isHovered)
                .frame(width: theme.icon() + 2, height: theme.icon() + 2)
                .overlay { if isFocused { Circle().strokeBorder(theme.color("focus-ring"), lineWidth: 1).padding(-3) } }
                .animation(theme.animation("feedback")) { view in
                    view.scaleEffect(configuration.isPressed && isEnabled && theme.hasMotion ? 0.9 : 1)
                }
                .anchorPreference(key: FabricatorRadioBounds.self, value: .bounds) { [option: $0] }
            configuration.label.modifier(FabricatorTextMetrics(size: theme.text(), weight: .medium, lineHeight: 1.375))
                .foregroundStyle(theme.color(isInvalid ? "destructive-text" : "foreground"))
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, minHeight: theme.icon() + 2, alignment: .leading)
        .modifier(FabricatorSelectionHitArea(visualHeight: theme.icon() + 2))
        .opacity(isEnabled ? 1 : 0.5).onHover { isHovered = $0 }.focusEffectDisabled()
    }
}

private struct FabricatorRadioBounds: PreferenceKey {
    static let defaultValue: [String: Anchor<CGRect>] = [:]
    static func reduce(value: inout [String: Anchor<CGRect>], nextValue: () -> [String: Anchor<CGRect>]) {
        value.merge(nextValue(), uniquingKeysWith: { _, next in next })
    }
}

private struct FabricatorRadioDot: View {
    @Environment(\.fabricatorTheme) private var theme
    var selection: String
    var frames: [String: CGRect]
    var isInvalid: Bool
    @State private var lastSelection: String?

    var body: some View {
        let isVisible = frames[selection] != nil
        let frame = frames[selection] ?? lastSelection.flatMap { frames[$0] } ?? .zero
        let diameter = frame.width * theme.icon() / (2 * (theme.icon() + 2))
        Circle().fill(theme.color(isInvalid ? "destructive" : "primary"))
            .frame(width: diameter, height: diameter)
            .animation(theme.animation(isVisible ? "move" : "feedback", easing: isVisible ? .enter : .exit, isExiting: !isVisible)) { view in
                view.scaleEffect(isVisible ? 1 : 0).opacity(isVisible ? 1 : 0)
            }
            .position(x: frame.midX, y: frame.midY)
            .animation(lastSelection == nil ? nil : theme.animation("move", easing: .enter), value: selection)
            .onAppear { if isVisible { lastSelection = selection } }
            .onChange(of: selection) { if frames[selection] != nil { lastSelection = selection } }
    }
}

private struct FabricatorSelectionHitArea: ViewModifier {
    @Environment(\.fabricatorTheme) private var theme
    var visualHeight: CGFloat
    func body(content: Content) -> some View {
        // Keep adjacent 44-point targets from overlapping at the density's row gap.
        let height = max(visualHeight, theme.minimumHitSize - theme.space(16))
        let padding = max(0, (theme.minimumHitSize - height) / 2)
        content.frame(minHeight: height).padding(.vertical, padding).contentShape(Rectangle()).padding(.vertical, -padding)
    }
}
