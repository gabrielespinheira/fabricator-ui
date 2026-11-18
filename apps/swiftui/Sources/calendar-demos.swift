import SwiftUI
import FabricatorUI

enum CalendarExamples {
    static var calendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.locale = Locale(identifier: "en_US")
        calendar.timeZone = .gmt
        calendar.firstWeekday = 1
        return calendar
    }
    static func date(_ day: Int, month: Int = 11, hour: Int = 0, year: Int = 2026) -> Date {
        guard let date = calendar.date(from: DateComponents(year: year, month: month, day: day, hour: hour)) else { preconditionFailure("Invalid calendar fixture") }
        return date
    }
    static var reference: Date { date(16) }
    static var bounds: ClosedRange<Date> { date(16, hour: 12)...date(20, hour: 12) }
}

struct CalendarDemo: View {
    @Environment(\.fabricatorTheme) private var theme
    @State private var selected: Date? = CalendarExamples.reference
    @State private var bounded: Date? = CalendarExamples.date(19)
    @State private var range: FabricatorDateRange? = FabricatorDateRange(from: CalendarExamples.date(12, month: 1), to: CalendarExamples.date(11, month: 2))
    @State private var multiple: Set<Date> = []
    var body: some View {
        VStack(alignment: .leading, spacing: theme.space(32)) {
            FabricatorCalendarView(selection: $selected, calendar: CalendarExamples.calendar, captionLayout: .dropdown, referenceDate: CalendarExamples.reference)
                .overlay { RoundedRectangle(cornerRadius: theme.radius()).strokeBorder(theme.color("border"), lineWidth: 1).allowsHitTesting(false) }
                .accessibilityIdentifier("fabricator-calendar-primary")
            VStack(alignment: .leading, spacing: theme.space(12)) {
                FabricatorText("Date bounds", role: .heading)
                FabricatorText("November 16–20. The 17th is unavailable.", role: .caption)
                FabricatorCalendarView(selection: $bounded, allowedRange: CalendarExamples.bounds, calendar: CalendarExamples.calendar, referenceDate: CalendarExamples.reference, disabledDates: [CalendarExamples.date(17, hour: 12)])
                    .accessibilityIdentifier("fabricator-calendar-bounds")
            }
            VStack(alignment: .leading, spacing: theme.space(12)) {
                FabricatorText("Date range", role: .heading)
                FabricatorCalendarView(selection: $range, calendar: CalendarExamples.calendar, numberOfMonths: 2, showsWeekNumbers: true, referenceDate: CalendarExamples.reference)
                    .accessibilityIdentifier("fabricator-calendar-range")
            }
            VStack(alignment: .leading, spacing: theme.space(12)) {
                FabricatorText("Multiple dates", role: .heading)
                FabricatorCalendarView(selection: $multiple, calendar: CalendarExamples.calendar, referenceDate: CalendarExamples.reference, maximumCount: 3)
                    .accessibilityIdentifier("fabricator-calendar-multiple")
            }
        }
    }
}

