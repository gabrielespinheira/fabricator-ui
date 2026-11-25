import * as React from "react"
import {
  ArrowUpRightIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  EyeIcon,
  EyeOffIcon,
  PlusIcon,
} from "@fabricator-ui/icons-react-native"
import { cn } from "cn"
import { Linking, Pressable, ScrollView, TextInput, View } from "react-native"
import Svg, { Circle } from "react-native-svg"

import { useDelayedSave } from "@/registry/fabricator/shared/hooks/use-delayed-save"
import {
  PropertyTypesProvider,
  usePropertyTypes,
} from "@/registry/fabricator/shared/hooks/use-property-types"
import {
  formatDuration,
  formatPropertyDateValue,
  formatPropertyLink,
  formatPropertyValue,
  getChoiceGroups,
  getNumberControl,
  getNumberRatio,
  getPropertyLink,
  getPropertyProgress,
  getPropertyTableType,
  getPropertyValueOptions,
  hasPropertyValue,
  isChoiceProperty,
  isMultiProperty,
  isPropertyOverdue,
  isPropertyShown,
  parsePropertyDay,
  parsePropertyInput,
  readPropertyKeys,
  suggestPropertyType,
  togglePropertyOption,
  toPropertyDate,
  toPropertyDay,
  validatePropertyValue,
  type PropertyConversionControls,
} from "@/registry/fabricator/shared/lib/property-model"
import {
  getCreatableTypes,
  getPropertySwatches,
  getPropertyType,
  getPropertyTypeName,
  groupPropertyTypes,
  readNumberSetting,
  readSwitchSetting,
  readTextSetting,
  resolveProperty,
  type PropertyDefinition,
  type PropertyOption,
  type PropertyTypeDefinition,
} from "@/registry/fabricator/shared/lib/property-types"
import { ControlSheet } from "@/registry/native/lib/control-sheet"
import { usePaletteMark } from "@/registry/native/lib/palette-color"
import {
  PropertyFilesEditor,
  PropertyThumbnails,
  type PropertyFilesAdd,
} from "@/registry/native/lib/property-files"
import {
  PropertyAvatar,
  PropertyIcon,
  PropertyIconProvider,
  PropertyMark,
  useMutedColor,
  type PropertyIconMap,
} from "@/registry/native/lib/property-marks"
import {
  moveEntry,
  PropertySettings,
  type PropertySettingsProps,
} from "@/registry/native/lib/property-settings"
import { Button } from "@/registry/native/ui/button"
import { Calendar } from "@/registry/native/ui/calendar"
import { Checkbox } from "@/registry/native/ui/checkbox"
import { ColorPicker } from "@/registry/native/ui/color-picker"
import { Drawer, DrawerContent, DrawerTitle } from "@/registry/native/ui/drawer"
import { Input } from "@/registry/native/ui/input"
import { InputGroupText } from "@/registry/native/ui/input-group"
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/registry/native/ui/number-field"
import { Rating } from "@/registry/native/ui/rating"
import { Switch } from "@/registry/native/ui/switch"
import { Text } from "@/registry/native/ui/text"
import { TimeInput } from "@/registry/native/ui/time-input"

// Properties: typed values read and edited as rows, the website's API on native
// parts. A picker that is a popover there is a sheet here.

type PropertyValueProps = Omit<
  React.ComponentProps<typeof View>,
  "children"
> & {
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
  const own = types.get(property.type)?.renderValue
  const isEmpty = !hasPropertyValue(property, value, types)
  if (isEmpty && variant === "card") return null
  return (
    <View
      data-slot="properties-value"
      data-variant={variant}
      className={cn(
        "cn-properties-value shrink flex-row items-center",
        className
      )}
      {...props}
    >
      {isEmpty ? (
        <Text className="cn-properties-empty">
          {property.type === "checkbox" ? "No" : "Empty"}
        </Text>
      ) : own ? (
        own({ property, value, variant })
      ) : (
        <PropertyContent property={property} value={value} variant={variant} />
      )}
    </View>
  )
}

function PropertyLine({
  variant,
  children,
}: {
  variant: "row" | "card"
  children: React.ReactNode
}) {
  return (
    <Text
      numberOfLines={1}
      data-variant={variant}
      className="cn-properties-value-text shrink"
    >
      {children}
    </Text>
  )
}

