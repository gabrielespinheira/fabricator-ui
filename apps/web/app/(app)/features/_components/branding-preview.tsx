"use client"

import * as React from "react"
import {
  ChartColumnIcon,
  CreditCardIcon,
  HouseIcon,
  MoonIcon,
  SunIcon,
  UsersIcon,
} from "@fabricator-ui/icons"

import { cn } from "@/lib/utils"
import {
  RoleSwatch,
  Segmented,
  TintSwatch,
} from "@/components/fabricator/site-settings"
import { getShapeStyle } from "@/components/foundations/radius-demos"
import { THEME_VARS } from "@/components/foundations/theme-vars"
import {
  DENSITY_OPTIONS,
  ROLE_PRESETS,
  SURFACE_PRESETS,
} from "@/registry/fabricator/look-presets"
import {
  MOTION_SPEED_NAMES,
  type MotionSpeedName,
} from "@/registry/fabricator/motion"
import { Badge } from "@/styles/base-fabricator/ui/badge"
import { Button } from "@/styles/base-fabricator/ui/button"
import { Checkbox } from "@/styles/base-fabricator/ui/checkbox"
import { DensityProvider } from "@/styles/base-fabricator/ui/density"
import { Label } from "@/styles/base-fabricator/ui/label"
import { Progress } from "@/styles/base-fabricator/ui/progress"
import { Switch } from "@/styles/base-fabricator/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/styles/base-fabricator/ui/tabs"

import { getBrandVars } from "../_lib/branding"
import { PreviewStage } from "./preview-stage"

type Mode = keyof typeof THEME_VARS

const MODE_OPTIONS: { value: Mode; label: string; icon: React.ReactNode }[] = [
  { value: "light", label: "Light", icon: <SunIcon /> },
  { value: "dark", label: "Dark", icon: <MoonIcon /> },
]

const BRAND_VALUES = [
  "neutral",
  "blue",
  "violet",
  "pink",
  "orange",
  "green",
  "teal",
]
const BRANDS = ROLE_PRESETS.primary.filter((preset) =>
  BRAND_VALUES.includes(preset.value)
)

const SURFACE_VALUES = ["neutral", "slate", "sand", "sage", "ocean", "plum"]
const SURFACES = SURFACE_PRESETS.filter((preset) =>
  SURFACE_VALUES.includes(preset.value)
)

type Density = (typeof DENSITY_OPTIONS)[number]["value"]

// The options only offer listed presets, so a miss is a bug.
function findPreset<T extends { value: string }>(presets: T[], value: string) {
  const preset = presets.find((option) => option.value === value)
  if (!preset) throw new Error(`Unknown preset: ${value}`)
  return preset
}

const MOTION_LABELS: Record<MotionSpeedName, string> = {
  instant: "Instant",
  snappy: "Snappy",
  default: "Default",
  smooth: "Smooth",
}

// Fastest first, as a speed control reads.
const MOTION_OPTIONS = [...MOTION_SPEED_NAMES]
  .reverse()
  .map((value) => ({ value, label: MOTION_LABELS[value] }))

const TABS = ["Overview", "Usage", "Billing"]

const NAV = [
  { label: "Home", icon: HouseIcon },
  { label: "Usage", icon: ChartColumnIcon },
  { label: "Members", icon: UsersIcon },
  { label: "Billing", icon: CreditCardIcon },
]

function ControlRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <div className="overflow-x-auto">{children}</div>
    </div>
  )
}

