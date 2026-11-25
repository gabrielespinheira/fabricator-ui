"use client"

import * as React from "react"

import {
  getToolbarFit,
  type ToolbarItem,
} from "@/registry/bases/__base__/lib/editor-surface-model"

// Fits the editor's toolbar to the room it has: the commands that don't fit
// hide and are listed for the More menu. It reads layout sizes, which a
// dialog's entrance scale doesn't change, and works on whatever controls the
// toolbar holds.

type ToolbarElement = ToolbarItem & {
  element: HTMLElement
  group: HTMLElement | null
}

function getKind(element: HTMLElement): ToolbarItem["kind"] {
  if (element.dataset.slot === "editor-toolbar-separator") return "separator"
  return element.dataset.command ? "command" : "control"
}

/** The row's controls in order, looking inside groups, without the ones not drawn. */
function getToolbarElements(list: HTMLElement): ToolbarElement[] {
  const children = Array.from(list.children).flatMap(
    (child): Pick<ToolbarElement, "element" | "group">[] => {
      if (!(child instanceof HTMLElement)) return []
      if (child.dataset.slot !== "editor-toolbar-group") {
        return [{ element: child, group: null }]
      }
      return Array.from(child.children).flatMap((element) =>
        element instanceof HTMLElement ? [{ element, group: child }] : []
      )
    }
  )
  const drawn = children.filter(({ element }) => element.offsetWidth > 0)
  const origin = drawn[0]?.element.offsetLeft ?? 0
  return drawn.map(({ element, group }) => {
    const start = element.offsetLeft - origin
    return {
      element,
      group,
      kind: getKind(element),
      start,
      end: start + element.offsetWidth,
    }
  })
}

function getContentWidth(element: HTMLElement) {
  const style = getComputedStyle(element)
  return (
    element.clientWidth -
    Number.parseFloat(style.paddingLeft) -
    Number.parseFloat(style.paddingRight)
  )
}

/** Hides what doesn't fit and returns the hidden commands, group by group. */
function fitToolbar(toolbar: HTMLElement, list: HTMLElement): string[][] {
  for (const element of list.querySelectorAll("[data-overflowed]")) {
    element.removeAttribute("data-overflowed")
  }
  toolbar.removeAttribute("data-compact")
  toolbar.removeAttribute("data-overflowing")
  const available = getContentWidth(list)
  const full = getToolbarElements(list)
  const total = full[full.length - 1]?.end ?? 0
  // The whole row's width, so hiding part of it never narrows a parent that
  // sizes to its content.
  const padding = list.clientWidth - available
  toolbar.style.setProperty("--editor-toolbar-size", `${total + padding}px`)
  // Offsets are whole pixels, so a row can read a pixel wider than it is.
  if (total <= available + 1) return []

  toolbar.setAttribute("data-overflowing", "")
  const availableWithMore = getContentWidth(list)
  const fit = (items: ToolbarElement[]) =>
    getToolbarFit({ items, available, availableWithMore })

  let items = full
  let isHidden = fit(items)
  const losesEssentials = items.some(
    (item, index) =>
      isHidden[index] && item.group?.hasAttribute("data-essential")
  )
  if (losesEssentials) {
    toolbar.setAttribute("data-compact", "")
    items = getToolbarElements(list)
    isHidden = fit(items)
  }

  const groups = new Map<HTMLElement | null, string[]>()
  const visibleGroups = new Set<HTMLElement | null>()
  for (const [index, { element, group }] of items.entries()) {
    element.toggleAttribute("data-overflowed", isHidden[index])
    if (!isHidden[index]) {
      visibleGroups.add(group)
      continue
    }
    const command = element.dataset.command
    if (command) groups.set(group, [...(groups.get(group) ?? []), command])
  }
  for (const group of groups.keys()) {
    group?.toggleAttribute("data-overflowed", !visibleGroups.has(group))
  }
  const hidden = Array.from(groups.values())
  toolbar.toggleAttribute("data-overflowing", hidden.length > 0)
  return hidden
}

function isSameGroups(first: string[][], second: string[][]) {
  return JSON.stringify(first) === JSON.stringify(second)
}

/** The commands the toolbar has no room for, kept in step with its width. */
function useEditorToolbar(
  toolbarRef: React.RefObject<HTMLElement | null>,
  listRef: React.RefObject<HTMLElement | null>
) {
  const [hidden, setHidden] = React.useState<string[][]>([])

  const fit = React.useCallback(() => {
    const toolbar = toolbarRef.current
    const list = listRef.current
    if (!toolbar || !list) return
    const next = fitToolbar(toolbar, list)
    setHidden((current) => (isSameGroups(current, next) ? current : next))
  }, [toolbarRef, listRef])

  // A render may have added or removed controls.
  React.useLayoutEffect(fit)

  React.useEffect(() => {
    const toolbar = toolbarRef.current
    const list = listRef.current
    if (!toolbar || !list) return
    const observer = new ResizeObserver(fit)
    observer.observe(toolbar)
    // A control's label can change width on its own, as Turn into's does.
    for (const { element, kind } of getToolbarElements(list)) {
      if (kind === "control") observer.observe(element)
    }
    return () => observer.disconnect()
  }, [toolbarRef, listRef, fit, hidden])

  return hidden
}

export { useEditorToolbar }
