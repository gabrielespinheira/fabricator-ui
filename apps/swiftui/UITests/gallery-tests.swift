import XCTest

@MainActor
final class GalleryTests: XCTestCase {
    private struct Catalog: Decodable {
        struct Item: Decodable { var name: String }
        var items: [Item]
    }

    override func setUpWithError() throws { continueAfterFailure = false }

    func testTimeInputCommitsTypedClockInvalidDraftAndExternalReset() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "time-input", "--motion-off"]
        app.launch()
        let field = app.textFields["Time"].firstMatch
        XCTAssertTrue(field.waitForExistence(timeout: 8))
        app.buttons["Open Time"].firstMatch.tap()
        let hours = app.otherElements["fabricator-time-wheel-hours"].firstMatch
        XCTAssertTrue(hours.waitForExistence(timeout: 3))
        hours.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        XCTAssertEqual(hours.value as? String, "9")
        XCTAssertEqual(app.staticTexts["time-input-primary-value"].firstMatch.label, "09:05:00")
        replaceDateText(field, with: "930pm\n")
        XCTAssertEqual(field.value as? String, "9:30 PM")
        XCTAssertEqual(app.staticTexts["time-input-primary-value"].firstMatch.label, "21:30:00")
        replaceDateText(field, with: "later\n")
        XCTAssertEqual(field.value as? String, "later")
        XCTAssertEqual(app.staticTexts["time-input-primary-value"].firstMatch.label, "No time")
        app.buttons["Reset time"].firstMatch.tap()
        XCTAssertEqual(field.value as? String, "9:05 AM")
        replaceDateText(field, with: "\n")
        XCTAssertEqual(app.staticTexts["time-input-primary-value"].firstMatch.label, "No time")
    }

    func testTimeInputWheelSecondsBoundsAndDisabledStateAtLargeText() {
        executionTimeAllowance = 90
        let app = XCUIApplication()
        app.launchArguments = ["--page", "time-input", "--dark", "--large-text", "--motion-off"]
        app.launch()
        let field = app.textFields["Time with seconds"].firstMatch
        XCTAssertTrue(field.waitForExistence(timeout: 8))
        for _ in 0..<8 where !field.isHittable { app.swipeUp() }
        app.buttons["Open Time with seconds"].firstMatch.tap()
        let seconds = app.otherElements["fabricator-time-wheel-seconds"].firstMatch
        XCTAssertTrue(seconds.waitForExistence(timeout: 3))
        seconds.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5 + 1.0 / 7)).tap()
        XCTAssertEqual(seconds.value as? String, "05")
        app.coordinate(withNormalizedOffset: CGVector(dx: 0.95, dy: 0.12)).tap()
        XCTAssertTrue(seconds.waitForNonExistence(timeout: 3))
        XCTAssertEqual(field.value as? String, "07:03:05")
        app.typeText("x")
        XCTAssertEqual(field.value as? String, "07:03:05x")
        let bounded = app.textFields["Bounded time"].firstMatch
        for _ in 0..<8 where !bounded.isHittable { app.swipeUp() }
        app.buttons["Open Bounded time"].firstMatch.tap()
        let hours = app.otherElements["fabricator-time-wheel-hours"].firstMatch
        XCTAssertTrue(hours.waitForExistence(timeout: 3))
        hours.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5 + 1.0 / 7)).tap()
        app.coordinate(withNormalizedOffset: CGVector(dx: 0.95, dy: 0.12)).tap()
        XCTAssertTrue(hours.waitForNonExistence(timeout: 3))
        XCTAssertEqual(bounded.value as? String, "09:30")
        XCTAssertFalse(app.textFields["Disabled time"].firstMatch.isEnabled)
    }

    func testDateTimePickerKeepsOpenAndUpdatesClockWithinTheSameDay() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "date-picker", "--motion-off"]
        app.launch()
        let field = app.buttons["Choose meeting"].firstMatch
        XCTAssertTrue(field.waitForExistence(timeout: 8))
        for _ in 0..<16 where !field.isHittable { app.swipeUp() }
        field.tap()
        let wheel = app.otherElements["fabricator-date-picker-time-wheel"].firstMatch
        let minutes = wheel.otherElements["fabricator-time-wheel-minutes"].firstMatch
        XCTAssertTrue(minutes.waitForExistence(timeout: 3))
        minutes.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5 + 1.0 / 7)).tap()
        XCTAssertEqual(minutes.value as? String, "06")
        let nextDay = app.buttons["fabricator-calendar-day-2026-11-18"].firstMatch
        minutes.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        XCTAssertEqual(minutes.value as? String, "06")
        nextDay.tap()
        XCTAssertTrue(wheel.exists)
        XCTAssertEqual(minutes.value as? String, "06")
        app.coordinate(withNormalizedOffset: CGVector(dx: 0.95, dy: 0.12)).tap()
        XCTAssertTrue(wheel.waitForNonExistence(timeout: 3))
        XCTAssertEqual(app.staticTexts["date-time-picker-value"].firstMatch.label, "2026-11-18 09:06:04")
    }

    func testEditableDateTimeCommitsRelativeDateAndRejectsInvalidClock() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "date-picker", "--motion-off"]
        app.launch()
        let field = app.textFields["Type meeting"].firstMatch
        XCTAssertTrue(field.waitForExistence(timeout: 8))
        for _ in 0..<18 where !field.isHittable { app.swipeUp() }
        replaceDateText(field, with: "tomorrow at 9:30pm\n")
        XCTAssertEqual(field.value as? String, "Nov 17, 2026, 9:30 PM")
        XCTAssertEqual(app.staticTexts["typed-date-time-value"].firstMatch.label, "2026-11-17 21:30:00")
        replaceDateText(field, with: "tomorrow at 9:99\n")
        XCTAssertEqual(field.value as? String, "tomorrow at 9:99")
        XCTAssertEqual(app.staticTexts["typed-date-time-value"].firstMatch.label, "No meeting")
    }

    func testDateTimePickerKeepsCalendarAndClockReachableAtLargeText() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "date-picker", "--dark", "--large-text", "--motion-off"]
        app.launch()
        let field = app.buttons["Choose meeting"].firstMatch
        XCTAssertTrue(field.waitForExistence(timeout: 8))
        for _ in 0..<18 where !field.isHittable { app.swipeUp() }
        field.tap()
        let day = app.buttons["fabricator-calendar-day-2026-11-18"].firstMatch
        XCTAssertTrue(day.waitForExistence(timeout: 3)); XCTAssertTrue(day.isHittable)
        day.tap()
        let seconds = app.otherElements["fabricator-date-picker-time-wheel"].otherElements["fabricator-time-wheel-seconds"].firstMatch
        let popup = app.scrollViews["fabricator-date-picker-panel-scroll"].firstMatch
        XCTAssertTrue(popup.exists)
        for _ in 0..<6 {
            if seconds.exists && seconds.frame.minY >= popup.frame.minY && seconds.frame.maxY <= popup.frame.maxY { break }
            popup.coordinate(withNormalizedOffset: CGVector(dx: 0.95, dy: 0.9)).press(forDuration: 0.05, thenDragTo: popup.coordinate(withNormalizedOffset: CGVector(dx: 0.95, dy: 0.1)))
        }
        XCTAssertTrue(seconds.isHittable)
        XCTAssertLessThanOrEqual(seconds.frame.maxY, popup.frame.maxY + 1)
        seconds.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5 + 1.0 / 7)).tap()
        XCTAssertEqual(seconds.value as? String, "05")
    }

    func testTimeWheelMotionOffKeepsInitialValuesBeforeInteraction() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "time-wheel", "--motion-off"]
        app.launch()
        let wheel = app.otherElements["time-wheel-primary"].firstMatch
        let minutes = wheel.otherElements["fabricator-time-wheel-minutes"].firstMatch
        XCTAssertTrue(minutes.waitForExistence(timeout: 8))
        XCTAssertEqual(minutes.value as? String, "05")
        let unchanged = XCTNSPredicateExpectation(predicate: NSPredicate(format: "value != %@", "05"), object: minutes)
        unchanged.isInverted = true
        XCTAssertEqual(XCTWaiter.wait(for: [unchanged], timeout: 1), .completed)
        XCTAssertEqual(app.staticTexts["time-wheel-primary-value"].firstMatch.label, "21:05:00")
        XCTAssertEqual(app.staticTexts["time-wheel-seconds-value"].firstMatch.label, "07:03:04")
        minutes.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        XCTAssertEqual(minutes.value as? String, "05")
    }

    func testTimeWheelColumnsChooseHoursMinutesAndMeridiem() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "time-wheel"]
        app.launch()
        let wheel = app.otherElements["time-wheel-primary"].firstMatch
        let minutes = wheel.otherElements["fabricator-time-wheel-minutes"].firstMatch
        XCTAssertTrue(minutes.waitForExistence(timeout: 8), app.debugDescription)
        XCTAssertEqual(minutes.value as? String, "05")
        minutes.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5 + 1.0 / 7)).tap()
        XCTAssertEqual(minutes.value as? String, "06")
        minutes.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        XCTAssertEqual(minutes.value as? String, "06")
        let hours = wheel.otherElements["fabricator-time-wheel-hours"].firstMatch
        hours.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5 + 1.0 / 7)).tap()
        XCTAssertEqual(hours.value as? String, "10")
        hours.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        XCTAssertEqual(hours.value as? String, "10")
        let meridiem = wheel.otherElements["fabricator-time-wheel-meridiem"].firstMatch
        meridiem.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5 - 1.0 / 7)).tap()
        XCTAssertEqual(meridiem.value as? String, "AM")
        meridiem.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        XCTAssertEqual(meridiem.value as? String, "AM")
        XCTAssertEqual(app.staticTexts["time-wheel-primary-value"].firstMatch.label, "10:06:00")
        minutes.swipeUp(velocity: .slow)
        let settled = XCTNSPredicateExpectation(predicate: NSPredicate(format: "value != %@", "06"), object: minutes)
        XCTAssertEqual(XCTWaiter.wait(for: [settled], timeout: 3), .completed)
        let scrolledValue = minutes.value as? String
        minutes.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        XCTAssertEqual(minutes.value as? String, scrolledValue)
    }

    func testTimeWheelSecondsBoundsAndDisabledStateAtLargeText() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "time-wheel", "--dark", "--large-text", "--motion-off"]
        app.launch()
        let wheel = app.otherElements["time-wheel-seconds"].firstMatch
        let seconds = wheel.otherElements["fabricator-time-wheel-seconds"].firstMatch
        XCTAssertTrue(seconds.waitForExistence(timeout: 8))
        for _ in 0..<8 where !seconds.isHittable { app.swipeUp() }
        XCTAssertEqual(seconds.value as? String, "04")
        seconds.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5 + 1.0 / 7)).tap()
        XCTAssertEqual(seconds.value as? String, "05")
        let bounded = app.otherElements["time-wheel-bounds"].firstMatch
        let hours = bounded.otherElements["fabricator-time-wheel-hours"].firstMatch
        for _ in 0..<12 where !hours.isHittable { app.swipeUp() }
        hours.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5 - 2.0 / 7)).tap()
        XCTAssertEqual(app.staticTexts["time-wheel-bounds-value"].firstMatch.label, "09:30:00")
        let disabled = app.otherElements["time-wheel-disabled"].firstMatch
        let disabledHours = disabled.otherElements["fabricator-time-wheel-hours"].firstMatch
        for _ in 0..<8 where !disabledHours.isHittable { app.swipeUp() }
        XCTAssertFalse(disabledHours.isEnabled)
        XCTAssertGreaterThanOrEqual(hours.frame.width, 44)
    }

    func testEditableDateCommitsInvalidTextClearingAndExternalUpdates() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "date-picker"]
        app.launch()
        let field = app.textFields["Type date"].firstMatch
        XCTAssertTrue(field.waitForExistence(timeout: 8))
        for _ in 0..<12 where !field.isHittable { app.swipeUp() }
        replaceDateText(field, with: "tomorrow\n")
        XCTAssertEqual(field.value as? String, "Nov 17, 2026")
        XCTAssertEqual(app.staticTexts["typed-date-value"].firstMatch.label, "2026-11-17")
        replaceDateText(field, with: "2026-02-30\n")
        XCTAssertEqual(field.value as? String, "2026-02-30")
        XCTAssertEqual(app.staticTexts["typed-date-value"].firstMatch.label, "No typed date")
        app.buttons["Reset typed date"].firstMatch.tap()
        XCTAssertEqual(field.value as? String, "Nov 19, 2026")
        replaceDateText(field, with: "\n")
        XCTAssertEqual(app.staticTexts["typed-date-value"].firstMatch.label, "No typed date")
        XCTAssertEqual(field.value as? String, "")
        app.buttons["Open Type date"].firstMatch.tap()
        let day = app.buttons["fabricator-calendar-day-2026-11-18"].firstMatch
        XCTAssertTrue(day.waitForExistence(timeout: 3))
        day.tap()
        XCTAssertTrue(day.waitForNonExistence(timeout: 3))
        XCTAssertEqual(field.value as? String, "Nov 18, 2026")
        app.typeText("x")
        XCTAssertTrue((field.value as? String)?.contains("x") == true)
    }

    func testEditableCustomFormatBoundsAndMonthGridAtLargeText() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "date-picker", "--dark", "--large-text"]
        app.launch()
        let field = app.textFields["Custom date"].firstMatch
        XCTAssertTrue(field.waitForExistence(timeout: 8))
        for _ in 0..<18 where !field.isHittable { app.swipeUp() }
        replaceDateText(field, with: "2026-11-21\n")
        XCTAssertEqual(field.value as? String, "21/11/2026")
        XCTAssertEqual(app.staticTexts["custom-date-value"].firstMatch.label, "No custom date")
        replaceDateText(field, with: "18/11/2026\n")
        XCTAssertEqual(app.staticTexts["custom-date-value"].firstMatch.label, "2026-11-18")
        let month = app.textFields["Type month"].firstMatch
        for _ in 0..<6 where !month.isHittable { app.swipeUp() }
        replaceDateText(month, with: "next month\n")
        XCTAssertEqual(month.value as? String, "Dec 2026")
        app.buttons["Open Type month"].firstMatch.tap()
        let selected = app.buttons["fabricator-date-picker-cell-2026-12"].firstMatch
        XCTAssertTrue(selected.waitForExistence(timeout: 3)); XCTAssertTrue(selected.isSelected)
        XCTAssertGreaterThanOrEqual(selected.frame.height, 44)
        selected.tap()
        XCTAssertTrue(selected.waitForNonExistence(timeout: 3))
    }

    private func replaceDateText(_ field: XCUIElement, with text: String) {
        let current = field.value as? String ?? ""
        field.coordinate(withNormalizedOffset: CGVector(dx: 0.98, dy: 0.5)).tap()
        field.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: current.count) + text)
    }

    func testMonthPickerPagesAndRespectsWholeMonthBounds() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "date-picker"]
        app.launch()
        let field = app.buttons["Choose month"].firstMatch
        XCTAssertTrue(field.waitForExistence(timeout: 8))
        for _ in 0..<6 where !field.isHittable { app.swipeUp() }
        XCTAssertEqual(field.value as? String, "No month selected")
        field.tap()
        let march = app.buttons["fabricator-date-picker-cell-2026-3"].firstMatch
        XCTAssertTrue(march.waitForExistence(timeout: 3))
        XCTAssertTrue(march.isEnabled)
        XCTAssertTrue(app.buttons["fabricator-date-picker-cell-2026-8"].firstMatch.isEnabled)
        XCTAssertFalse(app.buttons["fabricator-date-picker-cell-2026-2"].firstMatch.isEnabled)
        XCTAssertFalse(app.buttons["fabricator-date-picker-cell-2026-9"].firstMatch.isEnabled)
        app.buttons["Next year"].firstMatch.tap()
        let next = app.buttons["fabricator-date-picker-cell-2027-3"].firstMatch
        XCTAssertTrue(next.waitForExistence(timeout: 3))
        XCTAssertFalse(next.isEnabled)
        app.buttons["Previous year"].firstMatch.tap()
        march.tap()
        XCTAssertTrue(march.waitForNonExistence(timeout: 3))
        XCTAssertEqual(field.value as? String, "Mar 2026")
        field.tap()
        XCTAssertTrue(march.waitForExistence(timeout: 3))
        XCTAssertTrue(march.isSelected)
        march.tap()
        XCTAssertTrue(march.waitForNonExistence(timeout: 3))
    }

    func testYearPickerUsesTwelveYearPagesAndInclusiveBoundsAtLargeText() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "date-picker", "--dark", "--large-text"]
        app.launch()
        let field = app.buttons["Choose year"].firstMatch
        XCTAssertTrue(field.waitForExistence(timeout: 8))
        for _ in 0..<8 where !field.isHittable { app.swipeUp() }
        field.tap()
        let selected = app.buttons["fabricator-date-picker-cell-2026-1"].firstMatch
        XCTAssertTrue(selected.waitForExistence(timeout: 3))
        XCTAssertTrue(selected.isSelected)
        XCTAssertGreaterThanOrEqual(selected.frame.height, 44)
        XCTAssertEqual(selected.frame.height, field.frame.height, accuracy: 2)
        XCTAssertLessThanOrEqual(app.staticTexts["2016–2027"].firstMatch.frame.height, field.frame.height)
        XCTAssertFalse(app.buttons["fabricator-date-picker-cell-2023-1"].firstMatch.isEnabled)
        XCTAssertTrue(app.buttons["fabricator-date-picker-cell-2024-1"].firstMatch.isEnabled)
        XCTAssertFalse(app.buttons["fabricator-date-picker-cell-2027-1"].firstMatch.isEnabled)
        app.buttons["Next years"].firstMatch.tap()
        XCTAssertTrue(app.buttons["fabricator-date-picker-cell-2028-1"].firstMatch.waitForExistence(timeout: 3))
        app.buttons["Previous years"].firstMatch.tap()
        app.buttons["fabricator-date-picker-cell-2024-1"].firstMatch.tap()
        XCTAssertTrue(selected.waitForNonExistence(timeout: 3))
        XCTAssertEqual(field.value as? String, "2024")
    }

    func testCalendarSelectionAndCaptionMenusKeepTheChosenMonthVisible() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "calendar"]
        app.launch()
        let calendar = app.descendants(matching: .any).matching(identifier: "fabricator-calendar-primary").firstMatch
        let selected = calendar.buttons["fabricator-calendar-day-2026-11-16"].firstMatch
        XCTAssertTrue(selected.waitForExistence(timeout: 8), app.debugDescription)
        XCTAssertTrue(selected.isSelected)
        selected.tap()
        XCTAssertFalse(selected.isSelected)
        let day = calendar.buttons["fabricator-calendar-day-2026-11-14"].firstMatch
        day.tap()
        XCTAssertTrue(day.isSelected)
        calendar.buttons["Choose year"].firstMatch.tap()
        let current = app.buttons["2026"].firstMatch
        XCTAssertTrue(current.waitForExistence(timeout: 3))
        XCTAssertTrue(current.isHittable, app.debugDescription)
        let previous = app.buttons["2025"].firstMatch
        XCTAssertTrue(previous.isHittable)
        previous.tap()
        XCTAssertTrue(calendar.buttons["fabricator-calendar-day-2025-11-14"].firstMatch.waitForExistence(timeout: 3))
        calendar.buttons["Choose month"].firstMatch.tap()
        let january = app.buttons["Jan"].firstMatch
        let options = app.scrollViews["fabricator-select-options"].firstMatch
        for _ in 0..<5 where !january.isHittable { options.swipeDown() }
        XCTAssertTrue(january.isHittable)
        january.tap()
        XCTAssertTrue(calendar.buttons["fabricator-calendar-day-2025-01-14"].firstMatch.waitForExistence(timeout: 3))
    }

    func testCalendarWholeDayBoundsAndDisabledDatesPreventSelection() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "calendar"]
        app.launch()
        let calendar = app.descendants(matching: .any).matching(identifier: "fabricator-calendar-bounds").firstMatch
        let lower = calendar.buttons["fabricator-calendar-day-2026-11-16"].firstMatch
        XCTAssertTrue(lower.waitForExistence(timeout: 8))
        for _ in 0..<5 where !lower.isHittable { app.swipeUp() }
        XCTAssertTrue(lower.isEnabled)
        XCTAssertEqual(lower.value as? String, "Today")
        XCTAssertFalse(calendar.buttons["fabricator-calendar-day-2026-11-15"].firstMatch.isEnabled)
        XCTAssertFalse(calendar.buttons["fabricator-calendar-day-2026-11-17"].firstMatch.isEnabled)
        XCTAssertTrue(calendar.buttons["fabricator-calendar-day-2026-11-20"].firstMatch.isEnabled)
        XCTAssertFalse(calendar.buttons["fabricator-calendar-day-2026-11-21"].firstMatch.isEnabled)
        XCTAssertFalse(calendar.buttons["Previous month"].firstMatch.isEnabled)
        XCTAssertFalse(calendar.buttons["Next month"].firstMatch.isEnabled)
        lower.tap()
        XCTAssertTrue(lower.isSelected)
        XCTAssertFalse(calendar.buttons["fabricator-calendar-day-2026-11-19"].firstMatch.isSelected)
    }

    func testCalendarRangeAndMultipleDatesExposeTheirSelectedDays() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "calendar", "--dark"]
        app.launch()
        let range = app.descendants(matching: .any).matching(identifier: "fabricator-calendar-range").firstMatch
        let start = range.buttons["fabricator-calendar-day-2026-01-13"].firstMatch
        XCTAssertTrue(start.waitForExistence(timeout: 8))
        for _ in 0..<8 where !start.isHittable { app.swipeUp() }
        start.tap()
        start.tap()
        range.buttons["fabricator-calendar-day-2026-01-16"].firstMatch.tap()
        XCTAssertTrue(start.isSelected)
        XCTAssertTrue(range.buttons["fabricator-calendar-day-2026-01-14"].firstMatch.isSelected)
        XCTAssertTrue(range.buttons["fabricator-calendar-day-2026-01-16"].firstMatch.isSelected)
        XCTAssertFalse(range.buttons["fabricator-calendar-day-2026-01-12"].firstMatch.isSelected)
        let multiple = app.descendants(matching: .any).matching(identifier: "fabricator-calendar-multiple").firstMatch
        let first = multiple.buttons["fabricator-calendar-day-2026-11-16"].firstMatch
        for _ in 0..<10 where !first.isHittable { app.swipeUp() }
        first.tap()
        multiple.buttons["fabricator-calendar-day-2026-11-17"].firstMatch.tap()
        multiple.buttons["fabricator-calendar-day-2026-11-18"].firstMatch.tap()
        XCTAssertTrue(first.isSelected)
        multiple.buttons["fabricator-calendar-day-2026-11-19"].firstMatch.tap()
        XCTAssertFalse(first.isSelected)
        XCTAssertFalse(multiple.buttons["fabricator-calendar-day-2026-11-18"].firstMatch.isSelected)
        XCTAssertTrue(multiple.buttons["fabricator-calendar-day-2026-11-19"].firstMatch.isSelected)
    }

    func testDatePickerLargeTextPopupKeepsDatesReadableAndSelectable() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "date-picker", "--dark", "--large-text"]
        app.launch()
        let field = app.buttons["fabricator-date-picker-primary"].firstMatch
        XCTAssertTrue(field.waitForExistence(timeout: 8))
        field.tap()
        let day = app.buttons["fabricator-calendar-day-2026-11-19"].firstMatch
        XCTAssertTrue(day.waitForExistence(timeout: 3))
        XCTAssertTrue(day.isHittable)
        XCTAssertGreaterThanOrEqual(day.frame.width, 44)
        XCTAssertGreaterThanOrEqual(day.frame.height, 44)
        day.tap()
        XCTAssertTrue(day.waitForNonExistence(timeout: 3))
        XCTAssertEqual(field.value as? String, "Nov 19, 2026")
    }

    func testDatePickerStartsEmptyClosesOnSelectionAndCanBeCleared() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "date-picker"]
        app.launch()
        let field = app.buttons["fabricator-date-picker-primary"].firstMatch
        XCTAssertTrue(field.waitForExistence(timeout: 8))
        XCTAssertEqual(field.value as? String, "No date selected")
        XCTAssertFalse(app.buttons["Clear date"].firstMatch.isEnabled)
        XCTAssertFalse(app.buttons["Disabled date"].firstMatch.isEnabled)
        field.tap()
        let day = app.buttons["fabricator-calendar-day-2026-11-19"].firstMatch
        XCTAssertTrue(day.waitForExistence(timeout: 3))
        day.tap()
        XCTAssertTrue(day.waitForNonExistence(timeout: 3))
        XCTAssertEqual(field.value as? String, "Nov 19, 2026")
        field.tap()
        XCTAssertTrue(day.waitForExistence(timeout: 3))
        XCTAssertTrue(day.isSelected)
        day.tap()
        XCTAssertTrue(day.waitForNonExistence(timeout: 3))
        XCTAssertEqual(field.value as? String, "Nov 19, 2026")
        app.buttons["Clear date"].firstMatch.tap()
        XCTAssertEqual(field.value as? String, "No date selected")
        app.buttons["Choose bounded date"].firstMatch.tap()
        let lower = app.buttons["fabricator-calendar-day-2026-11-16"].firstMatch
        XCTAssertTrue(lower.waitForExistence(timeout: 3))
        XCTAssertTrue(lower.isEnabled)
        XCTAssertTrue(app.buttons["fabricator-calendar-day-2026-11-20"].firstMatch.isEnabled)
        XCTAssertFalse(app.buttons["fabricator-calendar-day-2026-11-15"].firstMatch.isEnabled)
        XCTAssertFalse(app.buttons["fabricator-calendar-day-2026-11-21"].firstMatch.isEnabled)
        lower.tap()
        XCTAssertTrue(lower.waitForNonExistence(timeout: 3))
        XCTAssertEqual(app.buttons["Choose bounded date"].firstMatch.value as? String, "Nov 16, 2026")
    }

    func testDataTableSearchSelectsOnlyMatchingAccountsAndDeletesThem() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "data-table"]
        app.launch()
        let company = app.descendants(matching: .any).matching(identifier: "fabricator-data-table-cell-acc-7743-company").firstMatch
        XCTAssertTrue(company.waitForExistence(timeout: 8), app.debugDescription)
        XCTAssertEqual(company.label, "Company: Maple Analytics")
        let search = app.textFields["Search accounts…"].firstMatch
        XCTAssertTrue(search.exists)
        search.tap()
        search.typeText("-7743.example.com")
        let count = app.staticTexts["0 of 1 rows selected"].firstMatch
        XCTAssertTrue(count.waitForExistence(timeout: 5))
        let all = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Select all filtered rows")).firstMatch
        all.tap()
        XCTAssertTrue(app.staticTexts["1 of 1 rows selected"].firstMatch.waitForExistence(timeout: 3))
        app.buttons["Delete"].firstMatch.tap()
        XCTAssertTrue(app.staticTexts["No matching records."].firstMatch.waitForExistence(timeout: 3))
        XCTAssertTrue(app.staticTexts["0 of 0 rows selected"].firstMatch.exists)
    }

    func testDataTablePinnedNameStaysVisibleWhileBooleanCellsToggle() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "data-table", "--dark"]
        app.launch()
        let company = app.descendants(matching: .any).matching(identifier: "fabricator-data-table-cell-acc-7743-company").firstMatch
        XCTAssertTrue(company.waitForExistence(timeout: 8), app.debugDescription)
        let origin = company.frame.minX
        let columns = app.scrollViews["fabricator-data-table-columns"].firstMatch
        let active = app.descendants(matching: .any).matching(identifier: "fabricator-data-table-cell-acc-7743-active").firstMatch
        for _ in 0..<10 where !active.isHittable { columns.swipeLeft() }
        XCTAssertTrue(active.isHittable)
        XCTAssertTrue(company.isHittable)
        XCTAssertEqual(company.frame.minX, origin, accuracy: 1)
        XCTAssertFalse(active.isSelected)
        active.tap()
        XCTAssertTrue(active.isSelected, active.debugDescription)
        XCTAssertEqual(active.value as? String, "Checked")
        active.tap()
        XCTAssertFalse(active.isSelected)
        XCTAssertEqual(active.value as? String, "Unchecked")
        let sort = app.buttons["Sort by Active"].firstMatch
        XCTAssertTrue(sort.isHittable)
        sort.tap()
        XCTAssertEqual(sort.value as? String, "Ascending")
        sort.tap()
        XCTAssertEqual(sort.value as? String, "Descending")
        sort.tap()
        XCTAssertEqual(sort.value as? String, "Not sorted")
    }

    func testDataTableNumericHeaderCyclesThroughItsDefaultAndRemoval() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "data-table"]
        app.launch()
        XCTAssertTrue(app.buttons["Sort by Company"].firstMatch.waitForExistence(timeout: 8))
        let columns = app.scrollViews["fabricator-data-table-columns"].firstMatch
        let sort = app.buttons["Sort by Pipeline"].firstMatch
        for _ in 0..<10 where !sort.isHittable { columns.swipeLeft() }
        XCTAssertTrue(sort.isHittable)
        XCTAssertEqual(sort.value as? String, "Descending")
        sort.tap()
        XCTAssertEqual(sort.value as? String, "Ascending")
        sort.tap()
        XCTAssertEqual(sort.value as? String, "Not sorted")
        sort.tap()
        XCTAssertEqual(sort.value as? String, "Descending")
    }

    func testEditorTaskControlsToggleFocusAndUndoWhileReadOnlyTasksStayDisabled() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "editor"]
        app.launch()
        let editor = app.descendants(matching: .any).matching(identifier: "fabricator-editor-primary").firstMatch
        let text = editor.textViews["Rich text editor"].firstMatch
        XCTAssertTrue(text.waitForExistence(timeout: 8))
        let task = editor.descendants(matching: .any).matching(NSPredicate(format: "identifier BEGINSWITH %@ AND label == %@", "fabricator-editor-task-", "Not done")).firstMatch
        for _ in 0..<5 where !task.isHittable { text.swipeUp() }
        XCTAssertTrue(task.isHittable)
        XCTAssertEqual(task.value as? String, "Unchecked")
        let identifier = task.identifier
        XCTAssertFalse(identifier.isEmpty)
        task.tap()
        let checked = editor.descendants(matching: .any).matching(identifier: identifier).firstMatch
        XCTAssertEqual(checked.label, "Done")
        XCTAssertEqual(checked.value as? String, "Checked")
        XCTAssertTrue(checked.isSelected)
        let hide = app.buttons["Hide keyboard"].firstMatch
        XCTAssertTrue(hide.waitForExistence(timeout: 4))
        let taskCenter = checked.frame.midY
        checked.tap()
        XCTAssertEqual(checked.value as? String, "Unchecked")
        XCTAssertEqual(checked.frame.midY, taskCenter, accuracy: 1)
        checked.tap()
        XCTAssertEqual(checked.value as? String, "Checked")
        XCTAssertEqual(checked.frame.midY, taskCenter, accuracy: 1)
        let formatting = app.scrollViews["fabricator-editor-keyboard-commands"].firstMatch
        let undo = formatting.buttons["Undo"].firstMatch
        for _ in 0..<4 where !undo.isHittable { formatting.swipeLeft() }
        XCTAssertTrue(undo.isHittable)
        undo.tap()
        XCTAssertEqual(checked.value as? String, "Unchecked")
        hide.tap()
        let preview = app.descendants(matching: .any).matching(identifier: "fabricator-editor-readonly").firstMatch
        for _ in 0..<5 where !preview.isHittable { app.swipeUp() }
        let readonlyTask = preview.descendants(matching: .any).matching(NSPredicate(format: "identifier BEGINSWITH %@ AND label == %@", "fabricator-editor-task-", "Not done")).firstMatch
        for _ in 0..<3 where !readonlyTask.exists { preview.swipeUp() }
        XCTAssertTrue(readonlyTask.exists)
        XCTAssertFalse(readonlyTask.isEnabled)
        XCTAssertEqual(readonlyTask.value as? String, "Unchecked")
    }

    func testEditorStartsUnselectedAndShortDocumentUsesSixLines() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "editor"]
        app.launch()
        let heading = app.buttons["Heading 1"].firstMatch
        XCTAssertTrue(heading.waitForExistence(timeout: 8))
        XCTAssertFalse(heading.isSelected)
        let short = app.descendants(matching: .any).matching(identifier: "fabricator-editor-short").firstMatch
        for _ in 0..<5 where !short.isHittable { app.swipeUp() }
        let text = short.textViews["Rich text editor"].firstMatch
        XCTAssertTrue(text.exists)
        XCTAssertEqual(text.frame.height, 158.4, accuracy: 1)
        XCTAssertTrue(short.staticTexts["0 words"].firstMatch.exists)
    }

    func testEditorCodeCopyShowsFeedbackAndPreservesSelection() throws {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "editor"]
        app.launch()
        let text = app.textViews["Rich text editor"].firstMatch
        XCTAssertTrue(text.waitForExistence(timeout: 8))
        let original = try XCTUnwrap(text.value as? String)
        let editor = app.descendants(matching: .any).matching(identifier: "fabricator-editor-primary").firstMatch
        let copy = editor.buttons["Copy code"].firstMatch
        for _ in 0..<5 where !copy.isHittable { text.swipeUp() }
        XCTAssertTrue(copy.isHittable)
        copy.tap()
        let copied = editor.buttons["Copied"].firstMatch
        XCTAssertTrue(copied.waitForExistence(timeout: 2))
        XCTAssertEqual(copied.value as? String, "Copied to clipboard")
        XCTAssertFalse(app.buttons["Hide keyboard"].firstMatch.exists)
        XCTAssertEqual(text.value as? String, original)
        XCTAssertTrue(copied.waitForNonExistence(timeout: 4))
        XCTAssertTrue(copy.exists)
        struct Examples: Decodable { var editor: String }
        let resource = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "document-examples", withExtension: "json"))
        let fixture = try JSONDecoder().decode(Examples.self, from: Data(contentsOf: resource))
        let fenced = try XCTUnwrap(fixture.editor.components(separatedBy: "```").dropFirst().first)
        let expected = fenced.split(separator: "\n", omittingEmptySubsequences: false).dropFirst().dropLast().joined(separator: "\n")
        app.terminate()
        app.launchArguments = ["--page", "textarea"]
        app.launch()
        let target = app.textFields["Write your message…"].firstMatch
        XCTAssertTrue(target.waitForExistence(timeout: 8))
        target.tap()
        target.typeKey("a", modifierFlags: .command)
        target.typeKey("v", modifierFlags: .command)
        XCTAssertEqual(target.value as? String, expected)
    }

    func testEditorEditsFormatsAndRestoresCanonicalHistory() throws {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "editor"]
        app.launch()
        let text = app.textViews["Rich text editor"].firstMatch
        XCTAssertTrue(text.waitForExistence(timeout: 8))
        XCTAssertTrue((text.value as? String)?.hasPrefix("Release notes") == true)
        XCTAssertLessThanOrEqual(text.frame.height, 513)
        text.tap()
        XCTAssertTrue(app.buttons["Hide keyboard"].firstMatch.waitForExistence(timeout: 4))
        text.press(forDuration: 1.1)
        let selectAll = app.menuItems["Select All"].firstMatch
        XCTAssertTrue(selectAll.waitForExistence(timeout: 3))
        selectAll.tap()
        app.typeText("Native note")
        XCTAssertEqual(text.value as? String, "Native note")
        XCTAssertTrue(app.staticTexts["2 words"].firstMatch.exists)
        text.press(forDuration: 1.1)
        XCTAssertTrue(selectAll.waitForExistence(timeout: 3))
        selectAll.tap()
        let bold = app.buttons["Bold"].firstMatch
        bold.tap()
        XCTAssertTrue(bold.isSelected)
        let toolbar = app.scrollViews["Formatting"].firstMatch
        let undo = app.buttons["Undo"].firstMatch
        for _ in 0..<3 where !undo.isHittable { toolbar.swipeLeft() }
        undo.tap()
        XCTAssertFalse(bold.isSelected)
        for _ in 0..<12 where (text.value as? String)?.hasPrefix("Release notes") != true { undo.tap() }
        XCTAssertTrue((text.value as? String)?.hasPrefix("Release notes") == true)
        let redo = app.buttons["Redo"].firstMatch
        for _ in 0..<12 where text.value as? String != "Native note" { redo.tap() }
        XCTAssertEqual(text.value as? String, "Native note")
    }

    func testEditorShowsNativeKeyboardFormattingAndDismissesIt() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "editor"]
        app.launch()
        let text = app.textViews["Rich text editor"].firstMatch
        XCTAssertTrue(text.waitForExistence(timeout: 8))
        text.tap()
        let hide = app.buttons["Hide keyboard"].firstMatch
        XCTAssertTrue(hide.waitForExistence(timeout: 4))
        hide.tap()
        XCTAssertTrue(hide.waitForNonExistence(timeout: 4))
    }

    func testSyntaxCopyWritesTheFullSourceAndRestoresItsButton() throws {
        struct Examples: Decodable { var code: String }
        let resource = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "document-examples", withExtension: "json"))
        let fixture = try JSONDecoder().decode(Examples.self, from: Data(contentsOf: resource))
        let app = XCUIApplication()
        app.launchArguments = ["--page", "syntax-highlight"]
        app.launch()
        let copy = app.buttons["Copy code"].firstMatch
        XCTAssertTrue(copy.waitForExistence(timeout: 8))
        copy.tap()
        let copied = app.buttons["Copied"].firstMatch
        XCTAssertTrue(copied.waitForExistence(timeout: 3))
        XCTAssertEqual(copied.value as? String, "Copied to clipboard")
        XCTAssertTrue(copied.waitForNonExistence(timeout: 4))
        XCTAssertTrue(copy.exists)
        app.terminate()
        app.launchArguments = ["--page", "textarea"]
        app.launch()
        let target = app.textFields["Write your message…"].firstMatch
        XCTAssertTrue(target.waitForExistence(timeout: 8))
        target.tap()
        target.typeKey("a", modifierFlags: .command)
        target.typeKey("v", modifierFlags: .command)
        XCTAssertEqual(target.value as? String, fixture.code)
    }

    func testMarkdownRendersTheCanonicalRichTableAndLinkText() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "markdown"]
        app.launch()
        XCTAssertTrue(app.staticTexts["Getting started"].firstMatch.waitForExistence(timeout: 8))
        XCTAssertTrue(app.staticTexts["Syntax"].firstMatch.exists)
        XCTAssertTrue(app.staticTexts["Result"].firstMatch.exists)
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "inline code")).firstMatch.exists)
        XCTAssertTrue(app.staticTexts["bold"].firstMatch.exists)
    }

    func testCodeWrapsAndItsCappedViewportScrolls() throws {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "syntax-highlight"]
        app.launch()
        let wrapped = app.descendants(matching: .any).matching(identifier: "fabricator-wrapped-code").firstMatch
        XCTAssertTrue(wrapped.waitForExistence(timeout: 8))
        for _ in 0..<4 where !wrapped.isHittable { app.swipeUp() }
        let longLine = wrapped.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "const url =")).firstMatch
        let shortLine = wrapped.staticTexts["const isReady = true"].firstMatch
        XCTAssertTrue(longLine.exists)
        XCTAssertGreaterThan(longLine.frame.height, shortLine.frame.height * 1.5)
        let capped = app.descendants(matching: .any).matching(identifier: "fabricator-capped-code").firstMatch
        for _ in 0..<4 where !capped.isHittable { app.swipeUp() }
        let viewport = capped.scrollViews.firstMatch
        XCTAssertLessThanOrEqual(viewport.frame.height, 289)
        let before = try XCTUnwrap(viewport.value as? String)
        viewport.swipeUp()
        XCTAssertNotEqual(viewport.value as? String, before)
    }

    func testEveryCatalogRouteLaunchesItsNativeScreen() throws {
        let resource = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "contract", withExtension: "json"))
        let catalog = try JSONDecoder().decode(Catalog.self, from: Data(contentsOf: resource))
        XCTAssertGreaterThanOrEqual(catalog.items.count, 141)
        let app = XCUIApplication()
        for (index, item) in catalog.items.enumerated() {
            XCTContext.runActivity(named: "\(index + 1)/\(catalog.items.count): \(item.name)") { _ in
                app.launchArguments = ["--page", item.name]
                app.launch()
                let heading = app.descendants(matching: .any).matching(identifier: "fabricator-gallery-page-\(item.name)").firstMatch
                XCTAssertTrue(heading.waitForExistence(timeout: 8), "Native route did not render: \(item.name)")
                XCTAssertFalse(app.staticTexts["This catalog entry is not implemented in this renderer."].exists)
                XCTAssertEqual(app.state, .runningForeground)
                app.terminate()
            }
        }
    }

    func testOverviewEditsNativeFieldAndAnnouncesCreatedProject() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "overview"]
        app.launch()
        let name = app.textFields["Your name"].firstMatch
        XCTAssertTrue(name.waitForExistence(timeout: 8))
        name.tap()
        name.typeText(" QA\n")
        XCTAssertTrue((name.value as? String)?.contains("QA") == true)
        app.buttons["Create project"].firstMatch.tap()
        let feedback = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", "Project created")).firstMatch
        XCTAssertTrue(feedback.waitForExistence(timeout: 4))
    }

    func testSelectOpensAcrossItsFullControlAndUpdatesSelection() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "showcase-forms"]
        app.launch()
        let trigger = app.buttons["Choose a role"].firstMatch
        XCTAssertTrue(trigger.waitForExistence(timeout: 8))
        trigger.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        let option = app.buttons["Engineer"].firstMatch
        XCTAssertTrue(option.waitForExistence(timeout: 4))
        option.tap()
        XCTAssertEqual(trigger.value as? String, "Engineer")
    }

    func testSelectPopupFitsItsRowsAndDismissesOutsideThem() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "select"]
        app.launch()
        let trigger = app.buttons["Select a fruit"].firstMatch
        XCTAssertTrue(trigger.waitForExistence(timeout: 8))
        trigger.tap()
        let first = app.buttons["Apple"].firstMatch
        let last = app.buttons["Pineapple"].firstMatch
        XCTAssertTrue(last.waitForExistence(timeout: 4))
        XCTAssertEqual(first.frame.width, trigger.frame.width - 8, accuracy: 1)
        XCTAssertEqual(last.frame.maxY - first.frame.minY, 5 * 36, accuracy: 1)
        last.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 1)).withOffset(CGVector(dx: 0, dy: 16)).tap()
        XCTAssertTrue(last.waitForNonExistence(timeout: 3), "The popup must end after its final row, without a blank tap-catching area")
        trigger.tap()
        XCTAssertTrue(first.waitForExistence(timeout: 3))
        first.tap()
        XCTAssertEqual(trigger.value as? String, "Apple")
        XCTAssertTrue(first.waitForNonExistence(timeout: 3))
    }

    func testSearchableSelectClearsItsQueryOnDismissal() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "showcase-forms"]
        app.launch()
        let trigger = app.buttons["Choose a role"].firstMatch
        XCTAssertTrue(trigger.waitForExistence(timeout: 8))
        trigger.tap()
        let search = app.textFields["Search options…"].firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 3))
        search.tap()
        search.typeText("No matching role")
        XCTAssertTrue(app.staticTexts["No options found."].waitForExistence(timeout: 3))
        app.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.2)).tap()
        XCTAssertTrue(search.waitForNonExistence(timeout: 3))
        trigger.tap()
        XCTAssertTrue(app.buttons["Engineer"].firstMatch.waitForExistence(timeout: 3))
    }

    func testDialogDismissalCanBeRepeatedWithoutLeavingAnOverlay() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "dialog"]
        app.launch()
        let trigger = app.buttons["Open dialog"].firstMatch
        XCTAssertTrue(trigger.waitForExistence(timeout: 8))
        for _ in 0..<3 {
            trigger.tap()
            let close = app.buttons["Close dialog"].firstMatch
            XCTAssertTrue(close.waitForExistence(timeout: 3))
            close.tap()
            XCTAssertTrue(close.waitForNonExistence(timeout: 3))
        }
    }

    func testLargeTextScalesTheTriggerAndItsPopupTogether() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "select"]
        app.launch()
        let baseline = app.buttons["Select a fruit"].firstMatch
        XCTAssertTrue(baseline.waitForExistence(timeout: 8))
        let baselineHeight = baseline.frame.height
        app.terminate()
        app.launchArguments = ["--page", "select", "--large-text"]
        app.launch()
        let trigger = app.buttons["Select a fruit"].firstMatch
        XCTAssertTrue(trigger.waitForExistence(timeout: 8))
        XCTAssertGreaterThan(trigger.frame.height, baselineHeight * 1.3)
        trigger.tap()
        let option = app.buttons["Apple"].firstMatch
        XCTAssertTrue(option.waitForExistence(timeout: 4))
        XCTAssertGreaterThan(option.frame.height, baselineHeight * 1.3, "A popup must inherit the region's Dynamic Type size")
        option.tap()
        XCTAssertEqual(trigger.value as? String, "Apple")
    }

    func testAvatarExposesOneImageWithTheFullName() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "avatar", "--large-text"]
        app.launch()
        let example = app.otherElements["fabricator-avatar-example"]
        let avatar = example.images["Alex Morgan"]
        XCTAssertTrue(avatar.waitForExistence(timeout: 8))
        XCTAssertEqual(example.images.matching(NSPredicate(format: "label == %@", "Alex Morgan")).count, 1)
        XCTAssertFalse(example.staticTexts["AM"].exists)
    }

    func testCheckboxAnnouncesMixedStateAndUpdatesItsSelectionTrait() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "checkbox"]
        app.launch()
        let checkbox = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Accept terms and conditions")).firstMatch
        XCTAssertTrue(checkbox.waitForExistence(timeout: 8))
        let next = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Receive product updates")).firstMatch
        XCTAssertGreaterThanOrEqual(next.frame.midY - checkbox.frame.midY, 44)
        XCTAssertTrue(checkbox.isSelected)
        checkbox.tap()
        XCTAssertFalse(checkbox.isSelected)
        checkbox.tap()
        XCTAssertTrue(checkbox.isSelected)
        let mixed = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Indeterminate selection")).firstMatch
        XCTAssertEqual(mixed.value as? String, "Mixed")
        let disabled = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Disabled checked")).firstMatch
        XCTAssertFalse(disabled.isEnabled)
        XCTAssertTrue(disabled.isSelected)
    }

    func testSwitchExposesItsSelectionTraitWhenToggled() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "switch"]
        app.launch()
        let toggle = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Push notifications")).firstMatch
        XCTAssertTrue(toggle.waitForExistence(timeout: 8))
        XCTAssertTrue(toggle.isSelected)
        toggle.tap()
        XCTAssertFalse(toggle.isSelected)
        toggle.tap()
        XCTAssertTrue(toggle.isSelected)
        let disabled = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Disabled unchecked")).firstMatch
        XCTAssertFalse(disabled.isEnabled)
        XCTAssertFalse(disabled.isSelected)
    }

    func testRadioSelectionIsExclusiveAcrossTheWholeRow() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "radio-group"]
        app.launch()
        let first = app.buttons["Default"]
        let second = app.buttons["Comfortable"]
        let third = app.buttons["Compact"]
        XCTAssertTrue(second.waitForExistence(timeout: 8))
        XCTAssertTrue(second.isSelected)
        third.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.5)).tap()
        XCTAssertTrue(third.isSelected)
        XCTAssertFalse(second.isSelected)
        first.tap()
        XCTAssertTrue(first.isSelected)
        XCTAssertFalse(third.isSelected)
        XCTAssertFalse(app.buttons["Disabled checked"].isEnabled)
        XCTAssertTrue(app.buttons["Disabled checked"].isSelected)
    }

    func testLargeTableScrollsToRevealUncompressedColumns() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "table", "--large-text"]
        app.launch()
        let invoice = app.staticTexts["Invoice"].firstMatch
        let amount = app.staticTexts["Amount"].firstMatch
        XCTAssertTrue(invoice.waitForExistence(timeout: 8))
        XCTAssertTrue(invoice.isHittable)
        if app.frame.width < 700 {
            XCTAssertFalse(amount.isHittable, "Large table text must retain its natural column width and overflow on a phone")
            let table = app.descendants(matching: .any).matching(identifier: "fabricator-invoice-table").firstMatch
            table.swipeLeft()
        }
        XCTAssertTrue(amount.isHittable)
    }

    func testFileTreeKeyboardNavigatesFoldersAndFindsNames() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "file-tree"]
        app.launch()
        let file = app.buttons["app.tsx"]
        XCTAssertTrue(file.waitForExistence(timeout: 8))
        file.tap()
        app.typeKey(.downArrow, modifierFlags: [])
        XCTAssertTrue(app.buttons["styles.css"].isSelected)
        app.typeKey(.upArrow, modifierFlags: [])
        XCTAssertTrue(app.buttons["app.tsx"].isSelected)
        app.typeKey(.leftArrow, modifierFlags: [])
        XCTAssertTrue(app.buttons["src"].isSelected)
        app.typeKey(.leftArrow, modifierFlags: [])
        XCTAssertTrue(file.waitForNonExistence(timeout: 3))
        app.typeKey(.rightArrow, modifierFlags: [])
        XCTAssertTrue(file.waitForExistence(timeout: 3))
        app.typeKey(.rightArrow, modifierFlags: [])
        XCTAssertTrue(file.isSelected)
        app.typeKey("s", modifierFlags: [])
        XCTAssertTrue(app.buttons["styles.css"].isSelected)
    }

    func testFileTreeDoubleTapOpensFiles() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "file-tree"]
        app.launch()
        let file = app.buttons["styles.css"]
        XCTAssertTrue(file.waitForExistence(timeout: 8))
        file.doubleTap()
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Opened styles.css")).firstMatch.waitForExistence(timeout: 3))
    }

    func testFileTreeKeepsEmptyFoldersAndDisabledRowsDistinct() {
        let app = XCUIApplication()
        app.launchArguments = ["--page", "file-tree"]
        app.launch()
        let folder = app.buttons["Empty folder"]
        XCTAssertTrue(folder.waitForExistence(timeout: 8))
        XCTAssertEqual(folder.value as? String, "Collapsed folder")
        folder.tap()
        XCTAssertEqual(folder.value as? String, "Expanded folder")
        XCTAssertFalse(app.buttons[".env.local"].isEnabled)
    }
}
