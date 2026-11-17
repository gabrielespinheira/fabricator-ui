"use client"

import * as React from "react"

import { CalendarAppRsvp } from "@/registry/bases/__base__/blocks/calendar-app-01/components/calendar-app-rsvp"
import {
  CALENDAR_APP_CALENDARS,
  type CalendarAppEvent,
  type CalendarAppEventData,
  type CalendarAppResponse,
} from "@/registry/bases/__base__/blocks/calendar-app-01/lib/calendar-app-events"
import {
  CALENDAR_APP_RESPONSE_LABELS,
  describeEventWhen,
  describeResponses,
  summarizeResponses,
  withYourResponse,
} from "@/registry/bases/__base__/blocks/calendar-app-01/lib/calendar-app-model"
import {
  describeRecurrence,
  EventCalendarRecurrenceError,
  parseRecurrence,
} from "@/registry/bases/__base__/lib/event-calendar-recurrence"
import {
  AppShellPanel,
  AppShellPanelClose,
  AppShellPanelContent,
  AppShellPanelHeader,
  AppShellPanelTitle,
} from "@/registry/bases/__base__/ui/app-shell"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/registry/bases/__base__/ui/avatar"
import { Button } from "@/registry/bases/__base__/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/registry/bases/__base__/ui/empty"
import { type EventCalendarController } from "@/registry/bases/__base__/ui/event-calendar"
import { getChipColorStyle } from "@/registry/bases/__base__/ui/event-calendar-event"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/registry/bases/__base__/ui/item"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

export const CALENDAR_APP_EVENT_PANEL = "event"

const MAX_AVATARS = 5

