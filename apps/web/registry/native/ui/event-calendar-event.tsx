// An event as the calendar draws it: a chip in the event's colour. Plain
// views, memoized on what they show, because a week can hold hundreds. React
// Native has no CSS variables per element, so the colour arrives as three
// resolved colours (fill, text, foreground) for the scheme, and the chip's
// state picks how it uses them, as the website's style map does.
import * as React from "react"
import { cn } from "cn"
import { Pressable, View, type TextStyle, type ViewStyle } from "react-native"
import { useCSSVariable, useUniwind } from "uniwind"

import {
  EVENT_CALENDAR_ROLES,
  type CalendarEvent,
  type EventCalendarColor,
} from "@/registry/fabricator/shared/lib/event-calendar-model"
import {
  getChipPalette,
  withAlpha,
  type ChipPalette,
  type ColorScheme,
} from "@/registry/native/lib/event-calendar-native-model"
import { Text } from "@/registry/native/ui/text"

type EventCalendarEventVariant = "block" | "row" | "dot"

type EventCalendarEventProps<TData = unknown> = Omit<
  React.ComponentProps<typeof Pressable>,
  "children"
> & {
  event: CalendarEvent<TData>
  color: EventCalendarColor
  /** "10:00 – 10:30 AM"; empty for all-day bars. */
  timeText?: string
  /** A time-grid block, an all-day or multi-day bar, or a month's dot row. */
  variant?: EventCalendarEventVariant
  /** A time-grid block too short for two lines. */
  isShort?: boolean
  isPast?: boolean
  isPending?: boolean
  isSelected?: boolean
  isDragging?: boolean
  /** The draft a new event starts as, before it's saved. */
  isDraft?: boolean
  className?: string
  children?: React.ReactNode
}

// Each role's three colours, read once for every chip in a calendar.
const ROLE_VARIABLES = EVENT_CALENDAR_ROLES.flatMap((role) => [
  `--${role}`,
  `--${role}-text`,
  `--${role}-foreground`,
])

type PaletteResolver = (color: EventCalendarColor) => ChipPalette

const ChipPaletteContext = React.createContext<PaletteResolver | null>(null)

function createPaletteResolver(
  scheme: ColorScheme,
  roleColors: string[]
): PaletteResolver {
  const roles = new Map<string, string>()
  ROLE_VARIABLES.forEach((name, index) => {
    const value = roleColors[index]
    if (value) roles.set(name, value)
  })
  const cache = new Map<string, ChipPalette>()
  return (color) => {
    const id =
      typeof color === "string" ? color : `${color.hue}/${color.chroma}`
    const cached = cache.get(id)
    if (cached) return cached
    const palette = getChipPalette(color, scheme, (name) => roles.get(name))
    cache.set(id, palette)
    return palette
  }
}

/** Resolves colours for the scheme, caching each colour's palette. */
function useChipPaletteResolver(): PaletteResolver {
  const { theme } = useUniwind()
  const scheme: ColorScheme = theme === "dark" ? "dark" : "light"
  // A new array each render; the joined values only change with the theme.
  const roleColors = useCSSVariable(ROLE_VARIABLES)
    .map((value) => (typeof value === "string" ? value : ""))
    .join("|")
  return React.useMemo(
    () => createPaletteResolver(scheme, roleColors.split("|")),
    [roleColors, scheme]
  )
}

/** Gives every chip inside one palette resolver, so each reads no theme. */
function ChipPaletteProvider({ children }: { children?: React.ReactNode }) {
  const resolve = useChipPaletteResolver()
  return <ChipPaletteContext value={resolve}>{children}</ChipPaletteContext>
}

type ChipState = Pick<
  EventCalendarEventProps,
  "variant" | "isPast" | "isSelected" | "isDragging" | "isDraft"
> & { status?: CalendarEvent["status"] }

/**
 * The chip's colours for its state: the soft step of the fill with the text
 * colour, a lighter wash when past, the solid fill with the foreground when
 * picked up, selected or a draft, and an outline for a tentative event.
 */
