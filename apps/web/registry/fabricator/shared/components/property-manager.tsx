"use client"

// Where a project shapes its records: the properties in order, each opening
// the form that renames it, changes its type and edits its options.
import * as React from "react"
import { cn } from "cn"

import {
  ControlPopover,
  ControlTooltip,
} from "@/registry/bases/__base__/components/property-controls"
import { PropertyIcon } from "@/registry/bases/__base__/components/property-icons"
import {
  moveEntry,
  PropertySettings,
} from "@/registry/bases/__base__/components/property-settings"
import { usePropertyTypes } from "@/registry/bases/__base__/hooks/use-property-types"
import {
  suggestPropertyType,
  type PropertyConversionControls,
} from "@/registry/bases/__base__/lib/property-model"
import {
  getCreatableTypes,
  getPropertyType,
  getPropertyTypeName,
  groupPropertyTypes,
  type PropertyDefinition,
  type PropertyTypeDefinition,
} from "@/registry/bases/__base__/lib/property-types"
import {
  SortableProvider,
  useSortableItem,
} from "@/registry/bases/__base__/lib/sortable"
import { Button } from "@/registry/bases/__base__/ui/button"
import { Input } from "@/registry/bases/__base__/ui/input"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

type PropertyManagerProps = {
  properties: readonly PropertyDefinition[]
  onPropertiesChange: (properties: PropertyDefinition[]) => void
  conversion?: PropertyConversionControls
  /** Which properties show, with an eye per row to change it. */
  visibleIds?: readonly string[]
  onVisibleIdsChange?: (ids: string[]) => void
  className?: string
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
      id: crypto.randomUUID(),
      name: `${property.name} copy`,
      isSystem: undefined,
    },
    ...properties.slice(index + 1),
  ]
}

function PropertyManager({
  properties,
  onPropertiesChange,
  conversion,
  visibleIds,
  onVisibleIdsChange,
  className,
}: PropertyManagerProps) {
  const change = (next: PropertyDefinition) =>
    onPropertiesChange(
      properties.map((entry) => (entry.id === next.id ? next : entry))
    )
  return (
    <section
      aria-label="Manage properties"
      data-slot="properties-manager"
      className={cn("cn-properties-manager flex flex-col", className)}
    >
      <SortableProvider
        axis="y"
        onMove={({ fromIndex, toIndex }) =>
          onPropertiesChange(moveEntry(properties, fromIndex, toIndex))
        }
      >
        <ul className="cn-properties-manager-list flex list-none flex-col">
          {properties.map((property, index) => (
            <PropertyManagerRow
              key={property.id}
              property={property}
              index={index}
              count={properties.length}
              conversion={conversion}
              isVisible={visibleIds?.includes(property.id)}
              onVisibleChange={
                visibleIds && onVisibleIdsChange
                  ? (isVisible) =>
                      onVisibleIdsChange(
                        isVisible
                          ? properties
                              .map(({ id }) => id)
                              .filter(
                                (id) =>
                                  id === property.id || visibleIds.includes(id)
                              )
                          : visibleIds.filter((id) => id !== property.id)
                      )
                  : undefined
              }
              onChange={change}
              onMove={(to) =>
                onPropertiesChange(moveEntry(properties, index, to))
              }
              onDuplicate={() =>
                onPropertiesChange(duplicateProperty(properties, property))
              }
              onRemove={() =>
                onPropertiesChange(
                  properties.filter((entry) => entry.id !== property.id)
                )
              }
            />
          ))}
        </ul>
      </SortableProvider>
      <PropertyAdd
        onPropertyAdd={(property) =>
          onPropertiesChange([...properties, property])
        }
      />
    </section>
  )
}

