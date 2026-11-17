import SwiftUI

public enum FabricatorButtonVariant: String, CaseIterable, Sendable { case `default`, outline, secondary, ghost, destructive, link }
public enum FabricatorControlSize: String, CaseIterable, Sendable {
    case xs, sm, `default`, lg, iconXs, iconSm, icon, iconLg
    fileprivate func resolveTheme(_ theme: FabricatorTheme) -> FabricatorTheme {
        var resolved = theme
        switch self { case .sm, .iconSm: resolved.density = .compact; case .lg, .iconLg: resolved.density = .spacious; default: break }
        return resolved
    }
}

public struct FabricatorButtonStyle: ButtonStyle {
    @Environment(\.fabricatorTheme) private var theme
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.isFocused) private var isFocused
    @State private var isHovered = false
    public var variant: FabricatorButtonVariant
    public var size: FabricatorControlSize
    public var fillsWidth: Bool
    public var hasLeadingIcon: Bool
    public init(variant: FabricatorButtonVariant = .default, size: FabricatorControlSize = .default, fillsWidth: Bool = false, hasLeadingIcon: Bool = false) { self.variant = variant; self.size = size; self.fillsWidth = fillsWidth; self.hasLeadingIcon = hasLeadingIcon }
    private var controlTheme: FabricatorTheme { size.resolveTheme(theme) }
    private var height: CGFloat {
        switch size {
        case .xs, .iconXs: controlTheme.minimumControlHeight(24, textStep: 12)
        default: controlTheme.controlHeight
        }
    }
    private var foreground: Color {
        switch variant {
        case .default: theme.color("primary-foreground")
        case .destructive: theme.color("destructive-text")
        case .secondary: theme.color("secondary-foreground")
        case .ghost: theme.color(isHovered ? "foreground" : "muted-foreground")
        case .link: theme.color("primary-text")
        default: theme.color("foreground")
        }
    }
    public func makeBody(configuration: Configuration) -> some View {
        let theme = controlTheme
        let isPressed = configuration.isPressed && isEnabled
        let isHovering = isHovered && isEnabled
        let fill: Color = switch variant {
        case .default: theme.color("primary").opacity(isPressed ? 0.8 : isHovering ? 0.9 : 1)
        case .secondary: theme.color("secondary").opacity(isHovering && !isPressed ? 0.8 : 1)
        case .destructive: theme.color("destructive").opacity(isPressed ? 0.2 : isHovering ? 0.16 : 0.12)
        case .outline, .ghost: isPressed ? theme.color("active") : isHovering ? theme.color("hover") : .clear
        case .link: .clear
        }
        return configuration.label.font(theme.font(size == .xs ? 12 : theme.text(), weight: .medium))
            .foregroundStyle(foreground)
            .padding(.leading, size.rawValue.hasPrefix("icon") ? 0 : size == .xs ? (hasLeadingIcon ? 6 : 8) : theme.space(hasLeadingIcon ? 12 : 16))
            .padding(.trailing, size.rawValue.hasPrefix("icon") ? 0 : size == .xs ? 8 : theme.space(16))
            .frame(minWidth: size.rawValue.hasPrefix("icon") ? height : nil, maxWidth: fillsWidth ? .infinity : (size.rawValue.hasPrefix("icon") ? height : nil), minHeight: height, maxHeight: theme.fontScale > 1 && !size.rawValue.hasPrefix("icon") ? nil : height)
            .background(fill)
            .clipShape(RoundedRectangle(cornerRadius: theme.radius()))
            .overlay { if variant == .outline { RoundedRectangle(cornerRadius: theme.radius()).strokeBorder(theme.color("border"), lineWidth: 1) } }
            .overlay { if isFocused { RoundedRectangle(cornerRadius: theme.radius() + 2).strokeBorder(theme.color("focus-ring"), lineWidth: 1).padding(-2) } }
            .opacity(isEnabled ? 1 : 0.5)
            .scaleEffect(configuration.isPressed && !reduceMotion ? theme.pressScale : 1)
            .animation(reduceMotion ? nil : theme.animation("feedback"), value: configuration.isPressed)
            .animation(reduceMotion ? nil : theme.animation("feedback"), value: isHovered)
            .contentShape(RoundedRectangle(cornerRadius: theme.radius()))
            .padding(max(0, (theme.minimumHitSize - height) / 2))
            .contentShape(Rectangle())
            .padding(-max(0, (theme.minimumHitSize - height) / 2))
            .onHover { isHovered = $0 }.focusEffectDisabled()
    }
}

