import Foundation

public enum FabricatorSpinnerVariant: String, CaseIterable, Sendable, Decodable {
    case orbit, ripple, cascade, wave, pulse, braid, ring, comet, bounce, equalizer, flip, scan, quadSwap = "quad-swap", quadFold = "quad-fold", ticTac = "tic-tac", bloom, checker, diagonal, triangle, square, rings, hex
}
public struct FabricatorSpinnerDot: Decodable, Sendable { public var x: Double; public var y: Double; public var phase: Double; public var opacity: Double; public var width: Double; public var height: Double; public var shape: String; public var travelX: Double; public var travelY: Double }
public struct FabricatorSpinnerMotionFrame: Decodable, Sendable {
    public var at: Double; public var opacity: Double; public var scaleX: Double; public var scaleY: Double; public var translateX: Double; public var translateY: Double; public var rotation: Double
    public init(at: Double = 0, opacity: Double = 1, scaleX: Double = 1, scaleY: Double = 1, translateX: Double = 0, translateY: Double = 0, rotation: Double = 0) { self.at = at; self.opacity = opacity; self.scaleX = scaleX; self.scaleY = scaleY; self.translateX = translateX; self.translateY = translateY; self.rotation = rotation }
}
public struct FabricatorSpinnerDefinition: Decodable, Identifiable, Sendable { public var value: FabricatorSpinnerVariant; public var label: String; public var description: String; public var dots: [FabricatorSpinnerDot]; public var motion: [FabricatorSpinnerMotionFrame]; public var id: String { value.rawValue } }
struct FabricatorSpinnerContract: Decodable, Sendable { var durationMs: Double; var variants: [FabricatorSpinnerDefinition] }
public enum FabricatorSpinnerEngine {
    public static func duration(baseMilliseconds: Double, speed: Double) -> Double { baseMilliseconds / (speed.isFinite && speed > 0 ? speed : 1) }
    public static func sample(_ motion: [FabricatorSpinnerMotionFrame], phase: Double) -> FabricatorSpinnerMotionFrame {
        guard var previous = motion.first else { return FabricatorSpinnerMotionFrame() }
        for next in motion.dropFirst() {
            if phase > next.at { previous = next; continue }
            let progress = (phase - previous.at) / max(.leastNonzeroMagnitude, next.at - previous.at)
            func mix(_ first: Double, _ last: Double) -> Double { first + (last - first) * progress }
            return FabricatorSpinnerMotionFrame(at: phase, opacity: mix(previous.opacity, next.opacity), scaleX: mix(previous.scaleX, next.scaleX), scaleY: mix(previous.scaleY, next.scaleY), translateX: mix(previous.translateX, next.translateX), translateY: mix(previous.translateY, next.translateY), rotation: mix(previous.rotation, next.rotation))
        }
        return previous
    }
}
