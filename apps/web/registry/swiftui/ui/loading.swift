import SwiftUI

public struct FabricatorSpinner: View {
    @Environment(\.fabricatorTheme) private var theme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.scenePhase) private var scenePhase
    @State private var start = Date.now
    public var variant: FabricatorSpinnerVariant
    public var speed: Double
    public var animated: Bool
    public var size: CGFloat?
    public init(variant: FabricatorSpinnerVariant = .orbit, speed: Double = 1, animated: Bool = true, size: CGFloat? = nil) { self.variant = variant; self.speed = speed; self.animated = animated; self.size = size }
    public static var definitions: [FabricatorSpinnerDefinition] { FabricatorContract.shared.spinners.variants }
    private var isAnimated: Bool { animated && !reduceMotion && theme.hasContinuousMotion && scenePhase == .active }
    public var body: some View {
        let contract = FabricatorContract.shared.spinners
        let dimension = size ?? (theme.density == .compact ? 14 : theme.density == .spacious || theme.density == .tablet ? 18 : 16)
        TimelineView(.animation(minimumInterval: 1 / 60, paused: !isAnimated)) { timeline in
            let elapsed = max(0, timeline.date.timeIntervalSince(start))
            let duration = FabricatorSpinnerEngine.duration(baseMilliseconds: contract.durationMs, speed: speed)
            let clock = isAnimated ? (elapsed * 1000 / duration).truncatingRemainder(dividingBy: 1) : 0
            Canvas { context, canvas in
                context.scaleBy(x: canvas.width / 24, y: canvas.height / 24)
                if variant == .ring {
                    context.translateBy(x: 12, y: 12); context.rotate(by: .degrees(clock * 360)); context.translateBy(x: -12, y: -12)
                    var background = context; background.opacity = 0.16
                    background.stroke(Path(ellipseIn: CGRect(x: 3, y: 3, width: 18, height: 18)), with: .foreground, lineWidth: 2)
                    var arc = Path(); arc.addArc(center: CGPoint(x: 12, y: 12), radius: 9, startAngle: .degrees(-90), endAngle: .degrees(0), clockwise: false)
                    context.stroke(arc, with: .foreground, style: StrokeStyle(lineWidth: 2, lineCap: .round))
                    return
                }
                guard let definition = contract.variants.first(where: { $0.value == variant }) else { return }
                for dot in definition.dots {
                    let phase = (clock + dot.phase).truncatingRemainder(dividingBy: 1)
                    let frame = isAnimated ? FabricatorSpinnerEngine.sample(definition.motion, phase: phase) : FabricatorSpinnerMotionFrame(opacity: 0.3 + dot.phase * 0.6)
                    var layer = context
                    layer.opacity = dot.opacity * frame.opacity
                    layer.translateBy(x: dot.x + frame.translateX * dot.travelX, y: dot.y + frame.translateY * dot.travelY)
                    layer.rotate(by: .degrees(frame.rotation)); layer.scaleBy(x: frame.scaleX, y: frame.scaleY)
                    let bounds = CGRect(x: -dot.width / 2, y: -dot.height / 2, width: dot.width, height: dot.height)
                    let path: Path
                    if dot.shape == "triangle" || dot.shape == "hexagon" {
                        let points: [CGPoint] = dot.shape == "triangle" ? [CGPoint(x: 0.5, y: 0), CGPoint(x: 1, y: 1), CGPoint(x: 0, y: 1)] : [CGPoint(x: 0.5, y: 0), CGPoint(x: 1, y: 0.25), CGPoint(x: 1, y: 0.75), CGPoint(x: 0.5, y: 1), CGPoint(x: 0, y: 0.75), CGPoint(x: 0, y: 0.25)]
                        path = Path { path in for (index, point) in points.enumerated() { let position = CGPoint(x: bounds.minX + point.x * dot.width, y: bounds.minY + point.y * dot.height); if index == 0 { path.move(to: position) } else { path.addLine(to: position) } }; path.closeSubpath() }
                    } else { path = Path(roundedRect: bounds, cornerRadius: dot.shape == "circle" ? dot.width / 2 : 0.6) }
                    layer.fill(path, with: .foreground)
                }
            }
        }.frame(width: dimension, height: dimension).accessibilityLabel("Loading").accessibilityAddTraits(.updatesFrequently).onChange(of: variant) { _, _ in start = .now }.onChange(of: scenePhase) { _, phase in if phase == .active { start = .now } }
    }
}

public struct FabricatorSkeleton: View {
    @Environment(\.fabricatorTheme) private var theme
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var start = Date.now
    public var width: CGFloat?
    public var height: CGFloat
    public var animated: Bool
    public init(width: CGFloat? = nil, height: CGFloat = 16, animated: Bool = true) { self.width = width; self.height = height; self.animated = animated }
    private var isAnimated: Bool { animated && !reduceMotion && theme.hasContinuousMotion && scenePhase == .active }
    public var body: some View {
        TimelineView(.animation(minimumInterval: 1 / 60, paused: !isAnimated)) { timeline in
            let elapsed = max(0, timeline.date.timeIntervalSince(start)).truncatingRemainder(dividingBy: 2)
            let progress = elapsed < 1 ? elapsed : 2 - elapsed
            let opacity = isAnimated ? 1 - easePulse(progress) * 0.5 : 1
            RoundedRectangle(cornerRadius: theme.radius("md")).fill(theme.color("hover")).opacity(opacity)
        }.frame(width: width, height: height).accessibilityHidden(true)
    }
    private func easePulse(_ progress: Double) -> Double {
        func cubic(_ time: Double, first: Double, second: Double) -> Double { 3 * (1 - time) * (1 - time) * time * first + 3 * (1 - time) * time * time * second + time * time * time }
        var low = 0.0, high = 1.0
        for _ in 0..<14 { let middle = (low + high) / 2; if cubic(middle, first: 0.4, second: 0.6) < progress { low = middle } else { high = middle } }
        return cubic((low + high) / 2, first: 0, second: 1)
    }
}