public struct FabricatorButton: View {
    @Environment(\.fabricatorTheme) private var theme
    public var title: String
    public var icon: String?
    public var variant: FabricatorButtonVariant
    public var size: FabricatorControlSize
    public var isLoading: Bool
    public var fillsWidth: Bool
    public var action: () -> Void
    public init(_ title: String, icon: String? = nil, variant: FabricatorButtonVariant = .default, size: FabricatorControlSize = .default, isLoading: Bool = false, fillsWidth: Bool = false, action: @escaping () -> Void) {
        self.title = title; self.icon = icon; self.variant = variant; self.size = size; self.isLoading = isLoading; self.fillsWidth = fillsWidth; self.action = action
    }
    public var body: some View {
        let controlTheme = size.resolveTheme(theme)
        let iconSize: CGFloat = size == .xs || size == .iconXs ? 12 : controlTheme.icon()
        Button(action: action) {
            HStack(spacing: size == .xs ? 4 : controlTheme.space(6)) {
                if isLoading { FabricatorSpinner(size: iconSize) } else if let icon { FabricatorIcon(icon, size: iconSize) }
                if !size.rawValue.hasPrefix("icon") { Text(title).lineLimit(controlTheme.fontScale > 1 ? nil : 1) }
            }
        }.buttonStyle(FabricatorButtonStyle(variant: variant, size: size, fillsWidth: fillsWidth, hasLeadingIcon: icon != nil || isLoading)).disabled(isLoading).accessibilityLabel(title)
    }
}

struct FabricatorInputFrame: ViewModifier {
    @Environment(\.fabricatorTheme) private var theme
    var isFocused: Bool
    var isInvalid: Bool
    var isHovered: Bool = false
    func body(content: Content) -> some View {
        let ring = isInvalid ? theme.color("destructive").opacity(0.5) : isFocused ? theme.color("foreground").opacity(0.25) : theme.color("border")
        content.font(theme.bodyFont).foregroundStyle(theme.color("foreground"))
            .padding(.horizontal, theme.space(10)).frame(minHeight: theme.controlHeight)
            .background(isFocused ? theme.color("card") : isHovered ? (isInvalid ? theme.color("destructive").opacity(0.05) : theme.color("muted").opacity(0.5)) : .clear, in: RoundedRectangle(cornerRadius: theme.radius()))
            .overlay { RoundedRectangle(cornerRadius: theme.radius()).strokeBorder(ring, lineWidth: 1) }
            .contentShape(Rectangle())
    }
}

public struct FabricatorInput: View {
    @Environment(\.fabricatorTheme) private var theme
    @FocusState private var isFocused: Bool
    @State private var isHovered = false
    @Binding public var text: String
    public var placeholder: String
    public var icon: String?
    public var isSecure: Bool
    public var isInvalid: Bool
    public init(_ placeholder: String = "", text: Binding<String>, icon: String? = nil, isSecure: Bool = false, isInvalid: Bool = false) {
        self.placeholder = placeholder; _text = text; self.icon = icon; self.isSecure = isSecure; self.isInvalid = isInvalid
    }
    public var body: some View {
        let prompt = Text(placeholder).foregroundStyle(theme.color("muted-foreground"))
        HStack(spacing: theme.space(8)) {
            if let icon { FabricatorIcon(icon).foregroundStyle(theme.color("muted-foreground")) }
            Group {
                if isSecure { SecureField(placeholder, text: $text, prompt: prompt) }
                else { TextField(placeholder, text: $text, prompt: prompt) }
            }.textFieldStyle(.plain).focused($isFocused).accessibilityLabel(placeholder)
        }.modifier(FabricatorInputFrame(isFocused: isFocused, isInvalid: isInvalid, isHovered: isHovered)).onHover { isHovered = $0 }
    }
}

public struct FabricatorTextarea: View {
    @Environment(\.fabricatorTheme) private var theme
    @FocusState private var isFocused: Bool
    @State private var isHovered = false
    @Binding public var text: String
    public var placeholder: String
    public var isInvalid: Bool
    public init(_ placeholder: String = "Write a message…", text: Binding<String>, isInvalid: Bool = false) { self.placeholder = placeholder; _text = text; self.isInvalid = isInvalid }
    public var body: some View {
        TextField(placeholder, text: $text, prompt: Text(placeholder).foregroundStyle(theme.color("muted-foreground")), axis: .vertical).textFieldStyle(.plain).lineLimit(4...8).focused($isFocused).padding(.vertical, theme.space(8))
            .modifier(FabricatorInputFrame(isFocused: isFocused, isInvalid: isInvalid, isHovered: isHovered)).onHover { isHovered = $0 }.accessibilityLabel(placeholder)
    }
}

