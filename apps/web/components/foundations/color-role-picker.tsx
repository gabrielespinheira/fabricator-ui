"use client"

import * as React from "react"
import { cn } from "cn"
import {
  CircleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"

import {
  ROLE_PRESETS,
  SURFACE_PRESETS,
  useSiteSetting,
} from "@/lib/site-settings"
import {
  RoleSwatch,
  Segmented,
  TintSwatch,
  useHydrated,
} from "@/components/fabricator/site-settings"
import { DemoFrame } from "@/components/foundations/demo-frame"
import {
  cssBlock,
  CssFigure,
  GradientSlider,
  hueTrack,
  SliderRow,
} from "@/components/foundations/picker-parts"
import { THEME_VARS } from "@/components/foundations/theme-vars"
import {
  COLOR_ROLES,
  normalizeRoleColor,
  ROLE_HUE_RANGES,
  roleLiterals,
  roleMaxChroma,
  roleStrength,
  roleToHex,
  roleVariables,
  sameRoleColor,
  type ColorRole,
  type RoleColor,
} from "@/registry/fabricator/color-roles"
import { contrast, layer } from "@/registry/fabricator/contrast"
import {
  FABRICATOR_PALETTE,
  PALETTE_LINKS,
} from "@/registry/fabricator/foundations"
import {
  MUTED_FOREGROUND_STEP,
  NEUTRAL_TINT,
  normalizeTint,
  sameTint,
  SURFACE_MAX_CHROMA,
  surfaceLadder,
  tintedLiteral,
  tintToHex,
  type SurfaceTint,
} from "@/registry/fabricator/surface-tint"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/styles/base-fabricator/ui/alert"
import { Badge } from "@/styles/base-fabricator/ui/badge"
import { Button } from "@/styles/base-fabricator/ui/button"
import { Checkbox } from "@/styles/base-fabricator/ui/checkbox"
import { Progress } from "@/styles/base-fabricator/ui/progress"
import { Switch } from "@/styles/base-fabricator/ui/switch"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/styles/base-fabricator/ui/tabs"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/styles/base-fabricator/ui/toggle-group"

const ROLE_LABELS: Record<ColorRole, string> = {
  primary: "Primary",
  secondary: "Secondary",
  info: "Info",
  success: "Success",
  warning: "Warning",
  destructive: "Destructive",
}

type Mode = "light" | "dark"
type PreviewTheme = Mode | "system"

// The site's theme switcher, for the preview.
const PREVIEW_THEMES: {
  value: PreviewTheme
  label: string
  icon: React.ReactNode
}[] = [
  { value: "light", label: "Light preview", icon: <SunIcon /> },
  { value: "system", label: "Preview follows the site", icon: <MonitorIcon /> },
  { value: "dark", label: "Dark preview", icon: <MoonIcon /> },
]

// --- A small app in one theme -----------------------------------------------

const DEPLOYMENTS = [
  {
    name: "api",
    status: "success",
    label: "Ready",
    Icon: CircleCheckIcon,
    detail: "2m ago",
  },
  {
    name: "web",
    status: "warning",
    label: "Building",
    Icon: TriangleAlertIcon,
    progress: 64,
  },
  {
    name: "worker",
    status: "destructive",
    label: "Failed",
    Icon: CircleAlertIcon,
    action: "Remove",
  },
] as const

/**
 * A deployments screen built from the real components. It is the same for
 * every role, so the whole of it stays in view while any role changes:
 * secondary and primary buttons, an info alert, success, warning and
 * destructive badges, a destructive button, checked controls, a link and a
 * success toast.
 */
function AppScene() {
  return (
    <div className="flex">
      <nav className="hidden w-36 shrink-0 flex-col gap-0.5 bg-surface-2 p-2 text-[13px] shadow-surface-2 sm:flex">
        <span className="px-2 py-1.5 font-semibold">Acme</span>
        <span className="rounded-md px-2 py-1.5 text-muted-foreground">
          Overview
        </span>
        <span className="rounded-md bg-active px-2 py-1.5 font-medium">
          Deployments
        </span>
        <span className="rounded-md px-2 py-1.5 text-muted-foreground">
          Domains
        </span>
        <span className="rounded-md px-2 py-1.5 text-muted-foreground">
          Settings
        </span>
      </nav>
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[14px] font-semibold">
            Deployments
          </span>
          <div className="flex shrink-0 gap-1.5">
            <Button size="sm" variant="secondary">
              Cancel
            </Button>
            <Button size="sm">Deploy</Button>
          </div>
        </div>
        <Alert variant="info" contrast="high" className="p-3">
          <InfoIcon />
          <AlertTitle>Preview ready</AlertTitle>
          <AlertDescription>Review it before it goes live.</AlertDescription>
        </Alert>
        <div className="flex flex-col rounded-lg bg-surface-3 text-[13px] shadow-surface-3">
          {DEPLOYMENTS.map((deployment) => (
            <div
              key={deployment.name}
              className="flex h-10 items-center gap-3 border-b border-border/60 px-3 last:border-b-0"
            >
              <span className="w-12 shrink-0 font-medium">
                {deployment.name}
              </span>
              <Badge variant={deployment.status}>
                <deployment.Icon data-icon="inline-start" />
                {deployment.label}
              </Badge>
              <span className="ms-auto flex text-[12px] text-muted-foreground">
                {"progress" in deployment ? (
                  <Progress
                    value={deployment.progress}
                    aria-label={`${deployment.name} build`}
                    className="w-20"
                  />
                ) : "action" in deployment ? (
                  <Button size="xs" variant="destructive">
                    {deployment.action}
                  </Button>
                ) : (
                  deployment.detail
                )}
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px]">
          <label className="flex items-center gap-2">
            <Checkbox defaultChecked />
            Notify me
          </label>
          <label className="flex items-center gap-2">
            <Switch size="sm" defaultChecked />
            Auto deploy
          </label>
          <Button size="sm" variant="link" className="ms-auto px-0">
            View logs
          </Button>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-surface-5 py-1.5 ps-3 pe-1.5 text-[12px] shadow-surface-5">
          <CircleCheckIcon className="size-4 shrink-0 text-success" />
          <span className="min-w-0 flex-1 truncate">
            api is live on production
          </span>
          <Button size="xs" variant="ghost">
            Undo
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * The preview's theme. Light and dark set the theme's tokens inline, plus the
 * `dark` class (or the light scene marker, which the site's `dark:` variant
 * skips) for the components' theme variants, so the scene renders in that
 * theme whatever the site's. System leaves it to the site.
 */
function Scene({
  theme,
  className,
  children,
}: {
  theme: PreviewTheme
  className?: string
  children: React.ReactNode
}) {
  const isForced = theme !== "system"
  return (
    <div
      data-theme-scene={isForced ? theme : undefined}
      style={isForced ? THEME_VARS[theme] : undefined}
      className={cn(
        "bg-surface-1 text-foreground shadow-surface-1",
        theme === "dark" && "dark",
        className
      )}
    >
      {children}
    </div>
  )
}

// --- The selected role's tokens, with their contrast on the page -------------

function paint(role: ColorRole, opacity: number) {
  return opacity === 1
    ? `var(--${role})`
    : `color-mix(in oklab, var(--${role}) ${opacity * 100}%, transparent)`
}

function Ratio({ value, minimum }: { value: number; minimum: number }) {
  return (
    <span
      className={cn(
        "tabular-nums",
        value >= minimum ? "text-muted-foreground" : "text-destructive-text"
      )}
    >
      {value.toFixed(1)}:1
    </span>
  )
}

type Chip = {
  label: string
  background: string
  color: string
  border?: string
  shadow?: string
  ratio: number
  /** The contrast it must keep; pressed shows only while the pointer is down. */
  minimum: number
}

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8]

function roleChips(
  role: ColorRole,
  color: RoleColor,
  mode: Mode,
  surface: SurfaceTint
): Chip[] {
  const tokens = roleLiterals(role, mode, color)
  const [page] = surfaceLadder(mode, surface)
  const fill = tokens[role]
  const foreground = tokens[`${role}-foreground`]
  const text = tokens[`${role}-text`]
  const isSecondary = role === "secondary"
  // Secondary is already a tint: hover is 80% of it, press its full strength.
  const states = isSecondary
    ? [
        { label: "Fill", opacity: 1, minimum: 4.5 },
        { label: "Hover", opacity: 0.8, minimum: 4.5 },
        { label: "Press", opacity: 1, minimum: 4.5 },
      ]
    : [
        { label: "Fill", opacity: 1, minimum: 4.5 },
        { label: "Hover", opacity: 0.9, minimum: 4.5 },
        { label: "Press", opacity: 0.8, minimum: 3 },
      ]
  return [
    ...states.map(({ label, opacity, minimum }) => ({
      label,
      background: paint(role, opacity),
      color: `var(--${role}-foreground)`,
      ratio: contrast(foreground, layer(fill, page, opacity)),
      minimum,
    })),
    ...(isSecondary
      ? []
      : [
          {
            label: "Soft",
            background: paint(role, 0.12),
            color: `var(--${role}-text)`,
            ratio: contrast(text, layer(fill, page, 0.12)),
            minimum: 4.5,
          },
        ]),
    {
      label: "Text",
      background: "transparent",
      color: `var(--${role}-text)`,
      border: `var(--${role}-border)`,
      ratio: contrast(text, page),
      minimum: 4.5,
    },
    {
      label: "Surfaces",
      background: `var(--${role}-surface-1)`,
      color: `var(--${role}-text)`,
      shadow: "var(--shadow-1)",
      ratio: Math.min(
        ...LEVELS.map((level) =>
          contrast(text, tokens[`${role}-surface-${level}`])
        )
      ),
      minimum: 4.5,
    },
  ]
}

/**
 * The eight surface levels with muted text, the weakest text that sits on
 * them. It is AA on every level in light, and up to dialogs (level 5) in dark,
 * where the top levels keep 3:1.
 */
function surfaceChips(mode: Mode, surface: SurfaceTint): Chip[] {
  const muted =
    mode === "light"
      ? tintedLiteral(MUTED_FOREGROUND_STEP, surface)
      : FABRICATOR_PALETTE.dark["muted-foreground"]
  return surfaceLadder(mode, surface).map((level, index) => ({
    label: String(index + 1),
    background: `var(--surface-${index + 1})`,
    color: "var(--muted-foreground)",
    shadow: `var(--shadow-${index + 1})`,
    ratio: contrast(muted, level),
    minimum: mode === "dark" && index >= 5 ? 3 : 4.5,
  }))
}

/**
 * The selected tab's tokens in the preview's theme, each with its WCAG
 * contrast: a role's fill at rest, on hover and pressed, its soft wash, text,
 * and text on its tinted surfaces; or the surface levels with muted text.
 */
function TokenRow({
  title,
  chips,
  theme,
}: {
  title: string
  chips: Chip[]
  theme: PreviewTheme
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-medium text-foreground">{title}</span>
      <Scene theme={theme} className="rounded-lg p-2">
        <div
          className="grid gap-1.5"
          style={{
            gridTemplateColumns: `repeat(${chips.length}, minmax(0, 1fr))`,
          }}
        >
          {chips.map((chip) => (
            <div
              key={chip.label}
              className="flex min-w-0 flex-col items-center gap-1"
            >
              <span
                className="flex h-7 w-full items-center justify-center rounded-md border border-transparent text-[12px] font-medium"
                style={{
                  backgroundColor: chip.background,
                  color: chip.color,
                  borderColor: chip.border,
                  boxShadow: chip.shadow,
                }}
              >
                Aa
              </span>
              <span className="truncate text-[11px] text-muted-foreground">
                {chip.label} <Ratio value={chip.ratio} minimum={chip.minimum} />
              </span>
            </div>
          ))}
        </div>
      </Scene>
    </div>
  )
}

// --- The picker ----------------------------------------------------------------

type Tab = "surface" | ColorRole

const TABS: Tab[] = ["surface", ...COLOR_ROLES]

const TAB_LABELS: Record<Tab, string> = { surface: "Surface", ...ROLE_LABELS }

type Preset = { value: string; label: string; swatch: React.ReactNode }

/**
 * Presets, then hue and strength (0 to 1), for whichever tab is selected. The
 * hue slider covers the tab's range: the wheel, or a status's family.
 */
function ColourControls({
  label,
  presets,
  preset,
  onPresetChange,
  hue,
  hueRange: [hueFrom, hueTo],
  onHueChange,
  strength,
  strengthTrack,
  onStrengthChange,
}: {
  label: string
  presets: Preset[]
  preset: string | undefined
  onPresetChange: (value: string) => void
  hue: number
  hueRange: readonly [number, number]
  onHueChange: (hue: number) => void
  strength: number
  strengthTrack: string
  onStrengthChange: (strength: number) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <ToggleGroup
        aria-label={`${label} presets`}
        value={preset ? [preset] : []}
        onValueChange={(next) => {
          if (next[0]) onPresetChange(next[0])
        }}
        spacing={1}
        size="sm"
        className="flex-wrap"
      >
        {presets.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            className="gap-2 rounded-full! ps-2.5 pe-3 text-[13px] text-muted-foreground aria-pressed:text-foreground"
          >
            {option.swatch}
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <SliderRow label="Hue" value={`${Math.round(hue)}°`}>
        {(labelId) => (
          <GradientSlider
            aria-labelledby={labelId}
            value={[hue]}
            min={hueFrom}
            max={hueTo === 360 ? 359 : hueTo}
            step={1}
            onValueChange={(value) =>
              onHueChange(Array.isArray(value) ? value[0] : value)
            }
            track={hueTrack(hueFrom, hueTo)}
          />
        )}
      </SliderRow>
      <SliderRow label="Strength" value={`${Math.round(strength * 100)}%`}>
        {(labelId) => (
          <GradientSlider
            aria-labelledby={labelId}
            value={[Math.round(strength * 100)]}
            min={0}
            max={100}
            step={1}
            onValueChange={(value) =>
              onStrengthChange((Array.isArray(value) ? value[0] : value) / 100)
            }
            track={strengthTrack}
          />
        )}
      </SliderRow>
    </div>
  )
}

function cssFor(surface: SurfaceTint, colors: Record<ColorRole, RoleColor>) {
  return [
    cssBlock(":root", {
      "surface-hue": String(surface.hue),
      "surface-chroma": String(surface.chroma),
      ...roleVariables(colors),
    }),
    "/* Let the theme tokens follow the surfaces and the roles. */",
    cssBlock(":root", PALETTE_LINKS.light),
    cssBlock(".dark", PALETTE_LINKS.dark),
  ].join("\n\n")
}

const SURFACE_OPTIONS: Preset[] = SURFACE_PRESETS.map(
  ({ value, label, tint }) => ({
    value,
    label,
    swatch: <TintSwatch tint={tint} />,
  })
)

/**
 * Sets the surface tint and the colour roles for the whole site: pick a tab,
 * then a preset or a hue (statuses keep to their family) and a strength.
 * Every tab shares one preview, an app with its own theme switch, followed by
 * the tab's tokens with their contrast; then the CSS that applies it all in a
 * project.
 */
export function ColorRolePicker() {
  const [tab, setTab] = React.useState<Tab>("surface")
  const [colors, setColors] = useSiteSetting("colors")
  const [surface, setSurface] = useSiteSetting("surface")
  const [theme, setTheme] = React.useState<PreviewTheme>("system")
  // System follows the site; its theme is only known after hydration.
  const { resolvedTheme } = useTheme()
  const hydrated = useHydrated()
  const mode: Mode =
    theme === "system"
      ? hydrated && resolvedTheme === "dark"
        ? "dark"
        : "light"
      : theme

  const controls =
    tab === "surface"
      ? surfaceControls(surface, (next) => setSurface(normalizeTint(next)))
      : roleControls(tab, colors[tab], (next) =>
          setColors({ ...colors, [tab]: normalizeRoleColor(tab, next) })
        )
  const chips =
    tab === "surface"
      ? surfaceChips(mode, surface)
      : roleChips(tab, colors[tab], mode, surface)

  return (
    <>
      <DemoFrame
        className="flex-col flex-nowrap items-stretch gap-5 sm:p-6"
        caption="Pick the surface or a role, then a preset or your own colour: hue sets --surface-hue or --<role>-hue, and strength sets the matching chroma (100% is 0.04 for surfaces, and for roles the most the hue can hold with every token inside sRGB). Primary and secondary take any hue; info stays blue, success green, warning orange to yellow and destructive red to orange. Every tab shares the preview, so you see the whole interface change; switch its theme above it. The numbers are WCAG contrast on the page. The choice applies to the whole site and is saved in this browser."
      >
        <Tabs
          value={tab}
          onValueChange={(next) => {
            const selected = TABS.find((option) => option === next)
            if (selected) setTab(selected)
          }}
          className="gap-4"
        >
          <TabsList
            aria-label="Colour to set"
            className="w-full max-w-full overflow-x-auto"
          >
            {TABS.map((option) => (
              <TabsTrigger key={option} value={option}>
                {TAB_LABELS[option]}
              </TabsTrigger>
            ))}
          </TabsList>
          {TABS.map((option) => (
            <TabsContent key={option} value={option}>
              {option === tab ? (
                <ColourControls label={TAB_LABELS[tab]} {...controls} />
              ) : null}
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] font-medium text-foreground">
              Preview
            </span>
            <Segmented
              label="Preview theme"
              value={theme}
              onValueChange={setTheme}
              options={PREVIEW_THEMES}
            />
          </div>
          <Scene theme={theme} className="overflow-hidden rounded-xl">
            <AppScene />
          </Scene>
        </div>

        <TokenRow
          title={
            tab === "surface"
              ? "Surface levels, with muted text"
              : `${TAB_LABELS[tab]} tokens`
          }
          chips={chips}
          theme={theme}
        />
      </DemoFrame>

      <CssFigure caption="globals.css" css={cssFor(surface, colors)} />
    </>
  )
}

/** The surface tab: the tint's presets, any hue, strength up to 0.04. */
function surfaceControls(
  surface: SurfaceTint,
  setSurface: (next: SurfaceTint) => void
) {
  return {
    presets: SURFACE_OPTIONS,
    preset: SURFACE_PRESETS.find(({ tint }) => sameTint(tint, surface))?.value,
    onPresetChange: (value: string) => {
      const selected = SURFACE_PRESETS.find((option) => option.value === value)
      if (selected) setSurface(selected.tint)
    },
    hue: surface.hue,
    hueRange: [0, 360] as const,
    onHueChange: (hue: number) => setSurface({ ...surface, hue }),
    strength: surface.chroma / SURFACE_MAX_CHROMA,
    // From the neutral grey to the hue at full strength.
    strengthTrack: `linear-gradient(to right, ${tintToHex(NEUTRAL_TINT)}, ${tintToHex(
      { hue: surface.hue, chroma: SURFACE_MAX_CHROMA }
    )})`,
    onStrengthChange: (strength: number) =>
      setSurface({ ...surface, chroma: strength * SURFACE_MAX_CHROMA }),
  }
}

/**
 * A role's tab: its presets, its hue range, and strength as a share of the
 * hue's maximum chroma, kept when the hue moves.
 */
function roleControls(
  role: ColorRole,
  color: RoleColor,
  setColor: (next: RoleColor) => void
) {
  const strength = roleStrength(color)
  return {
    presets: ROLE_PRESETS[role].map(({ value, label, color: swatch }) => ({
      value,
      label,
      swatch: <RoleSwatch color={swatch} />,
    })),
    preset: ROLE_PRESETS[role].find((option) =>
      sameRoleColor(option.color, color)
    )?.value,
    onPresetChange: (value: string) => {
      const selected = ROLE_PRESETS[role].find(
        (option) => option.value === value
      )
      if (selected) setColor(selected.color)
    },
    hue: color.hue,
    hueRange: ROLE_HUE_RANGES[role],
    onHueChange: (hue: number) =>
      setColor({ hue, chroma: strength * roleMaxChroma(hue) }),
    strength,
    strengthTrack: `linear-gradient(to right, ${[0, 0.25, 0.5, 0.75, 1]
      .map((share) =>
        roleToHex({ hue: color.hue, chroma: share * roleMaxChroma(color.hue) })
      )
      .join(", ")})`,
    onStrengthChange: (share: number) =>
      setColor({ hue: color.hue, chroma: share * roleMaxChroma(color.hue) }),
  }
}
