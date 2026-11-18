import Foundation

struct FabricatorTimeTextCommit: Equatable, Sendable { var value: FabricatorTimeOfDay?; var text: String; var isInvalid: Bool }

struct FabricatorTimeInputState: Equatable {
    var text: String
    var isInvalid = false
    private(set) var syncedValue: FabricatorTimeOfDay?
    init(value: FabricatorTimeOfDay?, text: String) { syncedValue = value; self.text = text }
    mutating func commit(_ result: FabricatorTimeTextCommit, allowsEmptyValue: Bool, hasSeconds: Bool) -> FabricatorTimeOfDay? {
        text = result.text; isInvalid = result.isInvalid || (!allowsEmptyValue && result.value == nil)
        if allowsEmptyValue || result.value != nil { syncedValue = result.value?.normalized(hasSeconds: hasSeconds) }
        return syncedValue
    }
    mutating func synchronize(_ value: FabricatorTimeOfDay?, text: String) {
        guard value != syncedValue else { return }
        self = Self(value: value, text: text)
    }
}

enum FabricatorTimeInputModel {
    struct Parsed: Equatable { var value: FabricatorTimeOfDay; var hasSeconds: Bool }
    private static let clockPattern = makeExpression(#"^([0-9]{1,2})(?:[:.h]?([0-9]{2}))?(?::([0-9]{2}))?\s*([ap])?\.?\s*(?:m\.?)?$"#)
    private static let dateTimePattern = makeExpression(#"^(.*?)(?:,\s*|\s+at\s+)([^,]+)$"#)
    private static let timeSuffixPattern = makeExpression(#"^([0-9]{1,2}[:.][0-9]{2}|[0-9]{1,2}\s*[ap]\.?m?\.?|noon|midnight)"#)
    static func parse(_ text: String) -> Parsed? {
        let normalized = text.lowercased().split(whereSeparator: \.isWhitespace).joined(separator: " ")
        if normalized == "noon" { return Parsed(value: FabricatorTimeOfDay(hours: 12, minutes: 0), hasSeconds: false) }
        if normalized == "midnight" { return Parsed(value: FabricatorTimeOfDay(hours: 0, minutes: 0), hasSeconds: false) }
        let isCompact = (3...4).contains(normalized.count) && normalized.allSatisfy { $0.isASCII && $0.isNumber }
        let compact = isCompact ? "\(normalized.dropLast(2)):\(normalized.suffix(2))" : normalized
        guard let match = clockPattern.firstMatch(in: compact, range: NSRange(compact.startIndex..., in: compact)), let hourText = capture(match, at: 1, in: compact), var hours = Int(hourText) else { return nil }
        let minutes = Int(capture(match, at: 2, in: compact) ?? "0"), secondText = capture(match, at: 3, in: compact)
        guard let minutes, let seconds = Int(secondText ?? "0"), minutes < 60, seconds < 60 else { return nil }
        if let meridiem = capture(match, at: 4, in: compact) {
            guard (1...12).contains(hours) else { return nil }
            hours = hours % 12 + (meridiem == "p" ? 12 : 0)
        }
        guard hours < 24 else { return nil }
        return Parsed(value: FabricatorTimeOfDay(hours: hours, minutes: minutes, seconds: seconds), hasSeconds: secondText != nil)
    }
    static func format(_ value: FabricatorTimeOfDay?, hourCycle: FabricatorHourCycle, hasSeconds: Bool) -> String {
        guard let value else { return "" }
        let hours = hourCycle == .twelve ? String(value.hour12) : FabricatorTimeOfDay.pad(value.hours)
        let seconds = hasSeconds ? ":\(FabricatorTimeOfDay.pad(value.seconds))" : ""
        return "\(hours):\(FabricatorTimeOfDay.pad(value.minutes))\(seconds)\(hourCycle == .twelve ? (value.meridiem == 0 ? " AM" : " PM") : "")"
    }
    static func commit(_ text: String, hourCycle: FabricatorHourCycle, allowedRange: ClosedRange<FabricatorTimeOfDay>? = nil) -> FabricatorTimeTextCommit {
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return FabricatorTimeTextCommit(value: nil, text: "", isInvalid: false) }
        guard let parsed = parse(text) else { return FabricatorTimeTextCommit(value: nil, text: text, isInvalid: true) }
        // Canonical typed bounds compare whole minutes; wheel bounds compare seconds.
        let value = parsed.value, minute = value.hours * 60 + value.minutes
        let isInRange = allowedRange.map { minute >= $0.lowerBound.hours * 60 + $0.lowerBound.minutes && minute <= $0.upperBound.hours * 60 + $0.upperBound.minutes } ?? true
        return FabricatorTimeTextCommit(value: isInRange ? value : nil, text: format(value, hourCycle: hourCycle, hasSeconds: parsed.hasSeconds), isInvalid: !isInRange)
    }
    static func splitDateTime(_ text: String) -> (dateText: String, timeText: String?) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let match = dateTimePattern.firstMatch(in: trimmed, range: NSRange(trimmed.startIndex..., in: trimmed)), let date = capture(match, at: 1, in: trimmed), !date.isEmpty, let time = capture(match, at: 2, in: trimmed)?.trimmingCharacters(in: .whitespacesAndNewlines), timeSuffixPattern.firstMatch(in: time, range: NSRange(time.startIndex..., in: time)) != nil else { return (trimmed, nil) }
        return (date.trimmingCharacters(in: .whitespacesAndNewlines), time)
    }
    private static func capture(_ match: NSTextCheckingResult, at index: Int, in text: String) -> String? {
        Range(match.range(at: index), in: text).map { String(text[$0]) }
    }
    private static func makeExpression(_ pattern: String) -> NSRegularExpression {
        do { return try NSRegularExpression(pattern: pattern, options: .caseInsensitive) }
        catch { preconditionFailure("Invalid canonical time pattern: \(error)") }
    }
}
