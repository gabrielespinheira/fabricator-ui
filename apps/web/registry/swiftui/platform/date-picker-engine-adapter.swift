import Foundation

enum FabricatorDatePickerEngineError: Error, LocalizedError {
    case unsupportedCalendar, scriptFailure(String), invalidReply
    var errorDescription: String? { switch self { case .unsupportedCalendar: "Date Picker text requires a Gregorian or ISO calendar."; case .scriptFailure(let message): message; case .invalidReply: "The canonical Date Picker returned an invalid reply." } }
}

@MainActor final class FabricatorDatePickerEngineAdapter {
    static let shared = Result { try FabricatorDatePickerEngineAdapter() }
    private let runtime: FabricatorJavaScriptRuntime
    var scriptByteCount: Int { runtime.scriptByteCount }
    init() throws { runtime = try FabricatorJavaScriptRuntime(resource: "date-picker-engine", functionName: "fabricatorDatePickerCall") }
    private struct CivilDate: Codable, Equatable { var year: Int; var month: Int; var day: Int }
    private struct Request: Encodable { var action: String; var text: String; var value: CivilDate?; var referenceDate: CivilDate; var minDate: CivilDate?; var maxDate: CivilDate?; var granularity: String; var format: String?; var locale: String
        enum CodingKeys: String, CodingKey { case action, text, value, referenceDate, minDate, maxDate, granularity, format, locale }
        func encode(to encoder: Encoder) throws {
            var container = encoder.container(keyedBy: CodingKeys.self)
            try container.encode(action, forKey: .action); try container.encode(text, forKey: .text); try container.encode(value, forKey: .value); try container.encode(referenceDate, forKey: .referenceDate); try container.encodeIfPresent(minDate, forKey: .minDate); try container.encodeIfPresent(maxDate, forKey: .maxDate); try container.encode(granularity, forKey: .granularity); try container.encodeIfPresent(format, forKey: .format); try container.encode(locale, forKey: .locale)
        }
    }
    private struct Reply: Decodable {
        struct Value: Decodable { var value: CivilDate?; var text: String; var isInvalid: Bool }
        struct Failure: Decodable { var name: String; var message: String }
        var ok: Bool; var value: Value?; var error: Failure?
    }
    func commit(_ text: String, referenceDate: Date, granularity: FabricatorDateGranularity = .day, format: String? = nil, allowedRange: ClosedRange<Date>? = nil, calendar: Calendar) throws -> FabricatorDateTextCommit {
        try call(action: "commit", text: text, referenceDate: referenceDate, granularity: granularity, format: format, allowedRange: allowedRange, calendar: calendar)
    }
    func parse(_ text: String, referenceDate: Date, granularity: FabricatorDateGranularity = .day, format: String? = nil, calendar: Calendar) throws -> Date? {
        try call(action: "parse", text: text, referenceDate: referenceDate, granularity: granularity, format: format, calendar: calendar).value
    }
    func format(_ value: Date, granularity: FabricatorDateGranularity = .day, format: String? = nil, calendar: Calendar) throws -> String {
        try call(action: "format", text: "", value: value, referenceDate: value, granularity: granularity, format: format, calendar: calendar).text
    }
    private func call(action: String, text: String, value: Date? = nil, referenceDate: Date, granularity: FabricatorDateGranularity, format: String?, allowedRange: ClosedRange<Date>? = nil, calendar: Calendar) throws -> FabricatorDateTextCommit {
        guard calendar.identifier == .gregorian || calendar.identifier == .iso8601 else { throw FabricatorDatePickerEngineError.unsupportedCalendar }
        let request = Request(action: action, text: text, value: value.map { civil($0, calendar: calendar) }, referenceDate: civil(referenceDate, calendar: calendar), minDate: allowedRange.map { civil($0.lowerBound, calendar: calendar) }, maxDate: allowedRange.map { civil($0.upperBound, calendar: calendar) }, granularity: granularity.rawValue, format: format, locale: (calendar.locale ?? .current).identifier)
        let input = String(decoding: try JSONEncoder().encode(request), as: UTF8.self)
        let reply = try JSONDecoder().decode(Reply.self, from: Data(try runtime.call(input).utf8))
        if let error = reply.error { throw FabricatorDatePickerEngineError.scriptFailure("\(error.name): \(error.message)") }
        guard reply.ok, let result = reply.value else { throw FabricatorDatePickerEngineError.invalidReply }
        let date = result.value.flatMap { value in
            let components = DateComponents(era: value.year <= 0 ? 0 : 1, year: value.year <= 0 ? 1 - value.year : value.year, month: value.month, day: value.day)
            guard let date = calendar.date(from: components), civil(date, calendar: calendar) == value else { return Optional<Date>.none }
            return date
        }
        return FabricatorDateTextCommit(value: date, text: result.text, isInvalid: result.isInvalid || (result.value != nil && date == nil))
    }
    private func civil(_ date: Date, calendar: Calendar) -> CivilDate {
        let year = calendar.component(.year, from: date)
        return CivilDate(year: calendar.component(.era, from: date) == 0 ? 1 - year : year, month: calendar.component(.month, from: date), day: calendar.component(.day, from: date))
    }
}

