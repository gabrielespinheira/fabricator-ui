"use client"

// Properties: typed values shown and edited as rows. It works with any record
// and any storage, with no board in sight: pass definitions and a way to read
// and write a value. Labels share one column so values are scanned straight
// down, and a value is its own button, so reading and editing look the same.
// Let people change the definitions and each label opens its property's
// settings, and drags to reorder.
import * as React from "react"
import { cn } from "cn"
import { flushSync } from "react-dom"

import { ControlPopover } from "@/registry/bases/__base__/components/property-controls"
import {
  PropertyEditor,
  type PropertyEditorProps,
} from "@/registry/bases/__base__/components/property-editor"
import { PropertyIcon } from "@/registry/bases/__base__/components/property-icons"
import { duplicateProperty } from "@/registry/bases/__base__/components/property-manager"
import {
  moveEntry,
  PropertySettings,
} from "@/registry/bases/__base__/components/property-settings"
import { PropertyValue } from "@/registry/bases/__base__/components/property-value"
import { usePropertyTypes } from "@/registry/bases/__base__/hooks/use-property-types"
import {
  isPropertyShown,
  type PropertyConversionControls,
} from "@/registry/bases/__base__/lib/property-model"
import type { PropertyDefinition } from "@/registry/bases/__base__/lib/property-types"
import {
  SortableProvider,
  useSortableItem,
} from "@/registry/bases/__base__/lib/sortable"
import { Button } from "@/registry/bases/__base__/ui/button"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

