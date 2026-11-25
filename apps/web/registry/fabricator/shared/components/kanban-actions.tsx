"use client"

// What can be done to cards, written once as menu data. A card's menu, its
// context menu and the selection bar all offer the same thing.
import * as React from "react"

import type {
  ControlMenuGroup,
  ControlMenuItem,
} from "@/registry/bases/__base__/components/property-controls"
import {
  PropertyAvatar,
  PropertyIcon,
  PropertyMark,
} from "@/registry/bases/__base__/components/property-icons"
import type { KanbanController } from "@/registry/bases/__base__/hooks/use-kanban"
import {
  isChoiceProperty,
  isMultiProperty,
  readPropertyKeys,
  togglePropertyOption,
  type PropertyDefinition,
} from "@/registry/bases/__base__/lib/property-model"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

/** Every column and lane a card can go to, as checks with its own place marked. */
function getKanbanMoveItems<Item>(
  board: KanbanController<Item>,
  ids: readonly string[]
): ControlMenuItem[] {
  const lanes = board.lanes?.length
    ? [...board.lanes, { id: null, name: "No lane" }]
    : [{ id: null, name: "" }]
  return lanes.flatMap((lane) =>
    board.groups.map(({ column, items }) => {
      const inside = items.filter(
        (item) => !board.getLaneId || board.getLaneId(item) === lane.id
      )
      const here = new Set(inside.map(board.getId))
      const isHere = ids.length > 0 && ids.every((id) => here.has(id))
      return {
        type: "check" as const,
        id: `${column.id}/${lane.id ?? ""}`,
        label: lane.name ? `${column.name} · ${lane.name}` : column.name,
        icon: <PropertyMark mark={column} />,
        isChecked: isHere,
        isDisabled:
          !isHere &&
          board.getMoveBlock(ids, column.id, inside.length, lane.id) !== null,
        onSelect: () => {
          if (!isHere) board.move(ids, column.id, inside.length, lane.id)
        },
      }
    })
  )
}

/** One choice property as a submenu. Several values keep it open. */
function getPropertyMenuItem<Item>(
  board: KanbanController<Item>,
  property: PropertyDefinition,
  ids: readonly string[]
): ControlMenuItem {
  const items = ids.flatMap((id) => board.byId.get(id) ?? [])
  const values = items.map((item) =>
    readPropertyKeys(board.getValue(item, property.id))
  )
  return {
    type: "submenu",
    id: property.id,
    label: property.name,
    icon: <PropertyIcon property={property} />,
    groups: [
      {
        id: property.id,
        items: (property.options ?? [])
          .filter(({ isArchived }) => !isArchived)
          .map((option) => ({
            type: "check" as const,
            id: option.value,
            label: option.label,
            icon:
              property.type === "person" ? (
                <PropertyAvatar person={option} />
              ) : (
                <PropertyMark mark={option} />
              ),
            isChecked:
              values.length > 0 &&
              values.every((keys) => keys.includes(option.value)),
            staysOpen: isMultiProperty(property),
            onSelect: () =>
              board.setValue(
                ids,
                property.id,
                togglePropertyOption(
                  property,
                  items.length ? board.getValue(items[0], property.id) : null,
                  option.value
                )
              ),
          })),
      },
    ],
  }
}

function getKanbanChoiceItems<Item>(
  board: KanbanController<Item>,
  ids: readonly string[]
) {
  return board.properties
    .filter(
      (property) =>
        isChoiceProperty(property) &&
        !property.isReadOnly &&
        property.id !== board.groupBy
    )
    .map((property) => getPropertyMenuItem(board, property, ids))
}

function getKanbanCardGroups<Item>(
  board: KanbanController<Item>,
  id: string,
  {
    onOpen,
    extra = [],
  }: { onOpen?: () => void; extra?: readonly ControlMenuItem[] }
): ControlMenuGroup[] {
  // A menu on a selected card acts on the whole selection.
  const ids =
    board.selectedIds.has(id) && board.selectedIds.size > 1
      ? [...board.selectedIds]
      : [id]
  const groups: ControlMenuGroup[] = [
    {
      id: "open",
      items: [
        ...(onOpen && ids.length === 1
          ? [
              {
                id: "open",
                label: "Open",
                icon: (
                  <IconPlaceholder
                    lucide="MaximizeIcon"
                    tabler="IconMaximize"
                    hugeicons="PlusSignIcon"
                    phosphor="PlusIcon"
                    remixicon="RiAddLine"
                  />
                ),
                shortcut: "↵",
                onSelect: onOpen,
              },
            ]
          : []),
        ...(ids.length === 1 ? extra : []),
      ],
    },
  ]
  if (!board.isMutable) return groups
  const place = board.groups.find(({ items }) =>
    items.some((item) => board.getId(item) === id)
  )
  const lane = board.byId.get(id)
  const laneId = lane !== undefined ? (board.getLaneId?.(lane) ?? null) : null
  const size = place?.items.length ?? 0
  groups.push(
    {
      id: "edit",
      items: [
        {
          type: "submenu",
          id: "move",
          label: "Move to",
          icon: (
            <IconPlaceholder
              lucide="ArrowRightIcon"
              tabler="IconArrowForward"
              hugeicons="ArrowRightIcon"
              phosphor="ShareFatIcon"
              remixicon="RiShareForwardLine"
            />
          ),
          groups: [{ id: "move", items: getKanbanMoveItems(board, ids) }],
        },
        ...getKanbanChoiceItems(board, ids),
      ],
    },
    {
      id: "order",
      items: [
        ...(place && !board.view.sort?.length
          ? [
              {
                id: "top",
                label: "Move to top",
                icon: (
                  <IconPlaceholder
                    lucide="ArrowUpIcon"
                    tabler="IconArrowUp"
                    hugeicons="ArrowUpIcon"
                    phosphor="ArrowUpIcon"
                    remixicon="RiArrowUpLine"
                  />
                ),
                onSelect: () => {
                  board.move(ids, place.column.id, 0, laneId)
                },
              },
              {
                id: "bottom",
                label: "Move to bottom",
                icon: (
                  <IconPlaceholder
                    lucide="ArrowDownIcon"
                    tabler="IconArrowDown"
                    hugeicons="ArrowDown02Icon"
                    phosphor="ArrowDownIcon"
                    remixicon="RiArrowDownLine"
                  />
                ),
                onSelect: () => {
                  board.move(ids, place.column.id, size, laneId)
                },
              },
            ]
          : []),
        {
          id: "select",
          label: board.selectedIds.has(id) ? "Deselect" : "Select",
          icon: (
            <IconPlaceholder
              lucide="SquareCheckIcon"
              tabler="IconSquareCheck"
              hugeicons="CheckmarkSquare02Icon"
              phosphor="CheckSquareIcon"
              remixicon="RiCheckboxLine"
            />
          ),
          shortcut: "X",
          onSelect: () => board.toggleSelection(id),
        },
      ],
    },
    {
      id: "danger",
      items: ids.every(board.canDelete)
        ? [
            {
              id: "delete",
              label: ids.length > 1 ? `Delete ${ids.length} cards` : "Delete",
              icon: (
                <IconPlaceholder
                  lucide="Trash2Icon"
                  tabler="IconTrash"
                  hugeicons="Delete02Icon"
                  phosphor="TrashIcon"
                  remixicon="RiDeleteBinLine"
                />
              ),
              shortcut: "⌫",
              variant: "destructive",
              onSelect: () => board.remove(ids),
            },
          ]
        : [],
    }
  )
  return groups
}

export { getKanbanCardGroups, getKanbanChoiceItems, getKanbanMoveItems }
