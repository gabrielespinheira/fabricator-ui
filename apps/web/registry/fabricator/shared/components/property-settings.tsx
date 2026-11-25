"use client"

// What a property is and how it behaves, changed where it is read. One small
// panel: its name and what it is for, then a row per setting that opens in its
// place. The rows come from the type's own list of settings, so an app's type
// is configured like a built-in one.
import * as React from "react"

import {
  ControlMenu,
  ControlSwitch,
  type ControlMenuGroup,
} from "@/registry/bases/__base__/components/property-controls"
import {
  PropertyIcon,
  PropertyMark,
  usePropertyIconNames,
} from "@/registry/bases/__base__/components/property-icons"
import { usePropertyTypes } from "@/registry/bases/__base__/hooks/use-property-types"
import { PALETTE_COLORS } from "@/registry/bases/__base__/lib/palette-model"
import {
  convertiblePropertyTypes,
  isChoiceProperty,
  isMultiProperty,
  previewPropertyConversion,
  readPropertyKeys,
  type PropertyConversion,
  type PropertyConversionControls,
} from "@/registry/bases/__base__/lib/property-model"
import {
  formatSetting,
  getPropertySettings,
  getPropertyTypeName,
  readSetting,
  writeSetting,
  type PropertyDefinition,
  type PropertyOption,
  type PropertyOptionGroup,
  type PropertySettingField,
  type PropertySettingValue,
  type PropertyVisibility,
} from "@/registry/bases/__base__/lib/property-types"
import {
  SortableProvider,
  useSortableItem,
} from "@/registry/bases/__base__/lib/sortable"
import { Button } from "@/registry/bases/__base__/ui/button"
import { Input } from "@/registry/bases/__base__/ui/input"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

const paletteNames = Object.keys(PALETTE_COLORS)

function moveEntry<Entry>(list: readonly Entry[], from: number, to: number) {
  const next = [...list]
  const [entry] = next.splice(from, 1)
  next.splice(to, 0, entry)
  return next
}

type PropertySettingsProps = {
  property: PropertyDefinition
  onChange: (property: PropertyDefinition) => void
  /** Lets the type change, with a preview of what each value becomes. */
  conversion?: PropertyConversionControls
  /** Whether cards show its value. Left out, there is no such setting. */
  isOnCard?: boolean
  onCardChange?: (isOnCard: boolean) => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  onDuplicate?: () => void
  onRemove?: () => void
}

type Panel =
  | {
      id:
        | "root"
        | "icon"
        | "type"
        | "options"
        | "default"
        | "visibility"
        | "remove"
    }
  | { id: "setting"; field: PropertySettingField }

const visibilities: readonly { value: PropertyVisibility; label: string }[] = [
  { value: "show", label: "Always show" },
  { value: "hide-empty", label: "Hide when empty" },
  { value: "hide", label: "Always hide" },
]

