"use client"

// One value, edited where it is read. A value from a set opens a searchable
// list, a date a calendar; text is typed in place and saved on Enter or blur.
// Whatever the type, a value is checked before it is saved, and a save that
// fails says so under the row.
import * as React from "react"

import {
  ControlCalendar,
  ControlCheckbox,
  ControlNumber,
  ControlOptions,
  ControlPopover,
  ControlRangeCalendar,
  ControlSwitch,
} from "@/registry/bases/__base__/components/property-controls"
import {
  PropertyFilesEditor,
  type PropertyFilesAdd,
} from "@/registry/bases/__base__/components/property-files"
import {
  PropertyAvatar,
  PropertyMark,
} from "@/registry/bases/__base__/components/property-icons"
import {
  PropertyMeter,
  PropertyValue,
} from "@/registry/bases/__base__/components/property-value"
import { useDelayedSave } from "@/registry/bases/__base__/hooks/use-delayed-save"
import { usePropertyTypes } from "@/registry/bases/__base__/hooks/use-property-types"
import {
  formatDuration,
  getChoiceGroups,
  getNumberControl,
  getNumberRatio,
  getPropertyLink,
  getPropertyTableType,
  isChoiceProperty,
  isMultiProperty,
  parsePropertyDay,
  parsePropertyInput,
  readPropertyKeys,
  togglePropertyOption,
  toPropertyDate,
  toPropertyDay,
  validatePropertyValue,
} from "@/registry/bases/__base__/lib/property-model"
import {
  getPropertySwatches,
  readNumberSetting,
  readSwitchSetting,
  readTextSetting,
  resolveProperty,
  type PropertyDefinition,
} from "@/registry/bases/__base__/lib/property-types"
import { Button } from "@/registry/bases/__base__/ui/button"
import { ColorPicker } from "@/registry/bases/__base__/ui/color-picker"
import { Input } from "@/registry/bases/__base__/ui/input"
import { Rating } from "@/registry/bases/__base__/ui/rating"
import { Textarea } from "@/registry/bases/__base__/ui/textarea"
import { TimeInput } from "@/registry/bases/__base__/ui/time-input"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

type PropertyEditorProps = {
  property: PropertyDefinition
  value: unknown
  /** A promise that rejects is shown under the row, with its message. */
  onValueChange: (value: unknown) => void | Promise<void>
  /** Makes an option from typed text and returns its value. */
  onOptionCreate?: (property: PropertyDefinition, label: string) => string
  /** Stores files and returns how to reach them. */
  onFilesAdd?: PropertyFilesAdd
  /** The app's own rules: why a value can't be kept. */
  validate?: (property: PropertyDefinition, value: unknown) => string | null
}

type PropertyFieldProps = Omit<PropertyEditorProps, "onValueChange"> & {
  errorId: string | undefined
  /** Whether the value was kept. */
  onSave: (value: unknown) => boolean
}

function PropertyEditor({ property: source, ...props }: PropertyEditorProps) {
  const types = usePropertyTypes()
  const id = React.useId()
  const property = resolveProperty(source)
  const { value, onValueChange, validate } = props
  const [error, setError] = React.useState<string | null>(null)
  const definition = types.get(property.type)
  if (property.isReadOnly || definition?.isReadOnly)
    return (
      <span className="cn-properties-inset flex">
        <PropertyValue property={property} value={value} />
      </span>
    )

  function save(next: unknown) {
    const problem =
      next === undefined
        ? `Enter a valid ${property.name.toLowerCase()}.`
        : (validatePropertyValue(property, next, types) ??
          validate?.(property, next) ??
          null)
    setError(problem)
    if (problem) return false
    const saving = onValueChange(next)
    if (saving)
      saving.catch((failure: unknown) =>
        setError(
          failure instanceof Error ? failure.message : "Couldn’t save this."
        )
      )
    return true
  }
  const field: PropertyFieldProps = {
    ...props,
    property,
    errorId: error ? id : undefined,
    onSave: save,
  }
  return (
    <div data-slot="properties-editor" className="flex min-w-0 flex-col">
      {definition?.renderEditor ? (
        definition.renderEditor({ property, value, onValueChange: save })
      ) : (
        <PropertyField {...field} />
      )}
      {error && (
        <p id={id} role="alert" className="cn-properties-error">
          {error}
        </p>
      )}
    </div>
  )
}