// A small workspace that takes the scene's brand, density and motion.
function Scene({
  tab,
  onTabChange,
  isReportOn,
  onReportChange,
}: {
  tab: string
  onTabChange: (tab: string) => void
  isReportOn: boolean
  onReportChange: (isOn: boolean) => void
}) {
  return (
    <div className="flex overflow-hidden rounded-(--radius-panel) bg-background text-foreground shadow-surface-1">
      <nav
        aria-label="Workspace"
        className="hidden w-36 shrink-0 flex-col gap-0.5 bg-sidebar p-(--density-8) shadow-surface-2 sm:flex"
      >
        <span className="flex items-center gap-(--density-8) px-(--density-8) py-(--density-6) text-(length:--density-text-13) font-medium">
          <span className="flex size-5 items-center justify-center rounded-md bg-primary text-[11px] font-semibold text-primary-foreground">
            N
          </span>
          Northwind
        </span>
        {NAV.map(({ label, icon: Icon }) => (
          <span
            key={label}
            className={cn(
              "flex h-(--density-32) items-center gap-(--density-8) rounded-(--radius-nested) px-(--density-8) text-(length:--density-text-13) [&_svg]:size-(--density-icon-16)",
              label === "Billing"
                ? "bg-active text-foreground"
                : "text-muted-foreground"
            )}
          >
            <Icon />
            {label}
          </span>
        ))}
      </nav>
      <div className="flex min-w-0 flex-1 flex-col gap-(--density-12) p-(--density-16)">
        <div className="flex items-center justify-between gap-(--density-8)">
          <span className="text-(length:--density-text-16) font-semibold">
            Billing
          </span>
          <Badge>Pro plan</Badge>
        </div>
        <Tabs value={tab} onValueChange={(value) => onTabChange(String(value))}>
          <TabsList aria-label="Billing sections">
            {TABS.map((option) => (
              <TabsTrigger key={option} value={option}>
                {option}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex flex-col gap-(--density-12) rounded-(--radius-card) bg-surface-3 p-(--density-16) shadow-surface-3">
          <div className="flex flex-col gap-(--density-6)">
            <div className="flex items-baseline justify-between text-(length:--density-text-13)">
              <span className="text-muted-foreground">Seats used</span>
              <span className="tabular-nums">18 of 25</span>
            </div>
            <Progress value={72} aria-label="Seats used" />
          </div>
          <div className="flex items-center justify-between gap-(--density-8)">
            <Label htmlFor="feature-branding-reports">Weekly reports</Label>
            <Switch
              id="feature-branding-reports"
              checked={isReportOn}
              onCheckedChange={onReportChange}
            />
          </div>
          <div className="flex items-center gap-(--density-8)">
            <Checkbox id="feature-branding-invoices" defaultChecked />
            <Label htmlFor="feature-branding-invoices">
              Email invoices to finance
            </Label>
          </div>
        </div>
        <div className="flex justify-end gap-(--density-8)">
          <Button variant="outline">Cancel</Button>
          <Button>Save changes</Button>
        </div>
      </div>
    </div>
  )
}

export function BrandingPreview() {
  const [brand, setBrand] = React.useState("violet")
  const [surface, setSurface] = React.useState("slate")
  const [density, setDensity] = React.useState<Density>("default")
  const [motion, setMotion] = React.useState<MotionSpeedName>("default")
  const [mode, setMode] = React.useState<Mode>("light")
  const [tab, setTab] = React.useState("Billing")
  const [isReportOn, setIsReportOn] = React.useState(true)

  const primary = findPreset(BRANDS, brand)
  const tint = findPreset(SURFACES, surface)

  // A new speed plays straight away: the tab slides and the switch flips.
  function changeMotion(next: MotionSpeedName) {
    setMotion(next)
    setTab((current) => TABS[(TABS.indexOf(current) + 1) % TABS.length])
    setIsReportOn((isOn) => !isOn)
  }

  return (
    <PreviewStage
      className="flex-col items-stretch gap-6"
      caption="The scene keeps its own look and theme; the rest of the site stays as it is."
    >
      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <ControlRow label="Brand colour">
          <Segmented
            label="Brand colour"
            value={brand}
            onValueChange={setBrand}
            options={BRANDS.map((preset) => ({
              value: preset.value,
              label: preset.label,
              icon: <RoleSwatch color={preset.color} />,
            }))}
          />
        </ControlRow>
        <ControlRow label="Surfaces">
          <Segmented
            label="Surface tint"
            value={surface}
            onValueChange={setSurface}
            options={SURFACES.map((preset) => ({
              value: preset.value,
              label: preset.label,
              icon: <TintSwatch tint={preset.tint} />,
            }))}
          />
        </ControlRow>
        <ControlRow label="Density">
          <Segmented
            label="Density"
            value={density}
            onValueChange={setDensity}
            options={DENSITY_OPTIONS}
          />
        </ControlRow>
        <ControlRow label="Motion">
          <Segmented
            label="Motion"
            value={motion}
            onValueChange={changeMotion}
            options={MOTION_OPTIONS}
          />
        </ControlRow>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px] text-muted-foreground">Theme</span>
          <Segmented
            label="Theme"
            value={mode}
            onValueChange={setMode}
            options={MODE_OPTIONS}
          />
        </div>
        {/* The scene declares every theme token again for its own mode, so
            its brand inputs apply here only. Those tokens include the default
            density sizes, so the density region sits inside to win over them. */}
        <div
          data-theme-scene={mode}
          style={{
            ...THEME_VARS[mode],
            // Squircle whatever the site's Radius setting is.
            ...getShapeStyle("squircle"),
            ...getBrandVars(primary.color, tint.tint),
          }}
          className={cn(
            "supports-[corner-shape:squircle]:[--radius-corner-scale:var(--radius-squircle-scale,1)]",
            mode === "dark" && "dark"
          )}
        >
          <DensityProvider density={density} data-motion={motion}>
            <Scene
              tab={tab}
              onTabChange={setTab}
              isReportOn={isReportOn}
              onReportChange={setIsReportOn}
            />
          </DensityProvider>
        </div>
      </div>
    </PreviewStage>
  )
}