function PropertySettings({
  property,
  onChange,
  conversion,
  isOnCard,
  onCardChange,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
}: PropertySettingsProps) {
  const types = usePropertyTypes()
  const [panel, setPanel] = React.useState<Panel>({ id: "root" })
  const container = React.useRef<HTMLDivElement>(null)
  const isFirst = React.useRef(true)
  // A panel takes the place of the last one, and focus with it.
  React.useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false
      return
    }
    container.current
      ?.querySelector<HTMLElement>("[data-panel-focus], button, input")
      ?.focus()
  }, [panel])
  const back = () => setPanel({ id: "root" })
  const canEdit = !property.isSystem && !property.isReadOnly
  const isChoice = isChoiceProperty(property, types)
  const hasOwnOptions = !!types.get(property.type)?.hasOptions
  const isComputed = !!types.get(property.type)?.isReadOnly
  const visibility = property.visibility ?? "show"

  return (
    <div
      ref={container}
      data-slot="properties-settings"
      data-panel={panel.id}
      className="cn-properties-settings flex flex-col"
    >
      {panel.id === "root" && (
        <>
          <PropertyIdentity
            property={property}
            onChange={onChange}
            onIcon={() => setPanel({ id: "icon" })}
          />
          <PropertySettingList>
            <PropertySettingRow
              label="Type"
              value={getPropertyTypeName(property.type, types)}
              onSelect={
                conversion && canEdit
                  ? () => setPanel({ id: "type" })
                  : undefined
              }
            />
            {hasOwnOptions && canEdit && (
              <PropertySettingRow
                label="Options"
                value={String(property.options?.length ?? 0)}
                onSelect={() => setPanel({ id: "options" })}
              />
            )}
            {getPropertySettings(property, types).map((field) => (
              <PropertySettingControl
                key={field.id}
                field={field}
                value={readSetting(property, field.id, types)}
                onChange={(next) =>
                  onChange(writeSetting(property, field, next))
                }
                onOpen={() => setPanel({ id: "setting", field })}
              />
            ))}
          </PropertySettingList>
          <PropertySettingList>
            <PropertySettingRow
              label="Visibility"
              value={
                visibilities.find(({ value }) => value === visibility)?.label ??
                ""
              }
              onSelect={() => setPanel({ id: "visibility" })}
            />
            {isOnCard !== undefined && onCardChange && (
              <PropertySettingSwitch
                label="Show on card"
                checked={isOnCard}
                onCheckedChange={onCardChange}
              />
            )}
            {isChoice && canEdit && (
              <PropertySettingRow
                label="Default"
                value={
                  readPropertyKeys(property.defaultValue)
                    .map(
                      (key) =>
                        property.options?.find(({ value }) => value === key)
                          ?.label ?? key
                    )
                    .join(", ") || "None"
                }
                onSelect={() => setPanel({ id: "default" })}
              />
            )}
            {!isComputed && canEdit && property.type !== "checkbox" && (
              <PropertySettingSwitch
                label="Required"
                checked={property.required ?? false}
                onCheckedChange={(required) =>
                  onChange({ ...property, required: required || undefined })
                }
              />
            )}
          </PropertySettingList>
          <PropertySettingActions
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onDuplicate={onDuplicate}
            onRemove={
              onRemove && !property.isSystem
                ? () => setPanel({ id: "remove" })
                : undefined
            }
          />
        </>
      )}
      {panel.id === "icon" && (
        <PropertySettingPanel title="Icon" onBack={back}>
          <PropertyIconGrid
            property={property}
            onSelect={(icon) => {
              onChange({ ...property, icon })
              back()
            }}
          />
        </PropertySettingPanel>
      )}
      {panel.id === "type" && conversion && (
        <PropertySettingPanel title="Type" onBack={back}>
          <PropertyTypePanel
            key={property.type}
            property={property}
            conversion={conversion}
            onDone={back}
          />
        </PropertySettingPanel>
      )}
      {panel.id === "options" && (
        <PropertySettingPanel title="Options" onBack={back}>
          <PropertyOptionList
            property={property}
            onChange={(options) => onChange({ ...property, options })}
          />
        </PropertySettingPanel>
      )}
      {panel.id === "default" && (
        <PropertySettingPanel title="Default" onBack={back}>
          <PropertyDefaultList
            property={property}
            onChange={(defaultValue) => onChange({ ...property, defaultValue })}
          />
        </PropertySettingPanel>
      )}
      {panel.id === "visibility" && (
        <PropertySettingPanel title="Visibility" onBack={back}>
          <PropertyChoiceList
            label="Visibility"
            choices={visibilities}
            selected={visibility}
            onSelect={(value) => {
              onChange({
                ...property,
                visibility: visibilities.find(
                  (entry) => entry.value === value && value !== "show"
                )?.value,
              })
              back()
            }}
          />
        </PropertySettingPanel>
      )}
      {panel.id === "setting" && panel.field.kind === "choice" && (
        <PropertySettingPanel title={panel.field.label} onBack={back}>
          <PropertyChoiceList
            label={panel.field.label}
            choices={panel.field.choices}
            selected={String(readSetting(property, panel.field.id, types))}
            onSelect={(value) => {
              onChange(writeSetting(property, panel.field, value))
              back()
            }}
          />
        </PropertySettingPanel>
      )}
      {panel.id === "remove" && (
        <PropertySettingPanel title="Delete property" onBack={back}>
          <div className="cn-properties-preview flex flex-col">
            <p>
              “{property.name}” and its values go from every record. This can’t
              be undone.
            </p>
            <div className="cn-properties-form-row flex">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onRemove?.()}
              >
                Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={back}>
                Cancel
              </Button>
            </div>
          </div>
        </PropertySettingPanel>
      )}
    </div>
  )
}

