"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { DemoColumn, DemoFrame } from "@/components/foundations/demo-frame"
import {
  MOTION_SPEED_NAMES,
  MOTION_SPEEDS,
  type MotionRole,
  type MotionSpeedName,
} from "@/registry/fabricator/motion"
import { Button } from "@/styles/base-fabricator/ui/button"
import { Checkbox } from "@/styles/base-fabricator/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/styles/base-fabricator/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/styles/base-fabricator/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/styles/base-fabricator/ui/popover"
import { Switch } from "@/styles/base-fabricator/ui/switch"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/styles/base-fabricator/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/styles/base-fabricator/ui/tooltip"

const SPEED_LABELS: Record<MotionSpeedName, string> = {
  smooth: "Smooth",
  default: "Default",
  snappy: "Snappy",
  instant: "Instant",
}

// Class names are written out in full so Tailwind generates them.
const TRACKS: { role: MotionRole; use: string; ball: string }[] = [
  {
    role: "feedback",
    use: "Hover, colour, focus, press",
    ball: "duration-feedback-exit ease-exit data-on:duration-feedback data-on:ease-feedback",
  },
  {
    role: "move",
    use: "Tab indicators, switches, selection, sidebar",
    ball: "duration-move-exit ease-exit data-on:duration-move data-on:ease-move",
  },
  {
    role: "popup",
    use: "Menus, selects, popovers, hover cards",
    ball: "duration-popup-exit ease-exit data-on:duration-popup data-on:ease-enter",
  },
  {
    role: "dialog",
    use: "Dialogs and their scrims",
    ball: "duration-dialog-exit ease-exit data-on:duration-dialog data-on:ease-enter",
  },
  {
    role: "sheet",
    use: "Sheets and drawers",
    ball: "duration-sheet-exit ease-drawer data-on:duration-sheet data-on:ease-drawer",
  },
]