type PropertyListProps = React.ComponentProps<"dl"> & {
  properties: readonly PropertyDefinition[]
  getValue: (propertyId: string) => unknown
  onValueChange?: (propertyId: string, value: unknown) => void | Promise<void>
  /** Opens a property's settings from its label, and lets labels reorder. */
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
  /** Stores files and returns how to reach them. */
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
  const firstHidden = properties.find((property) => !shown.includes(property))

  function drawValue(property: PropertyDefinition) {
    const value = getValue(property.id)
    const edit =
      onValueChange && !property.isReadOnly
        ? (next: unknown) => onValueChange(property.id, next)
        : undefined
    if (!edit)
      return (
        renderValue?.(property, value) ?? (
          <span className="cn-properties-inset flex">
            <PropertyValue property={property} value={value} />
          </span>
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

  const list = (
    <dl
      data-slot="properties"
      className={cn("cn-properties flex flex-col", className)}
      {...props}
    >
      {rows.map((property, index) =>
        onPropertiesChange ? (
          <PropertySettingsRow
            key={property.id}
            property={property}
            index={index}
            properties={properties}
            rows={rows}
            open={property.id === settingsId}
            onOpenChange={(open) => setSettingsId(open ? property.id : null)}
            conversion={conversion}
            isOnCard={isOnCard?.(property)}
            onCardChange={onCardChange}
            onPropertiesChange={onPropertiesChange}
          >
            {drawValue(property)}
          </PropertySettingsRow>
        ) : (
          <PropertyRow key={property.id} property={property}>
            {drawValue(property)}
          </PropertyRow>
        )
      )}
      {children}
    </dl>
  )
  return (
    <>
      {onPropertiesChange ? (
        <SortableProvider
          axis="y"
          onMove={({ id, toIndex }) =>
            onPropertiesChange(placeProperty(properties, id, rows[toIndex].id))
          }
        >
          {list}
        </SortableProvider>
      ) : (
        list
      )}
      {!isAllShown && firstHidden && (
        <Button
          variant="ghost"
          className="cn-properties-add"
          onClick={(event) => {
            // The button goes, so focus moves on to the first row it showed.
            const list = event.currentTarget.previousElementSibling
            flushSync(() => setIsAllShown(true))
            list
              ?.querySelector<HTMLElement>(
                `[data-property="${CSS.escape(firstHidden.id)}"] :is(button, input, textarea)`
              )
              ?.focus()
          }}
        >
          <IconPlaceholder
            lucide="ChevronDownIcon"
            tabler="IconChevronDown"
            hugeicons="ArrowDown01Icon"
            phosphor="CaretDownIcon"
            remixicon="RiArrowDownSLine"
          />
          {`${hiddenCount} more ${hiddenCount === 1 ? "property" : "properties"}`}
        </Button>
      )}
    </>
  )
}

/** Rows can be hidden, so a row moves to where another one is, not to a number. */
function placeProperty(
  properties: readonly PropertyDefinition[],
  id: string,
  targetId: string
) {
  return moveEntry(
    properties,
    properties.findIndex((property) => property.id === id),
    properties.findIndex((property) => property.id === targetId)
  )
}

function PropertyRow({
  property,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "property"> & {
  property: PropertyDefinition
}) {
  return (
    <div
      data-slot="properties-row"
      data-property={property.id}
      className={cn("cn-properties-row grid min-w-0", className)}
      {...props}
    >
      <dt
        data-slot="properties-label"
        title={property.description}
        className="cn-properties-label flex min-w-0 items-center"
      >
        <PropertyIcon property={property} />
        <span className="truncate">{property.name}</span>
      </dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  )
}

/** A row whose label opens its settings and is what it is dragged by. */
function PropertySettingsRow({
  property,
  index,
  properties,
  rows,
  open,
  onOpenChange,
  conversion,
  isOnCard,
  onCardChange,
  onPropertiesChange,
  children,
}: {
  property: PropertyDefinition
  index: number
  properties: readonly PropertyDefinition[]
  /** The rows on screen, which is what "up" and "down" mean. */
  rows: readonly PropertyDefinition[]
  open: boolean
  onOpenChange: (open: boolean) => void
  conversion?: PropertyConversionControls
  isOnCard?: boolean
  onCardChange?: (propertyId: string, isOnCard: boolean) => void
  onPropertiesChange: (properties: PropertyDefinition[]) => void
  children: React.ReactNode
}) {
  const { attach, attachHandle, isDragging } = useSortableItem({
    id: property.id,
    index,
    hasVariableHeight: true,
  })
  const above = rows[index - 1]
  const below = rows[index + 1]
  const moveTo = (target: PropertyDefinition) =>
    onPropertiesChange(placeProperty(properties, property.id, target.id))
  function closeAnd(action: () => void) {
    onOpenChange(false)
    action()
  }
  return (
    <div
      ref={attach}
      data-slot="properties-row"
      data-property={property.id}
      data-dragging={isDragging || undefined}
      className="cn-properties-row grid min-w-0"
    >
      <dt
        ref={attachHandle}
        data-slot="properties-label"
        className="cn-properties-label-cell min-w-0"
        onKeyDown={(event) => {
          if (!event.altKey || !event.shiftKey) return
          const target =
            event.key === "ArrowUp"
              ? above
              : event.key === "ArrowDown"
                ? below
                : undefined
          if (!target) return
          event.preventDefault()
          moveTo(target)
        }}
      >
        <ControlPopover
          label={`${property.name} settings`}
          triggerLabel={null}
          open={open}
          onOpenChange={onOpenChange}
          isRaised
          isDraggable
          layout="settings"
          className="cn-properties-label cn-properties-label-trigger w-full min-w-0"
          trigger={
            <>
              <PropertyIcon property={property} />
              <span className="truncate">{property.name}</span>
              <span className="sr-only"> settings</span>
            </>
          }
        >
          <PropertySettings
            property={property}
            conversion={conversion}
            isOnCard={isOnCard}
            onCardChange={
              onCardChange && ((isShown) => onCardChange(property.id, isShown))
            }
            onChange={(next) =>
              onPropertiesChange(
                properties.map((entry) => (entry.id === next.id ? next : entry))
              )
            }
            onMoveUp={above ? () => moveTo(above) : undefined}
            onMoveDown={below ? () => moveTo(below) : undefined}
            onDuplicate={() =>
              closeAnd(() => {
                const next = duplicateProperty(properties, property)
                onPropertiesChange(next)
                const copy = next.find((entry) => !properties.includes(entry))
                if (copy && isOnCard) onCardChange?.(copy.id, true)
              })
            }
            onRemove={() =>
              closeAnd(() =>
                onPropertiesChange(
                  properties.filter(({ id }) => id !== property.id)
                )
              )
            }
          />
        </ControlPopover>
        {property.description && (
          <p className="sr-only">{property.description}</p>
        )}
      </dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  )
}

export { PropertyList, PropertyRow, type PropertyListProps }
export {
  PropertyEditor,
  type PropertyEditorProps,
} from "@/registry/bases/__base__/components/property-editor"
export type { PropertyFilesAdd } from "@/registry/bases/__base__/components/property-files"
export {
  PropertyAvatar,
  PropertyIcon,
  PropertyIconProvider,
  PropertyMark,
  type PropertyIconMap,
} from "@/registry/bases/__base__/components/property-icons"
export {
  PropertyAdd,
  PropertyManager,
  type PropertyManagerProps,
} from "@/registry/bases/__base__/components/property-manager"
export {
  PropertySettings,
  type PropertySettingsProps,
} from "@/registry/bases/__base__/components/property-settings"
export {
  PropertyValue,
  type PropertyValueProps,
} from "@/registry/bases/__base__/components/property-value"
export {
  PropertyTypesProvider,
  usePropertyTypes,
} from "@/registry/bases/__base__/hooks/use-property-types"
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
} from "@/registry/bases/__base__/lib/property-model"
export {
  definePropertyType,
  type PropertyDefinition,
  type PropertyEditorRenderProps,
  type PropertyOption,
  type PropertyRenderProps,
  type PropertySettingField,
  type PropertyTypeDefinition,
} from "@/registry/bases/__base__/lib/property-types"
