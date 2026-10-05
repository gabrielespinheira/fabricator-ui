"use client"

import * as React from "react"
import { cn } from "cn"
import {
  CircleIcon,
  MoonIcon,
  Settings2Icon,
  SquareIcon,
  SunIcon,
  Volume2Icon,
  VolumeXIcon,
} from "lucide-react"
import { useTheme } from "next-themes"

import {
  ICON_LIBRARIES,
  useSiteSetting,
  type SiteIconLibrary,
  type SiteRadius,
} from "@/lib/site-settings"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/styles/base-fabricator/ui/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/styles/base-fabricator/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/styles/base-fabricator/ui/toggle-group"

function subscribeNothing() {
  return () => {}
}

/** False during server rendering and hydration, true after. */
function useHydrated() {
  return React.useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false
  )
}

function SettingRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  const id = React.useId()

  return (
    <div className="flex h-10 items-center justify-between gap-3">
      <span id={id} className="text-[13px] text-muted-foreground">
        {label}
      </span>
      <div aria-labelledby={id} role="group" className="flex items-center">
        {children}
      </div>
    </div>
  )
}

/** Two icon buttons in a pill, like a segmented control. */
function Segmented<T extends string>({
  value,
  onValueChange,
  options,
  label,
}: {
  value: T
  onValueChange: (value: T) => void
  options: { value: T; label: string; icon: React.ReactNode }[]
  label: string
}) {
  return (
    <ToggleGroup
      aria-label={label}
      value={[value]}
      onValueChange={(next) => {
        // A segmented control always has one value: ignore deselection.
        const selected = next[0] as T | undefined
        if (selected && selected !== value) onValueChange(selected)
      }}
      spacing={0.5}
      size="sm"
      className="rounded-full bg-foreground/[0.06] p-0.5 data-[size=sm]:rounded-full [&_[data-slot^=fluid-hover]]:rounded-full"
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          aria-label={option.label}
          className="h-7 min-w-8 rounded-full! px-2 text-muted-foreground aria-pressed:text-foreground [&_svg]:size-4"
        >
          {option.icon}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

function SettingSelect<T extends string>({
  value,
  onValueChange,
  options,
  label,
}: {
  value: T
  onValueChange: (value: T) => void
  options: { value: T; label: string; icon?: React.ReactNode }[]
  label: string
}) {
  return (
    <Select
      items={options.map(({ value, label }) => ({ value, label }))}
      value={value}
      onValueChange={(next) => {
        if (typeof next === "string") onValueChange(next as T)
      }}
    >
      <SelectTrigger
        aria-label={label}
        size="sm"
        className="-me-2 gap-1.5 text-[13px] ring-0 hover:bg-hover"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end" className="min-w-40">
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.icon}
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

const RADII: { value: SiteRadius; label: string; icon: React.ReactNode }[] = [
  {
    value: "rounded",
    label: "Rounded",
    icon: <SquareIcon className="text-muted-foreground" />,
  },
  {
    value: "pill",
    label: "Pill",
    icon: <CircleIcon className="text-muted-foreground" />,
  },
]

/** Theme, sound, icons and radius: the rows of the settings menu. */
export function SiteSettingsFields({ className }: { className?: string }) {
  const hydrated = useHydrated()
  const { resolvedTheme, setTheme } = useTheme()
  const [sound, setSound] = useSiteSetting("sound")
  const [iconLibrary, setIconLibrary] = useSiteSetting("iconLibrary")
  const [radius, setRadius] = useSiteSetting("radius")

  return (
    <div className={cn("flex flex-col", className)}>
      <SettingRow label="Theme">
        <Segmented
          label="Theme"
          value={hydrated && resolvedTheme === "dark" ? "dark" : "light"}
          onValueChange={setTheme}
          options={[
            { value: "light", label: "Light", icon: <SunIcon /> },
            { value: "dark", label: "Dark", icon: <MoonIcon /> },
          ]}
        />
      </SettingRow>
      <SettingRow label="Sound">
        <Segmented
          label="Sound"
          value={sound ? "on" : "off"}
          onValueChange={(next) => setSound(next === "on")}
          options={[
            { value: "off", label: "Sound off", icon: <VolumeXIcon /> },
            { value: "on", label: "Sound on", icon: <Volume2Icon /> },
          ]}
        />
      </SettingRow>
      <SettingRow label="Icons">
        <SettingSelect<SiteIconLibrary>
          label="Icons"
          value={iconLibrary}
          onValueChange={setIconLibrary}
          options={ICON_LIBRARIES.map((library) => ({ ...library }))}
        />
      </SettingRow>
      <SettingRow label="Radius">
        <SettingSelect<SiteRadius>
          label="Radius"
          value={radius}
          onValueChange={setRadius}
          options={RADII}
        />
      </SettingRow>
    </div>
  )
}

/** The settings button and menu for the top bar and the docs sidebar. */
export function SiteSettingsMenu({
  className,
  align = "end",
}: {
  className?: string
  align?: "start" | "center" | "end"
}) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label="Settings"
        className={cn(
          "flex size-10 items-center justify-center rounded-full bg-muted text-foreground transition-colors duration-80 ease-spring outline-none hover:bg-active focus-visible:ring-1 focus-visible:ring-focus-ring data-popup-open:bg-active [&_svg]:size-4.5",
          className
        )}
      >
        <Settings2Icon />
      </PopoverTrigger>
      <PopoverContent align={align} sideOffset={8} className="w-64 p-3 py-2">
        <SiteSettingsFields />
      </PopoverContent>
    </Popover>
  )
}