/** The four speeds on one subtree: tracks per role and a few live controls. */
export function MotionSpeeds() {
  const [speed, setSpeed] = React.useState<MotionSpeedName>("default")
  const [on, setOn] = React.useState(false)
  const { durations } = MOTION_SPEEDS[speed]
  return (
    <DemoFrame
      className="flex-col flex-nowrap items-stretch gap-6"
      caption="data-motion on this frame sets the speed for everything inside it. Each ball enters on its role's duration and curve and returns on the quicker exit. The settings menu sets the speed for the whole site."
    >
      <ToggleGroup
        aria-label="Motion speed"
        value={[speed]}
        onValueChange={(next) => {
          const selected = MOTION_SPEED_NAMES.find((name) => name === next[0])
          if (selected) setSpeed(selected)
        }}
        spacing={1}
        size="sm"
        className="flex-wrap self-center"
      >
        {MOTION_SPEED_NAMES.map((name) => (
          <ToggleGroupItem
            key={name}
            value={name}
            className="rounded-full! px-3 text-[13px] text-muted-foreground aria-pressed:text-foreground"
          >
            {SPEED_LABELS[name]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div data-motion={speed} className="flex flex-col gap-5">
        {TRACKS.map((track) => (
          <button
            key={track.role}
            type="button"
            onClick={() => setOn((value) => !value)}
            className="flex flex-col gap-2 rounded-lg text-start outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <span className="flex items-baseline justify-between gap-4 px-1">
              <span className="text-[13px] font-medium text-foreground">
                {track.role}
              </span>
              <span className="text-[12px] text-muted-foreground">
                {durations[track.role].enter}ms in ·{" "}
                {durations[track.role].exit}ms out
              </span>
            </span>
            <span className="@container relative block h-9 rounded-full bg-muted p-1">
              <span
                data-on={on ? "" : undefined}
                className={cn(
                  "block size-7 rounded-full bg-foreground transition-transform data-on:translate-x-[calc(100cqw-1.75rem)] motion-reduce:transition-none",
                  track.ball
                )}
              />
            </span>
            <span className="px-1 text-[12px] text-muted-foreground">
              {track.use}
            </span>
          </button>
        ))}
        <div className="flex flex-wrap items-center justify-center gap-6 pt-2">
          <Switch defaultChecked aria-label="Switch" />
          <Checkbox defaultChecked aria-label="Checkbox" />
          <Button variant="outline" size="sm">
            Press and hold
          </Button>
          <Button size="sm" onClick={() => setOn((value) => !value)}>
            Replay
          </Button>
        </div>
      </div>
    </DemoFrame>
  )
}

/** Tooltip, menu, popover and dialog at the site's speed. */
export function MotionSurfaces() {
  return (
    <DemoFrame caption="These open in a portal at the end of the page, so they follow the speed on <html>: change Motion in the settings menu and open them again. Move between the two tooltips: the second one appears at once.">
      <div className="flex gap-2">
        <Tooltip>
          <TooltipTrigger render={<Button variant="outline" />}>
            Tooltip
          </TooltipTrigger>
          <TooltipContent>Grows from its trigger</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={<Button variant="outline" />}>
            And another
          </TooltipTrigger>
          <TooltipContent>No animation once one is open</TooltipContent>
        </Tooltip>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" />}>
          Menu
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          <DropdownMenuGroup>
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Sign out</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <Popover>
        <PopoverTrigger render={<Button variant="outline" />}>
          Popover
        </PopoverTrigger>
        <PopoverContent>
          <PopoverHeader>
            <PopoverTitle>Popover</PopoverTitle>
            <PopoverDescription>
              Scales up from the side of its trigger.
            </PopoverDescription>
          </PopoverHeader>
        </PopoverContent>
      </Popover>
      <Dialog>
        <DialogTrigger render={<Button variant="outline" />}>
          Dialog
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Dialog</DialogTitle>
            <DialogDescription>
              Grows from the centre and closes quicker than it opened.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Close
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DemoFrame>
  )
}

function Panel({ open, exit }: { open: boolean; exit: "same" | "faster" }) {
  return (
    <div className="flex h-36 w-full items-center justify-center rounded-xl bg-muted/50">
      <div
        data-open={open ? "" : undefined}
        className={cn(
          "flex w-40 scale-(--motion-dialog-scale) flex-col gap-1 rounded-xl bg-surface-5 p-4 opacity-0 shadow-surface-5 transition-[opacity,scale] motion-reduce:scale-100 data-open:scale-100 data-open:opacity-100 data-open:duration-dialog data-open:ease-enter",
          exit === "same"
            ? "duration-dialog ease-enter"
            : "duration-dialog-exit ease-exit"
        )}
      >
        <span className="text-[13px] font-semibold text-foreground">
          Invite people
        </span>
        <span className="text-[12px] text-muted-foreground">
          Opens on the dialog timing.
        </span>
      </div>
    </div>
  )
}

/** Same entrance, different exits. */
export function MotionExit() {
  const [left, setLeft] = React.useState(false)
  const [right, setRight] = React.useState(false)
  return (
    <DemoFrame
      className="items-start"
      caption="Both panels open the same way. Close the left one, then the right one: the left lingers on the way out."
    >
      <DemoColumn
        label="Exit as slow as the entrance"
        note="Drags on the way out"
        className="w-60"
      >
        <Panel open={left} exit="same" />
        <Button variant="outline" size="sm" onClick={() => setLeft((v) => !v)}>
          {left ? "Close" : "Open"}
        </Button>
      </DemoColumn>
      <DemoColumn
        label="Exit about 30% quicker"
        note="Gone before you look for it"
        className="w-60"
      >
        <Panel open={right} exit="faster" />
        <Button variant="outline" size="sm" onClick={() => setRight((v) => !v)}>
          {right ? "Close" : "Open"}
        </Button>
      </DemoColumn>
    </DemoFrame>
  )
}