function PropertyContent({
  property,
  value,
  variant,
}: {
  property: PropertyDefinition
  value: unknown
  variant: "row" | "card"
}) {
  const muted = useMutedColor()
  const types = usePropertyTypes()
  switch (property.type) {
    case "person":
    case "created-by":
    case "edited-by": {
      const people = getPropertyValueOptions(property, value)
      return (
        <>
          {people.slice(0, 3).map((person) => (
            <PropertyAvatar key={person.value} person={person} />
          ))}
          {variant === "row" && people.length === 1 && (
            <PropertyLine variant={variant}>{people[0].label}</PropertyLine>
          )}
        </>
      )
    }
    case "status":
    case "select":
    case "multi-select":
    case "relation":
      return (
        <PropertyChoice
          options={getPropertyValueOptions(property, value)}
          isPlain={property.type === "status"}
          variant={variant}
        />
      )
    case "date":
    case "created-time":
    case "edited-time": {
      const today = new Date()
      return (
        <>
          <CalendarIcon size={variant === "card" ? 14 : 16} color={muted} />
          <Text
            numberOfLines={1}
            data-variant={variant}
            data-overdue={
              property.type === "date" &&
              readSwitchSetting(property, "isDue") &&
              isPropertyOverdue(value, today)
            }
            className="cn-properties-date-text"
          >
            {formatPropertyDateValue(property, value, today)}
          </Text>
        </>
      )
    }
    case "progress": {
      const progress = getPropertyProgress(value)
      return progress ? (
        <>
          <PropertyMeter
            display={readTextSetting(property, "display")}
            ratio={progress.ratio}
            isComplete={progress.ratio === 1}
          />
          <PropertyLine variant={variant}>
            {progress.done}/{progress.total}
          </PropertyLine>
        </>
      ) : null
    }
    case "checkbox":
      return (
        <>
          <CheckIcon size={16} color={muted} />
          {variant === "card" && (
            <PropertyLine variant={variant}>{property.name}</PropertyLine>
          )}
        </>
      )
    case "rating":
      return typeof value === "number" ? (
        <Rating
          readOnly
          size="sm"
          max={readNumberSetting(property, "steps")}
          value={value}
          accessibilityLabel={property.name}
        />
      ) : null
    case "files":
      return (
        <PropertyThumbnails
          property={property}
          value={value}
          variant={variant}
        />
      )
    case "color":
      return typeof value === "string" ? (
        <>
          <View
            className="cn-properties-swatch"
            style={{ backgroundColor: value }}
          />
          <PropertyLine variant={variant}>{value.toUpperCase()}</PropertyLine>
        </>
      ) : null
    case "number":
      return typeof value === "number" ? (
        <>
          {property.icon && variant === "card" && (
            <PropertyIcon property={property} size={14} />
          )}
          <PropertyMeter
            display={readTextSetting(property, "display")}
            ratio={getNumberRatio(property, value)}
          />
          <PropertyLine variant={variant}>
            {formatPropertyValue(property, value)}
          </PropertyLine>
        </>
      ) : null
    case "url":
    case "email":
    case "phone":
    case "location":
      return (
        <PropertyLink property={property} value={value} variant={variant} />
      )
    default:
      return (
        <>
          {property.icon && variant === "card" && (
            <PropertyIcon property={property} size={14} />
          )}
          <PropertyLine variant={variant}>
            {formatPropertyValue(property, value, types)}
          </PropertyLine>
        </>
      )
  }
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
  const isGlyph = options.every(({ icon }) => icon?.startsWith("priority-"))
  if (isPlain || isGlyph)
    return options.map((option) => (
      <View
        key={option.value}
        accessibilityLabel={option.label}
        className="cn-properties-option shrink flex-row items-center"
      >
        <PropertyMark mark={option} />
        {!(variant === "card" && isGlyph) && (
          <PropertyLine variant={variant}>{option.label}</PropertyLine>
        )}
      </View>
    ))
  const shown = variant === "card" ? options.slice(0, 3) : options
  return (
    <View className="cn-properties-chips shrink flex-row flex-wrap items-center">
      {shown.map((option) => (
        <View
          key={option.value}
          data-slot="properties-chip"
          className="cn-properties-chip flex-row items-center"
        >
          <PropertyMark mark={option} />
          <Text numberOfLines={1} className="cn-properties-chip-text shrink">
            {option.label}
          </Text>
        </View>
      ))}
      {options.length > shown.length && (
        <Text className="cn-properties-chip-text">
          +{options.length - shown.length}
        </Text>
      )}
    </View>
  )
}

/** How full a value is, drawn. The text beside it says the number. */
function PropertyMeter({
  display,
  ratio,
  isComplete = false,
}: {
  display: string
  ratio: number
  isComplete?: boolean
}) {
  const muted = useMutedColor()
  const toMark = usePaletteMark()
  const color = isComplete ? toMark("success") : muted
  if (display === "bar")
    return (
      <View className="cn-properties-bar overflow-hidden">
        <View
          className="cn-properties-bar-fill h-full"
          style={{ width: `${ratio * 100}%` }}
        />
      </View>
    )
  if (display !== "ring") return null
  const length = 2 * Math.PI * 5.5
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <Circle
        cx="7"
        cy="7"
        r="5.5"
        stroke={color}
        strokeWidth="2"
        opacity="0.25"
      />
      {ratio > 0 && (
        <Circle
          cx="7"
          cy="7"
          r="5.5"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={`${ratio * length} ${length}`}
          rotation={-90}
          origin="7, 7"
        />
      )}
    </Svg>
  )
}