/**
 * Text saved on Enter or on leaving it. Enter keeps the focus, so the next key
 * still belongs to the panel. What can't be kept goes back to what it was.
 */
function PropertySettingInput({
  value,
  onCommit,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "value" | "defaultValue"> & {
  value: string
  /** Whether the text was kept. */
  onCommit: (text: string) => boolean
}) {
  const field = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => {
    if (field.current) field.current.value = value
  }, [value])
  function commit(input: HTMLInputElement) {
    const text = input.value.trim()
    if (text === value || !onCommit(text)) input.value = value
  }
  return (
    <Input
      {...props}
      ref={field}
      defaultValue={value}
      onBlur={(event) => commit(event.target)}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.nativeEvent.isComposing)
          commit(event.currentTarget)
      }}
    />
  )
}

/** The icon, the name and what it is for. */
function PropertyIdentity({
  property,
  onChange,
  onIcon,
}: {
  property: PropertyDefinition
  onChange: (property: PropertyDefinition) => void
  onIcon: () => void
}) {
  const isFixed = !!property.isSystem
  return (
    <div className="cn-properties-identity flex flex-col">
      <div className="cn-properties-form-row flex items-center">
        <fieldset disabled={isFixed} className="contents">
          <Button
            variant="outline"
            size="icon"
            aria-label={`Icon of ${property.name}`}
            className="cn-properties-icon-button shrink-0"
            onClick={onIcon}
          >
            <PropertyIcon property={property} />
          </Button>
        </fieldset>
        <PropertySettingInput
          data-panel-focus=""
          aria-label="Property name"
          value={property.name}
          disabled={isFixed}
          onCommit={(name) => {
            if (!name) return false
            onChange({ ...property, name })
            return true
          }}
        />
      </div>
      {(!isFixed || property.description) && (
        <PropertySettingInput
          aria-label="Property description"
          placeholder="Add a description"
          value={property.description ?? ""}
          disabled={isFixed}
          className="cn-properties-description"
          onCommit={(text) => {
            onChange({ ...property, description: text || undefined })
            return true
          }}
        />
      )}
    </div>
  )
}

function PropertySettingList({ children }: { children: React.ReactNode }) {
  return (
    <div className="cn-properties-setting-list flex flex-col">{children}</div>
  )
}

function PropertySettingPanel({
  title,
  onBack,
  children,
}: {
  title: string
  onBack: () => void
  children: React.ReactNode
}) {
  return (
    <div
      role="group"
      aria-label={title}
      data-escape="back"
      className="cn-properties-panel flex min-h-0 flex-col"
      onKeyDown={(event) => {
        // A menu opened from here is this element's child only in React.
        const isOwn =
          event.target instanceof Node &&
          event.currentTarget.contains(event.target)
        if (event.key !== "Escape" || !isOwn) return
        event.preventDefault()
        event.stopPropagation()
        onBack()
      }}
    >
      <div className="cn-properties-panel-header flex items-center">
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Back"
          data-panel-focus=""
          onClick={onBack}
        >
          <IconPlaceholder
            lucide="ChevronLeftIcon"
            tabler="IconChevronLeft"
            hugeicons="ArrowLeft01Icon"
            phosphor="CaretLeftIcon"
            remixicon="RiArrowLeftSLine"
          />
        </Button>
        <span className="cn-properties-panel-title">{title}</span>
      </div>
      {children}
    </div>
  )
}

