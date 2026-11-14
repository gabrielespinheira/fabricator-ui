"use client"

import * as React from "react"
import { cn } from "cn"
import { createPortal } from "react-dom"

import { useDensity } from "@/registry/bases/__base__/ui/density"

export type AvatarParting = "before" | "active" | "after"

/** Where an item goes while the group parts around the active one. */
export function getAvatarParting(
  index: number,
  activeIndex: number | null
): AvatarParting | undefined {
  if (activeIndex === null) return undefined
  if (index === activeIndex) return "active"
  return index < activeIndex ? "before" : "after"
}

type TreeNode = { parentNode: TreeNode | null }

/** The index of the group's item that holds `target`, if any. */
export function getAvatarGroupItemIndex(
  group: TreeNode & { children: ArrayLike<TreeNode> },
  target: TreeNode | null
): number | null {
  let node = target
  while (node && node.parentNode !== group) node = node.parentNode
  if (!node) return null
  const index = Array.from(group.children).indexOf(node)
  return index === -1 ? null : index
}

type Rect = { left: number; top: number; width: number; height: number }
type Size = { width: number; height: number }

// How close the label comes to the viewport's edge.
const EDGE = 8

/**
 * Where a group's name label goes: centred over the active avatar, `gap` above
 * it once it has lifted, or below it when the top has no room, and kept inside
 * the viewport.
 */
export function getAvatarGroupLabelPosition({
  item,
  label,
  viewport,
  gap,
  lift,
}: {
  item: Rect
  label: Size
  viewport: Size
  gap: number
  lift: number
}): { x: number; y: number; side: "top" | "bottom" } {
  const centred = item.left + item.width / 2 - label.width / 2
  const x = Math.min(
    Math.max(centred, EDGE),
    viewport.width - label.width - EDGE
  )
  const top = item.top - lift - gap - label.height
  if (top >= EDGE) return { x, y: top, side: "top" }
  return { x, y: item.top + item.height + gap, side: "bottom" }
}

// Hands a node to the group's own ref, whichever kind it is.
function assignRef<T>(ref: React.Ref<T> | undefined, node: T) {
  if (typeof ref === "function") return ref(node)
  if (ref) ref.current = node
}

function getTargetNode(target: EventTarget) {
  return target instanceof Node ? target : null
}

type GroupProps = Pick<
  React.ComponentProps<"div">,
  "ref" | "onPointerOver" | "onPointerLeave" | "onFocus" | "onBlur"
>

/**
 * Parts an avatar group around one avatar, as beUI's does. The avatar a mouse
 * enters stays active until the pointer leaves the whole group, so avatars
 * sliding under the pointer never hand the hover back and forth, and a gap
 * between them changes nothing. Keyboard focus parts it too. Each item gets
 * `data-parting` for the style map; the group's own handlers and ref still run.
 */
export function useAvatarGroupParting({
  ref,
  onPointerOver,
  onPointerLeave,
  onFocus,
  onBlur,
}: GroupProps) {
  const group = React.useRef<HTMLDivElement | null>(null)
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null)
  const [focusIndex, setFocusIndex] = React.useState<number | null>(null)
  const activeIndex = hoverIndex ?? focusIndex

  // After every commit, since items can come and go.
  React.useLayoutEffect(() => {
    if (!group.current) return
    Array.from(group.current.children).forEach((item, index) => {
      const parting = getAvatarParting(index, activeIndex)
      if (parting) item.setAttribute("data-parting", parting)
      else item.removeAttribute("data-parting")
    })
  })

  const groupProps: GroupProps = {
    ref: (node: HTMLDivElement | null) => {
      group.current = node
      return assignRef(ref, node)
    },
    onPointerOver: (event) => {
      onPointerOver?.(event)
      if (event.pointerType !== "mouse") return
      const index = getAvatarGroupItemIndex(
        event.currentTarget,
        getTargetNode(event.target)
      )
      if (index !== null) setHoverIndex(index)
    },
    onPointerLeave: (event) => {
      onPointerLeave?.(event)
      setHoverIndex(null)
    },
    onFocus: (event) => {
      onFocus?.(event)
      if (!event.target.matches(":focus-visible")) return
      setFocusIndex(getAvatarGroupItemIndex(event.currentTarget, event.target))
    },
    onBlur: (event) => {
      onBlur?.(event)
      if (event.currentTarget.contains(event.relatedTarget)) return
      setFocusIndex(null)
    },
  }
  return { groupProps, group, activeIndex }
}

/** The names a group's avatars put in its label, by the avatar's id. */
export function useAvatarGroupNames() {
  const [names, setNames] = React.useState<
    ReadonlyMap<string, React.ReactNode>
  >(() => new Map())
  const register = React.useCallback((id: string, name: React.ReactNode) => {
    setNames((current) =>
      current.has(id) && current.get(id) === name
        ? current
        : new Map(current).set(id, name)
    )
    return () =>
      setNames((current) => {
        if (!current.has(id)) return current
        const next = new Map(current)
        next.delete(id)
        return next
      })
  }, [])
  return { names, register }
}