function PropertyField(props: PropertyFieldProps) {
  const { property, value, onSave } = props
  if (isChoiceProperty(property, usePropertyTypes()))
    return <PropertyChoiceEditor {...props} />
  switch (property.type) {
    case "date":
      return <PropertyDateEditor {...props} />
    case "number":
      return <PropertyNumberEditor {...props} />
    case "color":
      return <PropertyColorEditor {...props} />
    case "files":
      return (
        <PropertyFilesEditor
          property={property}
          value={value}
          onValueChange={onSave}
          onFilesAdd={props.onFilesAdd}
        />
      )
    case "checkbox": {
      const Control =
        readTextSetting(property, "display") === "switch"
          ? ControlSwitch
          : ControlCheckbox
      return (
        <span className="cn-properties-inset flex">
          <Control
            label={property.name}
            checked={value === true}
            onCheckedChange={onSave}
          />
        </span>
      )
    }
    case "rating":
      return (
        <span className="cn-properties-inset flex">
          <Rating
            size="sm"
            max={readNumberSetting(property, "steps")}
            aria-label={property.name}
            value={typeof value === "number" ? value : 0}
            onValueCommitted={(score) => onSave(score || null)}
          />
        </span>
      )
    default:
      return (
        <PropertyTextEditor
          key={`${getInputText(value)}/${JSON.stringify(property.settings ?? {})}`}
          {...props}
        />
      )
  }
}

/** The value as its own button, with its property's name for screen readers. */
function PropertyTriggerText({
  property,
  value,
}: Pick<PropertyFieldProps, "property" | "value">) {
  return (
    <>
      <span className="sr-only">{property.name}: </span>
      <PropertyValue property={property} value={value} />
    </>
  )
}

function PropertyChoiceEditor({
  property,
  value,
  onSave,
  onOptionCreate,
}: PropertyFieldProps) {
  const [open, setOpen] = React.useState(false)
  const selected = readPropertyKeys(value)
  const isMultiple = isMultiProperty(property)
  const canCreate =
    !!onOptionCreate && readSwitchSetting(property, "canCreateOptions")
  function select(key: string) {
    if (onSave(togglePropertyOption(property, value, key)) && !isMultiple)
      setOpen(false)
  }
  return (
    <ControlPopover
      label={property.name}
      triggerLabel={null}
      open={open}
      onOpenChange={setOpen}
      isRaised
      className="cn-properties-trigger"
      layout="picker"
      trigger={<PropertyTriggerText property={property} value={value} />}
    >
      <ControlOptions
        label={property.name}
        placeholder={`Search ${property.name.toLowerCase()}…`}
        selected={selected}
        options={getChoices(property, selected)}
        onSelect={select}
        onCreate={
          canCreate
            ? (label) => select(onOptionCreate(property, label))
            : undefined
        }
      />
    </ControlPopover>
  )
}

/** The options a picker offers: archived ones only where a value still uses them. */
function getChoices(property: PropertyDefinition, selected: readonly string[]) {
  const offered = (property.options ?? []).filter(
    ({ value, isArchived }) => !isArchived || selected.includes(value)
  )
  return getChoiceGroups(offered).flatMap(({ name, options }) =>
    options.map((option) => ({
      value: option.value,
      label: option.label,
      group: name ?? undefined,
      icon:
        property.type === "person" ? (
          <PropertyAvatar person={option} />
        ) : (
          <PropertyMark mark={option} />
        ),
    }))
  )
}

/** "14:30" of a saved time; empty for a day. */
function readTime(value: string | null | undefined) {
  return value?.match(/T(\d{2}:\d{2})/)?.[1]
}

function withTime(day: Date, time: string | undefined) {
  return time ? `${toPropertyDay(day)}T${time}` : toPropertyDay(day)
}

const presets = [
  { label: "Today", days: 0 },
  { label: "Tomorrow", days: 1 },
  { label: "Next week", days: 7 },
]