/** A row that says what a setting is and, with somewhere to go, opens it. */
function PropertySettingRow({
  label,
  value,
  onSelect,
}: {
  label: string
  value: string
  onSelect?: () => void
}) {
  const content = (
    <>
      <span className="shrink-0">{label}</span>
      <span className="cn-properties-setting-value min-w-0 flex-1 truncate text-end">
        {value}
      </span>
    </>
  )
  if (!onSelect)
    return (
      <div className="cn-properties-setting flex items-center">{content}</div>
    )
  return (
    <Button
      variant="ghost"
      className="cn-properties-setting w-full"
      onClick={onSelect}
    >
      {content}
      <IconPlaceholder
        lucide="ChevronRightIcon"
        tabler="IconChevronRight"
        hugeicons="ArrowRight01Icon"
        phosphor="CaretRightIcon"
        remixicon="RiArrowRightSLine"
      />
    </Button>
  )
}

function PropertySettingSwitch({
  label,
  checked,
  onCheckedChange,
}: {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="cn-properties-setting flex items-center">
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <ControlSwitch
        label={label}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  )
}

function PropertySettingControl({
  field,
  value,
  onChange,
  onOpen,
}: {
  field: PropertySettingField
  value: PropertySettingValue | undefined
  onChange: (value: PropertySettingValue | undefined) => void
  onOpen: () => void
}) {
  const text = formatSetting(field, value)
  if (field.kind === "choice")
    return (
      <PropertySettingRow label={field.label} value={text} onSelect={onOpen} />
    )
  if (field.kind === "switch")
    return (
      <PropertySettingSwitch
        label={field.label}
        checked={value === true}
        onCheckedChange={onChange}
      />
    )
  return (
    <div className="cn-properties-setting flex items-center">
      <span className="min-w-0 flex-1 truncate">{field.label}</span>
      <PropertySettingInput
        aria-label={field.label}
        placeholder={field.placeholder}
        inputMode={field.kind === "number" ? "decimal" : undefined}
        value={value === undefined ? "" : String(value)}
        className="cn-properties-setting-input"
        onCommit={(next) => {
          if (field.kind === "text" || next === "") {
            onChange(next || undefined)
            return true
          }
          const number = Number(next)
          const isValid =
            Number.isFinite(number) &&
            number >= (field.min ?? -Infinity) &&
            number <= (field.max ?? Infinity)
          if (isValid) onChange(number)
          return isValid
        }}
      />
    </div>
  )
}

function PropertySettingActions({
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
}: Pick<
  PropertySettingsProps,
  "onMoveUp" | "onMoveDown" | "onDuplicate" | "onRemove"
>) {
  const actions = [
    {
      label: "Move up",
      icon: (
        <IconPlaceholder
          lucide="ArrowUpIcon"
          tabler="IconArrowUp"
          hugeicons="ArrowUpIcon"
          phosphor="ArrowUpIcon"
          remixicon="RiArrowUpLine"
        />
      ),
      onSelect: onMoveUp,
    },
    {
      label: "Move down",
      icon: (
        <IconPlaceholder
          lucide="ArrowDownIcon"
          tabler="IconArrowDown"
          hugeicons="ArrowDownIcon"
          phosphor="ArrowDownIcon"
          remixicon="RiArrowDownLine"
        />
      ),
      onSelect: onMoveDown,
    },
    {
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
      onSelect: onDuplicate,
    },
    {
      label: "Delete property",
      icon: (
        <IconPlaceholder
          lucide="Trash2Icon"
          tabler="IconTrash"
          hugeicons="Delete02Icon"
          phosphor="TrashIcon"
          remixicon="RiDeleteBinLine"
        />
      ),
      onSelect: onRemove,
      isDestructive: true,
    },
  ].filter(({ onSelect }) => onSelect)
  if (!actions.length) return null
  return (
    <PropertySettingList>
      {actions.map(({ label, icon, onSelect, isDestructive }) => (
        <Button
          key={label}
          variant="ghost"
          data-destructive={isDestructive ? "" : undefined}
          className="cn-properties-action w-full"
          onClick={onSelect}
        >
          {icon}
          {label}
        </Button>
      ))}
    </PropertySettingList>
  )
}

