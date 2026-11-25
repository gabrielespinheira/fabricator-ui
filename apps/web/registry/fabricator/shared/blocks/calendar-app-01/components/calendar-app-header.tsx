"use client"

import * as React from "react"

import {
  CalendarAppChoice,
  CalendarAppDateButton,
  CalendarAppViewOptions,
} from "@/registry/bases/__base__/blocks/calendar-app-01/components/calendar-app-controls"
import { CALENDAR_APP_EVENT_PANEL } from "@/registry/bases/__base__/blocks/calendar-app-01/components/calendar-app-event-panel"
import { type CalendarAppEventData } from "@/registry/bases/__base__/blocks/calendar-app-01/lib/calendar-app-events"
import { getPeriodTitle } from "@/registry/bases/__base__/blocks/calendar-app-01/lib/calendar-app-model"
import { getViewLabel } from "@/registry/bases/__base__/lib/event-calendar-model"
import {
  AppShellHeader,
  AppShellHeaderActions,
  AppShellPanelTrigger,
  useAppShell,
} from "@/registry/bases/__base__/ui/app-shell"
import {
  EventCalendarMiniMonth,
  EventCalendarNavigation,
  EventCalendarToday,
  EventCalendarViewSelect,
  type EventCalendarController,
} from "@/registry/bases/__base__/ui/event-calendar"
import { useSidebar } from "@/registry/bases/__base__/ui/sidebar"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

/**
 * The page's one row: the period as its heading, the ways through time, the
 * view, and Create. A narrow column swaps the view's tabs for a select; a
 * phone leaves moving between days to the week strip and swiping.
 */
export function CalendarAppHeader({
  calendar,
  now,
  onCreate,
}: {
  calendar: EventCalendarController<CalendarAppEventData>
  now: Date | undefined
  onCreate: () => void
}) {
  const { size } = useAppShell()
  const { state, isMobile } = useSidebar()
  const isPhone = size === "phone"
  // The sidebar's month is the date picker while it shows.
  const hasDateButton = isMobile || state === "collapsed"
  const title = now
    ? getPeriodTitle({
        title: calendar.title,
        view: calendar.view,
        range: calendar.range,
        now,
        isPhone,
        locale: calendar.locale,
        timeZone: calendar.timeZone,
      })
    : ""
  const { settings, setSettings } = calendar

  return (
    <AppShellHeader>
      <div className="@container flex min-w-0 flex-1 items-center gap-(--density-8)">
        <h1
          aria-live="polite"
          className="flex min-w-0 items-center text-(length:--density-text-16) weight-semibold"
        >
          {hasDateButton ? (
            <CalendarAppDateButton title={title}>
              {(close) => (
                <EventCalendarMiniMonth
                  calendar={calendar}
                  onDateSelect={close}
                />
              )}
            </CalendarAppDateButton>
          ) : (
            <span className="truncate">{title}</span>
          )}
        </h1>
        <EventCalendarToday
          calendar={calendar}
          size={isPhone ? "default" : "sm"}
          className="in-data-[size=phone]:ms-auto"
        />
        {isPhone ? null : (
          <EventCalendarNavigation
            calendar={calendar}
            className="me-auto density-compact"
          />
        )}
        <CalendarAppChoice
          label="View"
          options={calendar.views.map((view) => ({
            value: view,
            label: getViewLabel(view, calendar.days),
          }))}
          value={calendar.view}
          onValueChange={calendar.setView}
          className="hidden shrink-0 density-compact @min-[36rem]:flex"
        />
        <EventCalendarViewSelect
          calendar={calendar}
          className="min-w-0 not-in-data-[size=phone]:density-compact @min-[36rem]:hidden"
        />
      </div>
      <AppShellHeaderActions
        primaryAction={{
          id: "create",
          label: "Create event",
          onSelect: onCreate,
          icon: (
            <IconPlaceholder
              lucide="PlusIcon"
              tabler="IconPlus"
              hugeicons="PlusSignIcon"
              phosphor="PlusIcon"
              remixicon="RiAddLine"
            />
          ),
        }}
        menuLabel="Calendar options"
        menu={
          <CalendarAppViewOptions
            options={[
              {
                id: "weekends",
                label: "Show weekends",
                icon: (
                  <IconPlaceholder
                    lucide="CalendarDaysIcon"
                    tabler="IconCalendarWeek"
                    hugeicons="Calendar03Icon"
                    phosphor="CalendarDotsIcon"
                    remixicon="RiCalendarView"
                  />
                ),
                isOn: settings.showWeekends,
                onChange: (showWeekends) => setSettings({ showWeekends }),
              },
              {
                id: "week-numbers",
                label: "Show week numbers",
                icon: (
                  <IconPlaceholder
                    lucide="HashIcon"
                    tabler="IconHash"
                    hugeicons="GridIcon"
                    phosphor="HashIcon"
                    remixicon="RiHashtag"
                  />
                ),
                isOn: settings.showWeekNumbers,
                onChange: (showWeekNumbers) => setSettings({ showWeekNumbers }),
              },
              {
                id: "monday",
                label: "Start the week on Monday",
                icon: (
                  <IconPlaceholder
                    lucide="CalendarArrowUpIcon"
                    tabler="IconCalendarUp"
                    hugeicons="CalendarUpload01Icon"
                    phosphor="CalendarBlankIcon"
                    remixicon="RiCalendarTodoLine"
                  />
                ),
                isOn: settings.weekStartsOn === 1,
                onChange: (isMonday) =>
                  setSettings({ weekStartsOn: isMonday ? 1 : 0 }),
              },
              {
                id: "24-hour",
                label: "24-hour time",
                icon: (
                  <IconPlaceholder
                    lucide="ClockIcon"
                    tabler="IconClock"
                    hugeicons="Clock01Icon"
                    phosphor="ClockIcon"
                    remixicon="RiTimeLine"
                  />
                ),
                isOn: settings.hourCycle === "h23",
                onChange: (is24Hour) =>
                  setSettings({ hourCycle: is24Hour ? "h23" : "h12" }),
              },
            ]}
          />
        }
      />
      {/* On a phone an event opens its own drawer. */}
      {isPhone ? null : (
        <AppShellPanelTrigger panel={CALENDAR_APP_EVENT_PANEL} />
      )}
    </AppShellHeader>
  )
}
