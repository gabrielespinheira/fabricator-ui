import SwiftUI
import CoreText

public struct FabricatorCatalogItem: Decodable, Identifiable, Sendable {
    public var name: String
    public var title: String
    public var group: String
    public var type: String
    public var id: String { name }
}

struct FabricatorTokenMode: Decodable, Sendable {
    var colors: [String: String]
    var radius: [String: Double]
    var shadows: [String: String]
}

struct FabricatorDensityTokens: Decodable, Sendable {
    var space: [String: Double]
    var text: [String: Double]
    var icon: [String: Double]
}

struct FabricatorIconNode: Decodable, Sendable {
    var tag: String
    var attributes: [String: String]
    init(from decoder: Decoder) throws {
        var container = try decoder.unkeyedContainer()
        tag = try container.decode(String.self)
        attributes = try container.decode([String: String].self)
    }
}

struct FabricatorIconGeometry: Decodable, Sendable {
    var name: String
    var node: [FabricatorIconNode]
}

struct FabricatorContract: Decodable, Sendable {
    var schemaVersion: Int
    var themes: [String: FabricatorTokenMode]
    var densities: [String: FabricatorDensityTokens]
    var typography: FabricatorTypographyTokens
    var items: [FabricatorCatalogItem]
    var icons: [FabricatorIconGeometry]
    var motion: [String: FabricatorMotionTokens]
    var sounds: [FabricatorSoundDefinition]
    var soundMasterLevel: Double
    var spinners: FabricatorSpinnerContract
    var gooey: FabricatorGooeyContract
    var calendar: FabricatorCalendarTokens
    var dataTable: [String: FabricatorTableColumnMetrics]

    static let shared: FabricatorContract = {
        #if SWIFT_PACKAGE
        let bundle = Bundle.module
        #else
        let bundle = Bundle.main
        #endif
        guard let url = bundle.url(forResource: "contract", withExtension: "json") else { preconditionFailure("Fabricator UI contract.json is missing. Run platforms:generate and sync-contract.ts before building.") }
        do { return try JSONDecoder().decode(FabricatorContract.self, from: Data(contentsOf: url)) }
        catch { preconditionFailure("Fabricator UI contract cannot be decoded: \(error)") }
    }()
}

struct FabricatorCalendarTokens: Decodable, Sendable { var chipWash: [String: [String: Double]] }
struct FabricatorGooeyContract: Decodable, Sendable {
    var resting: [Double]
    var effects: [String: [Double]]
    var subtle: Double
    var expressive: Double
    var waviness: Double
}

public enum FabricatorDensity: String, CaseIterable, Sendable {
    case compact
    case regular = "default"
    case spacious
    case tablet
}