function PropertyChoiceList({
  label,
  choices,
  selected,
  onSelect,
}: {
  label: string
  choices: readonly { value: string; label: string; icon?: React.ReactNode }[]
  selected: string | readonly string[]
  onSelect: (value: string) => void
}) {
  const picked = typeof selected === "string" ? [selected] : selected
  return (
    <div
      role="group"
      aria-label={label}
      className="cn-properties-choices flex flex-col overflow-y-auto"
    >
      {choices.map((choice) => (
        <Button
          key={choice.value}
          variant="ghost"
          aria-pressed={picked.includes(choice.value)}
          className="cn-properties-setting w-full"
          onClick={() => onSelect(choice.value)}
        >
          {choice.icon}
          <span className="min-w-0 flex-1 truncate text-start">
            {choice.label}
          </span>
          {picked.includes(choice.value) && (
            <IconPlaceholder
              lucide="CheckIcon"
              tabler="IconCheck"
              hugeicons="Tick02Icon"
              phosphor="CheckIcon"
              remixicon="RiCheckLine"
            />
          )}
        </Button>
      ))}
    </div>
  )
}

function PropertyDefaultList({
  property,
  onChange,
}: {
  property: PropertyDefinition
  onChange: (value: unknown) => void
}) {
  const picked = readPropertyKeys(property.defaultValue)
  const isMultiple = isMultiProperty(property)
  return (
    <PropertyChoiceList
      label="Default"
      selected={picked.length ? picked : [""]}
      choices={[
        { value: "", label: "None" },
        ...(property.options ?? [])
          .filter(({ isArchived }) => !isArchived)
          .map((option) => ({
            value: option.value,
            label: option.label,
            icon: <PropertyMark mark={option} />,
          })),
      ]}
      onSelect={(key) => {
        if (!key) return onChange(undefined)
        if (!isMultiple) return onChange(key)
        const next = picked.includes(key)
          ? picked.filter((entry) => entry !== key)
          : [...picked, key]
        onChange(next.length ? next : undefined)
      }}
    />
  )
}

function PropertyIconGrid({
  property,
  onSelect,
}: {
  property: PropertyDefinition
  onSelect: (icon: string | undefined) => void
}) {
  const names = usePropertyIconNames()
  const current = property.icon ?? property.type
  return (
    <div
      role="group"
      aria-label="Icon"
      className="cn-properties-icon-grid grid overflow-y-auto"
    >
      {names.map((name) => (
        <Button
          key={name}
          variant="ghost"
          size="icon-sm"
          aria-label={name.replaceAll("-", " ")}
          aria-pressed={name === current}
          className="cn-properties-icon-choice"
          onClick={() => onSelect(name === property.type ? undefined : name)}
        >
          <PropertyIcon property={{ type: "text", icon: name }} />
        </Button>
      ))}
    </div>
  )
}

