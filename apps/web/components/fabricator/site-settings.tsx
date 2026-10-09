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
  MOTION_SPEEDS,
  SURFACE_PRESETS,
  useSiteSetting,
  type SiteIconLibrary,
  type SiteMotion,
  type SiteRadius,
} from "@/lib/site-settings"
import {
  sameTint,
  tintToHex,
  type SurfaceTint,
} from "@/registry/fabricator/surface-tint"
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
  SelectSeparator,
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

/** A dot in the tint's colour, for the surface options. */
export function TintSwatch({
  tint,
  className,
}: {
  tint: SurfaceTint
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-3 shrink-0 self-center rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)] dark:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.16)]",
        className
      )}
      style={{ backgroundColor: tintToHex(tint) }}
    />
  )
}

/**
 * Surface presets, plus "Custom" while a colour from the Surfaces page is
 * set. The trigger shows the current swatch; the list opens below it, tall
 * enough to need no scrolling.
 */
function SurfaceSelect() {
  const [surface, setSurface] = useSiteSetting("surface")
  const preset = SURFACE_PRESETS.find(({ tint }) => sameTint(tint, surface))
  const value = preset?.value ?? "custom"

  return (
    <Select
      items={[
        ...SURFACE_PRESETS.map(({ value, label }) => ({ value, label })),
        { value: "custom", label: "Custom" },
      ]}
      value={value}
      onValueChange={(next) => {
        const selected = SURFACE_PRESETS.find((option) => option.value === next)
        if (selected) setSurface(selected.tint)
      }}
    >
      <SelectTrigger
        aria-label="Surface"
        size="sm"
        className="-me-2 gap-1.5 text-[13px] ring-0 hover:bg-hover"
      >
        <SelectValue>
          {() => (
            <>
              <TintSwatch tint={surface} />
              {preset?.label ?? "Custom"}
            </>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        align="end"
        alignItemWithTrigger={false}
        className="min-w-40"
      >
        <SelectGroup>
          {SURFACE_PRESETS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <TintSwatch tint={option.tint} />
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
        {preset ? null : (
          <>
            <SelectSeparator />
            <SelectGroup>
              <SelectItem value="custom">
                <TintSwatch tint={surface} />
                Custom
              </SelectItem>
            </SelectGroup>
          </>
        )}
      </SelectContent>
    </Select>
  )
}

/** Theme, sound, icons, radius, motion and surface: the settings menu rows. */
export function SiteSettingsFields({ className }: { className?: string }) {
  const hydrated = useHydrated()
  const { resolvedTheme, setTheme } = useTheme()
  const [sound, setSound] = useSiteSetting("sound")
  const [iconLibrary, setIconLibrary] = useSiteSetting("iconLibrary")
  const [radius, setRadius] = useSiteSetting("radius")
  const [motion, setMotion] = useSiteSetting("motion")

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
      <SettingRow label="Motion">
        <SettingSelect<SiteMotion>
          label="Motion"
          value={motion}
          onValueChange={setMotion}
          options={MOTION_SPEEDS.map(({ value, label }) => ({ value, label }))}
        />
      </SettingRow>
      <SettingRow label="Surface">
        <SurfaceSelect />
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
          "flex size-10 items-center justify-center rounded-full bg-muted text-foreground transition-colors duration-fast ease-spring outline-none hover:bg-active focus-visible:ring-1 focus-visible:ring-focus-ring data-popup-open:bg-active [&_svg]:size-4.5",
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
