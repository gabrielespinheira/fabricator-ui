"use client"

import * as React from "react"
import { type CellContext, type RowData } from "@tanstack/react-table"
import { cn } from "cn"

import {
  type DataTableColumnMeta,
  type DataTableFeatures,
  type DataTableOption,
  type DataTableTone,
} from "@/registry/bases/__base__/hooks/use-data-table"
import {
  DATA_TABLE_LOCALE,
  formatDataTableValue,
  toTimestamp,
  type DataTableColumnType,
} from "@/registry/bases/__base__/lib/data-table-model"
import { Avatar, AvatarFallback } from "@/registry/bases/__base__/ui/avatar"
import { Badge } from "@/registry/bases/__base__/ui/badge"
import { Progress } from "@/registry/bases/__base__/ui/progress"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// What a Data Table cell shows for each column type. `DataTableCell` is the
// default cell of every column; `DataTableValue` draws one value, for custom
// cells that keep the type's look.

const TONE_VARIANTS = {
  neutral: "secondary",
  info: "info",
  success: "success",
  warning: "warning",
  destructive: "error",
} as const satisfies Record<DataTableTone, string>

function getOption(meta: DataTableColumnMeta | undefined, value: unknown) {
  const key = String(value)
  return (
    meta?.options?.find((option) => option.value === key) ?? {
      value: key,
      label: key,
    }
  )
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

function getHost(url: string) {
  try {
    return new URL(url).host.replace(/^www\./, "")
  } catch {
    return url
  }
}

function DataTableEmptyValue() {
  return (
    <span
      data-slot="data-table-empty-value"
      className="cn-data-table-empty-value"
    >
      –
    </span>
  )
}

function DataTableStatus({ option }: { option: DataTableOption }) {
  return (
    <Badge
      data-slot="data-table-status"
      variant={TONE_VARIANTS[option.tone ?? "neutral"]}
      className="cn-data-table-status"
    >
      <span
        aria-hidden
        data-slot="data-table-status-dot"
        className="cn-data-table-status-dot"
      />
      {option.label}
    </Badge>
  )
}

// Every tag stays in the cell: a narrow column scrolls them sideways, with
// the edges fading out where more are hidden.
/**
 * The Checkbox's look and marks on a plain button, for the checkboxes a
 * table draws in every row (picking rows, editing a checkbox column). The
 * library's Checkbox checks for exit animations or reads computed styles as
 * each one mounts or unchecks, a forced style pass per row while scrolling
 * or clearing a selection; this one changes only its data attributes, and
 * the style map's transitions do the rest.
 */
function DataTableCheckbox({
  checked,
  indeterminate = false,
  onCheckedChange,
  className,
  ...props
}: Omit<React.ComponentProps<"button">, "onClick" | "role"> & {
  checked: boolean
  /** Some but not all: a minus, and "mixed" to assistive tech. */
  indeterminate?: boolean
  onCheckedChange: (
    checked: boolean,
    event: React.MouseEvent<HTMLButtonElement>
  ) => void
}) {
  const state = {
    "data-checked": checked && !indeterminate ? "" : undefined,
    "data-unchecked": checked || indeterminate ? undefined : "",
    "data-indeterminate": indeterminate ? "" : undefined,
  }
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      data-slot="checkbox"
      {...state}
      onClick={(event) => onCheckedChange(indeterminate || !checked, event)}
      className={cn(
        "cn-checkbox peer relative shrink-0 outline-none after:absolute after:-inset-x-3 after:-inset-y-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <span
        data-slot="checkbox-indicator"
        {...state}
        className="cn-checkbox-indicator group/checkbox-indicator grid place-content-center text-current"
      >
        <svg
          data-slot="checkbox-mark"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="cn-checkbox-mark"
        >
          <path
            d="M4 12l5 5L20 6"
            pathLength={1}
            className="cn-checkbox-check"
          />
          <path d="M5 12h14" pathLength={1} className="cn-checkbox-minus" />
        </svg>
      </span>
    </button>
  )
}

/**
 * Set by a control that draws values inside it (an editable cell, a picker
 * option), so nothing inside takes focus of its own.
 */
const DataTableInsideControl = React.createContext(false)

function DataTableTags({
  meta,
  values,
}: {
  meta?: DataTableColumnMeta
  values: unknown[]
}) {
  const insideControl = React.use(DataTableInsideControl)
  if (values.length === 0) return <DataTableEmptyValue />
  // Tags scroll sideways; a read-only strip takes focus so keys scroll it,
  // and an editable cell's button scrolls instead.
  return (
    <span
      data-slot="data-table-tags"
      tabIndex={insideControl ? undefined : 0}
      className="cn-data-table-tags"
    >
      {values.map((value) => {
        const option = getOption(meta, value)
        return (
          <Badge
            key={option.value}
            variant={TONE_VARIANTS[option.tone ?? "neutral"]}
            className="cn-data-table-tag"
          >
            {option.label}
          </Badge>
        )
      })}
    </span>
  )
}

function hideImage(event: React.SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.hidden = true
}

// The picture is a plain image over the initials rather than AvatarImage:
// AvatarImage tracks loading in state (a second render once it loads) and
// checks for animations on mount, which forces a style pass, for every row
// that scrolls in. The initials show until the picture paints over them, or
// if it fails.
function DataTablePerson({ option }: { option: DataTableOption }) {
  return (
    <span data-slot="data-table-person" className="cn-data-table-person">
      <Avatar size="sm" className="cn-data-table-person-avatar">
        <AvatarFallback className="cn-data-table-person-fallback">
          {getInitials(option.label)}
        </AvatarFallback>
        {option.image && (
          <img
            src={option.image}
            alt=""
            loading="lazy"
            decoding="async"
            onError={hideImage}
            className="cn-avatar-image absolute inset-0 aspect-square size-full object-cover"
          />
        )}
      </Avatar>
      <span className="truncate">{option.label}</span>
    </span>
  )
}

type DataTableValueProps = {
  type?: DataTableColumnType
  value: unknown
  meta?: DataTableColumnMeta
  locale?: string
  now?: number
}

/** One value drawn the way its column type draws it. */
function DataTableValue({
  type,
  value,
  meta,
  locale = DATA_TABLE_LOCALE,
  now,
}: DataTableValueProps) {
  const format = { ...meta?.format, locale, now }
  const blank =
    value === null ||
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  if (blank && type !== "boolean") return <DataTableEmptyValue />

  switch (type) {
    case "number":
    case "currency":
    case "percent":
      return (
        <span data-slot="data-table-number" className="cn-data-table-number">
          {formatDataTableValue(type, value, format)}
        </span>
      )
    case "progress": {
      const percent = Math.min(100, Math.max(0, Number(value)))
      return (
        <span
          data-slot="data-table-progress"
          className="cn-data-table-progress"
        >
          <Progress
            value={percent}
            aria-label={meta?.label ?? "Progress"}
            className="cn-data-table-progress-bar"
          />
          <span className="cn-data-table-progress-value">
            {formatDataTableValue("progress", percent, format)}
          </span>
        </span>
      )
    }
    case "date": {
      const time = toTimestamp(value)
      if (time === null) return <DataTableEmptyValue />
      return (
        <time
          data-slot="data-table-date"
          dateTime={new Date(time).toISOString()}
          title={formatDataTableValue("date", time, { locale })}
          className="cn-data-table-date"
        >
          {formatDataTableValue("date", time, format)}
        </time>
      )
    }
    case "status":
      return <DataTableStatus option={getOption(meta, value)} />
    case "tags":
      return (
        <DataTableTags
          meta={meta}
          values={Array.isArray(value) ? value : [value]}
        />
      )
    case "person":
      return <DataTablePerson option={getOption(meta, value)} />
    case "link": {
      const url = String(value)
      return (
        <a
          data-slot="data-table-link"
          href={url}
          target="_blank"
          rel="noreferrer"
          className="cn-data-table-link"
        >
          <span className="truncate">{getHost(url)}</span>
          <IconPlaceholder
            lucide="ArrowUpRightIcon"
            tabler="IconArrowUpRight"
            hugeicons="ArrowUpRight01Icon"
            phosphor="ArrowUpRightIcon"
            remixicon="RiArrowRightUpLine"
          />
        </a>
      )
    }
    case "email": {
      const email = String(value)
      return (
        <a
          data-slot="data-table-link"
          href={`mailto:${email}`}
          className="cn-data-table-link"
        >
          <span className="truncate">{email}</span>
        </a>
      )
    }
    case "boolean":
      return (
        <span
          data-slot="data-table-boolean"
          data-checked={value ? "" : undefined}
          className="cn-data-table-boolean"
        >
          {value ? (
            <IconPlaceholder
              lucide="CheckIcon"
              tabler="IconCheck"
              hugeicons="Tick02Icon"
              phosphor="CheckIcon"
              remixicon="RiCheckLine"
            />
          ) : (
            <IconPlaceholder
              lucide="MinusIcon"
              tabler="IconMinus"
              hugeicons="MinusSignIcon"
              phosphor="MinusIcon"
              remixicon="RiSubtractLine"
            />
          )}
          <span className="sr-only">{value ? "Yes" : "No"}</span>
        </span>
      )
    default:
      return (
        <span
          data-slot="data-table-text"
          data-primary={meta?.primary ? "" : undefined}
          className="cn-data-table-text"
        >
          {formatDataTableValue("text", value, format)}
        </span>
      )
  }
}

/** The default cell of every Data Table column: the value, drawn by type. */
function DataTableCell<TData extends RowData>({
  column,
  getValue,
  table,
}: CellContext<DataTableFeatures, TData, unknown>) {
  const meta = column.columnDef.meta
  return (
    <DataTableValue
      type={meta?.type}
      value={getValue()}
      meta={meta}
      locale={table.options.meta?.locale}
      now={table.options.meta?.now}
    />
  )
}

/** The header's icon for a column type. */
function DataTableTypeIcon({ type }: { type?: DataTableColumnType }) {
  switch (type) {
    case "number":
      return (
        <IconPlaceholder
          lucide="HashIcon"
          tabler="IconHash"
          hugeicons="HashtagIcon"
          phosphor="HashIcon"
          remixicon="RiHashtag"
        />
      )
    case "currency":
      return (
        <IconPlaceholder
          lucide="DollarSignIcon"
          tabler="IconCurrencyDollar"
          hugeicons="DollarCircleIcon"
          phosphor="CurrencyDollarIcon"
          remixicon="RiMoneyDollarCircleLine"
        />
      )
    case "percent":
      return (
        <IconPlaceholder
          lucide="PercentIcon"
          tabler="IconPercentage"
          hugeicons="PercentIcon"
          phosphor="PercentIcon"
          remixicon="RiPercentLine"
        />
      )
    case "progress":
      return (
        <IconPlaceholder
          lucide="GaugeIcon"
          tabler="IconGauge"
          hugeicons="DashboardSpeed01Icon"
          phosphor="GaugeIcon"
          remixicon="RiDashboard3Line"
        />
      )
    case "date":
      return (
        <IconPlaceholder
          lucide="CalendarIcon"
          tabler="IconCalendar"
          hugeicons="CalendarIcon"
          phosphor="CalendarBlankIcon"
          remixicon="RiCalendarLine"
        />
      )
    case "status":
      return (
        <IconPlaceholder
          lucide="CircleDotIcon"
          tabler="IconCircleDot"
          hugeicons="RecordIcon"
          phosphor="RadioButtonIcon"
          remixicon="RiRadioButtonLine"
        />
      )
    case "tags":
      return (
        <IconPlaceholder
          lucide="TagIcon"
          tabler="IconTag"
          hugeicons="Tag01Icon"
          phosphor="TagIcon"
          remixicon="RiPriceTag3Line"
        />
      )
    case "person":
      return (
        <IconPlaceholder
          lucide="CircleUserRoundIcon"
          tabler="IconUserCircle"
          hugeicons="UserCircle02Icon"
          phosphor="UserCircleIcon"
          remixicon="RiUserLine"
        />
      )
    case "link":
      return (
        <IconPlaceholder
          lucide="LinkIcon"
          tabler="IconLink"
          hugeicons="LinkIcon"
          phosphor="LinkIcon"
          remixicon="RiLinksLine"
        />
      )
    case "email":
      return (
        <IconPlaceholder
          lucide="MailIcon"
          tabler="IconMail"
          hugeicons="MailIcon"
          phosphor="EnvelopeIcon"
          remixicon="RiMailLine"
        />
      )
    case "boolean":
      return (
        <IconPlaceholder
          lucide="SquareCheckIcon"
          tabler="IconSquareCheck"
          hugeicons="CheckmarkSquare02Icon"
          phosphor="CheckSquareIcon"
          remixicon="RiCheckboxLine"
        />
      )
    default:
      return (
        <IconPlaceholder
          lucide="TypeIcon"
          tabler="IconLetterT"
          hugeicons="TextIcon"
          phosphor="TextTIcon"
          remixicon="RiText"
        />
      )
  }
}

export {
  DataTableCell,
  DataTableCheckbox,
  DataTableInsideControl,
  DataTableTypeIcon,
  DataTableValue,
}
