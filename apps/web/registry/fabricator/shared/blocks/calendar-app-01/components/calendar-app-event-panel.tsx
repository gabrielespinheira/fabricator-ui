"use client"

import * as React from "react"
import { cn } from "cn"

import {
  CalendarAppChoice,
  CalendarAppMenu,
  CalendarAppValueMenu,
} from "@/registry/bases/__base__/blocks/calendar-app-01/components/calendar-app-controls"
import { CalendarAppDot } from "@/registry/bases/__base__/blocks/calendar-app-01/components/calendar-app-sidebar"
import {
  type CalendarAppCalendar,
  type CalendarAppEvent,
  type CalendarAppEventData,
  type CalendarAppGuest,
  type CalendarAppResponse,
} from "@/registry/bases/__base__/blocks/calendar-app-01/lib/calendar-app-events"
import {
  CALENDAR_APP_REMINDERS,
  CALENDAR_APP_RESPONSE_LABELS,
  describeEventWhen,
  describeResponses,
  orderGuests,
  summarizeResponses,
  withYourResponse,
} from "@/registry/bases/__base__/blocks/calendar-app-01/lib/calendar-app-model"
import {
  describeRecurrence,
  EventCalendarRecurrenceError,
  parseRecurrence,
} from "@/registry/bases/__base__/lib/event-calendar-recurrence"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/registry/bases/__base__/ui/alert"
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
  AvatarImage,
} from "@/registry/bases/__base__/ui/avatar"
import { Button, buttonVariants } from "@/registry/bases/__base__/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/registry/bases/__base__/ui/empty"
import { type EventCalendarController } from "@/registry/bases/__base__/ui/event-calendar"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

export const CALENDAR_APP_EVENT_PANEL = "event"

const RESPONSES = [
  { value: "yes", label: "Yes" },
  { value: "maybe", label: "Maybe" },
  { value: "no", label: "No" },
] as const

/** An overlap, and the next time the event would fit. */
export type CalendarAppConflict = {
  title: string
  time: string
  move?: { label: string; asksScope: boolean; onMove: () => void }
}

