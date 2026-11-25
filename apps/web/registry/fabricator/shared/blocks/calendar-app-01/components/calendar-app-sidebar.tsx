"use client"

import * as React from "react"

import { CalendarAppAddCalendar } from "@/registry/bases/__base__/blocks/calendar-app-01/components/calendar-app-controls"
import {
  CALENDAR_APP_ACCOUNT,
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
import { getChipColorStyle } from "@/registry/bases/__base__/ui/event-calendar-event"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/registry/bases/__base__/ui/sidebar"
import { UserMenu } from "@/registry/bases/__base__/ui/user-menu"

const GROUPS: { id: CalendarAppCalendar["group"]; label: string }[] = [
  { id: "mine", label: "My calendars" },
  { id: "other", label: "Other calendars" },
]

/** A calendar's colour as a dot, in the mode's fill. */
export function CalendarAppDot({
  color,
}: {
  color: CalendarAppCalendar["color"]
}) {
  return (
    <span
      aria-hidden
      style={getChipColorStyle(color)}
      className="size-2.5 shrink-0 rounded-full bg-(--event-calendar-fill-light) dark:bg-(--event-calendar-fill-dark)"
    />
  )
}

export type CalendarAppUpNext = {
  title: string
  startsIn: string
  color: CalendarAppCalendar["color"]
  onOpen: () => void
}

export function CalendarAppSidebar({
  calendar,
  calendars,
  colleagues,
  upNext,
  onAddCalendar,
}: {
  calendar: EventCalendarController<CalendarAppEventData>
  calendars: CalendarAppCalendar[]
  /** Calendars that can still be added. */
  colleagues: CalendarAppCalendar[]
  /** Left out while the panel beside the week already shows it. */
  upNext: CalendarAppUpNext | undefined
  onAddCalendar: (id: string) => void
}) {
  const { isMobile, setOpenMobile } = useSidebar()
  // Each group is the calendar's own source list over some of its
  // calendars: the checkboxes show and hide their events in the grid.
  const groups = GROUPS.map((group) => {
    const ids = new Set(
      calendars.filter((item) => item.group === group.id).map((item) => item.id)
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
      <SidebarHeader
        role="banner"
        className="flex-row items-center gap-(--density-8) ps-(--density-16)"
      >
        <span
          aria-hidden
          className="flex size-(--density-24) shrink-0 items-center justify-center rounded-lg bg-primary text-(length:--density-text-12) text-primary-foreground weight-semibold"
        >
          A
        </span>
        <span className="truncate text-(length:--density-text-14) weight-semibold">
          Acme Inc
        </span>
        <SidebarTrigger className="ms-auto" />
      </SidebarHeader>
      <SidebarContent role="complementary" aria-label="Calendars">
        <SidebarGroup>
          <SidebarGroupContent className="flex justify-center">
            <EventCalendarMiniMonth
              calendar={calendar}
              onDateSelect={() => {
                if (isMobile) setOpenMobile(false)
              }}
            />
          </SidebarGroupContent>
        </SidebarGroup>
        {groups.map((group) => (
          <SidebarGroup key={group.id}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              {/* The list's rows, at the sidebar rows' height: the whole row
                  is the checkbox's label. */}
              <EventCalendarSources
                calendar={group.calendar}
                aria-label={group.label}
                className="gap-0 *:h-(--density-30) *:rounded-lg *:px-(--density-8) *:hover:bg-hover **:data-[slot=field-label]:my-0 **:data-[slot=field-label]:flex-1 **:data-[slot=field-label]:py-0 **:data-[slot=field-label]:leading-(--density-30) pointer-coarse:*:h-11 pointer-coarse:**:data-[slot=field-label]:leading-11"
              />
              {group.id === "other" && colleagues.length > 0 ? (
                <SidebarMenu>
                  <SidebarMenuItem>
                    <CalendarAppAddCalendar
                      options={colleagues.map(({ id, name, color }) => ({
                        id,
                        name,
                        media: <CalendarAppDot color={color} />,
                      }))}
                      onAdd={onAddCalendar}
                    />
                  </SidebarMenuItem>
                </SidebarMenu>
              ) : null}
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        {upNext ? (
          <SidebarMenu aria-label="Up next">
            <SidebarMenuItem>
              <SidebarMenuButton
                className="h-auto py-(--density-8)"
                onClick={() => {
                  if (isMobile) setOpenMobile(false)
                  upNext.onOpen()
                }}
              >
                <span className="flex h-(--density-28) w-(--density-16) shrink-0 items-center justify-center self-start">
                  <CalendarAppDot color={upNext.color} />
                </span>
                <span className="flex min-w-0 flex-col gap-(--density-4) [text-box:normal]">
                  <span className="truncate font-medium text-foreground">
                    {upNext.title}
                  </span>
                  <span className="truncate text-(length:--density-text-12) text-muted-foreground tabular-nums">
                    Up next, {upNext.startsIn}
                  </span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : null}
        <UserMenu user={CALENDAR_APP_ACCOUNT}>
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
