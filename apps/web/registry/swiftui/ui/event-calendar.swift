import SwiftUI
import OSLog

private enum CalendarRecurrenceOperation { case edit(FabricatorEvent, FabricatorEvent), delete(FabricatorEvent) }

public struct FabricatorEventCalendar: View {
    @Environment(\.fabricatorTheme) private var theme
    @Binding public var selection: Date
    @Binding public var events: [FabricatorEvent]
    @State private var mode: FabricatorEventCalendarMode
    @State private var draft: FabricatorEvent?
    @State private var undoStack: [[FabricatorEvent]] = []
    @State private var redoStack: [[FabricatorEvent]] = []
    @State private var draggedID: String?
    @State private var dragTranslation = CGSize.zero
    @State private var resizeTranslation: [String: Double] = [:]
    @State private var recurrenceAdapter: FabricatorCalendarEngineAdapter?
    @State private var expandedEvents: [FabricatorEvent] = []
    @State private var calendarError: String?
    @State private var recurrenceOperation: CalendarRecurrenceOperation?
    @State private var isScopePresented = false
    @State private var hoveredEventID: String?
    public var onSelectEvent: (FabricatorEvent) -> Void
    public var calendar: Calendar
    public var slotMinutes: Int
    public var numberOfDays: Int
    public init(selection: Binding<Date>, events: Binding<[FabricatorEvent]>, initialView: FabricatorEventCalendarMode = .month, slotMinutes: Int = 15, numberOfDays: Int = 3, calendar: Calendar = .current, onSelectEvent: @escaping (FabricatorEvent) -> Void = { _ in }) {
        _selection = selection; _events = events; _mode = State(initialValue: initialView); self.slotMinutes = max(1, slotMinutes); self.numberOfDays = max(1, numberOfDays); self.calendar = calendar; self.onSelectEvent = onSelectEvent
    }
    private var days: [Date] { FabricatorEventCalendarEngine.visibleDays(containing: selection, mode: mode, numberOfDays: numberOfDays, calendar: calendar) }
    private var displayedEvents: [FabricatorEvent] { events.contains { $0.recurrence != nil || $0.recurringEventId != nil } ? expandedEvents : events }
    public var body: some View {
        VStack(spacing: 16) {
            ViewThatFits(in: .horizontal) { HStack(spacing: 12) { navigation; Spacer(); viewPicker; addButton }; VStack(alignment: .leading, spacing: 12) { navigation; HStack { viewPicker; Spacer(); addButton } } }
            if let calendarError { FabricatorAlert("Calendar could not update", message: calendarError, variant: .destructive) }
            switch mode { case .month: month; case .agenda: agenda; default: timeGrid }
        }.sheet(item: $draft, onDismiss: { if recurrenceOperation != nil { isScopePresented = true } }) { event in
            FabricatorEventEditor(event: event, isExisting: events.contains { $0.id == event.id || $0.id == event.recurringEventId }, calendar: calendar, onCancel: { draft = nil }, onSave: { save($0); draft = nil }, onDelete: { remove(event); draft = nil }, onDuplicate: { var duplicate = event; duplicate.id = UUID().uuidString; duplicate.title += " (copy)"; duplicate.recurrence = nil; duplicate.recurringEventId = nil; duplicate.originalStart = nil; commit(events + [duplicate]); draft = nil })
        }.confirmationDialog("Change repeating event", isPresented: $isScopePresented, titleVisibility: .visible) {
            Button("This event") { applyRecurrenceScope(.this) }
            Button("This and following events") { applyRecurrenceScope(.following) }
            Button("All events") { applyRecurrenceScope(.all) }
            Button("Cancel", role: .cancel) { recurrenceOperation = nil }
        }.task { refreshOccurrences() }.onChange(of: events) { _, _ in refreshOccurrences() }.onChange(of: selection) { _, _ in refreshOccurrences() }.onChange(of: mode) { _, _ in refreshOccurrences() }.onChange(of: calendar.timeZone.identifier) { _, _ in refreshOccurrences() }
    }
    private var navigation: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: 4) { navigationButtons; monthTitle; historyButtons }.fixedSize(horizontal: true, vertical: false)
            VStack(alignment: .leading, spacing: 8) { HStack(spacing: 4) { navigationButtons; Spacer(minLength: 4); historyButtons }; monthTitle }
        }
    }
    private var navigationButtons: some View {
        HStack(spacing: 4) {
            FabricatorButton("Previous \(mode.rawValue)", icon: "chevron-left", variant: .ghost, size: .iconSm) { navigate(-1) }
            FabricatorButton("Next \(mode.rawValue)", icon: "chevron-right", variant: .ghost, size: .iconSm) { navigate(1) }
            FabricatorButton("Today", variant: .outline, size: .sm) { selection = .now }.fixedSize(horizontal: true, vertical: false)
        }
    }
    private var monthTitle: some View { Text(selection.formatted(mode == .day ? .dateTime.month(.wide).day().year() : .dateTime.month(.wide).year())).font(theme.font(theme.text(14), weight: .medium)).padding(.leading, 6).fixedSize() }
    private var historyButtons: some View {
        HStack(spacing: 4) {
            FabricatorButton("Undo calendar change", icon: "undo-2", variant: .ghost, size: .iconSm) { undo() }.disabled(undoStack.isEmpty)
            FabricatorButton("Redo calendar change", icon: "redo-2", variant: .ghost, size: .iconSm) { redo() }.disabled(redoStack.isEmpty)
        }
    }
    private var viewPicker: some View { FabricatorSelect("Calendar view", options: FabricatorEventCalendarMode.allCases.map { $0.rawValue.capitalized }, selection: Binding(get: { mode.rawValue.capitalized }, set: { if let next = FabricatorEventCalendarMode(rawValue: $0.lowercased()) { mode = next } })).frame(width: 120) }
    private var addButton: some View { FabricatorButton("New event", icon: "plus", size: .sm) { create(on: selection) } }
    private var month: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(minimum: 30), spacing: 0), count: 7), spacing: 0) {
            ForEach(0..<7, id: \.self) { offset in Text(calendar.shortStandaloneWeekdaySymbols[(calendar.firstWeekday - 1 + offset) % 7]).font(theme.font(10, weight: .medium)).foregroundStyle(theme.color("muted-foreground")).frame(maxWidth: .infinity).frame(height: 32).background(theme.color("wash")) }
            ForEach(days, id: \.self) { day in
                VStack(alignment: .leading, spacing: 4) {
                    Button { selection = day } label: { Text(String(calendar.component(.day, from: day))).font(theme.font(theme.text(12), weight: calendar.isDateInToday(day) ? .semibold : .regular)).foregroundStyle(theme.color(calendar.isDateInToday(day) ? "primary-foreground" : calendar.isDate(day, equalTo: selection, toGranularity: .month) ? "foreground" : "muted-foreground")).frame(width: 26, height: 26).background(calendar.isDateInToday(day) ? theme.color("primary") : .clear, in: Circle()) }.buttonStyle(.plain).accessibilityLabel(day.formatted(date: .complete, time: .omitted))
                    ForEach(eventsForDay(day).prefix(3)) { event in eventPill(event, isCompact: true).draggable(event.isEditable ? event.id : "") }
                    let extra = eventsForDay(day).count - 3
                    if extra > 0 { Button("+\(extra) more") { selection = day; mode = .day }.buttonStyle(.plain).font(theme.font(9)).foregroundStyle(theme.color("muted-foreground")) }
                    Spacer(minLength: 0)
                }.padding(5).frame(maxWidth: .infinity, minHeight: 112, alignment: .topLeading).background(calendar.isDate(day, inSameDayAs: selection) ? theme.color("hover") : .clear).overlay { Rectangle().strokeBorder(theme.color("border"), lineWidth: 0.25) }
                    .contentShape(Rectangle()).onTapGesture(count: 2) { create(on: day) }.contextMenu { Button("New event") { create(on: day) } }
                    .dropDestination(for: String.self) { ids, _ in guard let id = ids.first, let event = displayedEvents.first(where: { $0.id == id && $0.isEditable }) else { return false }; save(FabricatorEventCalendarEngine.move(event, toDay: day, calendar: calendar)); return true }
            }
        }.clipShape(RoundedRectangle(cornerRadius: theme.radius())).overlay { RoundedRectangle(cornerRadius: theme.radius()).strokeBorder(theme.color("border"), lineWidth: 0.5) }
    }
    private var timeGrid: some View {
        GeometryReader { geometry in
            let width = max(mode == .day ? 220 : 125, (geometry.size.width - 44) / CGFloat(max(1, days.count)))
            ScrollViewReader { proxy in
                ScrollView([.horizontal, .vertical]) {
                    HStack(alignment: .top, spacing: 0) {
                        VStack(spacing: 0) { Color.clear.frame(height: 80); ForEach(0..<24, id: \.self) { hour in Text(String(format: "%02d:00", hour)).font(theme.font(9)).foregroundStyle(theme.color("muted-foreground")).frame(width: 44, height: 64, alignment: .top).id("calendar-hour-\(hour)") } }
                        ForEach(days, id: \.self) { day in VStack(spacing: 0) { dayHeader(day).frame(height: 80); dayColumn(day, width: width).frame(width: width, height: 1536) }.frame(width: width) }
                    }
                }.onAppear { proxy.scrollTo("calendar-hour-8", anchor: .topLeading) }
            }
        }.frame(height: 540).overlay { RoundedRectangle(cornerRadius: theme.radius()).strokeBorder(theme.color("border"), lineWidth: 0.5) }.clipShape(RoundedRectangle(cornerRadius: theme.radius()))
    }
    private func dayHeader(_ day: Date) -> some View {
        VStack(spacing: 4) {
            Text(day.formatted(.dateTime.weekday(.abbreviated))).font(theme.font(10)).foregroundStyle(theme.color("muted-foreground"))
            Text(day.formatted(.dateTime.day())).font(theme.font(18, weight: .medium)).foregroundStyle(theme.color(calendar.isDateInToday(day) ? "info-text" : "foreground"))
            ForEach(eventsForDay(day).filter(\.allDay).prefix(1)) { event in eventPill(event, isCompact: true) }
        }.frame(maxWidth: .infinity).background(theme.color("wash")).overlay(alignment: .trailing) { Rectangle().fill(theme.color("border")).frame(width: 0.5) }
    }
    private func dayColumn(_ day: Date, width: CGFloat) -> some View {
        ZStack(alignment: .topLeading) {
            Canvas { context, size in
                for hour in 0..<24 { let y = CGFloat(hour) * 64; var path = Path(); path.move(to: CGPoint(x: 0, y: y)); path.addLine(to: CGPoint(x: size.width, y: y)); context.stroke(path, with: .color(theme.color("border")), lineWidth: 0.5) }
                var boundary = Path(); boundary.move(to: CGPoint(x: size.width, y: 0)); boundary.addLine(to: CGPoint(x: size.width, y: size.height)); context.stroke(boundary, with: .color(theme.color("border")), lineWidth: 0.5)
            }.contentShape(Rectangle()).onTapGesture(count: 2) { point in create(on: day, minute: snap(point.y / 64 * 60)) }
            ForEach(FabricatorEventCalendarEngine.layout(displayedEvents, on: day, calendar: calendar)) { layout in
                let eventWidth = (width - 6) / CGFloat(layout.columnCount)
                let eventHeight = max(24, (layout.endMinute - layout.startMinute) / 60 * 64 + resizeTranslation[layout.id, default: 0])
                eventPill(layout.event, isCompact: false)
                    .frame(width: eventWidth - 2, height: eventHeight, alignment: .topLeading)
                    .overlay(alignment: .bottom) { if layout.event.isEditable { Capsule().fill(theme.color("calendar-color-\(layout.event.category)").opacity(0.5)).frame(width: 20, height: 3).padding(.bottom, 3).frame(height: 16).contentShape(Rectangle()).highPriorityGesture(DragGesture().onChanged { resizeTranslation[layout.id] = $0.translation.height }.onEnded { value in let minutes = snap(value.translation.height / 64 * 60); save(FabricatorEventCalendarEngine.resize(layout.event, end: layout.event.end.addingTimeInterval(Double(minutes) * 60), minimumMinutes: slotMinutes)); resizeTranslation[layout.id] = nil }).accessibilityLabel("Resize \(layout.event.title)").accessibilityAdjustableAction { direction in save(FabricatorEventCalendarEngine.resize(layout.event, end: layout.event.end.addingTimeInterval(Double(direction == .increment ? slotMinutes : -slotMinutes) * 60), minimumMinutes: slotMinutes)) } } }
                    .offset(x: CGFloat(layout.column) * eventWidth + 3 + (draggedID == layout.id ? dragTranslation.width : 0), y: layout.startMinute / 60 * 64 + (draggedID == layout.id ? dragTranslation.height : 0))
                    .zIndex(draggedID == layout.id ? 2 : 0)
                    .simultaneousGesture(DragGesture(minimumDistance: 8).onChanged { value in guard layout.event.isEditable else { return }; draggedID = layout.id; dragTranslation = value.translation }.onEnded { value in guard layout.event.isEditable else { return }; let dayOffset = Int((value.translation.width / width).rounded()); let targetDay = calendar.date(byAdding: .day, value: dayOffset, to: day) ?? day; let minute = snap(layout.startMinute + value.translation.height / 64 * 60); save(FabricatorEventCalendarEngine.move(layout.event, toDay: targetDay, minute: minute, calendar: calendar)); draggedID = nil; dragTranslation = .zero })
            }
        }
    }
    private var agenda: some View {
        VStack(alignment: .leading, spacing: 20) {
            if !days.contains(where: { !eventsForDay($0).isEmpty }) { FabricatorEmpty("No upcoming events", description: "Create an event to start planning your next few weeks.", icon: "calendar") { addButton } }
            ForEach(days, id: \.self) { day in
                let dayEvents = eventsForDay(day)
                if !dayEvents.isEmpty { HStack(alignment: .top, spacing: 16) { VStack(spacing: 3) { Text(day.formatted(.dateTime.weekday(.abbreviated))).font(theme.font(10)); Text(day.formatted(.dateTime.day())).font(theme.font(22, weight: .medium)) }.foregroundStyle(theme.color("muted-foreground")).frame(width: 48); VStack(spacing: 6) { ForEach(dayEvents) { event in eventPill(event, isCompact: false) } } }; FabricatorSeparator() }
            }
        }
    }
    private func eventPill(_ event: FabricatorEvent, isCompact: Bool) -> some View {
        Button { onSelectEvent(event); draft = event } label: {
            VStack(alignment: .leading, spacing: 3) {
                Text(event.title).font(theme.font(isCompact ? 9 : theme.text(12), weight: .medium)).lineLimit(isCompact ? 1 : 2).strikethrough(event.status == .cancelled)
                if !isCompact { Text(event.allDay ? "All day" : "\(event.start.formatted(date: .omitted, time: .shortened)) – \(event.end.formatted(date: .omitted, time: .shortened))").font(theme.font(10)).opacity(0.85); if !event.location.isEmpty { Text(event.location).font(theme.font(10)).lineLimit(1).opacity(0.7) } }
            }.padding(isCompact ? 4 : 8).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading).foregroundStyle(theme.color("calendar-color-\(event.category)-text")).background(theme.color("calendar-color-\(event.category)").opacity(theme.calendarWash(hoveredEventID == event.id ? "hover" : event.end < Date.now ? "past" : "rest")), in: RoundedRectangle(cornerRadius: 4)).contentShape(Rectangle())
        }.buttonStyle(.plain).onHover { hoveredEventID = $0 ? event.id : nil }.contextMenu { Button("Edit event") { draft = event }.disabled(!event.isEditable); Button("Duplicate event") { var copy = event; copy.id = UUID().uuidString; copy.title += " (copy)"; copy.recurrence = nil; copy.recurringEventId = nil; copy.originalStart = nil; commit(events + [copy]) }; Button("Delete event", role: .destructive) { remove(event) }.disabled(!event.isEditable) }.accessibilityLabel("\(event.title), \(event.start.formatted(date: .abbreviated, time: .shortened)) to \(event.end.formatted(date: .omitted, time: .shortened))")
    }
    private func eventsForDay(_ day: Date) -> [FabricatorEvent] { displayedEvents.filter { FabricatorCalendar.overlaps(start: $0.start, end: $0.end, day: day, calendar: calendar) }.sorted { $0.allDay != $1.allDay ? $0.allDay : $0.start < $1.start } }
    private func snap(_ minute: Double) -> Int { Int((minute / Double(slotMinutes)).rounded()) * slotMinutes }
    private func navigate(_ offset: Int) { selection = FabricatorEventCalendarEngine.navigate(selection, mode: mode, offset: offset, numberOfDays: numberOfDays, calendar: calendar) }
    private func create(on day: Date, minute: Int = 600) { let placeholder = FabricatorEvent(title: "", start: day, end: day.addingTimeInterval(3600)); draft = FabricatorEventCalendarEngine.move(placeholder, toDay: day, minute: minute, calendar: calendar) }
    private func save(_ event: FabricatorEvent) {
        if let original = displayedEvents.first(where: { $0.id == event.id }), original.recurrence != nil || original.recurringEventId != nil {
            guard original != event else { return }; recurrenceOperation = .edit(original, event); if draft == nil { isScopePresented = true }; return
        }
        var updated = events; if let index = updated.firstIndex(where: { $0.id == event.id }) { updated[index] = event } else { updated.append(event) }; commit(updated)
    }
    private func remove(_ event: FabricatorEvent) { if event.recurrence != nil || event.recurringEventId != nil { recurrenceOperation = .delete(event); if draft == nil { isScopePresented = true }; return }; commit(events.filter { $0.id != event.id }) }
    private func refreshOccurrences() {
        do {
            if recurrenceAdapter == nil { recurrenceAdapter = try FabricatorCalendarEngineAdapter() }
            guard let adapter = recurrenceAdapter, let first = days.first, let last = days.last, let end = calendar.date(byAdding: .day, value: 1, to: last) else { return }
            expandedEvents = try adapter.expand(events, in: DateInterval(start: first, end: end), calendar: calendar); calendarError = nil
        } catch { report(error) }
    }
    private func applyRecurrenceScope(_ scope: FabricatorRecurrenceScope) {
        guard let recurrenceOperation, let adapter = recurrenceAdapter else { return }
        do { switch recurrenceOperation { case .edit(let original, let next): commit(try adapter.edit(occurrence: original, next: next, scope: scope, stored: events, calendar: calendar)); case .delete(let occurrence): commit(try adapter.delete(occurrence: occurrence, scope: scope, stored: events, calendar: calendar)) }; self.recurrenceOperation = nil; calendarError = nil }
        catch { report(error) }
    }
    private func report(_ error: Error) { calendarError = error.localizedDescription; Logger(subsystem: "app.fabricator-ui", category: "event-calendar").error("Calendar operation failed in \(calendar.timeZone.identifier): \(error.localizedDescription)") }
    private func commit(_ updated: [FabricatorEvent]) { guard updated != events else { return }; undoStack.append(events); if undoStack.count > 100 { undoStack.removeFirst() }; redoStack.removeAll(); events = updated }
    private func undo() { guard let previous = undoStack.popLast() else { return }; redoStack.append(events); events = previous }
    private func redo() { guard let next = redoStack.popLast() else { return }; undoStack.append(events); events = next }
}