function PropertyLink({
  property,
  value,
  variant,
}: Required<Pick<PropertyValueProps, "property" | "value" | "variant">>) {
  const [hasFailed, setHasFailed] = React.useState(false)
  const link = getPropertyLink(property.type, value)
  const text =
    typeof value === "string" ? formatPropertyLink(property, value) : ""
  if (!link || variant === "card")
    return <PropertyLine variant={variant}>{text}</PropertyLine>
  return (
    <View className="shrink">
      <Text
        numberOfLines={1}
        accessibilityRole="link"
        className="cn-properties-link"
        onPress={() => {
          void Linking.openURL(link).then(
            () => setHasFailed(false),
            () => setHasFailed(true)
          )
        }}
      >
        {text}
      </Text>
      {hasFailed && (
        <Text accessibilityRole="alert" className="cn-properties-error">
          Could not open this link.
        </Text>
      )}
    </View>
  )
}

type PropertyEditorProps = {
  property: PropertyDefinition
  value: unknown
  /** A promise that rejects is shown under the row, with its message. */
  onValueChange: (value: unknown) => void | Promise<void>
  /** Makes an option from typed text and returns its value. */
  onOptionCreate?: (property: PropertyDefinition, label: string) => string
  /** Picks and stores files, and returns how to reach them. */
  onFilesAdd?: PropertyFilesAdd
  /** The app's own rules: why a value can't be kept. */
  validate?: (property: PropertyDefinition, value: unknown) => string | null
}

type PropertyFieldProps = Omit<PropertyEditorProps, "onValueChange"> & {
  isInvalid: boolean
  /** Whether the value was kept. */
  onSave: (value: unknown) => boolean
}