export function CalendarAppConflictAlert({
  conflict,
}: {
  conflict: CalendarAppConflict
}) {
  return (
    <Alert variant="warning">
      <IconPlaceholder
        lucide="TriangleAlertIcon"
        tabler="IconAlertTriangle"
        hugeicons="Alert02Icon"
        phosphor="WarningIcon"
        remixicon="RiAlertLine"
      />
      <AlertTitle>Overlaps {conflict.title}</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-(--density-8)">
        <span className="tabular-nums">{conflict.time}</span>
        {conflict.move?.asksScope && (
          <span>Choose which occurrences to move.</span>
        )}
        {conflict.move && (
          <Button variant="outline" size="sm" onClick={conflict.move.onMove}>
            {conflict.move.label}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}

type EventPanelProps = {
  calendar: EventCalendarController<CalendarAppEventData>
  calendars: CalendarAppCalendar[]
  /** The event open in the panel, or the next one; neither shows an empty state. */
  event: CalendarAppEvent | undefined
  /** The event is being created: there is nothing to edit yet. */
  isDraft: boolean
  /** "in 12 min", when the event is the next one. */
  startsIn: string | undefined
  isOver: boolean
  conflict: CalendarAppConflict | undefined
  response: CalendarAppResponse | undefined
  onResponseChange: (response: CalendarAppResponse) => void
  reminderMinutes: number | undefined
  onReminderChange: (minutes: number) => void
}

export function CalendarAppEventPanel(props: EventPanelProps) {
  const { calendar, event, isDraft, startsIn, response, onResponseChange } =
    props
  const you = event?.data?.guests?.find((guest) => guest.isYou)
  const isInvited = you !== undefined && !you.isOrganizer
  const canEdit = event !== undefined && !isDraft && calendar.canEdit(event)

  return (
    <AppShellPanel
      id={CALENDAR_APP_EVENT_PANEL}
      label="Event details"
      defaultOpen
      defaultWidth={320}
      minWidth={300}
      maxWidth={480}
    >
      <AppShellPanelHeader className="ps-(--density-16)">
        <AppShellPanelTitle>
          {startsIn ? (
            <>
              Up next{" "}
              <span className="font-normal text-muted-foreground tabular-nums">
                {startsIn}
              </span>
            </>
          ) : isDraft ? (
            "New event"
          ) : (
            "Event details"
          )}
        </AppShellPanelTitle>
        {event && canEdit ? (
          <CalendarAppMenu
            label="Event actions"
            entries={[
              {
                id: "edit",
                label: "Edit event…",
                icon: (
                  <IconPlaceholder
                    lucide="PencilIcon"
                    tabler="IconPencil"
                    hugeicons="PencilEdit01Icon"
                    phosphor="PencilSimpleIcon"
                    remixicon="RiPencilLine"
                  />
                ),
                onSelect: () => calendar.editEvent(event),
              },
              {
                id: "duplicate",
                label: "Duplicate",
                icon: (
                  <IconPlaceholder
                    lucide="CopyIcon"
                    tabler="IconCopy"
                    hugeicons="Copy01Icon"
                    phosphor="CopyIcon"
                    remixicon="RiFileCopyLine"
                  />
                ),
                onSelect: () => calendar.duplicateEvent(event),
              },
              {
                id: "delete",
                label: "Delete event",
                icon: (
                  <IconPlaceholder
                    lucide="Trash2Icon"
                    tabler="IconTrash"
                    hugeicons="Delete02Icon"
                    phosphor="TrashIcon"
                    remixicon="RiDeleteBinLine"
                  />
                ),
                isDestructive: true,
                onSelect: () => calendar.deleteEvent(event),
              },
            ]}
          />
        ) : null}
        <AppShellPanelClose />
      </AppShellPanelHeader>
      <AppShellPanelContent>
        {event ? (
          <CalendarAppEventDetails {...props} key={event.id} event={event} />
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
              <EmptyTitle>Nothing ahead</EmptyTitle>
              <EmptyDescription>
                Select an event to see where it is and who is going.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </AppShellPanelContent>
      {event && isInvited ? (
        <div className="flex shrink-0 items-center justify-between gap-(--density-12) px-(--density-16) pt-(--density-12) pb-[calc(var(--density-16)+env(safe-area-inset-bottom))]">
          <span className="text-(length:--density-text-13) font-medium">
            Going?
          </span>
          <CalendarAppChoice
            label="Going?"
            options={RESPONSES}
            value={response}
            onValueChange={onResponseChange}
            className="max-w-56 flex-1"
          />
        </div>
      ) : null}
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
  calendars,
  event,
  isOver,
  conflict,
  response,
  reminderMinutes,
  onReminderChange,
}: EventPanelProps & { event: CalendarAppEvent }) {
  const source = calendars.find(({ id }) => id === event.calendarId)
  const guests = orderGuests(
    withYourResponse(event.data?.guests ?? [], response)
  )
  const conference = isOver ? undefined : event.data?.conference
  const repeat = describeRepeat(event.recurrence)
  const when = describeEventWhen(event, {
    locale: calendar.locale,
    timeZone: calendar.timeZone,
    hourCycle: calendar.settings.hourCycle,
  })

  return (
    <div className="flex flex-col gap-(--density-20) px-(--density-16) pt-(--density-8) pb-(--density-16)">
      <div className="flex flex-col gap-(--density-4)">
        <h3 className="text-(length:--density-text-16) text-balance weight-semibold">
          {event.title || "(No title)"}
        </h3>
        <p className="text-muted-foreground tabular-nums">{when.day}</p>
        <p className="text-muted-foreground tabular-nums">{when.time}</p>
        {repeat ? <p className="text-muted-foreground">{repeat}</p> : null}
      </div>

      {conflict && <CalendarAppConflictAlert conflict={conflict} />}

      {conference ? (
        <a
          href={conference.url}
          target="_blank"
          rel="noreferrer"
          className={cn(buttonVariants(), "w-full")}
        >
          <IconPlaceholder
            lucide="VideoIcon"
            tabler="IconVideo"
            hugeicons="Video01Icon"
            phosphor="VideoCameraIcon"
            remixicon="RiVidiconLine"
            data-icon="inline-start"
          />
          {conference.label}
        </a>
      ) : null}

      <dl className="flex flex-col gap-(--density-4)">
        {event.location ? (
          <DetailsRow
            label="Place"
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
            icon={<CalendarAppDot color={event.color ?? source.color} />}
          >
            {source.name}
          </DetailsRow>
        ) : null}
        {reminderMinutes === undefined || isOver ? null : (
          <DetailsRow
            label="Reminder"
            icon={
              <IconPlaceholder
                lucide="BellIcon"
                tabler="IconBell"
                hugeicons="Notification03Icon"
                phosphor="BellIcon"
                remixicon="RiNotification3Line"
              />
            }
          >
            <CalendarAppValueMenu
              label="Reminder"
              options={CALENDAR_APP_REMINDERS}
              value={String(reminderMinutes)}
              onValueChange={(value) => onReminderChange(Number(value))}
            />
          </DetailsRow>
        )}
      </dl>

      {guests.length > 1 ? (
        <section className="flex flex-col gap-(--density-8)">
          <div className="flex items-baseline justify-between gap-(--density-12)">
            <h4 className="font-medium">{guests.length} guests</h4>
            <p
              aria-live="polite"
              className="text-(length:--density-text-12) text-muted-foreground tabular-nums"
            >
              {describeResponses(summarizeResponses(guests))}
            </p>
          </div>
          <ul className="flex flex-col">
            {guests.map((guest) => (
              <GuestRow key={guest.id} guest={guest} />
            ))}
          </ul>
        </section>
      ) : null}

      {event.description ? (
        <section className="flex flex-col gap-(--density-4)">
          <h4 className="font-medium">Notes</h4>
          <p className="text-pretty whitespace-pre-line text-muted-foreground">
            {event.description}
          </p>
        </section>
      ) : null}
    </div>
  )
}

function GuestRow({ guest }: { guest: CalendarAppGuest }) {
  const response = guest.response ?? "awaiting"
  const note = guest.isOrganizer ? "Organizer" : undefined
  return (
    <li className="flex min-h-(--density-36) items-center gap-(--density-10)">
      <Avatar size="sm">
        {guest.avatar ? <AvatarImage src={guest.avatar} alt="" /> : null}
        <AvatarFallback className="text-foreground">
          {guest.initials}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1 truncate">
        {guest.name}
        {guest.isYou ? " (you)" : ""}
      </span>
      <span
        className={cn(
          "shrink-0 text-(length:--density-text-12) text-muted-foreground",
          guest.isYou && response === "awaiting" && "text-warning-text"
        )}
      >
        {note ?? CALENDAR_APP_RESPONSE_LABELS[response]}
      </span>
    </li>
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
      <dt className="flex h-(--density-28) w-(--density-16) shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-(--density-icon-16)">
        {icon}
        <span className="sr-only">{label}</span>
      </dt>
      <dd className="flex min-h-(--density-28) min-w-0 flex-1 items-center">
        {children}
      </dd>
    </div>
  )
}
