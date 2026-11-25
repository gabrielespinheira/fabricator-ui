import * as React from "react"
import {
  ArchiveIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  EllipsisIcon,
  PlusIcon,
  Trash2Icon,
} from "@fabricator-ui/icons-react-native"
import { ScrollView, View } from "react-native"

import { usePropertyTypes } from "@/registry/fabricator/shared/hooks/use-property-types"
import { PALETTE_COLORS } from "@/registry/fabricator/shared/lib/palette-model"
import {
  convertiblePropertyTypes,
  isChoiceProperty,
  isMultiProperty,
  previewPropertyConversion,
  readPropertyKeys,
  type PropertyConversion,
  type PropertyConversionControls,
} from "@/registry/fabricator/shared/lib/property-model"
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
} from "@/registry/fabricator/shared/lib/property-types"
import { ControlSheet } from "@/registry/native/lib/control-sheet"
import {
  PropertyIcon,
  PropertyMark,
  useMutedColor,
  usePropertyIconNames,
} from "@/registry/native/lib/property-marks"
import { Button } from "@/registry/native/ui/button"
import { DrawerTitle } from "@/registry/native/ui/drawer"
import { Input } from "@/registry/native/ui/input"
import { Switch } from "@/registry/native/ui/switch"
import { Text } from "@/registry/native/ui/text"

