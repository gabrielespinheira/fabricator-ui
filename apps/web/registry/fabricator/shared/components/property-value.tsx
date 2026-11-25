"use client"

// How a value reads, on a card and in a record. Plain markup with no popup or
// primitive per value, because a board draws hundreds of them.
import * as React from "react"
import { cn } from "cn"

import {
  PropertyAvatar,
  PropertyIcon,
  PropertyMark,
} from "@/registry/bases/__base__/components/property-icons"
import { usePropertyTypes } from "@/registry/bases/__base__/hooks/use-property-types"
import {
  formatPropertyDateValue,
  formatPropertyLink,
  formatPropertyNumber,
  formatPropertyValue,
  getNumberRatio,
  getPropertyLink,
  getPropertyProgress,
  getPropertyValueOptions,
  hasPropertyValue,
  isPropertyOverdue,
  readPropertyFiles,
  toPropertyDate,
} from "@/registry/bases/__base__/lib/property-model"
import {
  readNumberSetting,
  readSwitchSetting,
  readTextSetting,
  resolveProperty,
  type PropertyDefinition,
  type PropertyOption,
  type PropertyTypeMap,
} from "@/registry/bases/__base__/lib/property-types"
import { Rating } from "@/registry/bases/__base__/ui/rating"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

import { PropertyThumbnails } from "./property-files"

const neverChanges = () => () => {}
let today: Date | null = null

function readToday() {
  const now = new Date()
  if (!today || today.toDateString() !== now.toDateString()) today = now
  return today
}

/** Today, once the browser has taken over: the server can't know the reader's. */
function useToday() {
  return React.useSyncExternalStore(neverChanges, readToday, () => null)
}

type PropertyValueProps = Omit<React.ComponentProps<"span">, "property"> & {
  property: PropertyDefinition
  value: unknown
  /** `card` is compact and draws nothing for an empty value. */
  variant?: "row" | "card"
}

function PropertyValue({
  property: source,
  value,
  variant = "row",
  className,
  ...props
}: PropertyValueProps) {
  const types = usePropertyTypes()
  const property = resolveProperty(source)
  const content = drawValue(property, value, variant, types)
  if (content === null && variant === "card") return null
  return (
    <span
      data-slot="properties-value"
      data-variant={variant}
      data-type={property.type}
      data-empty={content === null || undefined}
      title={
        variant === "card"
          ? `${property.name}: ${formatPropertyValue(property, value, types)}`
          : undefined
      }
      className={cn(
        "cn-properties-value inline-flex min-w-0 items-center",
        className
      )}
      {...props}
    >
      {content ?? "Empty"}
    </span>
  )
}

function drawValue(
  property: PropertyDefinition,
  value: unknown,
  variant: "row" | "card",
  types: PropertyTypeMap
): React.ReactNode {
  const own = types.get(property.type)?.renderValue
  if (own)
    return hasPropertyValue(property, value, types)
      ? own({ property, value, variant })
      : null
  switch (property.type) {
    case "person":
    case "created-by":
    case "edited-by": {
      const people = getPropertyValueOptions(property, value)
      return people.length ? (
        <PropertyPeople people={people} variant={variant} />
      ) : null
    }
    case "status":
    case "select":
    case "multi-select":
    case "relation": {
      const options = getPropertyValueOptions(property, value)
      return options.length ? (
        <PropertyChoice
          options={options}
          isPlain={property.type === "status" || isGlyphOnly(options)}
          variant={variant}
        />
      ) : null
    }
    case "date":
    case "created-time":
    case "edited-time":
      return toPropertyDate(value) ? (
        <PropertyDate property={property} value={value} variant={variant} />
      ) : null
    case "progress":
      return getPropertyProgress(value) ? (
        <PropertyProgress property={property} value={value} />
      ) : null
    case "checkbox":
      return value === true ? (
        <>
          <IconPlaceholder
            lucide="CheckIcon"
            tabler="IconCheck"
            hugeicons="Tick02Icon"
            phosphor="CheckIcon"
            remixicon="RiCheckLine"
          />
          {variant === "card" && property.name}
        </>
      ) : variant === "card" ? null : (
        "No"
      )
    case "rating":
      return typeof value === "number" ? (
        <Rating
          readOnly
          size="sm"
          max={readNumberSetting(property, "steps")}
          value={value}
          aria-label={property.name}
        />
      ) : null
    case "number":
      return typeof value === "number" ? (
        <PropertyNumber property={property} value={value} variant={variant} />
      ) : null
    case "duration":
      return typeof value === "number" ? (
        <span className="cn-properties-number inline-flex items-center tabular-nums">
          {variant === "card" && <PropertyIcon property={property} />}
          {formatPropertyValue(property, value)}
        </span>
      ) : null
    case "color":
      return typeof value === "string" && value ? (
        <>
          <span
            aria-hidden="true"
            className="cn-properties-swatch shrink-0"
            style={{ backgroundColor: value }}
          />
          <span className="truncate uppercase">{value}</span>
        </>
      ) : null
    case "files":
      return readPropertyFiles(value).length ? (
        <PropertyThumbnails
          property={property}
          value={value}
          variant={variant}
        />
      ) : null
    case "url":
    case "email":
    case "phone":
    case "location":
      return drawLink(property, value, variant)
    default: {
      const text = formatPropertyValue(property, value, types)
      return text ? <span className="truncate">{text}</span> : null
    }
  }
}