// The attribute an avatar carries to find its name in the label.
const NAME_ID = "data-avatar-name"

/** Props for an avatar whose name shows in its group's label. */
export function useAvatarGroupName(
  register: ((id: string, name: React.ReactNode) => () => void) | null,
  name: React.ReactNode
) {
  const id = React.useId()
  React.useEffect(() => register?.(id, name), [register, id, name])
  return { [NAME_ID]: id }
}

// The gap between the label and the avatar, and how far the active avatar
// lifts (registry/styles/fabricator/avatar.css).
//
// The label's attributes (data-shown, data-label-side, data-open) are ones no
// `:has()` rule tests: a keyed one, such as data-active or data-side, restyles
// the whole document on a page with ancestor `:has()` rules.
const LABEL_GAP = 4
const ACTIVE_LIFT = 3
const ACTIVE_SCALE = 1.06

// The item's box without the parting's transforms: the group is its offset
// parent.
function getLayoutRect(group: HTMLElement, item: HTMLElement): Rect {
  const box = group.getBoundingClientRect()
  return {
    left: box.left + item.offsetLeft,
    top: box.top + item.offsetTop,
    width: item.offsetWidth,
    height: item.offsetHeight,
  }
}

/**
 * The group's name label: one chip, mounted with the group and holding every
 * name, that shows the active avatar's and glides to it on the settle spring.
 * A tooltip per avatar would mount, unmount and retext at every step, and on a
 * page with ancestor `:has()` rules each of those restyles the whole document,
 * which stalls the parting. Switching here only flips attributes and moves the
 * chip with `translate`. Hidden from assistive tech: each avatar is named by
 * its own `aria-label`.
 */
export function AvatarGroupLabel({
  group,
  activeIndex,
  names,
}: {
  group: React.RefObject<HTMLDivElement | null>
  activeIndex: number | null
  names: ReadonlyMap<string, React.ReactNode>
}) {
  const density = useDensity()
  const label = React.useRef<HTMLDivElement>(null)
  const [isMounted, setIsMounted] = React.useState(false)
  React.useEffect(() => setIsMounted(true), [])

  React.useLayoutEffect(() => {
    const node = label.current
    const groupNode = group.current
    if (!node || !groupNode) return
    const item =
      activeIndex === null ? undefined : groupNode.children[activeIndex]
    const avatar = item?.matches(`[${NAME_ID}]`)
      ? item
      : item?.querySelector(`[${NAME_ID}]`)
    const id = avatar?.getAttribute(NAME_ID)
    if (!(item instanceof HTMLElement) || !id || !names.has(id)) {
      // The last name stays while the chip fades out.
      node.removeAttribute("data-open")
      return
    }
    for (const name of Array.from(node.querySelectorAll("[data-name]"))) {
      name.toggleAttribute("data-shown", name.getAttribute("data-name") === id)
    }
    const place = () => {
      const position = getAvatarGroupLabelPosition({
        item: getLayoutRect(groupNode, item),
        label: { width: node.offsetWidth, height: node.offsetHeight },
        viewport: { width: window.innerWidth, height: window.innerHeight },
        gap: LABEL_GAP,
        // The lift, and the half of the growth that goes upwards.
        lift: ACTIVE_LIFT + (item.offsetHeight * (ACTIVE_SCALE - 1)) / 2,
      })
      node.style.translate = `${position.x}px ${position.y}px`
      node.setAttribute("data-label-side", position.side)
    }
    if (node.hasAttribute("data-open")) {
      place()
    } else {
      // Placed while closed, so it appears where it is rather than gliding in.
      place()
      void node.offsetWidth
      node.setAttribute("data-open", "")
    }
    // Scrolling under a resting pointer moves the avatar: the chip follows at
    // once instead of gliding after it.
    const follow = () => {
      node.setAttribute("data-instant", "")
      place()
      requestAnimationFrame(() => node.removeAttribute("data-instant"))
    }
    window.addEventListener("scroll", follow, { capture: true, passive: true })
    window.addEventListener("resize", follow)
    return () => {
      window.removeEventListener("scroll", follow, { capture: true })
      window.removeEventListener("resize", follow)
    }
  }, [activeIndex, group, names])

  if (!isMounted || names.size === 0) return null
  return createPortal(
    <div
      ref={label}
      aria-hidden
      data-slot="avatar-group-label"
      data-density={density}
      className={cn(
        "cn-avatar-group-label pointer-events-none fixed top-0 left-0 z-50 w-max select-none"
      )}
    >
      <div className={cn("cn-avatar-group-label-chip")}>
        {Array.from(names, ([id, name]) => (
          <span key={id} data-name={id} className="not-data-shown:hidden">
            {name}
          </span>
        ))}
      </div>
    </div>,
    document.body
  )
}