function PropertyManagerRow({
  property,
  index,
  count,
  conversion,
  isVisible,
  onVisibleChange,
  onChange,
  onMove,
  onDuplicate,
  onRemove,
}: {
  property: PropertyDefinition
  index: number
  count: number
  conversion?: PropertyConversionControls
  isVisible?: boolean
  onVisibleChange?: (isVisible: boolean) => void
  onChange: (property: PropertyDefinition) => void
  onMove: (to: number) => void
  onDuplicate: () => void
  onRemove: () => void
}) {
  const types = usePropertyTypes()
  const { attach, attachHandle, isDragging } = useSortableItem({
    id: property.id,
    index,
  })
  return (
    <li
      ref={attach}
      data-slot="properties-manager-row"
      data-property={property.id}
      data-dragging={isDragging || undefined}
      className="cn-properties-manager-row flex min-w-0 items-center"
      onKeyDown={(event) => {
        if (!event.altKey || !event.shiftKey) return
        const to =
          event.key === "ArrowUp"
            ? index - 1
            : event.key === "ArrowDown"
              ? index + 1
              : -1
        if (to < 0 || to >= count) return
        event.preventDefault()
        onMove(to)
      }}
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
      <ControlPopover
        label={`Edit ${property.name}`}
        triggerLabel={null}
        className="cn-properties-manager-trigger min-w-0 flex-1"
        layout="settings"
        trigger={
          <>
            <PropertyIcon property={property} />
            <span className="min-w-0 truncate">
              <span className="sr-only">Edit </span>
              {property.name}
            </span>
            <span className="cn-properties-kind ms-auto shrink-0">
              {getPropertyTypeName(property.type, types)}
            </span>
          </>
        }
      >
        <PropertySettings
          key={property.id}
          property={property}
          conversion={conversion}
          isOnCard={isVisible}
          onCardChange={onVisibleChange}
          onChange={onChange}
          onMoveUp={index > 0 ? () => onMove(index - 1) : undefined}
          onMoveDown={index < count - 1 ? () => onMove(index + 1) : undefined}
          onDuplicate={onDuplicate}
          onRemove={onRemove}
        />
      </ControlPopover>
      {onVisibleChange && (
        <ControlTooltip label={isVisible ? "Hide on cards" : "Show on cards"}>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Show ${property.name}`}
            aria-pressed={isVisible}
            className="cn-properties-eye"
            onClick={() => onVisibleChange(!isVisible)}
          >
            {isVisible ? (
              <IconPlaceholder
                lucide="EyeIcon"
                tabler="IconEye"
                hugeicons="EyeIcon"
                phosphor="EyeIcon"
                remixicon="RiEyeLine"
              />
            ) : (
              <IconPlaceholder
                lucide="EyeOffIcon"
                tabler="IconEyeClosed"
                hugeicons="ViewOffIcon"
                phosphor="EyeSlashIcon"
                remixicon="RiEyeOffLine"
              />
            )}
          </Button>
        </ControlTooltip>
      )}
    </li>
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
  const headings = React.useId()
  const text = name.trim()
  const suggested = text
    ? getPropertyType(suggestPropertyType(text), types)
    : null
  function add({ type, create }: PropertyTypeDefinition) {
    onPropertyAdd({
      ...create,
      id: crypto.randomUUID(),
      name: text || getPropertyTypeName(type, types),
      type,
    })
    setName("")
    setOpen(false)
  }
  const draw = (definition: PropertyTypeDefinition) => (
    <li key={definition.type}>
      <Button
        variant="ghost"
        className="cn-properties-type w-full"
        onClick={() => add(definition)}
      >
        <PropertyIcon property={{ type: definition.type }} />
        <span className="min-w-0 truncate">{definition.name}</span>
        {definition.description && (
          <span className="cn-properties-kind ms-auto min-w-0 truncate">
            {definition.description}
          </span>
        )}
      </Button>
    </li>
  )
  const groups = [
    ...(suggested
      ? [{ id: "suggested", name: "Suggested", items: [suggested] }]
      : []),
    ...groupPropertyTypes(
      getCreatableTypes(types).filter(
        (definition) => definition.type !== suggested?.type
      )
    ),
  ]
  return (
    <ControlPopover
      label={label}
      triggerLabel={null}
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setName("")
      }}
      isRaised
      className="cn-properties-add"
      layout="picker"
      trigger={
        <>
          <IconPlaceholder
            lucide="PlusIcon"
            tabler="IconPlus"
            hugeicons="PlusSignIcon"
            phosphor="PlusIcon"
            remixicon="RiAddLine"
          />
          {label}
        </>
      }
    >
      <div className="cn-properties-add-name">
        <Input
          autoFocus
          aria-label="Property name"
          placeholder="Property name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && suggested) {
              event.preventDefault()
              add(suggested)
            }
          }}
        />
      </div>
      <div className="cn-properties-types flex flex-col overflow-y-auto">
        {groups.map((group) => (
          <div key={group.id} className="cn-properties-type-group">
            <p
              id={`${headings}-${group.id}`}
              className="cn-properties-type-heading"
            >
              {group.name}
            </p>
            <ul
              aria-labelledby={`${headings}-${group.id}`}
              className="flex list-none flex-col gap-px"
            >
              {group.items.map(draw)}
            </ul>
          </div>
        ))}
      </div>
    </ControlPopover>
  )
}

export {
  duplicateProperty,
  PropertyAdd,
  PropertyManager,
  type PropertyManagerProps,
}
