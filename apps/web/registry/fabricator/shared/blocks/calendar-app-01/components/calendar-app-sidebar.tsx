"use client"

import {
  CALENDAR_APP_CALENDARS,
  type CalendarAppCalendar,
  type CalendarAppEventData,
} from "@/registry/bases/__base__/blocks/calendar-app-01/lib/calendar-app-events"
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/registry/bases/__base__/ui/dropdown-menu"
import {
  EventCalendarMiniMonth,
  EventCalendarSources,
  type EventCalendarController,
} from "@/registry/bases/__base__/ui/event-calendar"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarRail,
} from "@/registry/bases/__base__/ui/sidebar"
import { UserMenu } from "@/registry/bases/__base__/ui/user-menu"

const GROUPS: { id: CalendarAppCalendar["group"]; label: string }[] = [
  { id: "mine", label: "My calendars" },
  { id: "other", label: "Other calendars" },
]

export function CalendarAppSidebar({
  calendar,
}: {
  calendar: EventCalendarController<CalendarAppEventData>
}) {
  // Each group is the calendar's own source list over some of its
  // calendars: the checkboxes show and hide their events in the grid.
  const groups = GROUPS.map((group) => {
    const ids = new Set(
      CALENDAR_APP_CALENDARS.filter((item) => item.group === group.id).map(
        (item) => item.id
      )
    )
    return {
      ...group,
      calendar: {
        ...calendar,
        calendars: calendar.calendars.filter((item) => ids.has(item.id)),
      },
    }
  })

  return (
    <Sidebar variant="inset">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="flex justify-center">
            <EventCalendarMiniMonth calendar={calendar} />
          </SidebarGroupContent>
        </SidebarGroup>
        {groups.map((group) => (
          <SidebarGroup key={group.id}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent className="px-(--density-8)">
              <EventCalendarSources
                calendar={group.calendar}
                aria-label={group.label}
              />
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <UserMenu user={{ name: "Ada Park", email: "ada@acme.com" }}>
          <DropdownMenuGroup>
            <DropdownMenuItem>Account</DropdownMenuItem>
            <DropdownMenuItem>Calendar settings</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>Sign out</DropdownMenuItem>
          </DropdownMenuGroup>
        </UserMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
