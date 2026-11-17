import Foundation

public enum FabricatorHourCycle: Int, Sendable, Hashable { case twelve = 12, twentyFour = 24
    static func resolve(_ locale: Locale) -> Self { locale.hourCycle == .zeroToEleven || locale.hourCycle == .oneToTwelve ? .twelve : .twentyFour }
}

public struct FabricatorTimeOfDay: Sendable, Hashable, Comparable {
    public let hours: Int
    public let minutes: Int
    public let seconds: Int
    public init(hours: Int, minutes: Int, seconds: Int = 0) {
        precondition((0..<24).contains(hours) && (0..<60).contains(minutes) && (0..<60).contains(seconds), "Time parts must describe a real time of day")
        self.hours = hours; self.minutes = minutes; self.seconds = seconds
    }
    init(_ date: Date, calendar: Calendar) { self.init(hours: calendar.component(.hour, from: date), minutes: calendar.component(.minute, from: date), seconds: calendar.component(.second, from: date)) }
    var hour12: Int { hours % 12 == 0 ? 12 : hours % 12 }
    var meridiem: Int { hours < 12 ? 0 : 1 }
    private var totalSeconds: Int { hours * 3600 + minutes * 60 + seconds }
    public static func < (left: Self, right: Self) -> Bool { left.totalSeconds < right.totalSeconds }
    func normalized(hasSeconds: Bool) -> Self { Self(hours: hours, minutes: minutes, seconds: hasSeconds ? seconds : 0) }
    func makeDate(on date: Date, calendar: Calendar) -> Date {
        var components = calendar.dateComponents([.era, .year, .month, .day], from: date)
        components.hour = hours; components.minute = minutes; components.second = seconds
        guard let date = calendar.date(from: components) else { preconditionFailure("Calendar could not resolve the selected clock time") }
        return date
    }
    func changing(_ component: FabricatorTimeWheelModel.Component, to value: Int, hourCycle: FabricatorHourCycle, hasSeconds: Bool) -> Self {
        let next: Self = switch component {
        case .hours: Self(hours: hourCycle == .twelve ? value % 12 + meridiem * 12 : value, minutes: minutes, seconds: seconds)
        case .minutes: Self(hours: hours, minutes: value, seconds: seconds)
        case .seconds: Self(hours: hours, minutes: minutes, seconds: value)
        case .meridiem: Self(hours: hours % 12 + value * 12, minutes: minutes, seconds: seconds)
        }
        return next.normalized(hasSeconds: hasSeconds)
    }
    func clamped(to range: ClosedRange<Self>?, hasSeconds: Bool) -> Self {
        guard let range else { return normalized(hasSeconds: hasSeconds) }
        return min(range.upperBound, max(range.lowerBound, self)).normalized(hasSeconds: hasSeconds)
    }
    static func pad(_ value: Int) -> String { value < 10 ? "0\(value)" : String(value) }
}

enum FabricatorTimeWheelModel {
    enum Component: String, Hashable { case hours, minutes, seconds, meridiem
        var label: String { switch self { case .hours: "Hours"; case .minutes: "Minutes"; case .seconds: "Seconds"; case .meridiem: "AM or PM" } }
    }
    static func getHourValues(_ cycle: FabricatorHourCycle) -> [Int] { cycle == .twelve ? Array(1...12) : Array(0...23) }
    static func getMinuteValues(step: Int) -> [Int] { Array(stride(from: 0, to: 60, by: max(1, step))) }
    static func findNearestIndex(in values: [Int], to value: Int) -> Int {
        precondition(!values.isEmpty, "A time column must have rows")
        return values.indices.reduce(0) { nearest, index in abs(values[index] - value) < abs(values[nearest] - value) ? index : nearest }
    }
    static func move(in values: [Int], from value: Int, by amount: Int) -> Int { values[min(values.count - 1, max(0, findNearestIndex(in: values, to: value) + amount))] }
    static func getSnapIndex(offset: Double, rowHeight: Double, count: Int) -> Int { min(count - 1, max(0, Int((offset / rowHeight).rounded()))) }
    static func getTiltAngle(offset: Double, height: Double, hasMotion: Bool) -> Double { hasMotion ? -asin(max(-1, min(1, offset / (height / 2)))) * 180 * 0.9 / .pi : 0 }
}