function getChipColorStyle(
  palette: ChipPalette,
  {
    variant = "block",
    isPast = false,
    isSelected = false,
    isDragging = false,
    isDraft = false,
    status,
  }: ChipState
): { container: ViewStyle; text: TextStyle; dot: ViewStyle } {
  const isSolid = isSelected || isDragging || isDraft
  const dot = { backgroundColor: palette.fill }
  if (isSolid) {
    return {
      container: { backgroundColor: palette.fill, borderColor: palette.fill },
      text: { color: palette.foreground },
      dot: { backgroundColor: palette.foreground },
    }
  }
  if (variant === "dot") return { container: {}, text: {}, dot }
  const container: ViewStyle =
    status === "tentative"
      ? { borderColor: withAlpha(palette.fill, 0.5) }
      : {
          backgroundColor: withAlpha(palette.fill, isPast ? 0.08 : 0.14),
          borderColor: palette.fill,
        }
  return { container, text: { color: palette.text }, dot }
}

function EventCalendarEventInner<TData>({
  event,
  color,
  timeText,
  variant = "block",
  isShort = false,
  isPast = false,
  isPending = false,
  isSelected = false,
  isDragging = false,
  isDraft = false,
  className,
  style,
  children,
  ...props
}: EventCalendarEventProps<TData>) {
  const fromContext = React.use(ChipPaletteContext)
  const palette = fromContext?.(color) ?? null
  const title = event.title || "(No title)"
  const colors = palette
    ? getChipColorStyle(palette, {
        variant,
        isPast,
        isSelected,
        isDragging,
        isDraft,
        status: event.status,
      })
    : null
  return (
    <Pressable
      data-slot="event-calendar-event"
      data-variant={variant}
      data-short={isShort}
      data-past={isPast}
      data-pending={isPending}
      data-selected={isSelected}
      data-dragging={isDragging}
      data-draft={isDraft}
      data-status={event.status}
      accessibilityState={{ busy: isPending, selected: isSelected }}
      className={cn(
        "cn-event-calendar-event min-w-0 overflow-hidden",
        className
      )}
      style={(state) => [
        colors?.container,
        typeof style === "function" ? style(state) : style,
      ]}
      {...props}
    >
      {children ?? (
        <>
          {variant === "dot" ? (
            <View
              data-slot="event-calendar-event-dot"
              aria-hidden
              className="cn-event-calendar-event-dot shrink-0"
              style={colors?.dot}
            />
          ) : null}
          {variant === "dot" && timeText ? (
            <Text
              data-slot="event-calendar-event-time"
              data-variant={variant}
              data-past={isPast}
              numberOfLines={1}
              className="cn-event-calendar-event-time shrink-0"
              style={colors?.text}
            >
              {timeText}
            </Text>
          ) : null}
          <Text
            data-slot="event-calendar-event-title"
            data-variant={variant}
            data-past={isPast}
            numberOfLines={variant === "block" && !isShort ? 2 : 1}
            className="cn-event-calendar-event-title min-w-0 shrink"
            style={colors?.text}
          >
            {variant === "block" && isShort && timeText
              ? `${title}, ${timeText}`
              : title}
          </Text>
          {variant === "block" && !isShort && timeText ? (
            <Text
              data-slot="event-calendar-event-time"
              data-variant={variant}
              numberOfLines={1}
              className="cn-event-calendar-event-time"
              style={colors?.text}
            >
              {timeText}
            </Text>
          ) : null}
          {variant === "block" && !isShort && event.location ? (
            <Text
              data-slot="event-calendar-event-location"
              numberOfLines={1}
              className="cn-event-calendar-event-location"
              style={colors?.text}
            >
              {event.location}
            </Text>
          ) : null}
        </>
      )}
    </Pressable>
  )
}

const EventCalendarEvent = React.memo(
  EventCalendarEventInner
) as typeof EventCalendarEventInner

export {
  ChipPaletteContext,
  ChipPaletteProvider,
  EventCalendarEvent,
  getChipColorStyle,
  useChipPaletteResolver,
  type EventCalendarEventProps,
  type EventCalendarEventVariant,
  type PaletteResolver,
}
