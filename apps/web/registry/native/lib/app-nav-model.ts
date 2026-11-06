// What App Nav works out about a row before drawing it: its state, the entries in
// its menu, and what a screen reader hears after a move. No React Native imports,
// so it stays testable anywhere.

import {
  containsNavItem,
  describeMove,
  findNavItem,
  getNavList,
  type NavGroup,
  type NavItem,
  type NavMove,
  type NavPreferences,
} from "@/registry/fabricator/shared/lib/app-shell-model"

/** Whether a list keeps an icon column: a row has an icon or children. */
export function hasIconColumn<TIcon>(items: NavItem<TIcon>[]) {
  return items.some(
    (item) => item.icon !== undefined || (item.children?.length ?? 0) > 0
  )
}

export function isNavGroupOpen<TIcon>(
  group: NavGroup<TIcon>,
  preferences: NavPreferences
) {
  return preferences.open[group.id] ?? group.defaultOpen ?? true
}

export function getNavRowState<TIcon>(
  item: NavItem<TIcon>,
  activeId: string | null,
  preferences: NavPreferences
) {
  const hasChildren = (item.children?.length ?? 0) > 0
  const isCurrent = item.id === activeId
  const holdsActive = !isCurrent && containsNavItem(item, activeId)
  return {
    hasChildren,
    isCurrent,
    holdsActive,
    // An explicit choice wins; otherwise open by default or to show the page.
    isOpen:
      hasChildren &&
      (preferences.open[item.id] ??
        ((item.defaultOpen ?? false) || holdsActive)),
  }
}

export type NavEntryAction =
  | { kind: "move"; toParentId: string; toIndex: number }
  | { kind: "pin"; pinned: boolean }
  | { kind: "hide" }
  | { kind: "select"; onSelect: () => void }

/** One line of a row's menu: its built-in entries and the item's own actions. */
export type NavRowEntry<TIcon> = {
  id: string
  label: string
  icon?: TIcon
  destructive?: boolean
  separatorBefore?: boolean
  disabled?: boolean
  action?: NavEntryAction
  children?: NavRowEntry<TIcon>[]
}

export function getNavRowEntries<TIcon>({
  item,
  parentId,
  index,
  count,
  reorderable,
  canChangeGroup,
  customizable,
  applied,
  preferences,
}: {
  item: NavItem<TIcon>
  /** The list it sits in: its group's id, or its parent item's. */
  parentId: string
  index: number
  count: number
  reorderable: boolean
  /** Top-level rows can move to another reorderable group. */
  canChangeGroup: boolean
  /** Adds Pin and Hide. */
  customizable: boolean
  applied: NavGroup<TIcon>[]
  preferences: NavPreferences
}): NavRowEntry<TIcon>[] {
  const entries: NavRowEntry<TIcon>[] = []

  if (reorderable) {
    entries.push(
      {
        id: "move-up",
        label: "Move up",
        disabled: index === 0,
        action: { kind: "move", toParentId: parentId, toIndex: index - 1 },
      },
      {
        id: "move-down",
        label: "Move down",
        disabled: index >= count - 1,
        action: { kind: "move", toParentId: parentId, toIndex: index + 1 },
      }
    )
    const targets = canChangeGroup
      ? applied.filter((group) => group.reorderable && group.id !== parentId)
      : []
    if (targets.length > 0) {
      entries.push({
        id: "move-to",
        label: "Move to",
        children: targets.map((target) => ({
          id: target.id,
          label: target.label ?? target.id,
          action: {
            kind: "move",
            toParentId: target.id,
            toIndex: target.items.length,
          },
        })),
      })
    }
  }

  if (customizable) {
    const isPinned = preferences.pinned.includes(item.id)
    entries.push(
      {
        id: "pin",
        label: isPinned ? "Unpin" : "Pin to top",
        separatorBefore: entries.length > 0,
        action: { kind: "pin", pinned: !isPinned },
      },
      { id: "hide", label: "Hide", action: { kind: "hide" } }
    )
  }

  const own = (item.actions ?? []).map(
    (action, position): NavRowEntry<TIcon> => ({
      id: action.id,
      label: action.label,
      icon: action.icon,
      destructive: action.destructive,
      separatorBefore:
        action.separatorBefore || (position === 0 && entries.length > 0),
      action: { kind: "select", onSelect: action.onSelect },
    })
  )
  return [...entries, ...own]
}

/** What a screen reader says after a move. */
export function getMoveAnnouncement<TIcon>(
  groups: NavGroup<TIcon>[],
  { id, toParentId, toIndex }: NavMove
) {
  const list = getNavList(groups, toParentId) ?? []
  const total = list.length + (list.some((entry) => entry.id === id) ? 0 : 1)
  const label = findNavItem(groups, id)?.label ?? id
  return describeMove(label, Math.min(toIndex, total - 1), total)
}
