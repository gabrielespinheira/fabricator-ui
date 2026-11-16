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
    var items: [FabricatorCatalogItem]
    var icons: [FabricatorIconGeometry]
    var motion: [String: FabricatorMotionTokens]
    var sounds: [FabricatorSoundDefinition]
    var soundMasterLevel: Double
    var spinners: FabricatorSpinnerContract
    var calendar: FabricatorCalendarTokens

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

struct FabricatorMotionDuration: Decodable, Sendable { var enter: Double; var exit: Double }
struct FabricatorCalendarTokens: Decodable, Sendable { var chipWash: [String: [String: Double]] }
struct FabricatorMotionTokens: Decodable, Sendable { var durations: [String: FabricatorMotionDuration]; var easings: [String: String]; var scales: [String: Double] }
public enum FabricatorMotionSpeed: String, CaseIterable, Sendable { case smooth, `default`, snappy, instant }

private enum FabricatorFonts {
    static let registered: Bool = {
        #if SWIFT_PACKAGE
        let bundle = Bundle.module
        #else
        let bundle = Bundle.main
        #endif
        for name in ["InterVariable", "InterVariable-Italic"] {
            guard let url = bundle.url(forResource: name, withExtension: "ttf") else { preconditionFailure("Fabricator UI Inter font is missing: \(name)") }
            CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
        }
        return true
    }()
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
    public init(colorScheme: ColorScheme = .light, density: FabricatorDensity = .regular, motionSpeed: FabricatorMotionSpeed = .default) { self.colorScheme = colorScheme; self.density = density; self.motionSpeed = motionSpeed }
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
    public var controlHeight: CGFloat { space(36) }
    public var minimumHitSize: CGFloat {
        #if os(iOS)
        44
        #else
        0
        #endif
    }
    public var bodyFont: Font { font(text()) }
    public func font(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        _ = FabricatorFonts.registered
        return .custom("InterVariable", size: size, relativeTo: .body).weight(weight)
    }
    public var pressScale: Double { FabricatorContract.shared.motion[motionSpeed.rawValue]?.scales["press"] ?? 1 }
    func shadows(_ role: String) -> [FabricatorShadow] { FabricatorShadow.parse(mode.shadows[role, default: ""]) }
    func calendarWash(_ state: String) -> Double { guard let wash = FabricatorContract.shared.calendar.chipWash[colorScheme == .dark ? "dark" : "light"]?[state] else { preconditionFailure("Unknown calendar wash state: \(state)") }; return wash }
    public func animation(_ role: String = "feedback", isExiting: Bool = false) -> Animation? {
        guard motionSpeed != .instant, let motion = FabricatorContract.shared.motion[motionSpeed.rawValue], let duration = motion.durations[role] else { return nil }
        let easing = motion.easings[role] ?? motion.easings[isExiting ? "exit" : "enter", default: ""]
        let points = easing.replacingOccurrences(of: "cubic-bezier(", with: "").replacingOccurrences(of: ")", with: "").split(separator: ",").compactMap { Double($0.trimmingCharacters(in: .whitespaces)) }
        guard points.count == 4 else { return nil }
        return .timingCurve(points[0], points[1], points[2], points[3], duration: (isExiting ? duration.exit : duration.enter) / 1000)
    }
    func motionProgress(_ role: String, elapsed: Double) -> Double {
        guard motionSpeed != .instant, let motion = FabricatorContract.shared.motion[motionSpeed.rawValue], let duration = motion.durations[role], duration.enter > 0 else { return 1 }
        let progress = min(1, max(0, elapsed / (duration.enter / 1000)))
        let easing = motion.easings[role] ?? motion.easings["enter", default: ""]
        let values = easing.replacingOccurrences(of: "cubic-bezier(", with: "").replacingOccurrences(of: ")", with: "").split(separator: ",").compactMap { Double($0.trimmingCharacters(in: .whitespaces)) }
        guard values.count == 4 else { return progress }
        func cubic(_ time: Double, first: Double, second: Double) -> Double { 3 * (1 - time) * (1 - time) * time * first + 3 * (1 - time) * time * time * second + time * time * time }
        var low = 0.0, high = 1.0
        for _ in 0..<16 { let middle = (low + high) / 2; if cubic(middle, first: values[0], second: values[2]) < progress { low = middle } else { high = middle } }
        return cubic((low + high) / 2, first: values[1], second: values[3])
    }
    public static var catalog: [FabricatorCatalogItem] { FabricatorContract.shared.items }
}

private struct FabricatorThemeKey: EnvironmentKey { static let defaultValue = FabricatorTheme() }
public extension EnvironmentValues {
    var fabricatorTheme: FabricatorTheme { get { self[FabricatorThemeKey.self] } set { self[FabricatorThemeKey.self] = newValue } }
}

public struct FabricatorRoot<Content: View>: View {
    @Environment(\.colorScheme) private var systemScheme
    public var colorScheme: ColorScheme?
    public var density: FabricatorDensity
    private var content: Content
    public init(colorScheme: ColorScheme? = nil, density: FabricatorDensity = .regular, @ViewBuilder content: () -> Content) {
        self.colorScheme = colorScheme; self.density = density; self.content = content()
    }
    public var body: some View {
        let theme = FabricatorTheme(colorScheme: colorScheme ?? systemScheme, density: density)
        content.environment(\.fabricatorTheme, theme).font(theme.bodyFont).foregroundStyle(theme.color("foreground"))
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
    var elevation: String = "card"
    func body(content: Content) -> some View {
        let shadows = theme.shadows(elevation)
        content.background {
            ZStack {
                ForEach(Array(shadows.enumerated()).filter { !$0.element.isInset }.reversed(), id: \.offset) { _, shadow in
                    RoundedRectangle(cornerRadius: theme.radius(radius)).inset(by: -shadow.spread).fill(shadow.color).blur(radius: shadow.blur / 2).offset(x: shadow.x, y: shadow.y)
                }
                RoundedRectangle(cornerRadius: theme.radius(radius)).fill(theme.color("card"))
            }
        }.overlay {
            ForEach(Array(shadows.enumerated()).filter { $0.element.isInset }, id: \.offset) { _, shadow in
                RoundedRectangle(cornerRadius: theme.radius(radius)).strokeBorder(shadow.color, lineWidth: max(1, shadow.spread)).offset(x: shadow.x, y: shadow.y).clipShape(RoundedRectangle(cornerRadius: theme.radius(radius)))
            }
        }
    }
}
public extension View {
    func fabricatorSurface(radius: String = "xl", elevation: String = "card") -> some View { modifier(FabricatorSurface(radius: radius, elevation: elevation)) }
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