public struct FabricatorTheme: Sendable {
    public var colorScheme: ColorScheme
    public var density: FabricatorDensity
    public var motionSpeed: FabricatorMotionSpeed
    public var motionScale: Double
    public var isMotionEnabled: Bool
    var fontScale: CGFloat = 1
    public init(colorScheme: ColorScheme = .light, density: FabricatorDensity = .regular, motionSpeed: FabricatorMotionSpeed = .default, motionScale: Double = 1, isMotionEnabled: Bool = true) {
        precondition(motionScale.isFinite && motionScale >= 0, "Motion scale must be finite and nonnegative")
        self.colorScheme = colorScheme; self.density = density; self.motionSpeed = motionSpeed; self.motionScale = motionScale; self.isMotionEnabled = isMotionEnabled
    }
    private var mode: FabricatorTokenMode {
        guard let mode = FabricatorContract.shared.themes[colorScheme == .dark ? "dark" : "light"] else { preconditionFailure("Fabricator theme mode is missing") }
        return mode
    }
    public func color(_ token: String) -> Color {
        guard let value = mode.colors[token] else { preconditionFailure("Unknown Fabricator color token: \(token)") }
        return Color(fabricatorLiteral: value)
    }
    public func radius(_ token: String = "lg") -> CGFloat { CGFloat(mode.radius[token, default: 8]) }
    public func space(_ step: Int) -> CGFloat {
        if density == .tablet && step == 36 { return 40 }
        let name = density == .tablet ? "spacious" : density.rawValue
        return CGFloat(FabricatorContract.shared.densities[name]?.space[String(step)] ?? Double(step))
    }
    public func text(_ step: Int = 13) -> CGFloat {
        let name = density == .tablet ? "spacious" : density.rawValue
        return CGFloat(FabricatorContract.shared.densities[name]?.text[String(step)] ?? Double(step))
    }
    public func icon(_ step: Int = 16) -> CGFloat {
        let name = density == .tablet ? "spacious" : density.rawValue
        return CGFloat(FabricatorContract.shared.densities[name]?.icon[String(step)] ?? Double(step))
    }
    public var controlHeight: CGFloat { minimumControlHeight(36) }
    func minimumControlHeight(_ step: Int, textStep: Int = 13) -> CGFloat {
        space(step) + ceil(max(0, fontScale - 1) * text(textStep) * 1.5)
    }
    public var minimumHitSize: CGFloat {
        #if os(iOS)
        44
        #else
        0
        #endif
    }
    public var bodyFont: Font { font(text()) }
    public func font(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        Font(resolveFont(size, weight: weight))
    }
    func resolveFont(_ size: CGFloat, weight: Font.Weight = .regular) -> CTFont {
        let weights = FabricatorContract.shared.typography.weights
        let axis: Double
        switch weight {
        case .ultraLight: axis = 100
        case .thin: axis = 200
        case .light: axis = 300
        case .regular: axis = 400
        case .medium: axis = weights.medium
        case .semibold: axis = weights.semibold
        case .bold: axis = 700
        case .heavy: axis = 800
        case .black: axis = 900
        default: preconditionFailure("Unsupported Fabricator font weight: \(weight)")
        }
        return FabricatorFontAdapter.makeFont(size: size * fontScale, weight: axis)
    }
    private var motion: FabricatorMotionTokens {
        guard let motion = FabricatorContract.shared.motion[motionSpeed.rawValue] else { preconditionFailure("Missing Fabricator motion speed: \(motionSpeed)") }
        return motion
    }
    public var hasMotion: Bool { isMotionEnabled && motionScale > 0 }
    public var hasContinuousMotion: Bool { hasMotion && motionSpeed != .instant }
    public var pressScale: Double { surfaceScale("press") }
    func surfaceScale(_ role: String) -> Double { hasMotion ? motion.scales[role, default: 1] : 1 }
    var popupBlur: Double { hasMotion ? motion.popupBlur : 0 }
    func popupTravel(_ role: String = "popup") -> Double { hasMotion ? motion.travel[role, default: 0] : 0 }
    func shadows(_ role: String) -> [FabricatorShadow] {
        guard let source = mode.shadows[role] else { preconditionFailure("Unknown Fabricator elevation: \(role)") }
        return FabricatorShadow.parse(source)
    }
    func calendarWash(_ state: String) -> Double { guard let wash = FabricatorContract.shared.calendar.chipWash[colorScheme == .dark ? "dark" : "light"]?[state] else { preconditionFailure("Unknown calendar wash state: \(state)") }; return wash }
    public func animation(_ role: String = "feedback", isExiting: Bool = false) -> Animation? {
        resolveAnimation(motionTiming(role, isExiting: isExiting))
    }
    func animation(_ role: String, easing: FabricatorMotionEasing, isExiting: Bool = false) -> Animation? {
        resolveAnimation(motionTiming(role, isExiting: isExiting, easing: easing))
    }
    private func resolveAnimation(_ timing: FabricatorMotionTiming?) -> Animation? {
        guard let timing else { return nil }
        switch timing.curve {
        case .cubicBezier(let x1, let y1, let x2, let y2): return .timingCurve(x1, y1, x2, y2, duration: timing.duration)
        case .spring: return Animation(FabricatorSampledAnimation(timing: timing))
        }
    }
    func motionTiming(_ role: String, isExiting: Bool = false, easing: FabricatorMotionEasing? = nil) -> FabricatorMotionTiming? {
        hasMotion ? motion.timing(role, isExiting: isExiting, scale: motionScale, easing: easing) : nil
    }
    func motionProgress(_ role: String, elapsed: Double) -> Double {
        guard let timing = motionTiming(role) else { return 1 }
        return timing.progress(at: elapsed / timing.duration)
    }
    public static var catalog: [FabricatorCatalogItem] { FabricatorContract.shared.items }
}