struct DatePickerDemo: View {
    @Environment(\.fabricatorTheme) private var theme
    @State private var selected: Date?
    @State private var bounded: Date? = CalendarExamples.date(19)
    @State private var disabled: Date? = CalendarExamples.reference
    @State private var month: Date?
    @State private var year: Date? = CalendarExamples.reference
    @State private var typed: Date? = CalendarExamples.reference
    @State private var custom: Date?
    @State private var typedMonth: Date?
    @State private var meeting: Date? = CalendarExamples.date(16, hour: 9).addingTimeInterval(5 * 60 + 4)
    @State private var typedMeeting: Date?
    var body: some View {
        VStack(alignment: .leading, spacing: theme.space(24)) {
            FabricatorField("Date") {
                FabricatorDatePicker("Choose date", selection: $selected, calendar: CalendarExamples.calendar, referenceDate: CalendarExamples.reference)
                    .accessibilityIdentifier("fabricator-date-picker-primary")
            }
            FabricatorButton("Clear date", variant: .outline) { selected = nil }.disabled(selected == nil)
            FabricatorField("Date bounds", description: "November 16–20, inclusive.") {
                FabricatorDatePicker("Choose bounded date", selection: $bounded, allowedRange: CalendarExamples.bounds, calendar: CalendarExamples.calendar, referenceDate: CalendarExamples.reference)
            }
            FabricatorField("Disabled") {
                FabricatorDatePicker("Disabled date", selection: $disabled, calendar: CalendarExamples.calendar, referenceDate: CalendarExamples.reference).disabled(true)
            }
            FabricatorField("Invalid", error: "Choose a date.") {
                FabricatorDatePicker("Invalid date", selection: $selected, isInvalid: true, calendar: CalendarExamples.calendar, referenceDate: CalendarExamples.reference)
            }
            FabricatorField("Month", description: "March–August 2026, inclusive.") {
                FabricatorDatePicker("Choose month", selection: $month, allowedRange: CalendarExamples.date(21, month: 3)...CalendarExamples.date(4, month: 8), calendar: CalendarExamples.calendar, referenceDate: CalendarExamples.reference, granularity: .month)
            }
            FabricatorField("Year", description: "2024–2026, inclusive.") {
                FabricatorDatePicker("Choose year", selection: $year, allowedRange: CalendarExamples.date(31, month: 12, year: 2024)...CalendarExamples.date(1, month: 1), calendar: CalendarExamples.calendar, referenceDate: CalendarExamples.reference, granularity: .year)
            }
            FabricatorField("Editable date", description: "Type a date or tomorrow.") {
                FabricatorDatePicker("Type date", selection: $typed, calendar: CalendarExamples.calendar, referenceDate: CalendarExamples.reference, isEditable: true)
                FabricatorText(typed.map { $0.formatted(.iso8601.year().month().day().dateSeparator(.dash)) } ?? "No typed date", role: .caption).accessibilityIdentifier("typed-date-value")
            }
            FabricatorButton("Reset typed date", variant: .outline) { typed = CalendarExamples.date(19) }
            FabricatorField("Custom format", description: "dd/MM/yyyy. November 16–20, inclusive.") {
                FabricatorDatePicker("Custom date", selection: $custom, allowedRange: CalendarExamples.bounds, calendar: CalendarExamples.calendar, referenceDate: CalendarExamples.reference, isEditable: true, dateFormat: "dd/MM/yyyy")
                FabricatorText(custom.map { $0.formatted(.iso8601.year().month().day().dateSeparator(.dash)) } ?? "No custom date", role: .caption).accessibilityIdentifier("custom-date-value")
            }
            FabricatorField("Editable month", description: "Type a month or next month.") {
                FabricatorDatePicker("Type month", selection: $typedMonth, calendar: CalendarExamples.calendar, referenceDate: CalendarExamples.reference, granularity: .month, isEditable: true)
            }
            FabricatorField("Date and time") {
                FabricatorDatePicker("Choose meeting", selection: $meeting, calendar: CalendarExamples.calendar, referenceDate: CalendarExamples.reference, hasTime: true, hasSeconds: true, hourCycle: .twentyFour)
                FabricatorText(formatMeeting(meeting), role: .caption).accessibilityIdentifier("date-time-picker-value")
            }
            FabricatorField("Editable date and time", description: "Type tomorrow at 9:30pm.") {
                FabricatorDatePicker("Type meeting", selection: $typedMeeting, calendar: CalendarExamples.calendar, referenceDate: CalendarExamples.reference, isEditable: true, hasTime: true, hourCycle: .twelve)
                FabricatorText(formatMeeting(typedMeeting), role: .caption).accessibilityIdentifier("typed-date-time-value")
            }
        }.frame(maxWidth: 256, alignment: .leading)
    }
    private func formatMeeting(_ date: Date?) -> String {
        guard let date else { return "No meeting" }
        let formatter = DateFormatter(); formatter.calendar = CalendarExamples.calendar; formatter.timeZone = CalendarExamples.calendar.timeZone; formatter.locale = CalendarExamples.calendar.locale; formatter.dateFormat = "yyyy-MM-dd HH:mm:ss"; return formatter.string(from: date)
    }
}