function drawLink(
  property: PropertyDefinition,
  value: unknown,
  variant: "row" | "card"
) {
  if (typeof value !== "string" || !value) return null
  const text = formatPropertyLink(property, value)
  const link = getPropertyLink(property.type, value)
  if (!link || variant === "card")
    return <span className="truncate">{text}</span>
  return (
    <a
      href={link}
      target={/^https?:/.test(link) ? "_blank" : undefined}
      rel="noreferrer"
      className="cn-properties-link truncate"
    >
      {text}
    </a>
  )
}

function PropertyNumber({
  property,
  value,
  variant,
}: {
  property: PropertyDefinition
  value: number
  variant: "row" | "card"
}) {
  const unit = readTextSetting(property, "unit")
  return (
    <span className="cn-properties-number inline-flex items-center tabular-nums">
      {property.icon && variant === "card" && (
        <PropertyIcon property={property} />
      )}
      <PropertyMeter
        display={readTextSetting(property, "display")}
        ratio={getNumberRatio(property, value)}
      />
      {formatPropertyNumber(property, value)}
      {unit && ` ${unit}`}
    </span>
  )
}

/** How full a value is, drawn. The text beside it says the number. */
function PropertyMeter({ display, ratio }: { display: string; ratio: number }) {
  if (display === "bar")
    return (
      <span aria-hidden="true" className="cn-properties-bar overflow-hidden">
        <span
          className="cn-properties-bar-fill block h-full"
          style={{ width: `${ratio * 100}%` }}
        />
      </span>
    )
  if (display === "ring") return <PropertyRing ratio={ratio} />
  return null
}

function PropertyRing({ ratio }: { ratio: number }) {
  return (
    <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle
        cx="7"
        cy="7"
        r="5.5"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.25"
      />
      <circle
        cx="7"
        cy="7"
        r="5.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        pathLength="1"
        strokeDasharray={`${ratio} 1`}
        opacity={ratio === 0 ? 0 : 1}
        transform="rotate(-90 7 7)"
      />
    </svg>
  )
}

// A priority's bars say it alone on a card; its name is in the title.
function isGlyphOnly(options: readonly PropertyOption[]) {
  return options.every(({ icon }) => icon?.startsWith("priority-"))
}

function PropertyChoice({
  options,
  isPlain,
  variant,
}: {
  options: readonly PropertyOption[]
  isPlain: boolean
  variant: "row" | "card"
}) {
  if (isPlain)
    return options.map((option) => (
      <span
        key={option.value}
        className="cn-properties-option inline-flex min-w-0 items-center"
      >
        <PropertyMark mark={option} />
        {variant === "card" && isGlyphOnly(options) ? (
          <span className="sr-only">{option.label}</span>
        ) : (
          <span className="truncate">{option.label}</span>
        )}
      </span>
    ))
  const shown = variant === "card" ? options.slice(0, 3) : options
  return (
    <span className="cn-properties-chips flex min-w-0 flex-wrap items-center">
      {shown.map((option) => (
        <span
          key={option.value}
          data-slot="properties-chip"
          className="cn-properties-chip inline-flex max-w-full min-w-0 items-center"
        >
          <PropertyMark mark={option} />
          <span className="truncate">{option.label}</span>
        </span>
      ))}
      {options.length > shown.length && (
        <span
          data-slot="properties-chip"
          className="cn-properties-chip tabular-nums"
        >
          +{options.length - shown.length}
        </span>
      )}
    </span>
  )
}

function PropertyPeople({
  people,
  variant,
}: {
  people: readonly PropertyOption[]
  variant: "row" | "card"
}) {
  if (variant === "row" && people.length === 1)
    return (
      <>
        <PropertyAvatar person={people[0]} />
        <span className="truncate">{people[0].label}</span>
      </>
    )
  const shown = people.slice(0, 3)
  return (
    <span className="cn-properties-people inline-flex items-center">
      {shown.map((person) => (
        <PropertyAvatar key={person.value} person={person} />
      ))}
      <span className="sr-only">
        {people.map(({ label }) => label).join(", ")}
      </span>
      {people.length > shown.length && (
        <span className="tabular-nums">+{people.length - shown.length}</span>
      )}
    </span>
  )
}

function PropertyDate({
  property,
  value,
  variant,
}: {
  property: PropertyDefinition
  value: unknown
  variant: "row" | "card"
}) {
  const now = useToday()
  const isOwn = property.type === "date"
  const isOverdue =
    isOwn &&
    readSwitchSetting(property, "isDue") &&
    isPropertyOverdue(value, now)
  return (
    <span
      data-overdue={isOverdue || undefined}
      className="cn-properties-date inline-flex items-center tabular-nums"
    >
      {(isOwn || variant === "card") && (
        <IconPlaceholder
          lucide="CalendarIcon"
          tabler="IconCalendar"
          hugeicons="CalendarIcon"
          phosphor="CalendarBlankIcon"
          remixicon="RiCalendarLine"
        />
      )}
      {formatPropertyDateValue(property, value, now)}
      {isOverdue && <span className="sr-only"> overdue</span>}
    </span>
  )
}

function PropertyProgress({
  property,
  value,
}: {
  property: PropertyDefinition
  value: unknown
}) {
  const progress = getPropertyProgress(value)
  if (!progress) return null
  return (
    <span
      data-complete={progress.ratio === 1 || undefined}
      className="cn-properties-progress inline-flex items-center tabular-nums"
    >
      <PropertyMeter
        display={readTextSetting(property, "display")}
        ratio={progress.ratio}
      />
      {progress.done}/{progress.total}
    </span>
  )
}

export { PropertyMeter, PropertyValue, useToday, type PropertyValueProps }