// What a property is and how it behaves, the website's panel in a sheet. The
// rows come from the type's own list of settings.

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
  const back = () => setPanel({ id: "root" })
  const canEdit = !property.isSystem && !property.isReadOnly
  const definition = types.get(property.type)
  const visibility = property.visibility ?? "show"
  const defaults = readPropertyKeys(property.defaultValue)
    .map(
      (key) =>
        property.options?.find(({ value }) => value === key)?.label ?? key
    )
    .join(", ")

  return (
    <View
      data-slot="properties-settings"
      className="cn-properties-sheet cn-properties-settings"
    >
      {panel.id === "root" && (
        <>
          <DrawerTitle>{property.name}</DrawerTitle>
          <View className="cn-properties-form-row flex-row items-center">
            <Button
              variant="outline"
              size="icon"
              disabled={property.isSystem}
              accessibilityLabel={`Icon of ${property.name}`}
              onPress={() => setPanel({ id: "icon" })}
            >
              <PropertyIcon property={property} />
            </Button>
            <Input
              key={property.name}
              accessibilityLabel="Property name"
              defaultValue={property.name}
              disabled={property.isSystem}
              className="flex-1"
              onEndEditing={(event) => {
                const name = event.nativeEvent.text.trim()
                if (name && name !== property.name)
                  onChange({ ...property, name })
              }}
            />
          </View>
          {!property.isSystem && (
            <Input
              key={property.description ?? ""}
              accessibilityLabel="Property description"
              placeholder="Add a description"
              defaultValue={property.description ?? ""}
              onEndEditing={(event) => {
                const text = event.nativeEvent.text.trim()
                if (text !== (property.description ?? ""))
                  onChange({ ...property, description: text || undefined })
              }}
            />
          )}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            className="cn-properties-setting-scroll max-h-96"
          >
            <PropertySettingRow
              label="Type"
              value={getPropertyTypeName(property.type, types)}
              onPress={
                conversion && canEdit
                  ? () => setPanel({ id: "type" })
                  : undefined
              }
            />
            {definition?.hasOptions && canEdit && (
              <PropertySettingRow
                label="Options"
                value={String(property.options?.length ?? 0)}
                onPress={() => setPanel({ id: "options" })}
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
            <PropertySettingRow
              label="Visibility"
              value={
                visibilities.find(({ value }) => value === visibility)?.label ??
                ""
              }
              onPress={() => setPanel({ id: "visibility" })}
            />
            {isOnCard !== undefined && onCardChange && (
              <PropertySettingSwitch
                label="Show on card"
                checked={isOnCard}
                onCheckedChange={onCardChange}
              />
            )}
            {isChoiceProperty(property, types) && canEdit && (
              <PropertySettingRow
                label="Default"
                value={defaults || "None"}
                onPress={() => setPanel({ id: "default" })}
              />
            )}
            {!definition?.isReadOnly &&
              canEdit &&
              property.type !== "checkbox" && (
                <PropertySettingSwitch
                  label="Required"
                  checked={property.required ?? false}
                  onCheckedChange={(required) =>
                    onChange({ ...property, required: required || undefined })
                  }
                />
              )}
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
          </ScrollView>
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
            choices={visibilities}
            selected={[visibility]}
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
            choices={panel.field.choices}
            selected={[String(readSetting(property, panel.field.id, types))]}
            onSelect={(value) => {
              onChange(writeSetting(property, panel.field, value))
              back()
            }}
          />
        </PropertySettingPanel>
      )}
      {panel.id === "remove" && (
        <PropertySettingPanel title="Delete property" onBack={back}>
          <View className="cn-properties-preview">
            <Text className="cn-properties-kind">
              “{property.name}” and its values go from every record. This can’t
              be undone.
            </Text>
            <View className="cn-properties-form-row flex-row">
              <Button size="sm" variant="destructive" onPress={onRemove}>
                Delete
              </Button>
              <Button size="sm" variant="ghost" onPress={back}>
                Cancel
              </Button>
            </View>
          </View>
        </PropertySettingPanel>
      )}
    </View>
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
    <>
      <View className="cn-properties-panel-header flex-row items-center">
        <Button
          variant="ghost"
          size="icon-sm"
          accessibilityLabel="Back"
          onPress={onBack}
        >
          <ChevronLeftIcon />
        </Button>
        <DrawerTitle>{title}</DrawerTitle>
      </View>
      {children}
    </>
  )
}

/** A row that says what a setting is and, with somewhere to go, opens it. */
function PropertySettingRow({
  label,
  value,
  onPress,
}: {
  label: string
  value: string
  onPress?: () => void
}) {
  const muted = useMutedColor()
  return (
    <Button
      variant="ghost"
      disabled={!onPress}
      accessibilityLabel={`${label}: ${value}`}
      className="cn-properties-setting justify-start"
      onPress={onPress}
    >
      <Text className="cn-properties-sheet-text">{label}</Text>
      <Text
        numberOfLines={1}
        className="cn-properties-setting-value flex-1 text-right"
      >
        {value}
      </Text>
      {onPress && <ChevronRightIcon size={14} color={muted} />}
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
    <View className="cn-properties-setting flex-row items-center">
      <Text numberOfLines={1} className="cn-properties-sheet-text flex-1">
        {label}
      </Text>
      <Switch
        accessibilityLabel={label}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </View>
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
  if (field.kind === "choice")
    return (
      <PropertySettingRow
        label={field.label}
        value={formatSetting(field, value)}
        onPress={onOpen}
      />
    )
  if (field.kind === "switch")
    return (
      <PropertySettingSwitch
        label={field.label}
        checked={value === true}
        onCheckedChange={onChange}
      />
    )
  const initial = value === undefined ? "" : String(value)
  return (
    <View className="cn-properties-setting flex-row items-center">
      <Text numberOfLines={1} className="cn-properties-sheet-text flex-1">
        {field.label}
      </Text>
      <Input
        key={initial}
        accessibilityLabel={field.label}
        placeholder={field.placeholder}
        keyboardType={field.kind === "number" ? "decimal-pad" : "default"}
        defaultValue={initial}
        className="cn-properties-setting-input w-28"
        onEndEditing={(event) => {
          const next = event.nativeEvent.text.trim()
          if (next === initial) return
          if (field.kind === "text" || next === "")
            return onChange(next || undefined)
          const number = Number(next)
          if (
            Number.isFinite(number) &&
            number >= (field.min ?? -Infinity) &&
            number <= (field.max ?? Infinity)
          )
            onChange(number)
        }}
      />
    </View>
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
    { label: "Move up", Icon: ArrowUpIcon, onPress: onMoveUp },
    { label: "Move down", Icon: ArrowDownIcon, onPress: onMoveDown },
    { label: "Duplicate", Icon: CopyIcon, onPress: onDuplicate },
    { label: "Delete property", Icon: Trash2Icon, onPress: onRemove },
  ].filter(({ onPress }) => onPress)
  return actions.map(({ label, Icon, onPress }) => (
    <Button
      key={label}
      variant="ghost"
      className="cn-properties-setting justify-start"
      onPress={onPress}
    >
      <Icon />
      <Text className="cn-properties-sheet-text">{label}</Text>
    </Button>
  ))
}

function PropertyChoiceList({
  choices,
  selected,
  onSelect,
}: {
  choices: readonly { value: string; label: string; icon?: React.ReactNode }[]
  selected: readonly string[]
  onSelect: (value: string) => void
}) {
  return (
    <ScrollView className="cn-properties-types max-h-96">
      {choices.map((choice) => (
        <Button
          key={choice.value}
          variant="ghost"
          accessibilityState={{ selected: selected.includes(choice.value) }}
          className="cn-properties-sheet-row justify-start"
          onPress={() => onSelect(choice.value)}
        >
          {choice.icon}
          <Text className="cn-properties-sheet-text flex-1">
            {choice.label}
          </Text>
          {selected.includes(choice.value) && <CheckIcon />}
        </Button>
      ))}
    </ScrollView>
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
    <View className="cn-properties-icon-grid flex-row flex-wrap">
      {names.map((name) => (
        <Button
          key={name}
          variant={name === current ? "secondary" : "ghost"}
          size="icon"
          accessibilityLabel={name.replaceAll("-", " ")}
          accessibilityState={{ selected: name === current }}
          onPress={() => onSelect(name === property.type ? undefined : name)}
        >
          <PropertyIcon property={{ type: "text", icon: name }} />
        </Button>
      ))}
    </View>
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
    <View
      data-slot="properties-type-conversion"
      className="cn-properties-form-field"
    >
      <PropertyChoiceList
        selected={[preview?.property.type ?? property.type]}
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
        <View className="cn-properties-preview">
          <Text className="cn-properties-kind" accessibilityLiveRegion="polite">
            {failed
              ? `${failed} of ${preview.values.length + failed} values can’t become ${getPropertyTypeName(preview.property.type, types).toLowerCase()}. Fix them first.`
              : `All ${preview.values.length} values convert.`}
          </Text>
          <View className="cn-properties-form-row flex-row">
            <Button
              size="sm"
              disabled={isSaving || failed > 0}
              onPress={() => void convert(preview)}
            >
              {isSaving ? "Changing…" : "Change type"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={isSaving}
              onPress={() => setPreview(null)}
            >
              Cancel
            </Button>
          </View>
        </View>
      )}
      {error && (
        <Text accessibilityRole="alert" className="cn-properties-error">
          {error}
        </Text>
      )}
    </View>
  )
}

const statusGroups: readonly { value: PropertyOptionGroup; label: string }[] = [
  { value: "todo", label: "To do" },
  { value: "inProgress", label: "In progress" },
  { value: "complete", label: "Complete" },
]

function PropertyOptionList({
  property,
  onChange,
}: {
  property: PropertyDefinition
  onChange: (options: PropertyOption[]) => void
}) {
  const options = property.options ?? []
  const [label, setLabel] = React.useState("")
  const [menuFor, setMenuFor] = React.useState<string | null>(null)
  const index = options.findIndex(({ value }) => value === menuFor)
  const option = index < 0 ? null : options[index]
  const replace = (next: PropertyOption) =>
    onChange(
      options.map((entry) => (entry.value === next.value ? next : entry))
    )
  function add() {
    const name = label.trim()
    if (!name) return
    onChange([
      ...options,
      {
        value: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        label: name,
        color: paletteNames[options.length % paletteNames.length],
        ...(property.type === "status" ? { group: "todo" } : undefined),
      },
    ])
    setLabel("")
  }
  return (
    <View data-slot="properties-options" className="cn-properties-form-field">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        className="cn-properties-option-list max-h-56"
      >
        {options.map((entry) => (
          <View
            key={entry.value}
            data-slot="properties-option-row"
            data-archived={entry.isArchived ?? false}
            className="cn-properties-option-row flex-row items-center"
          >
            <PropertyMark
              mark={{ color: entry.color ?? "gray", icon: entry.icon }}
            />
            <Input
              key={entry.label}
              accessibilityLabel={`Label of ${entry.label}`}
              defaultValue={entry.label}
              className="cn-properties-option-input flex-1"
              onEndEditing={(event) => {
                const next = event.nativeEvent.text.trim()
                if (next && next !== entry.label)
                  replace({ ...entry, label: next })
              }}
            />
            <Button
              size="icon"
              variant="ghost"
              accessibilityLabel={`More for ${entry.label}`}
              onPress={() => setMenuFor(entry.value)}
            >
              <EllipsisIcon />
            </Button>
          </View>
        ))}
      </ScrollView>
      <View className="cn-properties-form-row flex-row items-center">
        <Input
          accessibilityLabel={`New option for ${property.name}`}
          placeholder="Add an option"
          value={label}
          className="flex-1"
          onChangeText={setLabel}
          onSubmitEditing={add}
        />
        <Button
          size="icon"
          variant="ghost"
          accessibilityLabel="Add option"
          onPress={add}
        >
          <PlusIcon />
        </Button>
      </View>
      <ControlSheet
        open={option !== null}
        onOpenChange={(open) => {
          if (!open) setMenuFor(null)
        }}
        label={option?.label ?? ""}
        groups={
          option
            ? [
                {
                  id: "color",
                  items: [
                    {
                      type: "submenu",
                      id: "color",
                      label: "Color",
                      icon: (
                        <PropertyMark
                          mark={{ color: option.color ?? "gray" }}
                        />
                      ),
                      groups: [
                        {
                          id: "palette",
                          items: paletteNames.map((name) => ({
                            type: "check" as const,
                            id: name,
                            label: name.charAt(0).toUpperCase() + name.slice(1),
                            icon: <PropertyMark mark={{ color: name }} />,
                            isChecked: name === option.color,
                            onSelect: () => replace({ ...option, color: name }),
                          })),
                        },
                      ],
                    },
                    {
                      id: "up",
                      label: "Move up",
                      icon: <ArrowUpIcon />,
                      isDisabled: index === 0,
                      onSelect: () =>
                        onChange(moveEntry(options, index, index - 1)),
                    },
                    {
                      id: "archive",
                      label: option.isArchived ? "Restore" : "Archive",
                      icon: <ArchiveIcon />,
                      onSelect: () =>
                        replace({ ...option, isArchived: !option.isArchived }),
                    },
                  ],
                },
                {
                  id: "group",
                  label: "Group",
                  items:
                    property.type === "status"
                      ? statusGroups.map(({ value, label }) => ({
                          type: "check" as const,
                          id: value,
                          label,
                          isChecked: option.group === value,
                          onSelect: () => replace({ ...option, group: value }),
                        }))
                      : [],
                },
                {
                  id: "danger",
                  items: [
                    {
                      id: "delete",
                      label: "Delete option",
                      icon: <Trash2Icon />,
                      variant: "destructive",
                      onSelect: () =>
                        onChange(
                          options.filter(({ value }) => value !== option.value)
                        ),
                    },
                  ],
                },
              ]
            : []
        }
      />
    </View>
  )
}

export { moveEntry, PropertySettings, type PropertySettingsProps }