private struct FabricatorSampledAnimation: CustomAnimation {
    var timing: FabricatorMotionTiming
    func animate<V: VectorArithmetic>(value: V, time: TimeInterval, context: inout AnimationContext<V>) -> V? {
        guard time < timing.duration else { return nil }
        return value.scaled(by: timing.progress(at: time / timing.duration))
    }
}

struct FabricatorTextMetrics: ViewModifier {
    @Environment(\.fabricatorTheme) private var theme
    var size: CGFloat
    var weight: Font.Weight = .regular
    var lineHeight: CGFloat = 1.5
    func body(content: Content) -> some View {
        let font = theme.resolveFont(size, weight: weight)
        let naturalHeight = CTFontGetAscent(font) + CTFontGetDescent(font) + CTFontGetLeading(font)
        let extra = size * theme.fontScale * lineHeight - naturalHeight
        // CSS line-height includes half-leading above and below the glyphs too.
        return content.font(Font(font)).lineSpacing(extra).padding(.vertical, extra / 2)
    }
}

private struct FabricatorThemeKey: EnvironmentKey { static let defaultValue = FabricatorTheme() }
public extension EnvironmentValues {
    var fabricatorTheme: FabricatorTheme { get { self[FabricatorThemeKey.self] } set { self[FabricatorThemeKey.self] = newValue } }
}

public struct FabricatorRoot<Content: View>: View {
    @Environment(\.colorScheme) private var systemScheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @ScaledMetric(relativeTo: .body) private var fontScale: CGFloat = 1
    public var colorScheme: ColorScheme?
    public var density: FabricatorDensity
    public var motionSpeed: FabricatorMotionSpeed
    public var motionScale: Double
    public var isMotionEnabled: Bool
    private var content: Content
    public init(colorScheme: ColorScheme? = nil, density: FabricatorDensity = .regular, motionSpeed: FabricatorMotionSpeed = .default, motionScale: Double = 1, isMotionEnabled: Bool = true, @ViewBuilder content: () -> Content) {
        self.colorScheme = colorScheme; self.density = density; self.motionSpeed = motionSpeed; self.motionScale = motionScale; self.isMotionEnabled = isMotionEnabled; self.content = content()
    }
    public var body: some View {
        var theme = FabricatorTheme(colorScheme: colorScheme ?? systemScheme, density: density, motionSpeed: motionSpeed, motionScale: motionScale, isMotionEnabled: isMotionEnabled && !reduceMotion)
        theme.fontScale = fontScale
        return content.environment(\.fabricatorTheme, theme).font(theme.bodyFont).foregroundStyle(theme.color("foreground"))
            .tint(theme.color("primary")).preferredColorScheme(colorScheme)
    }
}

extension Color {
    init(fabricatorLiteral value: String) {
        if value.hasPrefix("#") {
            var hex = String(value.dropFirst())
            if hex.count == 3 || hex.count == 4 { hex = hex.map { "\($0)\($0)" }.joined() }
            guard let number = UInt64(hex, radix: 16) else { preconditionFailure("Invalid color: \(value)") }
            let hasAlpha = hex.count == 8
            self.init(.sRGB, red: Double((number >> (hasAlpha ? 24 : 16)) & 255) / 255, green: Double((number >> (hasAlpha ? 16 : 8)) & 255) / 255, blue: Double((number >> (hasAlpha ? 8 : 0)) & 255) / 255, opacity: hasAlpha ? Double(number & 255) / 255 : 1)
            return
        }
        let components = value.replacingOccurrences(of: "rgba(", with: "").replacingOccurrences(of: "rgb(", with: "").replacingOccurrences(of: ")", with: "").split(separator: ",").compactMap { Double($0.trimmingCharacters(in: .whitespaces)) }
        guard components.count >= 3 else { preconditionFailure("Unresolved Fabricator color: \(value)") }
        self.init(.sRGB, red: components[0] / 255, green: components[1] / 255, blue: components[2] / 255, opacity: components.count == 4 ? components[3] : 1)
    }
}

