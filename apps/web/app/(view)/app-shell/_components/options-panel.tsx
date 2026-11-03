"use client"

import * as React from "react"
import Link from "next/link"

import { RotateCcwIcon, SlidersHorizontalIcon } from "@/lib/site-icons"
import { Badge } from "@/styles/base-fabricator/ui/badge"
import { Button } from "@/styles/base-fabricator/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/styles/base-fabricator/ui/popover"
import { Separator } from "@/styles/base-fabricator/ui/separator"
import { Switch } from "@/styles/base-fabricator/ui/switch"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/styles/base-fabricator/ui/toggle-group"

import {
  countChangedOptions,
  isPeekAvailable,
  type PlaygroundOptions,
} from "../_lib/options"

type SetOptions = (options: Partial<PlaygroundOptions> | null) => void

function OptionRow({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-3">
      <label htmlFor={htmlFor} className="text-sm text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}

function OptionChoice<T extends string>({
  label,
  value,
  choices,
  disabled = false,
  onChange,
}: {
  label: string
  value: T
  choices: ReadonlyArray<{ value: T; label: string }>
  disabled?: boolean
  onChange: (value: T) => void
}) {
  return (
    <OptionRow label={label}>
      <ToggleGroup
        aria-label={label}
        variant="outline"
        size="sm"
        spacing={0}
        value={[value]}
        disabled={disabled}
        onValueChange={(next) => {
          // One choice: a press on the pressed item keeps it.
          const choice = choices.find((entry) => next.includes(entry.value))
          if (choice) onChange(choice.value)
        }}
      >
        {choices.map((choice) => (
          <ToggleGroupItem key={choice.value} value={choice.value}>
            {choice.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </OptionRow>
  )
}

function OptionSwitch({
  label,
  checked,
  disabled = false,
  onChange,
}: {
  label: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  const id = React.useId()
  return (
    <OptionRow label={label} htmlFor={id}>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    </OptionRow>
  )
}

function OptionSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section aria-label={title} className="flex flex-col px-4 py-3">
      <h2 className="pb-1 text-xs font-medium text-foreground">{title}</h2>
      {children}
    </section>
  )
}

/** The floating Options button and its panel of settings. */
export function OptionsPanel({
  options,
  setOptions,
}: {
  options: PlaygroundOptions
  setOptions: SetOptions
}) {
  const changed = countChangedOptions(options)

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center md:bottom-12">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-surface-3 p-1 shadow-surface-3">
        <Popover>
          <PopoverTrigger
            render={
              <Button variant="ghost" size="sm" className="rounded-full" />
            }
          >
            <SlidersHorizontalIcon data-icon="inline-start" />
            Options
            {changed > 0 && (
              <Badge variant="secondary" className="ms-0.5">
                {changed}
              </Badge>
            )}
          </PopoverTrigger>
          <PopoverContent
            side="top"
            sideOffset={10}
            className="max-h-[min(72svh,640px)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto p-0"
          >
            <OptionSection title="Sidebar">
              <OptionChoice
                label="Style"
                value={options.variant}
                choices={[
                  { value: "inset", label: "Inset" },
                  { value: "sidebar", label: "Flush" },
                  { value: "floating", label: "Floating" },
                ]}
                onChange={(variant) => setOptions({ variant })}
              />
              <OptionChoice
                label="Collapse"
                value={options.collapse}
                choices={[
                  { value: "icon", label: "Icons" },
                  { value: "offcanvas", label: "Hide" },
                  { value: "none", label: "Never" },
                ]}
                onChange={(collapse) => setOptions({ collapse })}
              />
              <OptionChoice
                label="Peek"
                value={options.peek}
                disabled={!isPeekAvailable(options)}
                choices={[
                  { value: "none", label: "Off" },
                  { value: "hover", label: "Hover" },
                  { value: "click", label: "Click" },
                ]}
                onChange={(peek) => setOptions({ peek })}
              />
              <OptionChoice
                label="Workspaces"
                value={options.switcher}
                choices={[
                  { value: "menu", label: "Menu" },
                  { value: "command", label: "Search" },
                  { value: "none", label: "None" },
                ]}
                onChange={(switcher) => setOptions({ switcher })}
              />
              <OptionChoice
                label="Account"
                value={options.account}
                choices={[
                  { value: "footer", label: "Bottom" },
                  { value: "header", label: "Top" },
                  { value: "none", label: "None" },
                ]}
                onChange={(account) => setOptions({ account })}
              />
              <OptionSwitch
                label="Drag to reorder"
                checked={options.reorder}
                onChange={(reorder) => setOptions({ reorder })}
              />
              <OptionSwitch
                label="Pin, hide and customize"
                checked={options.customize}
                onChange={(customize) => setOptions({ customize })}
              />
            </OptionSection>
            <Separator />
            <OptionSection title="Main">
              <OptionChoice
                label="Tabs"
                value={options.tabs}
                choices={[
                  { value: "none", label: "None" },
                  { value: "main", label: "Page" },
                  { value: "titlebar", label: "Titlebar" },
                ]}
                onChange={(tabs) => setOptions({ tabs })}
              />
              <OptionSwitch
                label="Breadcrumb"
                checked={options.breadcrumb}
                onChange={(breadcrumb) => setOptions({ breadcrumb })}
              />
              <OptionSwitch
                label="Header actions"
                checked={options.actions}
                onChange={(actions) => setOptions({ actions })}
              />
              <OptionSwitch
                label="Status bar"
                checked={options.status}
                onChange={(status) => setOptions({ status })}
              />
              <OptionSwitch
                label="Tab bar on phones"
                checked={options.bottomNav}
                onChange={(bottomNav) => setOptions({ bottomNav })}
              />
            </OptionSection>
            <Separator />
            <OptionSection title="Right panel">
              <OptionSwitch
                label="Panel"
                checked={options.panel}
                onChange={(panel) => setOptions({ panel })}
              />
              <OptionChoice
                label="On phones"
                value={options.panelMobile}
                disabled={!options.panel}
                choices={[
                  { value: "drawer", label: "Drawer" },
                  { value: "swap", label: "Screen" },
                  { value: "none", label: "None" },
                ]}
                onChange={(panelMobile) => setOptions({ panelMobile })}
              />
            </OptionSection>
            <Separator />
            <OptionSection title="Window">
              <OptionChoice
                label="Runs in"
                value={options.window}
                choices={[
                  { value: "web", label: "Browser" },
                  { value: "macos", label: "macOS" },
                  { value: "windows", label: "Windows" },
                ]}
                onChange={(runtime) => setOptions({ window: runtime })}
              />
              <OptionSwitch
                label="Fullscreen"
                checked={options.fullscreen}
                disabled={options.window === "web"}
                onChange={(fullscreen) => setOptions({ fullscreen })}
              />
              <OptionSwitch
                label="Glass sidebar"
                checked={options.glass}
                disabled={options.window === "web"}
                onChange={(glass) => setOptions({ glass })}
              />
              <OptionChoice
                label="Density"
                value={options.density}
                choices={[
                  { value: "compact", label: "Compact" },
                  { value: "default", label: "Default" },
                  { value: "spacious", label: "Spacious" },
                ]}
                onChange={(density) => setOptions({ density })}
              />
            </OptionSection>
            <Separator />
            <div className="flex items-center justify-between gap-2 px-4 py-3">
              <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                render={<Link href="/docs/components/base/app-shell" />}
              >
                Read the docs
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={changed === 0}
                onClick={() => setOptions(null)}
              >
                <RotateCcwIcon data-icon="inline-start" />
                Reset
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
