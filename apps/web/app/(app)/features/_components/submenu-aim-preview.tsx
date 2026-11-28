"use client"

import * as React from "react"
import {
  ChevronRightIcon,
  CopyIcon,
  ExternalLinkIcon,
  FolderInputIcon,
  PencilIcon,
  ShareIcon,
  TagIcon,
  TrashIcon,
  type IconComponent,
} from "@fabricator-ui/icons"

import { cn } from "@/lib/utils"
import {
  initialSubmenuAim,
  stepSubmenuAim,
  SUBMENU_AIM_REST_MS,
  type AimPoint,
  type AimRect,
} from "@/styles/base-fabricator/lib/submenu-aim-model"
import { Button } from "@/styles/base-fabricator/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/styles/base-fabricator/ui/dropdown-menu"
import { Label } from "@/styles/base-fabricator/ui/label"
import { Switch } from "@/styles/base-fabricator/ui/switch"

import { getAimTriangle } from "../_lib/aim-triangle"
import { PreviewStage } from "./preview-stage"

type Row = {
  label: string
  icon: IconComponent
  submenu?: string[]
}

const ROWS: Row[] = [
  { label: "Open", icon: ExternalLinkIcon },
  { label: "Duplicate", icon: CopyIcon },
  {
    label: "Share",
    icon: ShareIcon,
    submenu: ["Copy link", "Email", "Message", "Invite people", "Embed"],
  },
  {
    label: "Move to",
    icon: FolderInputIcon,
    submenu: ["Desktop", "Documents", "Downloads", "Projects", "Archive"],
  },
  {
    label: "Label",
    icon: TagIcon,
    submenu: ["Red", "Orange", "Green", "Blue"],
  },
  { label: "Rename", icon: PencilIcon },
  { label: "Move to trash", icon: TrashIcon },
]

const ROW =
  "flex h-8 items-center gap-2 rounded-lg px-2 text-[13px] text-muted-foreground transition-colors duration-feedback ease-feedback [&_svg]:size-4 [&_svg]:shrink-0"

function toAimRect(rect: DOMRect): AimRect {
  return {
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
  }
}

function findRow(label: string | undefined) {
  return ROWS.find((row) => row.label === label)
}