public enum FabricatorBadgeVariant: String, CaseIterable, Sendable { case `default`, secondary, outline, destructive, success, warning, info }
public struct FabricatorBadge: View {
    @Environment(\.fabricatorTheme) private var theme
    public var title: String
    public var variant: FabricatorBadgeVariant
    public var icon: String?
    public var showsDot: Bool
    public init(_ title: String, variant: FabricatorBadgeVariant = .secondary, icon: String? = nil, showsDot: Bool = false) { self.title = title; self.variant = variant; self.icon = icon; self.showsDot = showsDot }
    private var isStatus: Bool { [.destructive, .success, .warning, .info].contains(variant) }
    private var foreground: Color { isStatus ? theme.color("\(variant.rawValue)-text") : theme.color("foreground") }
    private var iconColor: Color { isStatus ? theme.color(variant.rawValue) : foreground }
    private var background: Color {
        switch variant {
        case .default: theme.color("active")
        case .secondary: theme.color("hover")
        case .outline: .clear
        default: theme.color("\(variant.rawValue)-surface-\(theme.colorScheme == .dark ? "3" : "1")")
        }
    }
    public var body: some View {
        HStack(spacing: theme.space(6)) { if showsDot { Circle().fill(foreground).frame(width: 6, height: 6).accessibilityHidden(true) }; if let icon { FabricatorIcon(icon, size: 12).foregroundStyle(iconColor) }; Text(title).lineLimit(1) }
            .font(theme.font(theme.text(12), weight: .medium)).foregroundStyle(foreground).padding(.horizontal, theme.space(10)).frame(minHeight: theme.minimumControlHeight(24, textStep: 12))
            .background(background, in: RoundedRectangle(cornerRadius: theme.radius()))
            .overlay { if variant == .outline || isStatus { RoundedRectangle(cornerRadius: theme.radius()).strokeBorder(theme.color(isStatus ? "\(variant.rawValue)-border" : "border"), lineWidth: 1) } }
    }
}

public struct FabricatorAvatar: View {
    @Environment(\.fabricatorTheme) private var theme
    public var name: String
    public var imageURL: URL?
    public var size: CGFloat
    public init(_ name: String, imageURL: URL? = nil, size: CGFloat = 32) { self.name = name; self.imageURL = imageURL; self.size = size }
    private var initials: String { name.split(separator: " ").prefix(2).compactMap(\.first).map(String.init).joined() }
    public var body: some View {
        ZStack {
            theme.color("background")
            theme.color("active")
            AsyncImage(url: imageURL) { phase in
                if let image = phase.image { image.resizable().scaledToFill() }
                else {
                    Canvas { context, canvas in
                        let font = Font(FabricatorFontAdapter.makeFont(size: size <= 24 ? 12 : 14, weight: FabricatorContract.shared.typography.weights.medium))
                        context.draw(Text(initials).font(font).foregroundStyle(theme.color("muted-foreground")), at: CGPoint(x: canvas.width / 2, y: canvas.height / 2))
                    }
                }
            }.accessibilityHidden(true)
        }
        .frame(width: size, height: size).clipShape(Circle())
        .overlay { Circle().strokeBorder(theme.color("border"), lineWidth: 1).allowsHitTesting(false) }
        .accessibilityElement(children: .ignore).accessibilityLabel(name).accessibilityAddTraits(.isImage)
    }
}