struct FabricatorSurface: ViewModifier {
    @Environment(\.fabricatorTheme) private var theme
    var radius: String = "xl"
    var elevation: String? = "surface-2"
    var fill: Color? = nil
    var cornerRadius: CGFloat? = nil
    func body(content: Content) -> some View {
        let fillColor = fill ?? theme.color("card")
        let corner = cornerRadius ?? theme.radius(radius)
        let shadows = elevation.map { theme.shadows($0) } ?? []
        content.background {
            ZStack {
                ForEach(Array(shadows.enumerated()).filter { !$0.element.isInset }.reversed(), id: \.offset) { _, shadow in
                    RoundedRectangle(cornerRadius: corner).inset(by: -shadow.spread).fill(shadow.color).blur(radius: shadow.blur / 2).offset(x: shadow.x, y: shadow.y)
                }
                RoundedRectangle(cornerRadius: corner).fill(fillColor)
            }
        }.overlay {
            ForEach(Array(shadows.enumerated()).filter { $0.element.isInset }, id: \.offset) { _, shadow in
                ZStack {
                    RoundedRectangle(cornerRadius: corner).fill(shadow.color)
                    RoundedRectangle(cornerRadius: corner).inset(by: shadow.spread).fill(.black).blur(radius: shadow.blur / 2).offset(x: shadow.x, y: shadow.y).blendMode(.destinationOut)
                }.compositingGroup().clipShape(RoundedRectangle(cornerRadius: corner))
            }.allowsHitTesting(false)
        }
    }
}
public extension View {
    func fabricatorSurface(radius: String = "xl", elevation: String? = "surface-2", fill: Color? = nil) -> some View { modifier(FabricatorSurface(radius: radius, elevation: elevation, fill: fill)) }
    func fabricatorSurface(cornerRadius: CGFloat, elevation: String? = "surface-2", fill: Color? = nil) -> some View { modifier(FabricatorSurface(elevation: elevation, fill: fill, cornerRadius: cornerRadius)) }
}

struct FabricatorShadow {
    var color: Color
    var x: Double
    var y: Double
    var blur: Double
    var spread: Double
    var isInset: Bool
    static func parse(_ source: String) -> [Self] {
        var parts: [String] = [], depth = 0, start = source.startIndex
        for index in source.indices {
            if source[index] == "(" { depth += 1 }; if source[index] == ")" { depth -= 1 }
            if source[index] == "," && depth == 0 { parts.append(String(source[start..<index])); start = source.index(after: index) }
        }
        parts.append(String(source[start...]))
        return parts.compactMap { part in
            guard let expression = try? NSRegularExpression(pattern: "rgba?\\([^)]*\\)|#[0-9a-fA-F]{6,8}"), let match = expression.firstMatch(in: part, range: NSRange(part.startIndex..., in: part)), let range = Range(match.range, in: part) else { return nil }
            let color = Color(fabricatorLiteral: String(part[range]))
            let remainder = part.replacingCharacters(in: range, with: "").replacingOccurrences(of: "inset", with: "")
            let values = remainder.split(whereSeparator: \.isWhitespace).compactMap { Double($0.replacingOccurrences(of: "px", with: "")) }
            guard values.count >= 2 else { return nil }
            return Self(color: color, x: values[0], y: values[1], blur: values.count > 2 ? values[2] : 0, spread: values.count > 3 ? values[3] : 0, isInset: part.contains("inset"))
        }
    }
}