function PropertyDateEditor({ property, value, onSave }: PropertyFieldProps) {
  const [open, setOpen] = React.useState(false)
  const date = toPropertyDate(value)
  const start = date && parsePropertyDay(date.start)
  const end = date?.end ? parsePropertyDay(date.end) : null
  const hasTime = readSwitchSetting(property, "hasTime")
  const hasRange = readSwitchSetting(property, "hasRange")
  const cycle = readNumberSetting(property, "hourCycle")
  const hourCycle = cycle === 12 || cycle === 24 ? cycle : undefined
  const startTime = readTime(date?.start)
  const endTime = readTime(date?.end)

  function write(
    from: Date,
    to: Date | null,
    times = { start: startTime, end: endTime }
  ) {
    const first = withTime(from, hasTime ? times.start : undefined)
    return onSave(
      hasRange && to
        ? { start: first, end: withTime(to, hasTime ? times.end : undefined) }
        : first
    )
  }

  return (
    <ControlPopover
      label={property.name}
      triggerLabel={null}
      open={open}
      onOpenChange={setOpen}
      isRaised
      className="cn-properties-trigger"
      layout="calendar"
      trigger={<PropertyTriggerText property={property} value={value} />}
    >
      {hasRange ? (
        <ControlRangeCalendar
          label={property.name}
          start={start}
          end={end}
          onSelect={(from, to) => write(from, to)}
        />
      ) : (
        <ControlCalendar
          label={property.name}
          value={start}
          onSelect={(next) => {
            if (write(next, null) && !hasTime) setOpen(false)
          }}
        />
      )}
      {hasTime && start && (
        <div className="cn-properties-times flex items-center">
          <TimeInput
            aria-label={`${property.name} time`}
            hourCycle={hourCycle}
            value={startTime ?? ""}
            onValueChange={(time) =>
              write(start, end, { start: time, end: endTime })
            }
          />
          {hasRange && end && (
            <TimeInput
              aria-label={`${property.name} end time`}
              hourCycle={hourCycle}
              value={endTime ?? ""}
              onValueChange={(time) =>
                write(start, end, { start: startTime, end: time })
              }
            />
          )}
        </div>
      )}
      <div className="cn-properties-presets flex flex-wrap items-center">
        {!hasRange &&
          presets.map(({ label, days }) => (
            <Button
              key={label}
              variant="ghost"
              size="sm"
              className="cn-properties-preset"
              onClick={() => {
                const day = new Date()
                day.setDate(day.getDate() + days)
                if (write(day, null)) setOpen(false)
              }}
            >
              {label}
            </Button>
          ))}
        {date && !property.required && (
          <Button
            variant="ghost"
            size="sm"
            className="cn-properties-clear"
            onClick={() => {
              if (onSave(null)) setOpen(false)
            }}
          >
            Clear
          </Button>
        )}
      </div>
    </ControlPopover>
  )
}

/** A color, picked anywhere or from the ones the property offers. */
function PropertyColorEditor({ property, value, onSave }: PropertyFieldProps) {
  const [open, setOpen] = React.useState(false)
  const saved = typeof value === "string" && value ? value : null
  const [draft, setDraft] = React.useState(saved)
  const [seen, setSeen] = React.useState(saved)
  if (seen !== saved) {
    setSeen(saved)
    setDraft(saved)
  }
  const { cancel, flush, schedule } = useDelayedSave(onSave)
  return (
    <ControlPopover
      label={property.name}
      triggerLabel={null}
      open={open}
      onOpenChange={(next) => {
        if (!next) flush()
        setOpen(next)
      }}
      isRaised
      className="cn-properties-trigger"
      layout="color"
      trigger={<PropertyTriggerText property={property} value={draft} />}
    >
      <div className="cn-properties-color flex flex-col">
        <ColorPicker
          value={draft ?? undefined}
          swatches={getPropertySwatches(property)}
          onValueChange={(_, { hex }) => {
            setDraft(hex)
            schedule(hex)
          }}
        />
        {draft && !property.required && (
          <Button
            variant="ghost"
            size="sm"
            className="cn-properties-color-clear"
            onClick={() => {
              cancel()
              if (!onSave(null)) return
              setDraft(null)
              setOpen(false)
            }}
          >
            Clear
          </Button>
        )}
      </div>
    </ControlPopover>
  )
}