private struct FabricatorEventEditor: View {
    @Environment(\.fabricatorTheme) private var theme
    @State private var event: FabricatorEvent
    @State private var presets: [FabricatorRecurrencePreset] = []
    @State private var recurrenceText = ""
    @State private var validationError: String?
    var isExisting: Bool
    var calendar: Calendar
    var onCancel: () -> Void
    var onSave: (FabricatorEvent) -> Void
    var onDelete: () -> Void
    var onDuplicate: () -> Void
    init(event: FabricatorEvent, isExisting: Bool, calendar: Calendar, onCancel: @escaping () -> Void, onSave: @escaping (FabricatorEvent) -> Void, onDelete: @escaping () -> Void, onDuplicate: @escaping () -> Void) { _event = State(initialValue: event); self.isExisting = isExisting; self.calendar = calendar; self.onCancel = onCancel; self.onSave = onSave; self.onDelete = onDelete; self.onDuplicate = onDuplicate }
    var body: some View {
        FabricatorDialogContent(isExisting ? "Event details" : "New event", onDismiss: onCancel) {
            ScrollView {
                FabricatorFieldGroup {
                    FabricatorField("Title") { FabricatorInput("Event title", text: $event.title) }
                    FabricatorSwitch("All day", isOn: $event.allDay).onChange(of: event.allDay) { _, allDay in if allDay { event.start = calendar.startOfDay(for: event.start); event.end = calendar.date(byAdding: .day, value: 1, to: event.start) ?? event.end } }
                    DatePicker("Starts", selection: $event.start, displayedComponents: event.allDay ? [.date] : [.date, .hourAndMinute])
                    DatePicker("Ends", selection: $event.end, in: event.start..., displayedComponents: event.allDay ? [.date] : [.date, .hourAndMinute])
                    FabricatorField("Color") { FabricatorSelect("Event color", options: ["primary", "secondary", "info", "success", "warning", "destructive", "red", "orange", "yellow", "green", "teal", "cyan", "blue", "indigo", "purple", "pink", "gray"], selection: $event.category) }
                    FabricatorField("Status") { FabricatorSelect("Event status", options: FabricatorEventStatus.allCases.map(\.rawValue), selection: Binding(get: { event.status.rawValue }, set: { if let value = FabricatorEventStatus(rawValue: $0) { event.status = value } })) }
                    FabricatorField("Location") { FabricatorInput("Add a location", text: $event.location, icon: "map-pin") }
                    FabricatorField("Description") { FabricatorTextarea("Add event details…", text: $event.description) }
                    FabricatorField("Repeat", error: validationError) {
                        FabricatorSelect("Repeat schedule", options: presets.map(\.label) + ["Custom rule"], selection: Binding(get: { presets.first { $0.value == (recurrenceText.isEmpty ? nil : recurrenceText) }?.label ?? "Custom rule" }, set: { label in if let preset = presets.first(where: { $0.label == label }) { recurrenceText = preset.value ?? "" } }))
                        FabricatorInput("RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR", text: $recurrenceText, isInvalid: validationError != nil)
                    }
                }.disabled(!event.isEditable)
            }
            HStack { if isExisting { FabricatorButton("Delete", icon: "trash", variant: .destructive, action: onDelete).disabled(!event.isEditable); FabricatorButton("Duplicate", icon: "copy", variant: .ghost, action: onDuplicate) }; Spacer(); FabricatorButton("Save", action: save).disabled(event.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || event.end <= event.start || !event.isEditable).keyboardShortcut(.defaultAction) }
        }.presentationDetents([.large]).environment(\.calendar, calendar).environment(\.timeZone, calendar.timeZone).onAppear { recurrenceText = event.recurrence ?? ""; do { presets = try FabricatorCalendarEngineAdapter().presets(start: event.start, calendar: calendar) } catch { validationError = error.localizedDescription } }
    }
    private func save() {
        do { if !recurrenceText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { try FabricatorCalendarEngineAdapter().validate(recurrenceText, timeZone: calendar.timeZone.identifier) }; event.recurrence = recurrenceText.isEmpty ? nil : recurrenceText; validationError = nil; onSave(event) }
        catch { validationError = error.localizedDescription }
    }
}
