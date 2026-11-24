import SwiftUI
import FabricatorUI

struct TimeInputDemo: View {
    @Environment(\.fabricatorTheme) private var theme
    @State private var selected: Date? = CalendarExamples.date(16, hour: 9).addingTimeInterval(5 * 60)
    @State private var seconds: Date? = CalendarExamples.date(16, hour: 7).addingTimeInterval(3 * 60 + 4)
    @State private var bounded: Date?
    @State private var disabled = CalendarExamples.date(16, hour: 23).addingTimeInterval(45 * 60)
    var body: some View {
        FabricatorFieldGroup {
            FabricatorField("Time", description: "Type 930pm, noon or 21:30. Return commits.") {
                FabricatorTimeInput(selection: $selected, hourCycle: .twelve, calendar: CalendarExamples.calendar, referenceDate: CalendarExamples.reference)
                FabricatorText(formatClock(selected), role: .caption).accessibilityIdentifier("time-input-primary-value")
            }
            FabricatorButton("Reset time", variant: .outline) { selected = CalendarExamples.date(16, hour: 9).addingTimeInterval(5 * 60) }
            FabricatorField("Seconds") {
                FabricatorTimeInput("Time with seconds", selection: $seconds, hourCycle: .twentyFour, hasSeconds: true, calendar: CalendarExamples.calendar, referenceDate: CalendarExamples.reference)
                FabricatorText(formatClock(seconds), role: .caption).accessibilityIdentifier("time-input-seconds-value")
            }
            FabricatorField("Time bounds", description: "09:30–17:00. The wheel advances by 15 minutes.") {
                FabricatorTimeInput("Bounded time", selection: $bounded, hourCycle: .twentyFour, step: 15, allowedRange: FabricatorTimeOfDay(hours: 9, minutes: 30)...FabricatorTimeOfDay(hours: 17, minutes: 0), calendar: CalendarExamples.calendar, referenceDate: CalendarExamples.reference)
            }
            FabricatorField("Disabled") {
                FabricatorTimeInput("Disabled time", selection: $disabled, calendar: CalendarExamples.calendar).disabled(true)
            }
        }.frame(maxWidth: 320, alignment: .leading)
    }
    private func formatClock(_ date: Date?) -> String {
        guard let date else { return "No time" }
        let formatter = DateFormatter(); formatter.calendar = CalendarExamples.calendar; formatter.timeZone = CalendarExamples.calendar.timeZone; formatter.locale = CalendarExamples.calendar.locale; formatter.dateFormat = "HH:mm:ss"; return formatter.string(from: date)
    }
}

struct TimeWheelDemo: View {
    @Environment(\.fabricatorTheme) private var theme
    @State private var primary = CalendarExamples.date(16, hour: 21).addingTimeInterval(5 * 60)
    @State private var seconds = CalendarExamples.date(16, hour: 7).addingTimeInterval(3 * 60 + 4)
    @State private var bounded = CalendarExamples.date(16, hour: 10)
    @State private var disabled = CalendarExamples.date(16, hour: 23).addingTimeInterval(45 * 60)
    var body: some View {
        VStack(alignment: .leading, spacing: theme.space(32)) {
            VStack(alignment: .leading, spacing: theme.space(8)) {
                FabricatorText("12-hour clock", role: .heading)
                FabricatorTimeWheel(selection: $primary, hourCycle: .twelve, calendar: CalendarExamples.calendar, label: "12-hour time").accessibilityIdentifier("time-wheel-primary")
                FabricatorText(formatClock(primary), role: .caption).accessibilityIdentifier("time-wheel-primary-value")
            }
            VStack(alignment: .leading, spacing: theme.space(8)) {
                FabricatorText("24-hour clock and seconds", role: .heading)
                FabricatorTimeWheel(selection: $seconds, hourCycle: .twentyFour, hasSeconds: true, calendar: CalendarExamples.calendar, label: "24-hour time").accessibilityIdentifier("time-wheel-seconds")
                FabricatorText(formatClock(seconds), role: .caption).accessibilityIdentifier("time-wheel-seconds-value")
            }
            VStack(alignment: .leading, spacing: theme.space(8)) {
                FabricatorText("Time bounds", role: .heading)
                FabricatorText("09:30–17:00. Minutes advance by 15.", role: .caption)
                FabricatorTimeWheel(selection: $bounded, hourCycle: .twentyFour, step: 15, allowedRange: FabricatorTimeOfDay(hours: 9, minutes: 30)...FabricatorTimeOfDay(hours: 17, minutes: 0), calendar: CalendarExamples.calendar, label: "Bounded time").accessibilityIdentifier("time-wheel-bounds")
                FabricatorText(formatClock(bounded), role: .caption).accessibilityIdentifier("time-wheel-bounds-value")
            }
            VStack(alignment: .leading, spacing: theme.space(8)) {
                FabricatorText("Disabled", role: .heading)
                FabricatorTimeWheel(selection: $disabled, hourCycle: .twentyFour, calendar: CalendarExamples.calendar, label: "Disabled time").disabled(true).accessibilityIdentifier("time-wheel-disabled")
            }
        }
    }
    private func formatClock(_ date: Date) -> String {
        let formatter = DateFormatter(); formatter.calendar = CalendarExamples.calendar; formatter.timeZone = CalendarExamples.calendar.timeZone; formatter.locale = CalendarExamples.calendar.locale; formatter.dateFormat = "HH:mm:ss"; return formatter.string(from: date)
    }
}