public struct FabricatorSlider: View {
    @Environment(\.fabricatorTheme) private var theme
    @Binding public var value: Double
    public var range: ClosedRange<Double>
    public var step: Double
    public var label: String
    public init(_ label: String, value: Binding<Double>, in range: ClosedRange<Double> = 0...100, step: Double = 1) { self.label = label; _value = value; self.range = range; self.step = step }
    public var body: some View {
        let span = range.upperBound - range.lowerBound
        let ratio = span == 0 ? 0 : min(1, max(0, (value - range.lowerBound) / span))
        let thumb: CGFloat = min(theme.space(20), theme.icon(14) + 6)
        GeometryReader { geometry in
            let travel = max(0, geometry.size.width - thumb)
            let origin = travel * ratio
            ZStack(alignment: .leading) {
                Capsule().strokeBorder(theme.color("border"), lineWidth: 1).frame(height: theme.icon(14) + 2)
                Capsule().fill(theme.color("primary").opacity(theme.colorScheme == .dark ? 0.15 : 0.1)).frame(width: origin + thumb / 2, height: theme.icon(14) + 2)
                Circle().fill(Color.white).frame(width: thumb, height: thumb).shadow(color: .black.opacity(0.12), radius: 1, y: 1).overlay { Circle().strokeBorder(Color.black.opacity(0.06), lineWidth: 1) }.offset(x: origin)
            }.frame(height: thumb).contentShape(Rectangle()).gesture(DragGesture(minimumDistance: 0).onChanged { drag in
                let nextRatio = min(1, max(0, drag.location.x / max(geometry.size.width, 1)))
                let raw = range.lowerBound + nextRatio * span
                let stepped = range.lowerBound + ((raw - range.lowerBound) / max(step, .leastNonzeroMagnitude)).rounded() * step
                value = min(range.upperBound, max(range.lowerBound, stepped))
            })
        }.frame(height: thumb).accessibilityElement(children: .ignore).accessibilityLabel(label).accessibilityValue("\(Int(value.rounded()))").accessibilityAdjustableAction { direction in
            let delta = direction == .increment ? step : -step
            value = min(range.upperBound, max(range.lowerBound, value + delta))
        }
    }
}

public enum FabricatorRatingVariant: String, CaseIterable, Sendable { case `default`, primary, info, success, warning, error }
public struct FabricatorRating: View {
    @Environment(\.fabricatorTheme) private var theme
    @Binding public var value: Double
    public var maximum: Int
    public var step: Double
    public var variant: FabricatorRatingVariant
    public var isReadOnly: Bool
    public init(value: Binding<Int>, maximum: Int = 5, variant: FabricatorRatingVariant = .default, isReadOnly: Bool = false) { _value = Binding(get: { Double(value.wrappedValue) }, set: { value.wrappedValue = Int($0.rounded()) }); self.maximum = max(1, maximum); self.step = 1; self.variant = variant; self.isReadOnly = isReadOnly }
    public init(value: Binding<Double>, maximum: Int = 5, step: Double = 0.5, variant: FabricatorRatingVariant = .default, isReadOnly: Bool = false) { _value = value; self.maximum = max(1, maximum); self.step = max(0.1, min(1, step)); self.variant = variant; self.isReadOnly = isReadOnly }
    private var fill: Color { theme.color(variant == .default ? "rating-fill" : variant == .error ? "destructive" : variant.rawValue) }
    public var body: some View {
        HStack(spacing: 2) {
            ForEach(1...max(1, maximum), id: \.self) { rating in
                let iconSize = theme.space(20)
                let fraction = min(1, max(0, value - Double(rating - 1)))
                Button { value = Double(rating) == value ? 0 : Double(rating) } label: {
                    FabricatorIcon("star", size: iconSize, strokeWidth: 1.5, isFilled: true).foregroundStyle(theme.color("foreground").opacity(theme.colorScheme == .dark ? 0.16 : 0.12))
                        .overlay(alignment: .leading) { FabricatorIcon("star", size: iconSize, strokeWidth: 1.5, isFilled: true, strokeColor: variant == .default ? theme.color("rating-stroke") : fill).foregroundStyle(fill).mask(alignment: .leading) { Rectangle().frame(width: iconSize * fraction) } }
                        .frame(width: iconSize, height: iconSize).contentShape(Rectangle())
                }.buttonStyle(.plain).disabled(isReadOnly).highPriorityGesture(DragGesture(minimumDistance: 0).onEnded { gesture in
                    guard !isReadOnly else { return }
                    let padding: CGFloat = 0
                    let partial = min(1, max(step, ceil((gesture.location.x - padding) / iconSize / step) * step))
                    let next = Double(rating - 1) + partial; value = next == value ? 0 : next
                }).accessibilityLabel("Rate \(rating) of \(maximum)").accessibilityAddTraits(Double(rating) <= value ? .isSelected : [])
            }
        }.accessibilityElement(children: .contain).accessibilityLabel("Rating").accessibilityValue("\(value.formatted()) of \(maximum)")
            .accessibilityAdjustableAction { direction in guard !isReadOnly else { return }; value = min(Double(maximum), max(0, value + (direction == .increment ? step : -step))) }
    }
}

