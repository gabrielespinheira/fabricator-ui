import Foundation

public enum FabricatorMotionSpeed: String, CaseIterable, Sendable { case smooth, `default`, snappy, instant }
enum FabricatorMotionEasing: String { case enter, move, exit, feedback, drawer, theme }

struct FabricatorMotionDuration: Decodable, Sendable { var enter: Double; var exit: Double }
struct FabricatorMotionTokens: Decodable, Sendable {
    var durations: [String: FabricatorMotionDuration]
    var easings: [String: String]
    var scales: [String: Double]
    var travel: [String: Double]
    var popupBlur: Double
    var bounce: Double
    var settle: Double
}

struct FabricatorMotionTiming: Sendable, Hashable {
    enum Curve: Sendable, Hashable {
        case cubicBezier(Double, Double, Double, Double)
        case spring(bounce: Double)
    }
    var duration: TimeInterval
    var curve: Curve

    func progress(at fraction: Double) -> Double {
        let progress = min(1, max(0, fraction))
        if progress == 0 || progress == 1 { return progress }
        switch curve {
        case .cubicBezier(let x1, let y1, let x2, let y2):
            func cubic(_ time: Double, _ first: Double, _ second: Double) -> Double {
                3 * (1 - time) * (1 - time) * time * first + 3 * (1 - time) * time * time * second + time * time * time
            }
            var low = 0.0, high = 1.0
            for _ in 0..<20 {
                let middle = (low + high) / 2
                if cubic(middle, x1, x2) < progress { low = middle } else { high = middle }
            }
            return cubic((low + high) / 2, y1, y2)
        case .spring(let bounce):
            // Contract 10: interpolate the same rounded 60 samples as motion.ts.
            func sample(_ index: Int) -> Double {
                if index == 60 { return 1 }
                let damping = 1 - bounce
                let frequency = 6 / damping
                let damped = frequency * sqrt(1 - damping * damping)
                let time = Double(index) / 60
                let envelope = exp(-6 * time)
                let value = damped == 0 ? 1 - envelope * (1 + frequency * time) : 1 - envelope * (cos(damped * time) + 6 / damped * sin(damped * time))
                return (value * 1000).rounded() / 1000
            }
            let position = progress * 60
            let index = Int(position)
            return sample(index) + (sample(index + 1) - sample(index)) * (position - Double(index))
        }
    }
}

extension FabricatorMotionTokens {
    func timing(_ role: String, isExiting: Bool, scale: Double, easing: FabricatorMotionEasing? = nil) -> FabricatorMotionTiming? {
        guard let durations = durations[role] else { preconditionFailure("Unknown Fabricator motion role: \(role)") }
        let duration = (isExiting ? durations.exit : durations.enter) * scale / 1000
        guard duration > 0 else { return nil }
        if role == "bounce" || role == "settle" {
            return FabricatorMotionTiming(duration: duration, curve: .spring(bounce: role == "bounce" ? bounce : settle))
        }
        let key: String
        if let easing { key = easing.rawValue }
        else if role == "sheet" { key = "drawer" }
        else if isExiting { key = "exit" }
        else if ["move", "feedback", "theme"].contains(role) { key = role }
        else { key = "enter" }
        guard let easing = easings[key] else { preconditionFailure("Missing Fabricator easing: \(key)") }
        let points = easing.replacingOccurrences(of: "cubic-bezier(", with: "").replacingOccurrences(of: ")", with: "").split(separator: ",").compactMap { Double($0.trimmingCharacters(in: .whitespaces)) }
        precondition(points.count == 4, "Invalid Fabricator cubic easing: \(easing)")
        return FabricatorMotionTiming(duration: duration, curve: .cubicBezier(points[0], points[1], points[2], points[3]))
    }
}