export function CalendarAppEventPanel({
  calendar,
  event,
  response,
  onResponseChange,
}: {
  calendar: EventCalendarController<CalendarAppEventData>
  /** The event open in the panel; nothing open shows an empty state. */
  event: CalendarAppEvent | undefined
  response: CalendarAppResponse | undefined
  onResponseChange: (response: CalendarAppResponse) => void
}) {
  return (
    <AppShellPanel
      id={CALENDAR_APP_EVENT_PANEL}
      label="Event details"
      defaultWidth={340}
      minWidth={300}
    >
      <AppShellPanelHeader>
        <AppShellPanelTitle>Event details</AppShellPanelTitle>
        <AppShellPanelClose />
      </AppShellPanelHeader>
      <AppShellPanelContent>
        {event ? (
          <CalendarAppEventDetails
            key={event.id}
            calendar={calendar}
            event={event}
            response={response}
            onResponseChange={onResponseChange}
          />
        ) : (
          <Empty className="h-full">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconPlaceholder
                  lucide="CalendarIcon"
                  tabler="IconCalendar"
                  hugeicons="Calendar03Icon"
                  phosphor="CalendarBlankIcon"
                  remixicon="RiCalendarLine"
                />
              </EmptyMedia>
              <EmptyTitle>No event open</EmptyTitle>
              <EmptyDescription>
                Select an event to see when and where it is, and who&apos;s
                going.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </AppShellPanelContent>
    </AppShellPanel>
  )
}

function describeRepeat(recurrence: string | undefined) {
  if (!recurrence) return undefined
  try {
    return describeRecurrence(parseRecurrence(recurrence).rule)
  } catch (error) {
    // A rule from another app, outside what the model reads, still repeats.
    if (error instanceof EventCalendarRecurrenceError) return "Repeats"
    throw error
  }
}

function CalendarAppEventDetails({
  calendar,
  event,
  response,
  onResponseChange,
}: {
  calendar: EventCalendarController<CalendarAppEventData>
  event: CalendarAppEvent
  response: CalendarAppResponse | undefined
  onResponseChange: (response: CalendarAppResponse) => void
}) {
  const rsvpLabelId = React.useId()
  const source = CALENDAR_APP_CALENDARS.find(
    ({ id }) => id === event.calendarId
  )
  const color = event.color ?? source?.color
  const guests = withYourResponse(event.data?.guests ?? [], response)
  const you = guests.find((guest) => guest.isYou)
  const organizer = guests.find((guest) => guest.isOrganizer)
  const conference = event.data?.conference
  const repeat = describeRepeat(event.recurrence)
  const canEdit = calendar.canEdit(event)

  return (
    <div className="flex flex-col gap-(--density-20) p-(--density-16)">
      <div className="flex items-start gap-(--density-12)">
        <span
          aria-hidden
          style={color ? getChipColorStyle(color) : undefined}
          className="mt-(--density-6) size-3.5 shrink-0 rounded-sm bg-(--event-calendar-fill-light) dark:bg-(--event-calendar-fill-dark)"
        />
        <div className="flex min-w-0 flex-col gap-(--density-4)">
          <h3 className="text-base font-semibold text-balance">
            {event.title || "(No title)"}
          </h3>
          <p className="text-(length:--density-text-13) text-muted-foreground">
            {describeEventWhen(event, {
              locale: calendar.locale,
              timeZone: calendar.timeZone,
              hourCycle: calendar.settings.hourCycle,
            })}
          </p>
          {repeat ? (
            <p className="text-(length:--density-text-13) text-muted-foreground">
              {repeat}
            </p>
          ) : null}
        </div>
      </div>

      {conference ? (
        <a
          href={conference.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-(--density-36) w-fit items-center gap-(--density-6) rounded-lg bg-secondary px-(--density-12) text-(length:--density-text-13) font-medium text-secondary-foreground outline-none hover:bg-secondary/80 focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-(--density-icon-16)"
        >
          <IconPlaceholder
            lucide="VideoIcon"
            tabler="IconVideo"
            hugeicons="Video01Icon"
            phosphor="VideoCameraIcon"
            remixicon="RiVidiconLine"
          />
          {conference.label}
        </a>
      ) : null}

      <dl className="flex flex-col gap-(--density-12) text-(length:--density-text-13)">
        {event.location ? (
          <DetailsRow
            label="Location"
            icon={
              <IconPlaceholder
                lucide="MapPinIcon"
                tabler="IconMapPin"
                hugeicons="Location01Icon"
                phosphor="MapPinIcon"
                remixicon="RiMapPinLine"
              />
            }
          >
            {event.location}
          </DetailsRow>
        ) : null}
        {source ? (
          <DetailsRow
            label="Calendar"
            icon={
              <IconPlaceholder
                lucide="CalendarIcon"
                tabler="IconCalendar"
                hugeicons="Calendar03Icon"
                phosphor="CalendarBlankIcon"
                remixicon="RiCalendarLine"
              />
            }
          >
            {source.name}
          </DetailsRow>
        ) : null}
        {guests.length > 0 ? (
          <DetailsRow
            label="Guests"
            icon={
              <IconPlaceholder
                lucide="UsersIcon"
                tabler="IconUsers"
                hugeicons="UserGroupIcon"
                phosphor="UsersIcon"
                remixicon="RiGroupLine"
              />
            }
          >
            <div className="flex flex-col gap-(--density-8)">
              <span>
                {guests.length} guests ·{" "}
                <span className="text-muted-foreground">
                  {describeResponses(summarizeResponses(guests))}
                </span>
              </span>
              <AvatarGroup>
                {guests.slice(0, MAX_AVATARS).map((guest) => (
                  <Avatar
                    key={guest.id}
                    tooltip={`${guest.name}${guest.isYou ? " (you)" : ""}${guest.isOrganizer ? ", organizer" : ""}: ${CALENDAR_APP_RESPONSE_LABELS[guest.response ?? "awaiting"]}`}
                  >
                    <AvatarFallback>{guest.initials}</AvatarFallback>
                  </Avatar>
                ))}
                {guests.length > MAX_AVATARS ? (
                  <AvatarGroupCount>
                    +{guests.length - MAX_AVATARS}
                  </AvatarGroupCount>
                ) : null}
              </AvatarGroup>
            </div>
          </DetailsRow>
        ) : null}
        {event.description ? (
          <DetailsRow
            label="Description"
            icon={
              <IconPlaceholder
                lucide="AlignLeftIcon"
                tabler="IconAlignLeft"
                hugeicons="TextAlignLeftIcon"
                phosphor="TextAlignLeftIcon"
                remixicon="RiAlignLeft"
              />
            }
          >
            <span className="text-pretty whitespace-pre-line">
              {event.description}
            </span>
          </DetailsRow>
        ) : null}
      </dl>

      {you ? (
        <Item variant="muted" size="sm">
          <ItemContent>
            <ItemTitle id={rsvpLabelId}>Going?</ItemTitle>
            {organizer && !organizer.isYou ? (
              <ItemDescription>
                {organizer.name} sees your answer.
              </ItemDescription>
            ) : null}
          </ItemContent>
          <ItemActions>
            <CalendarAppRsvp
              aria-labelledby={rsvpLabelId}
              value={response ?? you.response}
              onValueChange={onResponseChange}
            />
          </ItemActions>
        </Item>
      ) : null}

      {canEdit ? (
        <div className="flex items-center gap-(--density-8)">
          <Button variant="outline" onClick={() => calendar.editEvent(event)}>
            <IconPlaceholder
              lucide="PencilIcon"
              tabler="IconPencil"
              hugeicons="PencilEdit01Icon"
              phosphor="PencilSimpleIcon"
              remixicon="RiPencilLine"
              data-icon="inline-start"
            />
            Edit
          </Button>
          <Button
            variant="destructive"
            className="ms-auto"
            onClick={() => calendar.deleteEvent(event)}
          >
            <IconPlaceholder
              lucide="Trash2Icon"
              tabler="IconTrash"
              hugeicons="Delete02Icon"
              phosphor="TrashIcon"
              remixicon="RiDeleteBinLine"
              data-icon="inline-start"
            />
            Delete event
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function DetailsRow({
  label,
  icon,
  children,
}: {
  label: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-(--density-12)">
      <dt className="flex h-5 shrink-0 items-center text-muted-foreground [&_svg]:size-(--density-icon-16)">
        {icon}
        <span className="sr-only">{label}</span>
      </dt>
      <dd className="min-w-0 flex-1 leading-5">{children}</dd>
    </div>
  )
}
