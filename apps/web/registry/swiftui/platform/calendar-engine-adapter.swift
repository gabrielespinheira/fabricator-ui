import Foundation

public enum FabricatorRecurrenceScope: String, Codable, Sendable { case this, following, all }
public struct FabricatorRecurrencePreset: Codable, Identifiable, Sendable { public var label: String; public var value: String?; public var id: String { value ?? "none" } }
public enum FabricatorCalendarEngineError: Error, LocalizedError { case invalidReply(String); public var errorDescription: String? { switch self { case .invalidReply(let message): "Canonical calendar engine: \(message)" } } }

private struct CalendarWireEvent: Codable {
    var id: String; var title: String; var start: String; var end: String; var allDay: Bool?; var calendarId: String?; var color: String?; var recurrence: String?; var recurringEventId: String?; var originalStart: String?; var status: String?; var editable: Bool?; var location: String?; var description: String?
    init(_ event: FabricatorEvent, calendar: Calendar) {
        id = event.id; title = event.title; allDay = event.allDay; calendarId = event.calendarId; color = event.category; recurrence = event.recurrence; recurringEventId = event.recurringEventId; status = event.status.rawValue; editable = event.isEditable; location = event.location; description = event.description
        start = Self.format(event.start, allDay: event.allDay, calendar: calendar); end = Self.format(event.end, allDay: event.allDay, calendar: calendar); originalStart = event.originalStart.map { Self.format($0, allDay: event.allDay, calendar: calendar) }
    }
    func native(calendar: Calendar) throws -> FabricatorEvent {
        FabricatorEvent(id: id, title: title, start: try Self.parse(start, calendar: calendar), end: try Self.parse(end, calendar: calendar), category: color ?? "primary", allDay: allDay ?? false, isEditable: editable ?? true, location: location ?? "", description: description ?? "", status: status.flatMap(FabricatorEventStatus.init(rawValue:)) ?? .confirmed, recurrence: recurrence, recurringEventId: recurringEventId, originalStart: try originalStart.map { try Self.parse($0, calendar: calendar) }, calendarId: calendarId)
    }
    static func format(_ date: Date, allDay: Bool, calendar: Calendar) -> String {
        if allDay { let formatter = DateFormatter(); formatter.calendar = calendar; formatter.locale = Locale(identifier: "en_US_POSIX"); formatter.timeZone = calendar.timeZone; formatter.dateFormat = "yyyy-MM-dd"; return formatter.string(from: date) }
        let formatter = ISO8601DateFormatter(); formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]; return formatter.string(from: date)
    }
    private static func parse(_ value: String, calendar: Calendar) throws -> Date {
        let internet = ISO8601DateFormatter(); internet.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = internet.date(from: value) { return date }
        internet.formatOptions = [.withInternetDateTime]
        if let date = internet.date(from: value) { return date }
        let local = DateFormatter(); local.calendar = calendar; local.locale = Locale(identifier: "en_US_POSIX"); local.timeZone = calendar.timeZone; local.dateFormat = "yyyy-MM-dd"; local.isLenient = false
        if let date = local.date(from: value) { return date }
        throw FabricatorCalendarEngineError.invalidReply("Invalid event date: \(value)")
    }
}
private struct CalendarEngineRequest: Encodable {
    var action: String; var events: [CalendarWireEvent] = []; var start: String?; var end: String?; var timeZone: String; var occurrence: CalendarWireEvent?; var next: CalendarWireEvent?; var scope: FabricatorRecurrenceScope?; var recurrence: String?; var newID: String?
}
private struct CalendarEngineReply: Decodable { var ok: Bool; var value: Value?; var error: Failure?; struct Value: Decodable { var events: [CalendarWireEvent]; var timeZone: String?; var presets: [FabricatorRecurrencePreset]? }; struct Failure: Decodable { var name: String; var message: String } }

@MainActor public final class FabricatorCalendarEngineAdapter {
    private let runtime: FabricatorJavaScriptRuntime
    public var scriptByteCount: Int { runtime.scriptByteCount }
    public init() throws { runtime = try FabricatorJavaScriptRuntime(resource: "calendar-engine", functionName: "FabricatorCalendarBridge") }
    public func verifyTimeZone(_ zone: String) throws -> String { let value = try call(CalendarEngineRequest(action: "environment", timeZone: zone)); guard let resolved = value.timeZone else { throw FabricatorCalendarEngineError.invalidReply("Intl returned no timezone") }; return resolved }
    public func validate(_ recurrence: String, timeZone: String = "UTC") throws { _ = try call(CalendarEngineRequest(action: "validate", timeZone: timeZone, recurrence: recurrence)) }
    public func presets(start: Date, calendar: Calendar = .current) throws -> [FabricatorRecurrencePreset] { try call(CalendarEngineRequest(action: "presets", start: start.ISO8601Format(), timeZone: calendar.timeZone.identifier)).presets ?? [] }
    public func expand(_ events: [FabricatorEvent], in interval: DateInterval, calendar: Calendar = .current) throws -> [FabricatorEvent] {
        let value = try call(CalendarEngineRequest(action: "expand", events: events.map { CalendarWireEvent($0, calendar: calendar) }, start: interval.start.ISO8601Format(), end: interval.end.ISO8601Format(), timeZone: calendar.timeZone.identifier))
        return try value.events.map { try $0.native(calendar: calendar) }
    }
    public func edit(occurrence: FabricatorEvent, next: FabricatorEvent, scope: FabricatorRecurrenceScope, stored: [FabricatorEvent], calendar: Calendar = .current) throws -> [FabricatorEvent] {
        let value = try call(CalendarEngineRequest(action: "edit", events: stored.map { CalendarWireEvent($0, calendar: calendar) }, timeZone: calendar.timeZone.identifier, occurrence: CalendarWireEvent(occurrence, calendar: calendar), next: CalendarWireEvent(next, calendar: calendar), scope: scope, newID: UUID().uuidString))
        return try value.events.map { try $0.native(calendar: calendar) }
    }
    public func delete(occurrence: FabricatorEvent, scope: FabricatorRecurrenceScope, stored: [FabricatorEvent], calendar: Calendar = .current) throws -> [FabricatorEvent] {
        let value = try call(CalendarEngineRequest(action: "delete", events: stored.map { CalendarWireEvent($0, calendar: calendar) }, timeZone: calendar.timeZone.identifier, occurrence: CalendarWireEvent(occurrence, calendar: calendar), scope: scope))
        return try value.events.map { try $0.native(calendar: calendar) }
    }
    private func call(_ request: CalendarEngineRequest) throws -> CalendarEngineReply.Value {
        let json = String(decoding: try JSONEncoder().encode(request), as: UTF8.self)
        let data = Data(try runtime.call(json).utf8)
        let reply = try JSONDecoder().decode(CalendarEngineReply.self, from: data)
        guard reply.ok, let value = reply.value else { throw FabricatorCalendarEngineError.invalidReply(reply.error.map { "\($0.name): \($0.message)" } ?? "Missing result") }
        return value
    }
}
