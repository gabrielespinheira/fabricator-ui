"use client"

import * as React from "react"
import { cn } from "cn"
import {
  CircleIcon,
  MonitorIcon,
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
  ROLE_PRESETS,
  SURFACE_PRESETS,
  useSiteSetting,
  type SiteIconLibrary,
  type SiteMotion,
  type SiteRadius,
} from "@/lib/site-settings"
import {
  roleToHex,
  sameRoleColor,
  type RoleColor,
} from "@/registry/fabricator/color-roles"
import {
  sameTint,
  tintToHex,
  type SurfaceTint,
} from "@/registry/fabricator/surface-tint"
import { Button } from "@/styles/base-fabricator/ui/button"
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
export function useHydrated() {
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

/** Icon buttons in a pill, like a segmented control (theme, sound). */
export function Segmented<T extends string>({
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
      className="rounded-lg bg-foreground/[0.06] p-0.5 [&_[data-slot^=fluid-hover]]:rounded-md"
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          aria-label={option.label}
          className="h-7 min-w-8 rounded-md! px-2 text-muted-foreground aria-pressed:text-foreground [&_svg]:size-4"
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

/** A dot in one colour, for the surface and primary options. */
function Swatch({ hex, className }: { hex: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-3 shrink-0 self-center rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)] dark:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.16)]",
        className
      )}
      style={{ backgroundColor: hex }}
    />
  )
}

/** A dot in the tint's colour, for the surface options. */
export function TintSwatch({
  tint,
  className,
}: {
  tint: SurfaceTint
  className?: string
}) {
  return <Swatch hex={tintToHex(tint)} className={className} />
}

/** A dot in the role's fill colour, for the colour role options. */
export function RoleSwatch({
  color,
  className,
}: {
  color: RoleColor
  className?: string
}) {
  return <Swatch hex={roleToHex(color)} className={className} />
}

type SwatchOption = { value: string; label: string; hex: string }

/**
 * Presets with a colour dot, plus "Custom" while a colour set on a
 * Foundations page matches none. The trigger shows the current dot; the list
 * opens below it, tall enough to need no scrolling.
 */
function SwatchSelect({
  label,
  options,
  selected,
  currentHex,
  onSelect,
}: {
  label: string
  options: SwatchOption[]
  selected: string | undefined
  currentHex: string
  onSelect: (value: string) => void
}) {
  const current = options.find((option) => option.value === selected)

  return (
    <Select
      items={[
        ...options.map(({ value, label }) => ({ value, label })),
        { value: "custom", label: "Custom" },
      ]}
      value={selected ?? "custom"}
      onValueChange={(next) => {
        if (typeof next === "string" && next !== "custom") onSelect(next)
      }}
    >
      <SelectTrigger
        aria-label={label}
        size="sm"
        className="-me-2 gap-1.5 text-[13px] ring-0 hover:bg-hover"
      >
        <SelectValue>
          {() => (
            <>
              <Swatch hex={currentHex} />
              {current?.label ?? "Custom"}
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
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <Swatch hex={option.hex} />
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
        {current ? null : (
          <>
            <SelectSeparator />
            <SelectGroup>
              <SelectItem value="custom">
                <Swatch hex={currentHex} />
                Custom
              </SelectItem>
            </SelectGroup>
          </>
        )}
      </SelectContent>
    </Select>
  )
}

const SURFACE_OPTIONS = SURFACE_PRESETS.map(({ value, label, tint }) => ({
  value,
  label,
  hex: tintToHex(tint),
}))

function SurfaceSelect() {
  const [surface, setSurface] = useSiteSetting("surface")

  return (
    <SwatchSelect
      label="Surface"
      options={SURFACE_OPTIONS}
      selected={
        SURFACE_PRESETS.find(({ tint }) => sameTint(tint, surface))?.value
      }
      currentHex={tintToHex(surface)}
      onSelect={(next) => {
        const preset = SURFACE_PRESETS.find(({ value }) => value === next)
        if (preset) setSurface(preset.tint)
      }}
    />
  )
}

const PRIMARY_PRESETS = ROLE_PRESETS.primary

const PRIMARY_OPTIONS = PRIMARY_PRESETS.map(({ value, label, color }) => ({
  value,
  label,
  hex: roleToHex(color),
}))

function PrimarySelect() {
  const [colors, setColors] = useSiteSetting("colors")

  return (
    <SwatchSelect
      label="Primary"
      options={PRIMARY_OPTIONS}
      selected={
        PRIMARY_PRESETS.find(({ color }) =>
          sameRoleColor(color, colors.primary)
        )?.value
      }
      currentHex={roleToHex(colors.primary)}
      onSelect={(next) => {
        const preset = PRIMARY_PRESETS.find(({ value }) => value === next)
        if (preset) setColors({ ...colors, primary: preset.color })
      }}
    />
  )
}

const THEMES = ["light", "system", "dark"] as const
type ThemeSetting = (typeof THEMES)[number]

function isThemeSetting(value: unknown): value is ThemeSetting {
  return THEMES.some((theme) => theme === value)
}

/**
 * Theme, sound, icons, radius, motion, surface and primary colour: the
 * settings menu rows.
 */
export function SiteSettingsFields({ className }: { className?: string }) {
  const hydrated = useHydrated()
  const { theme, setTheme } = useTheme()
  const [sound, setSound] = useSiteSetting("sound")
  const [iconLibrary, setIconLibrary] = useSiteSetting("iconLibrary")
  const [radius, setRadius] = useSiteSetting("radius")
  const [motion, setMotion] = useSiteSetting("motion")

  return (
    <div className={cn("flex flex-col", className)}>
      <SettingRow label="Theme">
        <Segmented
          label="Theme"
          value={hydrated && isThemeSetting(theme) ? theme : "system"}
          onValueChange={setTheme}
          options={[
            { value: "light", label: "Light", icon: <SunIcon /> },
            { value: "system", label: "System", icon: <MonitorIcon /> },
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
      <SettingRow label="Primary">
        <PrimarySelect />
      </SettingRow>
    </div>
  )
}

/** The settings button and menu for the top bar and the docs sidebar. */
export function SiteSettingsMenu({
  align = "end",
  size = "icon-lg",
}: {
  align?: "start" | "center" | "end"
  size?: "icon-sm" | "icon" | "icon-lg"
}) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label="Settings"
        render={<Button variant="ghost" size={size} />}
      >
        <Settings2Icon />
      </PopoverTrigger>
      <PopoverContent align={align} sideOffset={8} className="w-64 p-3 py-2">
        <SiteSettingsFields />
      </PopoverContent>
    </Popover>
  )
}