/** The types it can become, and what that would do to its values first. */
function PropertyTypePanel({
  property,
  conversion,
  onDone,
}: {
  property: PropertyDefinition
  conversion: PropertyConversionControls
  onDone: () => void
}) {
  const types = usePropertyTypes()
  const [preview, setPreview] = React.useState<PropertyConversion | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const failed = preview?.invalidRecordIds.length ?? 0

  async function convert(next: PropertyConversion) {
    setIsSaving(true)
    setError(null)
    try {
      await conversion.onConvert(next)
      onDone()
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not change the property type."
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      data-slot="properties-type-conversion"
      className="cn-properties-panel-body flex min-h-0 flex-col"
    >
      <PropertyChoiceList
        label="Type"
        selected={preview?.property.type ?? property.type}
        choices={convertiblePropertyTypes.map((type) => ({
          value: type,
          label: getPropertyTypeName(type, types),
          icon: <PropertyIcon property={{ type }} />,
        }))}
        onSelect={(value) => {
          const type = convertiblePropertyTypes.find((name) => name === value)
          setError(null)
          setPreview(
            !type || type === property.type
              ? null
              : previewPropertyConversion(
                  property,
                  type,
                  conversion.getValues(property.id)
                )
          )
        }}
      />
      {preview && (
        <div className="cn-properties-preview flex flex-col">
          <p role="status">
            {failed
              ? `${failed} of ${preview.values.length + failed} values can’t become ${getPropertyTypeName(preview.property.type, types).toLowerCase()}. Fix them first.`
              : `All ${preview.values.length} values convert.`}
          </p>
          <fieldset disabled={isSaving} className="contents">
            <div className="cn-properties-form-row flex">
              <fieldset disabled={failed > 0} className="contents">
                <Button size="sm" onClick={() => void convert(preview)}>
                  {isSaving ? "Changing…" : "Change type"}
                </Button>
              </fieldset>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPreview(null)}
              >
                Cancel
              </Button>
            </div>
          </fieldset>
        </div>
      )}
      {error && (
        <p role="alert" className="cn-properties-error">
          {error}
        </p>
      )}
    </div>
  )
}

function PropertyOptionList({
  property,
  onChange,
}: {
  property: PropertyDefinition
  onChange: (options: PropertyOption[]) => void
}) {
  const options = property.options ?? []
  const [label, setLabel] = React.useState("")
  function add() {
    const name = label.trim()
    if (!name) return
    onChange([
      ...options,
      {
        value: crypto.randomUUID(),
        label: name,
        color: paletteNames[options.length % paletteNames.length],
        ...(property.type === "status" ? { group: "todo" } : undefined),
      },
    ])
    setLabel("")
  }
  return (
    <div
      data-slot="properties-options"
      className="cn-properties-panel-body flex min-h-0 flex-col"
    >
      <SortableProvider
        axis="y"
        onMove={({ fromIndex, toIndex }) =>
          onChange(moveEntry(options, fromIndex, toIndex))
        }
      >
        <ul className="cn-properties-option-list flex list-none flex-col overflow-y-auto">
          {options.map((option, index) => (
            <PropertyOptionRow
              key={option.value}
              option={option}
              index={index}
              isStatus={property.type === "status"}
              onChange={(next) =>
                onChange(
                  options.map((entry) =>
                    entry.value === option.value ? next : entry
                  )
                )
              }
              onRemove={() =>
                onChange(
                  options.filter((entry) => entry.value !== option.value)
                )
              }
            />
          ))}
        </ul>
      </SortableProvider>
      <div className="cn-properties-form-row flex items-center">
        <Input
          aria-label={`New option for ${property.name}`}
          placeholder="Add an option"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return
            event.preventDefault()
            add()
          }}
        />
        <Button
          size="icon"
          variant="ghost"
          aria-label="Add option"
          onClick={add}
        >
          <IconPlaceholder
            lucide="PlusIcon"
            tabler="IconPlus"
            hugeicons="PlusSignIcon"
            phosphor="PlusIcon"
            remixicon="RiAddLine"
          />
        </Button>
      </div>
    </div>
  )
}

const statusGroups: readonly { value: PropertyOptionGroup; label: string }[] = [
  { value: "todo", label: "To do" },
  { value: "inProgress", label: "In progress" },
  { value: "complete", label: "Complete" },
]