/** A number with its steppers. A run of steps is one save. */
function PropertyNumberEditor({
  property,
  value,
  errorId,
  onSave,
}: PropertyFieldProps) {
  const saved = typeof value === "number" ? value : null
  const [draft, setDraft] = React.useState(saved)
  const [seen, setSeen] = React.useState(saved)
  // Starts the field over, which is the one way to drop what is typed in it.
  const [revision, setRevision] = React.useState(0)
  if (seen !== saved) {
    setSeen(saved)
    setDraft(saved)
  }
  const { cancel, schedule } = useDelayedSave(onSave)

  return (
    <div className="flex min-w-0 items-center">
      <ControlNumber
        key={revision}
        {...getNumberControl(property)}
        label={property.name}
        value={draft}
        isInvalid={!!errorId}
        describedBy={errorId}
        onValueChange={setDraft}
        onValueCommit={(next) => {
          if (next === saved && !errorId) cancel()
          else schedule(next)
        }}
        onEscape={() => {
          cancel()
          setDraft(saved)
          setRevision(revision + 1)
          if (errorId) onSave(saved)
        }}
      />
      {draft !== null && (
        <span className="cn-properties-meter">
          <PropertyMeter
            display={readTextSetting(property, "display")}
            ratio={getNumberRatio(property, draft)}
          />
        </span>
      )}
    </div>
  )
}

function getInputText(value: unknown) {
  if (Array.isArray(value))
    return value.filter((entry) => typeof entry === "string").join(", ")
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : ""
}

function PropertyTextEditor({
  property,
  value,
  errorId,
  onSave,
}: PropertyFieldProps) {
  const types = usePropertyTypes()
  const raw = getInputText(value)
  const text =
    property.type === "duration" && typeof value === "number"
      ? formatDuration(value)
      : raw
  const link = getPropertyLink(property.type, value)
  const isEscaping = React.useRef(false)

  function commit(input: HTMLInputElement | HTMLTextAreaElement) {
    const isCancelled = isEscaping.current
    isEscaping.current = false
    if (isCancelled || input.value === text || input.value === raw) {
      input.value = text
      if (errorId) onSave(value ?? null)
      return
    }
    onSave(parsePropertyInput(property, input.value, types))
  }
  const field = {
    "aria-label": property.name,
    "aria-invalid": errorId ? true : undefined,
    "aria-describedby": errorId,
    "data-escape": "undo",
    defaultValue: text,
    placeholder: "Empty",
    onKeyDown: (
      event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      if (event.nativeEvent.isComposing) return
      if (event.key === "Escape") {
        event.stopPropagation()
        isEscaping.current = true
        event.currentTarget.blur()
      }
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault()
        event.currentTarget.blur()
      }
    },
  }
  return (
    <div className="flex min-w-0 items-center">
      {property.type === "text" &&
      readSwitchSetting(property, "isMultiline") ? (
        <Textarea
          {...field}
          rows={1}
          className="cn-properties-textarea field-sizing-content resize-none"
          onBlur={(event) => commit(event.target)}
        />
      ) : (
        <Input
          {...field}
          inputMode={
            getPropertyTableType(property.type, types) === "number" &&
            property.type !== "duration"
              ? "decimal"
              : property.type === "email"
                ? "email"
                : property.type === "phone"
                  ? "tel"
                  : property.type === "url"
                    ? "url"
                    : undefined
          }
          className="cn-properties-input"
          onBlur={(event) => commit(event.target)}
        />
      )}
      {link && (
        <a
          href={link}
          target={/^https?:/.test(link) ? "_blank" : undefined}
          rel="noreferrer"
          aria-label={`Open ${property.name.toLowerCase()}`}
          className="cn-properties-open shrink-0"
        >
          <IconPlaceholder
            lucide="ArrowUpRightIcon"
            tabler="IconArrowUpRight"
            hugeicons="ArrowUpRightIcon"
            phosphor="ArrowUpRightIcon"
            remixicon="RiArrowRightUpLine"
          />
        </a>
      )}
    </div>
  )
}

export { getChoices, PropertyEditor, type PropertyEditorProps }
