import Foundation

public enum FabricatorEventStatus: String, CaseIterable, Sendable { case confirmed, tentative, cancelled }
public enum FabricatorEventCalendarMode: String, CaseIterable, Sendable { case day, days, week, month, agenda }
public struct FabricatorEventLayout: Identifiable, Sendable {
    public var event: FabricatorEvent
    public var column: Int
    public var columnCount: Int
    public var startMinute: Double
    public var endMinute: Double
    public var id: String { event.id }
}
public enum FabricatorEventCalendarEngine {
    public static func visibleDays(containing date: Date, mode: FabricatorEventCalendarMode, numberOfDays: Int = 3, calendar: Calendar = .current) -> [Date] {
        if mode == .month { return FabricatorCalendar.monthDays(containing: date, calendar: calendar) }
        let first: Date
        let count: Int
        switch mode {
        case .day: first = calendar.startOfDay(for: date); count = 1
        case .days: first = calendar.startOfDay(for: date); count = max(1, numberOfDays)
        case .week: first = calendar.dateInterval(of: .weekOfYear, for: date)?.start ?? calendar.startOfDay(for: date); count = 7
        case .agenda: first = calendar.startOfDay(for: date); count = 30
        case .month: return []
        }
        return (0..<count).compactMap { calendar.date(byAdding: .day, value: $0, to: first) }
    }
    public static func move(_ event: FabricatorEvent, toDay day: Date, minute: Int? = nil, calendar: Calendar = .current) -> FabricatorEvent {
        var updated = event
        if event.allDay {
            let days = max(1, calendar.dateComponents([.day], from: calendar.startOfDay(for: event.start), to: calendar.startOfDay(for: event.end)).day ?? 1)
            updated.start = calendar.startOfDay(for: day); updated.end = calendar.date(byAdding: .day, value: days, to: updated.start) ?? updated.start
            return updated
        }
        let components = calendar.dateComponents([.hour, .minute], from: event.start)
        let targetMinute = max(0, min(1439, minute ?? ((components.hour ?? 0) * 60 + (components.minute ?? 0))))
        guard let start = calendar.date(bySettingHour: targetMinute / 60, minute: targetMinute % 60, second: 0, of: day) else { return event }
        updated.start = start; updated.end = start.addingTimeInterval(event.end.timeIntervalSince(event.start))
        return updated
    }
    public static func resize(_ event: FabricatorEvent, end: Date, minimumMinutes: Int = 15) -> FabricatorEvent {
        var updated = event; updated.end = max(event.start.addingTimeInterval(Double(max(1, minimumMinutes)) * 60), end); return updated
    }
    public static func navigate(_ date: Date, mode: FabricatorEventCalendarMode, offset: Int, numberOfDays: Int = 3, calendar: Calendar = .current) -> Date {
        let component: Calendar.Component = mode == .month ? .month : .day
        let step = mode == .week ? 7 : mode == .days ? max(1, numberOfDays) : mode == .agenda ? 30 : 1
        return calendar.date(byAdding: component, value: step * offset, to: date) ?? date
    }
    public static func layout(_ events: [FabricatorEvent], on day: Date, calendar: Calendar = .current) -> [FabricatorEventLayout] {
        guard let interval = calendar.dateInterval(of: .day, for: day) else { return [] }
        let visible = events.filter { !$0.allDay && $0.status != .cancelled && $0.start < interval.end && $0.end > interval.start }.sorted { $0.start == $1.start ? $0.end > $1.end : $0.start < $1.start }
        var result: [FabricatorEventLayout] = [], cluster: [Int] = [], ends: [Date] = [], clusterEnd = interval.start, maximumColumns = 0
        func finishCluster() { for index in cluster { result[index].columnCount = maximumColumns }; cluster.removeAll(); ends.removeAll(); maximumColumns = 0 }
        for event in visible {
            if event.start >= clusterEnd { finishCluster() }
            let column: Int
            if let free = ends.firstIndex(where: { $0 <= event.start }) { column = free; ends[free] = event.end }
            else { column = ends.count; ends.append(event.end) }
            maximumColumns = max(maximumColumns, ends.count); clusterEnd = max(clusterEnd, event.end)
            let start = calendar.dateComponents([.hour, .minute], from: event.start), end = calendar.dateComponents([.hour, .minute], from: event.end)
            let first = event.start <= interval.start ? 0 : Double((start.hour ?? 0) * 60 + (start.minute ?? 0))
            let last = event.end >= interval.end ? 1440 : Double((end.hour ?? 0) * 60 + (end.minute ?? 0))
            cluster.append(result.count); result.append(FabricatorEventLayout(event: event, column: column, columnCount: 1, startMinute: first, endMinute: max(first + 15, last)))
        }
        finishCluster(); return result
    }
}