function PropertyOptionRow({
  option,
  index,
  isStatus,
  onChange,
  onRemove,
}: {
  option: PropertyOption
  index: number
  isStatus: boolean
  onChange: (option: PropertyOption) => void
  onRemove: () => void
}) {
  const { attach, attachHandle, isDragging } = useSortableItem({
    id: option.value,
    index,
  })
  const groups: ControlMenuGroup[] = [
    {
      id: "group",
      label: "Group",
      items: isStatus
        ? statusGroups.map(({ value, label }) => ({
            type: "check" as const,
            id: value,
            label,
            isChecked: option.group === value,
            onSelect: () => onChange({ ...option, group: value }),
          }))
        : [],
    },
    {
      id: "option",
      items: [
        {
          id: "archive",
          label: option.isArchived ? "Restore" : "Archive",
          icon: (
            <IconPlaceholder
              lucide="ArchiveIcon"
              tabler="IconArchive"
              hugeicons="Archive02Icon"
              phosphor="ArchiveIcon"
              remixicon="RiArchiveLine"
            />
          ),
          onSelect: () =>
            onChange({ ...option, isArchived: !option.isArchived }),
        },
        {
          id: "delete",
          label: "Delete option",
          icon: (
            <IconPlaceholder
              lucide="Trash2Icon"
              tabler="IconTrash"
              hugeicons="Delete02Icon"
              phosphor="TrashIcon"
              remixicon="RiDeleteBinLine"
            />
          ),
          variant: "destructive",
          onSelect: onRemove,
        },
      ],
    },
  ]
  return (
    <li
      ref={attach}
      data-slot="properties-option-row"
      data-archived={option.isArchived || undefined}
      data-dragging={isDragging || undefined}
      className="cn-properties-option-row flex items-center"
    >
      <span
        ref={attachHandle}
        aria-hidden="true"
        className="cn-properties-handle inline-flex shrink-0 touch-none"
      >
        <IconPlaceholder
          lucide="GripVerticalIcon"
          tabler="IconGripVertical"
          hugeicons="DragDropVerticalIcon"
          phosphor="DotsSixVerticalIcon"
          remixicon="RiDraggable"
        />
      </span>
      <PropertyColorMenu
        label={`Color of ${option.label}`}
        mark={option}
        onColorChange={(color) => onChange({ ...option, color })}
      />
      <PropertySettingInput
        aria-label={`Label of ${option.label}`}
        value={option.label}
        className="cn-properties-input"
        onCommit={(label) => {
          if (!label) return false
          onChange({ ...option, label })
          return true
        }}
      />
      <ControlMenu
        label={`More for ${option.label}`}
        align="end"
        isRaised
        groups={groups}
      >
        <IconPlaceholder
          lucide="EllipsisIcon"
          tabler="IconDots"
          hugeicons="MoreHorizontalCircle01Icon"
          phosphor="DotsThreeIcon"
          remixicon="RiMoreLine"
        />
      </ControlMenu>
    </li>
  )
}

/** The palette, as a menu behind the mark it colours. */
function PropertyColorMenu({
  label,
  mark,
  onColorChange,
}: {
  label: string
  mark: Pick<PropertyOption, "color" | "icon" | "group">
  onColorChange: (color: string) => void
}) {
  return (
    <ControlMenu
      label={label}
      isRaised
      groups={[
        {
          id: "color",
          items: paletteNames.map((name) => ({
            type: "check" as const,
            id: name,
            label: name.charAt(0).toUpperCase() + name.slice(1),
            icon: <PropertyMark mark={{ color: name }} />,
            isChecked: name === mark.color,
            onSelect: () => onColorChange(name),
          })),
        },
      ]}
    >
      <PropertyMark mark={{ ...mark, color: mark.color ?? "gray" }} />
    </ControlMenu>
  )
}

export { moveEntry, PropertySettings, type PropertySettingsProps }