public struct FabricatorToggle: View {
    @Binding public var isOn: Bool
    public var title: String
    public var icon: String?
    public init(_ title: String, icon: String? = nil, isOn: Binding<Bool>) { self.title = title; self.icon = icon; _isOn = isOn }
    public var body: some View { FabricatorButton(title, icon: icon, variant: isOn ? .secondary : .ghost) { isOn.toggle() }.accessibilityAddTraits(isOn ? .isSelected : []) }
}

public struct FabricatorToggleGroup: View {
    public var options: [String]
    @Binding public var selection: String
    public init(_ options: [String], selection: Binding<String>) { self.options = options; _selection = selection }
    public var body: some View {
        HStack(spacing: 2) { ForEach(options, id: \.self) { option in FabricatorButton(option, variant: selection == option ? .secondary : .ghost) { selection = option }.accessibilityAddTraits(selection == option ? .isSelected : []) } }
    }
}

public struct FabricatorProgress: View {
    @Environment(\.fabricatorTheme) private var theme
    public var value: Double
    public var label: String
    public init(value: Double, label: String = "Progress") { self.value = value; self.label = label }
    public var body: some View {
        let clamped = min(1, max(0, value))
        Capsule().fill(theme.color("hover")).frame(height: 6).overlay(alignment: .leading) { Capsule().fill(theme.color("primary")).scaleEffect(x: max(clamped, 0.001), anchor: .leading) }
            .accessibilityElement(children: .ignore).accessibilityLabel(label).accessibilityValue("\(Int((clamped * 100).rounded())) percent")
    }
}

public struct FabricatorSeparator: View {
    @Environment(\.fabricatorTheme) private var theme
    public init() {}
    public var body: some View { Rectangle().fill(theme.color("border")).frame(height: 0.5).accessibilityHidden(true) }
}
public struct FabricatorKbd: View {
    @Environment(\.fabricatorTheme) private var theme
    public var keys: String
    public init(_ keys: String) { self.keys = keys }
    public var body: some View { Text(keys).font(theme.font(theme.text(11), weight: .medium)).foregroundStyle(theme.color("muted-foreground")).padding(.horizontal, theme.space(4)).frame(minWidth: theme.space(20), minHeight: theme.space(20)).background(theme.color("hover"), in: RoundedRectangle(cornerRadius: 5)) }
}
public struct FabricatorLabel: View {
    @Environment(\.fabricatorTheme) private var theme
    public var title: String
    public init(_ title: String) { self.title = title }
    public var body: some View { Text(title).modifier(FabricatorTextMetrics(size: theme.text(), weight: .medium, lineHeight: 1)) }
}
public struct FabricatorText: View {
    @Environment(\.fabricatorTheme) private var theme
    public var text: String
    public var role: Role
    public enum Role: Sendable { case title, heading, body, caption, code }
    public init(_ text: String, role: Role = .body) { self.text = text; self.role = role }
    public var body: some View {
        Text(text).font(role == .code ? .system(size: theme.text(), design: .monospaced) : theme.font(role == .title ? 24 : role == .heading ? 16 : role == .caption ? theme.text(12) : theme.text(), weight: role == .title || role == .heading ? .semibold : .regular))
            .foregroundStyle(theme.color(role == .caption ? "muted-foreground" : "foreground"))
    }
}
public struct FabricatorAspectRatio<Content: View>: View {
    public var ratio: CGFloat
    private var content: Content
    public init(_ ratio: CGFloat = 16 / 9, @ViewBuilder content: () -> Content) { self.ratio = ratio; self.content = content() }
    public var body: some View { content.aspectRatio(ratio, contentMode: .fit).clipped() }
}
public struct FabricatorScrollArea<Content: View>: View {
    private var content: Content
    public init(@ViewBuilder content: () -> Content) { self.content = content() }
    public var body: some View { ScrollView { content } }
}
public struct FabricatorThemeToggle: View {
    @Binding public var isDark: Bool
    public init(isDark: Binding<Bool>) { _isDark = isDark }
    public var body: some View { FabricatorButton(isDark ? "Use light appearance" : "Use dark appearance", icon: isDark ? "sun" : "moon", variant: .ghost, size: .icon) { isDark.toggle() } }
}