function PropertyEditor({ property: source, ...props }: PropertyEditorProps) {
  const types = usePropertyTypes()
  const property = resolveProperty(source)
  const { value, onValueChange, validate } = props
  const [error, setError] = React.useState<string | null>(null)
  const definition = types.get(property.type)
  if (property.isReadOnly || definition?.isReadOnly)
    return (
      <View className="cn-properties-inset justify-center">
        <PropertyValue property={property} value={value} />
      </View>
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
  return (
    <View data-slot="properties-editor">
      {definition?.renderEditor ? (
        definition.renderEditor({ property, value, onValueChange: save })
      ) : (
        <PropertyField
          {...props}
          property={property}
          isInvalid={error !== null}
          onSave={save}
        />
      )}
      {error && (
        <Text accessibilityRole="alert" className="cn-properties-error">
          {error}
        </Text>
      )}
    </View>
  )
}

function PropertyField(props: PropertyFieldProps) {
  const { property, value, onSave } = props
  const types = usePropertyTypes()
  if (isChoiceProperty(property, types))
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
        readTextSetting(property, "display") === "switch" ? Switch : Checkbox
      return (
        <View className="cn-properties-inset justify-center">
          <Control
            accessibilityLabel={property.name}
            checked={value === true}
            onCheckedChange={onSave}
          />
        </View>
      )
    }
    case "rating":
      return (
        <View className="cn-properties-inset justify-center">
          <Rating
            size="sm"
            max={readNumberSetting(property, "steps")}
            accessibilityLabel={property.name}
            value={typeof value === "number" ? value : 0}
            onValueCommitted={(score) => onSave(score || null)}
          />
        </View>
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

function PropertyTrigger({
  property,
  value,
  onPress,
}: Pick<PropertyFieldProps, "property" | "value"> & { onPress: () => void }) {
  const types = usePropertyTypes()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${property.name}: ${formatPropertyValue(property, value, types) || "Empty"}`}
      className="cn-properties-trigger justify-center"
      onPress={onPress}
    >
      <PropertyValue property={property} value={value} />
    </Pressable>
  )
}

function PropertyChoiceEditor({
  property,
  value,
  onSave,
  onOptionCreate,
}: PropertyFieldProps) {
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const selected = readPropertyKeys(value)
  const isMultiple = isMultiProperty(property)
  const label = name.trim()
  const canCreate =
    !!onOptionCreate && readSwitchSetting(property, "canCreateOptions")
  const choices = (property.options ?? []).filter(
    (option) =>
      (!option.isArchived || selected.includes(option.value)) &&
      option.label.toLowerCase().includes(label.toLowerCase())
  )
  if (!canCreate)
    return (
      <>
        <PropertyTrigger
          property={property}
          value={value}
          onPress={() => setOpen(true)}
        />
        <ControlSheet
          open={open}
          onOpenChange={setOpen}
          label={property.name}
          groups={getChoiceGroups(choices).map((group) => ({
            id: group.id,
            label: group.name ?? undefined,
            items: group.options.map((option) => ({
              type: "check" as const,
              id: option.value,
              label: option.label,
              icon:
                property.type === "person" ? (
                  <PropertyAvatar person={option} />
                ) : (
                  <PropertyMark mark={option} />
                ),
              isChecked: selected.includes(option.value),
              staysOpen: isMultiple,
              onSelect: () => {
                onSave(togglePropertyOption(property, value, option.value))
              },
            })),
          }))}
        />
      </>
    )
  const select = (key: string) => {
    const isKept = onSave(togglePropertyOption(property, value, key))
    setName("")
    if (isKept && !isMultiple) setOpen(false)
  }
  const isNew =
    label !== "" &&
    !choices.some(
      (option) => option.label.toLowerCase() === label.toLowerCase()
    )
  return (
    <>
      <PropertyTrigger
        property={property}
        value={value}
        onPress={() => setOpen(true)}
      />
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <View className="cn-properties-sheet">
            <DrawerTitle>{property.name}</DrawerTitle>
            <Input
              accessibilityLabel={`Search ${property.name}`}
              placeholder="Search or create"
              value={name}
              onChangeText={setName}
            />
            <ScrollView
              keyboardShouldPersistTaps="handled"
              className="max-h-80"
            >
              {choices.map((option) => (
                <Button
                  key={option.value}
                  variant="ghost"
                  accessibilityState={{
                    selected: selected.includes(option.value),
                  }}
                  className="cn-properties-sheet-row justify-start"
                  onPress={() => select(option.value)}
                >
                  <PropertyMark mark={option} />
                  <Text className="cn-properties-sheet-text flex-1">
                    {option.label}
                  </Text>
                  {selected.includes(option.value) && <CheckIcon />}
                </Button>
              ))}
              {isNew && (
                <Button
                  variant="ghost"
                  className="cn-properties-sheet-row justify-start"
                  onPress={() => select(onOptionCreate(property, label))}
                >
                  <PlusIcon />
                  Create “{label}”
                </Button>
              )}
            </ScrollView>
          </View>
        </DrawerContent>
      </Drawer>
    </>
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
    <>
      <PropertyTrigger
        property={property}
        value={value}
        onPress={() => setOpen(true)}
      />
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <View className="cn-properties-sheet">
            <DrawerTitle>{property.name}</DrawerTitle>
            {hasRange ? (
              <Calendar
                mode="range"
                className="cn-properties-calendar self-center"
                selected={{ from: start ?? undefined, to: end ?? undefined }}
                defaultMonth={start ?? undefined}
                onSelect={(next) => {
                  if (next?.from) write(next.from, next.to ?? null)
                }}
              />
            ) : (
              <Calendar
                mode="single"
                required
                className="cn-properties-calendar self-center"
                selected={start ?? undefined}
                defaultMonth={start ?? undefined}
                onSelect={(next: Date | undefined) => {
                  if (next && write(next, null) && !hasTime) setOpen(false)
                }}
              />
            )}
            {hasTime && start && (
              <View className="cn-properties-form-row flex-row">
                <TimeInput
                  accessibilityLabel={`${property.name} time`}
                  className="flex-1"
                  hourCycle={hourCycle}
                  value={startTime ?? ""}
                  onValueChange={(time) =>
                    write(start, end, { start: time, end: endTime })
                  }
                />
                {hasRange && end && (
                  <TimeInput
                    accessibilityLabel={`${property.name} end time`}
                    className="flex-1"
                    hourCycle={hourCycle}
                    value={endTime ?? ""}
                    onValueChange={(time) =>
                      write(start, end, { start: startTime, end: time })
                    }
                  />
                )}
              </View>
            )}
            <View className="cn-properties-presets flex-row flex-wrap">
              {!hasRange &&
                presets.map(({ label, days }) => (
                  <Button
                    key={label}
                    size="sm"
                    variant="ghost"
                    onPress={() => {
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
                  size="sm"
                  variant="ghost"
                  onPress={() => {
                    if (onSave(null)) setOpen(false)
                  }}
                >
                  Clear
                </Button>
              )}
            </View>
          </View>
        </DrawerContent>
      </Drawer>
    </>
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
    <>
      <PropertyTrigger
        property={property}
        value={draft}
        onPress={() => setOpen(true)}
      />
      <Drawer
        open={open}
        onOpenChange={(next) => {
          if (!next) flush()
          setOpen(next)
        }}
      >
        <DrawerContent>
          <View className="cn-properties-sheet">
            <DrawerTitle>{property.name}</DrawerTitle>
            <ColorPicker
              hideEyedropper
              value={draft ?? undefined}
              swatches={getPropertySwatches(property)}
              onValueChange={(_, { hex }) => {
                setDraft(hex)
                schedule(hex)
              }}
            />
            {draft !== null && !property.required && (
              <Button
                variant="ghost"
                onPress={() => {
                  cancel()
                  if (!onSave(null)) return
                  setDraft(null)
                  setOpen(false)
                }}
              >
                Clear
              </Button>
            )}
          </View>
        </DrawerContent>
      </Drawer>
    </>
  )
}

/** A number with its steppers. A run of steps is one save. */
function PropertyNumberEditor({
  property,
  value,
  isInvalid,
  onSave,
}: PropertyFieldProps) {
  const saved = typeof value === "number" ? value : null
  const [draft, setDraft] = React.useState(saved)
  const [seen, setSeen] = React.useState(saved)
  if (seen !== saved) {
    setSeen(saved)
    setDraft(saved)
  }
  const { cancel, schedule } = useDelayedSave(onSave)
  function commit(next: number | null) {
    setDraft(next)
    if (next === saved && !isInvalid) cancel()
    else schedule(next)
  }
  const { suffix, ...control } = getNumberControl(property)
  return (
    <View className="flex-row items-center">
      <NumberField
        {...control}
        locale="en-US"
        value={draft}
        onValueChange={commit}
        className="cn-properties-number-field flex-1"
      >
        <NumberFieldGroup className="cn-properties-number-group">
          <NumberFieldInput
            accessibilityLabel={property.name}
            aria-invalid={isInvalid || undefined}
            placeholder="Empty"
            className="cn-properties-number-input"
          />
          {suffix !== "" && (
            <InputGroupText className="cn-properties-number-suffix">
              <Text>{suffix}</Text>
            </InputGroupText>
          )}
          <NumberFieldDecrement
            align="inline-end"
            accessibilityLabel={`Decrease ${property.name}`}
          />
          <NumberFieldIncrement
            accessibilityLabel={`Increase ${property.name}`}
          />
        </NumberFieldGroup>
      </NumberField>
      {draft !== null && (
        <PropertyMeter
          display={readTextSetting(property, "display")}
          ratio={getNumberRatio(property, draft)}
        />
      )}
    </View>
  )
}

function getInputText(value: unknown) {
  if (Array.isArray(value))
    return value.filter((entry) => typeof entry === "string").join(", ")
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : ""
}

const keyboards: Record<
  string,
  React.ComponentProps<typeof TextInput>["keyboardType"]
> = { email: "email-address", phone: "phone-pad", url: "url" }

function PropertyTextEditor({
  property,
  value,
  isInvalid,
  onSave,
}: PropertyFieldProps) {
  const types = usePropertyTypes()
  const muted = useMutedColor()
  const raw = getInputText(value)
  const rest =
    property.type === "duration" && typeof value === "number"
      ? formatDuration(value)
      : raw
  const [text, setText] = React.useState(rest)
  const link = getPropertyLink(property.type, value)
  function commit(entered: string) {
    if (entered === raw || entered === rest) {
      setText(rest)
      if (isInvalid) onSave(value ?? null)
      return
    }
    onSave(parsePropertyInput(property, entered, types))
  }
  return (
    <View className="flex-row items-center">
      {/* No frame at rest: a value is text until it is edited. */}
      <TextInput
        accessibilityLabel={property.name}
        aria-invalid={isInvalid || undefined}
        value={text}
        placeholder="Empty"
        placeholderTextColorClassName="accent-muted-foreground"
        selectionColorClassName="accent-primary"
        multiline={
          property.type === "text" && readSwitchSetting(property, "isMultiline")
        }
        keyboardType={
          getPropertyTableType(property.type, types) === "number" &&
          property.type !== "duration"
            ? "decimal-pad"
            : (keyboards[property.type] ?? "default")
        }
        autoCapitalize={property.type === "text" ? "sentences" : "none"}
        className="cn-properties-input flex-1"
        onChangeText={setText}
        onEndEditing={(event) => commit(event.nativeEvent.text)}
      />
      {link && <PropertyOpen property={property} link={link} color={muted} />}
    </View>
  )
}

function PropertyOpen({
  property,
  link,
  color,
}: {
  property: PropertyDefinition
  link: string
  color?: string
}) {
  const [hasFailed, setHasFailed] = React.useState(false)
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      accessibilityLabel={`Open ${property.name.toLowerCase()}`}
      accessibilityHint={hasFailed ? "Could not open this link." : undefined}
      onPress={() => {
        void Linking.openURL(link).then(
          () => setHasFailed(false),
          () => setHasFailed(true)
        )
      }}
    >
      <ArrowUpRightIcon color={color} />
    </Button>
  )
}

type PropertyListProps = React.ComponentProps<typeof View> & {
  properties: readonly PropertyDefinition[]
  getValue: (propertyId: string) => unknown
  onValueChange?: (propertyId: string, value: unknown) => void | Promise<void>
  /** Opens a property's settings from its label, where it can also be moved. */
  onPropertiesChange?: (properties: PropertyDefinition[]) => void
  /** Lets a property's type change, with a preview of what its values become. */
  conversion?: PropertyConversionControls
  /**
   * Whether cards show a property, for "Show on card" in its settings. One it
   * answers undefined for has no such setting.
   */
  isOnCard?: (property: PropertyDefinition) => boolean | undefined
  onCardChange?: (propertyId: string, isOnCard: boolean) => void
  /** Makes an option from typed text and returns its value. */
  onOptionCreate?: PropertyEditorProps["onOptionCreate"]
  /** Picks and stores files, and returns how to reach them. */
  onFilesAdd?: PropertyEditorProps["onFilesAdd"]
  /** The app's own rules: why a value can't be kept. */
  validate?: PropertyEditorProps["validate"]
  renderValue?: (
    property: PropertyDefinition,
    value: unknown
  ) => React.ReactNode
  renderEditor?: (
    property: PropertyDefinition,
    value: unknown,
    onChange: (value: unknown) => void
  ) => React.ReactNode
}

function PropertyList({
  properties,
  getValue,
  onValueChange,
  onPropertiesChange,
  conversion,
  isOnCard,
  onCardChange,
  onOptionCreate,
  onFilesAdd,
  validate,
  renderValue,
  renderEditor,
  className,
  children,
  ...props
}: PropertyListProps) {
  const types = usePropertyTypes()
  const [isAllShown, setIsAllShown] = React.useState(false)
  const [settingsId, setSettingsId] = React.useState<string | null>(null)
  // Hiding a property from its own settings keeps the row until they close.
  const shown = properties.filter(
    (property) =>
      property.id === settingsId ||
      isPropertyShown(property, getValue(property.id), types)
  )
  const rows = isAllShown ? properties : shown
  const hiddenCount = properties.length - shown.length

  function drawValue(property: PropertyDefinition) {
    const value = getValue(property.id)
    const edit =
      onValueChange && !property.isReadOnly
        ? (next: unknown) => onValueChange(property.id, next)
        : undefined
    if (!edit)
      return (
        renderValue?.(property, value) ?? (
          <View className="cn-properties-inset justify-center">
            <PropertyValue property={property} value={value} />
          </View>
        )
      )
    return (
      renderEditor?.(property, value, (next) => void edit(next)) ?? (
        <PropertyEditor
          property={property}
          value={value}
          onValueChange={edit}
          onOptionCreate={onOptionCreate}
          onFilesAdd={onFilesAdd}
          validate={validate}
        />
      )
    )
  }

  return (
    <View
      data-slot="properties"
      className={cn("cn-properties w-full flex-col", className)}
      {...props}
    >
      {rows.map((property) => (
        <PropertyRow
          key={property.id}
          property={property}
          onSettings={
            onPropertiesChange ? () => setSettingsId(property.id) : undefined
          }
        >
          {drawValue(property)}
        </PropertyRow>
      ))}
      {children}
      {!isAllShown && hiddenCount > 0 && (
        <Button
          variant="ghost"
          className="cn-properties-add self-start"
          onPress={() => setIsAllShown(true)}
        >
          <ChevronDownIcon />
          {`${hiddenCount} more ${hiddenCount === 1 ? "property" : "properties"}`}
        </Button>
      )}
      {onPropertiesChange && (
        <PropertySettingsSheet
          properties={properties}
          rows={rows}
          openId={settingsId}
          onClose={() => setSettingsId(null)}
          conversion={conversion}
          isOnCard={isOnCard}
          onCardChange={onCardChange}
          onPropertiesChange={onPropertiesChange}
        />
      )}
    </View>
  )
}

function PropertyRow({
  property,
  onSettings,
  className,
  children,
  ...props
}: React.ComponentProps<typeof View> & {
  property: PropertyDefinition
  onSettings?: () => void
}) {
  const label = (
    <>
      <PropertyIcon property={property} size={16} />
      <Text numberOfLines={1} className="cn-properties-label-text shrink">
        {property.name}
      </Text>
    </>
  )
  return (
    <View
      data-slot="properties-row"
      className={cn("cn-properties-row flex-row items-start", className)}
      {...props}
    >
      {onSettings ? (
        <Pressable
          data-slot="properties-label"
          accessibilityRole="button"
          accessibilityLabel={`${property.name} settings`}
          accessibilityHint={property.description}
          className="cn-properties-label cn-properties-label-cell cn-properties-label-trigger w-32 flex-row items-center"
          onPress={onSettings}
        >
          {label}
        </Pressable>
      ) : (
        <View
          data-slot="properties-label"
          className="cn-properties-label w-32 flex-row items-center"
        >
          {label}
        </View>
      )}
      <View className="min-w-0 flex-1">{children}</View>
    </View>
  )
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** A property like another, beside it, with an ID of its own. */
function duplicateProperty(
  properties: readonly PropertyDefinition[],
  property: PropertyDefinition
) {
  const index = properties.findIndex(({ id }) => id === property.id)
  return [
    ...properties.slice(0, index + 1),
    {
      ...property,
      id: createId(),
      name: `${property.name} copy`,
      isSystem: undefined,
    },
    ...properties.slice(index + 1),
  ]
}

/** The settings of one property of a list, in a sheet. */
function PropertySettingsSheet({
  properties,
  rows,
  openId,
  onClose,
  conversion,
  isOnCard,
  onCardChange,
  onPropertiesChange,
}: {
  properties: readonly PropertyDefinition[]
  /** The rows on screen, which is what "up" and "down" mean. */
  rows: readonly PropertyDefinition[]
  openId: string | null
  onClose: () => void
  conversion?: PropertyConversionControls
  isOnCard?: PropertyListProps["isOnCard"]
  onCardChange?: PropertyListProps["onCardChange"]
  onPropertiesChange: (properties: PropertyDefinition[]) => void
}) {
  const property = properties.find(({ id }) => id === openId)
  const place = rows.findIndex(({ id }) => id === openId)
  const indexOf = (id: string | undefined) =>
    properties.findIndex((entry) => entry.id === id)
  const moveTo = (target: PropertyDefinition | undefined) =>
    target && property
      ? () =>
          onPropertiesChange(
            moveEntry(properties, indexOf(property.id), indexOf(target.id))
          )
      : undefined
  return (
    <Drawer
      open={!!property}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DrawerContent>
        {property && (
          <PropertySettings
            key={property.id}
            property={property}
            conversion={conversion}
            isOnCard={isOnCard?.(property)}
            onCardChange={
              onCardChange && ((isShown) => onCardChange(property.id, isShown))
            }
            onChange={(next) =>
              onPropertiesChange(
                properties.map((entry) => (entry.id === next.id ? next : entry))
              )
            }
            onMoveUp={moveTo(rows[place - 1])}
            onMoveDown={moveTo(rows[place + 1])}
            onDuplicate={() => {
              onClose()
              const next = duplicateProperty(properties, property)
              onPropertiesChange(next)
              const copy = next.find((entry) => !properties.includes(entry))
              if (copy && isOnCard?.(property)) onCardChange?.(copy.id, true)
            }}
            onRemove={() => {
              onClose()
              onPropertiesChange(
                properties.filter(({ id }) => id !== property.id)
              )
            }}
          />
        )}
      </DrawerContent>
    </Drawer>
  )
}

/** Names a new property and picks its type, suggesting one from the name. */
function PropertyAdd({
  onPropertyAdd,
  label = "Add a property",
}: {
  onPropertyAdd: (property: PropertyDefinition) => void
  label?: string
}) {
  const types = usePropertyTypes()
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const text = name.trim()
  const suggested = text
    ? getPropertyType(suggestPropertyType(text), types)
    : null
  function add({ type, create }: PropertyTypeDefinition) {
    onPropertyAdd({
      ...create,
      id: createId(),
      name: text || getPropertyTypeName(type, types),
      type,
    })
    setName("")
    setOpen(false)
  }
  const groups = [
    ...(suggested
      ? [{ id: "suggested", name: "Suggested", items: [suggested] }]
      : []),
    ...groupPropertyTypes(
      getCreatableTypes(types).filter(({ type }) => type !== suggested?.type)
    ),
  ]
  return (
    <>
      <Button
        variant="ghost"
        className="cn-properties-add self-start"
        onPress={() => setOpen(true)}
      >
        <PlusIcon />
        {label}
      </Button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <View className="cn-properties-sheet">
            <DrawerTitle>{label}</DrawerTitle>
            <Input
              accessibilityLabel="Property name"
              placeholder="Property name"
              value={name}
              onChangeText={setName}
            />
            <ScrollView
              keyboardShouldPersistTaps="handled"
              className="cn-properties-types max-h-96"
            >
              {groups.map((group) => (
                <View key={group.id}>
                  <Text className="cn-properties-type-heading">
                    {group.name}
                  </Text>
                  {group.items.map((definition) => (
                    <Button
                      key={definition.type}
                      variant="ghost"
                      className="cn-properties-sheet-row justify-start"
                      onPress={() => add(definition)}
                    >
                      <PropertyIcon property={{ type: definition.type }} />
                      <Text
                        numberOfLines={1}
                        className="cn-properties-sheet-text flex-1"
                      >
                        {definition.name}
                      </Text>
                      {definition.description && (
                        <Text className="cn-properties-kind">
                          {definition.description}
                        </Text>
                      )}
                    </Button>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </DrawerContent>
      </Drawer>
    </>
  )
}

type PropertyManagerProps = {
  properties: readonly PropertyDefinition[]
  onPropertiesChange: (properties: PropertyDefinition[]) => void
  conversion?: PropertyConversionControls
  /** Which properties show, with an eye per row to change it. */
  visibleIds?: readonly string[]
  onVisibleIdsChange?: (ids: string[]) => void
  className?: string
}

function PropertyManager({
  properties,
  onPropertiesChange,
  conversion,
  visibleIds,
  onVisibleIdsChange,
  className,
}: PropertyManagerProps) {
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const types = usePropertyTypes()
  return (
    <View
      data-slot="properties-manager"
      accessibilityLabel="Manage properties"
      className={cn("cn-properties-manager w-full flex-col", className)}
    >
      {properties.map((property) => {
        const isVisible = visibleIds?.includes(property.id)
        return (
          <View
            key={property.id}
            data-slot="properties-manager-row"
            className="cn-properties-manager-row flex-row items-center"
          >
            <Button
              variant="ghost"
              accessibilityLabel={`Edit ${property.name}`}
              className="cn-properties-manager-trigger flex-1 justify-start"
              onPress={() => setEditingId(property.id)}
            >
              <PropertyIcon property={property} />
              <Text
                numberOfLines={1}
                className="cn-properties-sheet-text flex-1"
              >
                {property.name}
              </Text>
              <Text className="cn-properties-kind">
                {getPropertyTypeName(property.type, types)}
              </Text>
            </Button>
            {visibleIds && onVisibleIdsChange && (
              <Button
                variant="ghost"
                size="icon"
                accessibilityLabel={`Show ${property.name}`}
                accessibilityState={{ selected: isVisible }}
                onPress={() =>
                  onVisibleIdsChange(
                    isVisible
                      ? visibleIds.filter((id) => id !== property.id)
                      : [...visibleIds, property.id]
                  )
                }
              >
                {isVisible ? <EyeIcon /> : <EyeOffIcon />}
              </Button>
            )}
          </View>
        )
      })}
      <PropertyAdd
        onPropertyAdd={(property) =>
          onPropertiesChange([...properties, property])
        }
      />
      <PropertySettingsSheet
        properties={properties}
        rows={properties}
        openId={editingId}
        onClose={() => setEditingId(null)}
        conversion={conversion}
        isOnCard={
          visibleIds && ((property) => visibleIds.includes(property.id))
        }
        onCardChange={
          visibleIds &&
          onVisibleIdsChange &&
          ((id, isShown) =>
            onVisibleIdsChange(
              isShown
                ? [...visibleIds, id]
                : visibleIds.filter((entry) => entry !== id)
            ))
        }
        onPropertiesChange={onPropertiesChange}
      />
    </View>
  )
}

export {
  PropertyAdd,
  PropertyAvatar,
  PropertyEditor,
  PropertyIcon,
  PropertyIconProvider,
  PropertyList,
  PropertyManager,
  PropertyMark,
  PropertyRow,
  PropertySettings,
  PropertyTypesProvider,
  PropertyValue,
  usePropertyTypes,
  type PropertyEditorProps,
  type PropertyFilesAdd,
  type PropertyIconMap,
  type PropertyListProps,
  type PropertyManagerProps,
  type PropertySettingsProps,
  type PropertyValueProps,
}
export {
  getPropertyCover,
  getPropertyDefaults,
  validatePropertyValue,
  type PropertyConversion,
  type PropertyConversionControls,
  type PropertyFile,
  type PropertyFilter,
  type PropertyFilterGroup,
  type PropertySort,
} from "@/registry/fabricator/shared/lib/property-model"
export {
  definePropertyType,
  type PropertyDefinition,
  type PropertyEditorRenderProps,
  type PropertyOption,
  type PropertyRenderProps,
  type PropertySettingField,
  type PropertyTypeDefinition,
} from "@/registry/fabricator/shared/lib/property-types"
