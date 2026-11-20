import SwiftUI

public enum FabricatorGooeyEffect: String, CaseIterable, Sendable { case move, morph, bend, melt }
public enum FabricatorGooeyMode: Sendable { case off, subtle, expressive }
public enum FabricatorGooeyDirection: Sendable { case right, left, down, up }

public struct FabricatorGooeyOptions: Sendable {
    public var effect: FabricatorGooeyEffect?
    public var intensity: Double?
    public var waviness: Double?
    public var isEnabled: Bool

    public init(effect: FabricatorGooeyEffect? = nil, intensity: Double? = nil, waviness: Double? = nil, isEnabled: Bool = true) {
        self.effect = effect
        self.intensity = intensity
        self.waviness = waviness
        self.isEnabled = isEnabled
    }
}

private struct GooeySettings: Sendable {
    var mode: FabricatorGooeyMode
    var waviness: Double?
}

private struct GooeySettingsKey: EnvironmentKey { static let defaultValue: GooeySettings? = nil }
private extension EnvironmentValues {
    var gooeySettings: GooeySettings? {
        get { self[GooeySettingsKey.self] }
        set { self[GooeySettingsKey.self] = newValue }
    }
}

private struct GooeyScope: ViewModifier {
    @Environment(\.gooeySettings) private var parent
    var mode: FabricatorGooeyMode
    var waviness: Double?

    func body(content: Content) -> some View {
        content.environment(\.gooeySettings, GooeySettings(mode: parent?.mode == .off ? .off : mode, waviness: waviness ?? parent?.waviness))
    }
}

public extension View {
    func fabricatorGooey(_ mode: FabricatorGooeyMode, waviness: Double? = nil) -> some View {
        modifier(GooeyScope(mode: mode, waviness: waviness))
    }
}

private func clampGooeyUnit(_ value: Double) -> Double { value.isFinite ? min(1, max(0, value)) : 0 }

private struct GooeyShape: Shape {
    var effect: FabricatorGooeyEffect
    var amount: Double
    var waviness: Double
    var direction: FabricatorGooeyDirection

    var animatableData: Double {
        get { amount }
        set { amount = newValue }
    }

    func path(in rect: CGRect) -> Path {
        let geometry = FabricatorContract.shared.gooey
        let target = geometry.effects[effect.rawValue, default: geometry.resting]
        let strength = clampGooeyUnit(amount)
        let ripple = 4 * strength * clampGooeyUnit(waviness)
        func point(_ index: Int) -> CGPoint {
            let startX = geometry.resting[index]
            let startY = geometry.resting[index + 1]
            let x = startX + (target[index] - startX) * strength
            let y = startY + (target[index + 1] - startY) * strength + sin(startX * 0.13 + startY * 0.18) * ripple
            let (px, py) = switch direction {
            case .right: (x, y)
            case .left: (100 - x, y)
            case .down: (100 - y * 2.5, x * 0.4)
            case .up: (y * 2.5, 40 - x * 0.4)
            }
            return CGPoint(x: rect.minX + rect.width * (px + 30) / 160, y: rect.minY + rect.height * (py + 16) / 72)
        }
        return Path { path in
            path.move(to: point(0))
            for index in stride(from: 2, to: geometry.resting.count, by: 6) {
                path.addCurve(to: point(index + 4), control1: point(index), control2: point(index + 2))
            }
            path.closeSubpath()
        }
    }
}

public struct FabricatorGooey: View {
    @Environment(\.fabricatorTheme) private var theme
    @Environment(\.gooeySettings) private var settings
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    private var effect: FabricatorGooeyEffect
    private var progress: Double
    private var intensity: Double?
    private var waviness: Double?
    private var direction: FabricatorGooeyDirection
    private var fill: Color
    private var accentFill: Color?

    public init(effect: FabricatorGooeyEffect = .move, progress: Double = 0, intensity: Double? = nil, waviness: Double? = nil, direction: FabricatorGooeyDirection = .right, fill: Color = .primary, accentFill: Color? = nil) {
        self.effect = effect; self.progress = progress; self.intensity = intensity; self.waviness = waviness
        self.direction = direction; self.fill = fill; self.accentFill = accentFill
    }

    public var body: some View {
        let geometry = FabricatorContract.shared.gooey
        let strength = intensity ?? (settings?.mode == .expressive ? geometry.expressive : geometry.subtle)
        let amount = theme.hasMotion && !reduceMotion && settings?.mode != .off ? clampGooeyUnit(progress) * clampGooeyUnit(strength) : 0
        let shape = GooeyShape(effect: effect, amount: amount, waviness: waviness ?? settings?.waviness ?? geometry.waviness, direction: direction)
        let (start, end): (UnitPoint, UnitPoint) = switch direction {
        case .right: (UnitPoint(x: 0, y: 0.25), UnitPoint(x: 1, y: 0.75))
        case .left: (UnitPoint(x: 1, y: 0.25), UnitPoint(x: 0, y: 0.75))
        case .down: (UnitPoint(x: 0.75, y: 0), UnitPoint(x: 0.25, y: 1))
        case .up: (UnitPoint(x: 0.25, y: 1), UnitPoint(x: 0.75, y: 0))
        }
        let style = if effect == .melt, let accentFill, amount > 0 {
            AnyShapeStyle(LinearGradient(stops: [.init(color: fill, location: 0.25), .init(color: accentFill, location: 0.75)], startPoint: start, endPoint: end))
        } else { AnyShapeStyle(fill) }
        shape.fill(style).allowsHitTesting(false).accessibilityHidden(true)
    }
}

struct FabricatorGooeyPulse: View {
    @Environment(\.fabricatorTheme) private var theme
    @Environment(\.gooeySettings) private var settings
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.layoutDirection) private var layoutDirection
    @State private var direction: FabricatorGooeyDirection = .right
    let value: Double
    let options: FabricatorGooeyOptions?
    let effect: FabricatorGooeyEffect
    let fill: Color
    var isVisible = true

    private var isEnabled: Bool {
        (settings != nil || options != nil) && settings?.mode != .off && options?.isEnabled != false && theme.hasMotion && !reduceMotion
    }

    var body: some View {
        if isEnabled, let duration = theme.motionTiming("move")?.duration {
            let defaults = FabricatorContract.shared.gooey
            let resolvedIntensity = clampGooeyUnit(options?.intensity ?? (settings?.mode == .expressive ? defaults.expressive : defaults.subtle))
            let resolvedWaviness = options?.waviness ?? settings?.waviness ?? defaults.waviness
            let resolvedEffect = options?.effect ?? effect
            let resolvedDirection = direction
            Color.clear.keyframeAnimator(initialValue: 0.0, trigger: value) { _, progress in
                GeometryReader { geometry in
                    if isVisible && progress > 0 {
                        GooeyShape(effect: resolvedEffect, amount: progress * resolvedIntensity, waviness: resolvedWaviness, direction: resolvedDirection).fill(fill)
                            .frame(width: geometry.size.width * 1.6, height: geometry.size.height * 1.8)
                            .opacity(min(1, progress * 2))
                            .position(x: geometry.size.width / 2, y: geometry.size.height / 2)
                    }
                }
            } keyframes: { _ in
                MoveKeyframe(1.0)
                CubicKeyframe(0.0, duration: duration)
            }
            .allowsHitTesting(false).accessibilityHidden(true)
            .onChange(of: value) { previous, next in
                direction = (next > previous) != (layoutDirection == .rightToLeft) ? .right : .left
            }
        }
    }
}