// A drawing of a menu that runs the real submenu-aim model, with the safe
// triangle drawn as the pointer moves. It is a picture for the pointer:
// keyboard and screen reader users get the real menu beside it.
function AimDiagram({ isAimOn }: { isAimOn: boolean }) {
  const stageRef = React.useRef<HTMLDivElement>(null)
  const submenuRef = React.useRef<HTMLDivElement>(null)
  const rowElements = React.useRef(new Map<string, HTMLDivElement>())
  const aimRef = React.useRef(initialSubmenuAim)
  const restTimer = React.useRef<number | undefined>(undefined)
  const pointerRow = React.useRef<string | undefined>(undefined)

  const [activeRow, setActiveRow] = React.useState<string>()
  const [openRow, setOpenRow] = React.useState("Share")
  const [submenuTop, setSubmenuTop] = React.useState(0)
  const [activeItem, setActiveItem] = React.useState<string>()
  const [triangle, setTriangle] = React.useState<AimPoint[] | null>(null)
  const [isAiming, setIsAiming] = React.useState(false)

  React.useEffect(() => () => window.clearTimeout(restTimer.current), [])

  // The submenu lines its first row up with its trigger, as a real one does.
  React.useLayoutEffect(() => {
    const row = rowElements.current.get(openRow)
    const stage = stageRef.current
    if (!row || !stage) return
    setSubmenuTop(
      row.getBoundingClientRect().top - stage.getBoundingClientRect().top - 4
    )
  }, [openRow])

  const applyRow = React.useCallback((label: string | undefined) => {
    const row = findRow(label)
    if (!row) return
    setActiveRow(row.label)
    if (!row.submenu) return
    aimRef.current = initialSubmenuAim
    setOpenRow(row.label)
  }, [])

  function releaseAim() {
    window.clearTimeout(restTimer.current)
    aimRef.current = initialSubmenuAim
    setIsAiming(false)
    setTriangle(null)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return
    const target = event.target
    if (!(target instanceof Element)) return
    const stage = stageRef.current
    const submenu = submenuRef.current
    if (!stage || !submenu) return

    if (target.closest("[data-submenu]")) {
      releaseAim()
      setActiveRow(openRow)
      setActiveItem(
        target.closest<HTMLElement>("[data-item]")?.dataset.item ?? undefined
      )
      return
    }
    setActiveItem(undefined)
    pointerRow.current = target.closest<HTMLElement>("[data-row]")?.dataset.row

    const point = { x: event.clientX, y: event.clientY }
    const submenuRect = toAimRect(submenu.getBoundingClientRect())
    aimRef.current = stepSubmenuAim(aimRef.current, point, submenuRect, "right")
    const isHeld = isAimOn && aimRef.current.isAiming
    setIsAiming(isHeld)

    const stageRect = stage.getBoundingClientRect()
    const corners = isAimOn ? getAimTriangle(point, submenuRect, "right") : null
    setTriangle(
      corners?.map((corner) => ({
        x: corner.x - stageRect.left,
        y: corner.y - stageRect.top,
      })) ?? null
    )

    window.clearTimeout(restTimer.current)
    if (!isHeld) {
      applyRow(pointerRow.current)
      return
    }
    // A pointer that stops inside the triangle has changed its mind.
    restTimer.current = window.setTimeout(() => {
      aimRef.current = initialSubmenuAim
      setIsAiming(false)
      applyRow(pointerRow.current)
    }, SUBMENU_AIM_REST_MS)
  }

  function handlePointerLeave() {
    releaseAim()
    setActiveRow(undefined)
    setActiveItem(undefined)
  }

  const open = findRow(openRow)

  return (
    <div
      ref={stageRef}
      aria-hidden="true"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative flex w-full max-w-[25rem] cursor-default justify-start pt-4 pb-12 select-none"
    >
      <div className="relative w-44 shrink-0 rounded-xl bg-surface-3 p-1 shadow-surface-3">
        {ROWS.map((row) => {
          const isLit = row.label === activeRow || row.label === openRow
          return (
            <React.Fragment key={row.label}>
              {row.label === "Share" || row.label === "Rename" ? (
                <div className="mx-2 my-1 h-px bg-border/60" />
              ) : null}
              <div
                ref={(element) => {
                  if (element) rowElements.current.set(row.label, element)
                }}
                data-row={row.label}
                className={cn(
                  ROW,
                  isLit && "bg-hover text-foreground",
                  row.label === "Move to trash" && "text-destructive-text"
                )}
              >
                <row.icon />
                <span className="flex-1 truncate">{row.label}</span>
                {row.submenu ? <ChevronRightIcon /> : null}
              </div>
            </React.Fragment>
          )
        })}
      </div>
      <div
        ref={submenuRef}
        data-submenu=""
        style={{ top: submenuTop }}
        className="absolute left-48 w-36 rounded-xl bg-surface-3 p-1 shadow-surface-3 sm:left-52"
      >
        {open?.submenu?.map((item) => (
          <div
            key={item}
            data-item={item}
            className={cn(
              ROW,
              "pl-3",
              item === activeItem && "bg-hover text-foreground"
            )}
          >
            {item}
          </div>
        ))}
      </div>
      {triangle ? (
        <svg className="pointer-events-none absolute inset-0 size-full overflow-visible">
          <polygon
            points={triangle.map(({ x, y }) => `${x},${y}`).join(" ")}
            strokeWidth={1}
            strokeLinejoin="round"
            className={cn(
              "transition-colors duration-feedback",
              isAiming
                ? "fill-info/15 stroke-info"
                : "fill-muted-foreground/5 stroke-muted-foreground/40"
            )}
          />
        </svg>
      ) : null}
      <p className="absolute right-0 bottom-0 left-0 text-center text-[12px] text-muted-foreground sm:text-start">
        {isAimOn
          ? isAiming
            ? `Heading for ${openRow}: the rows below wait`
            : "Move from Share straight to its submenu"
          : "Off: every row you cross takes over"}
      </p>
    </div>
  )
}

function RealMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        Try the real menu
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <ExternalLinkIcon />
            Open
          </DropdownMenuItem>
          <DropdownMenuItem>
            <CopyIcon />
            Duplicate
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {ROWS.filter((row) => row.submenu).map((row) => (
            <DropdownMenuSub key={row.label}>
              <DropdownMenuSubTrigger>
                <row.icon />
                {row.label}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-36">
                <DropdownMenuGroup>
                  {row.submenu?.map((item) => (
                    <DropdownMenuItem key={item}>{item}</DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function SubmenuAimPreview() {
  const [isAimOn, setIsAimOn] = React.useState(true)

  return (
    <PreviewStage
      caption="Turn the triangle off and try the same move."
      controls={
        <>
          <span className="flex items-center gap-2">
            <Switch
              id="feature-submenu-aim"
              checked={isAimOn}
              onCheckedChange={setIsAimOn}
            />
            <Label htmlFor="feature-submenu-aim">Safe triangle</Label>
          </span>
          <RealMenu />
        </>
      }
    >
      <AimDiagram isAimOn={isAimOn} />
    </PreviewStage>
  )
}
