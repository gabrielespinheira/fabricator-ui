"use client"

import * as React from "react"

import { SURFACE_PRESETS, useSiteSetting } from "@/lib/site-settings"
import { CopyButton } from "@/components/copy-button"
import { TintSwatch } from "@/components/fabricator/site-settings"
import { DemoFrame } from "@/components/foundations/demo-frame"
import {
  FABRICATOR_FOUNDATIONS,
  FABRICATOR_PALETTE,
  SURFACE_PALETTE_LINKS,
} from "@/registry/fabricator/foundations"
import {
  isNeutralTint,
  normalizeTint,
  sameTint,
  SURFACE_MAX_CHROMA,
  type SurfaceTint,
} from "@/registry/fabricator/surface-tint"
import { Slider } from "@/styles/base-fabricator/ui/slider"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/styles/base-fabricator/ui/toggle-group"

// The hue slider's track: the wheel at a mid lightness.
const HUE_TRACK = `linear-gradient(to right, ${Array.from(
  { length: 13 },
  (_, index) => `oklch(0.72 0.12 ${index * 30})`
).join(", ")})`

function cssFor(tint: SurfaceTint) {
  const block = (selector: string, entries: Record<string, string>) =>
    `${selector} {\n${Object.entries(entries)
      .map(([name, value]) => `  --${name}: ${value};`)
      .join("\n")}\n}`

  return [
    block(":root", {
      "surface-hue": String(tint.hue),
      "surface-chroma": String(tint.chroma),
    }),
    "/* Let the theme tokens follow the surfaces. */",
    block(":root", SURFACE_PALETTE_LINKS.light),
    block(".dark", SURFACE_PALETTE_LINKS.dark),
  ].join("\n\n")
}

// Each theme's tokens, scoped to a scene so both themes render side by side
// whatever the site's theme. The surfaces stay calc() expressions, so they
// read the live --surface-hue and --surface-chroma from <html>. The tint,
// radius and motion speed are left to the site's settings.
const SITE_SETTING_VARS = /^(surface-hue|surface-chroma|radius|motion)/

function themeVars(mode: "light" | "dark") {
  const vars = {
    ...FABRICATOR_FOUNDATIONS.cssVars[mode],
    ...FABRICATOR_PALETTE[mode],
    ...SURFACE_PALETTE_LINKS[mode],
  }
  return {
    colorScheme: mode,
    ...Object.fromEntries(
      Object.entries(vars)
        .filter(([name]) => !SITE_SETTING_VARS.test(name))
        .map(([name, value]) => [`--${name}`, value])
    ),
  } as React.CSSProperties
}

const THEME_VARS = { light: themeVars("light"), dark: themeVars("dark") }

// Class names are written out in full so Tailwind generates them.
const LEVELS = [
  "bg-surface-1 shadow-surface-1",
  "bg-surface-2 shadow-surface-2",
  "bg-surface-3 shadow-surface-3",
  "bg-surface-4 shadow-surface-4",
  "bg-surface-5 shadow-surface-5",
  "bg-surface-6 shadow-surface-6",
  "bg-surface-7 shadow-surface-7",
  "bg-surface-8 shadow-surface-8",
]

/**
 * A small interface in one theme: page (1), sidebar (2), card (3), active
 * tab (4) and a dialog (5), then the whole ladder.
 */
function ThemeScene({ mode }: { mode: "light" | "dark" }) {
  return (
    <div
      style={THEME_VARS[mode]}
      className="flex flex-col overflow-hidden rounded-xl bg-surface-1 text-foreground shadow-surface-1"
    >
      <div className="relative flex h-56">
        <div className="flex w-24 shrink-0 flex-col gap-0.5 bg-surface-2 p-1.5 shadow-surface-2">
          <span className="px-1.5 py-1 text-[11px] text-muted-foreground">
            {mode === "light" ? "Light" : "Dark"}
          </span>
          <span className="rounded-md bg-active px-1.5 py-1 text-[11px]">
            Threads
          </span>
          <span className="rounded-md px-1.5 py-1 text-[11px] text-muted-foreground">
            Agents
          </span>
          <span className="rounded-md px-1.5 py-1 text-[11px] text-muted-foreground">
            Settings
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2 p-2.5">
          <div className="flex w-fit rounded-lg bg-muted p-0.5">
            <span className="rounded-md bg-surface-4 px-2 py-0.5 text-[11px] shadow-surface-4">
              Overview
            </span>
            <span className="px-2 py-0.5 text-[11px] text-muted-foreground">
              Logs
            </span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-lg bg-surface-3 p-2.5 shadow-surface-3">
            <span className="text-[12px] font-medium">Runs this week</span>
            <span className="text-[11px] text-muted-foreground">
              128 runs, 4 failed
            </span>
          </div>
        </div>
        <div className="absolute right-2.5 bottom-2.5 flex w-36 flex-col gap-1.5 rounded-lg bg-surface-5 p-2.5 shadow-surface-5">
          <span className="text-[12px] font-semibold">Rerun failed?</span>
          <span className="text-[11px] leading-snug text-muted-foreground">
            Four jobs will run again.
          </span>
          <span className="mt-0.5 self-end rounded-md bg-primary px-2 py-0.5 text-[11px] text-primary-foreground">
            Rerun
          </span>
        </div>
      </div>
      <div className="grid grid-cols-8 gap-1.5 border-t border-border p-2.5">
        {LEVELS.map((className, index) => (
          <div
            key={index}
            className={`flex h-7 items-center justify-center rounded-md text-[11px] tabular-nums ${className}`}
          >
            {index + 1}
          </div>
        ))}
      </div>
    </div>
  )
}

function SliderRow({
  label,
  value,
  children,
}: {
  label: string
  value: string
  children: (labelId: string) => React.ReactNode
}) {
  const id = React.useId()

  return (
    <div className="grid grid-cols-[4.5rem_1fr_3.5rem] items-center gap-3">
      <span id={id} className="text-[13px] text-muted-foreground">
        {label}
      </span>
      {children(id)}
      <span className="text-end text-[13px] text-foreground tabular-nums">
        {value}
      </span>
    </div>
  )
}

/**
 * Sets the surface tint for the whole site with hue and strength sliders (the
 * same setting as the Surface row in the settings menu), previews both
 * ladders, and prints the CSS that applies it in a project.
 */
export function SurfaceTintPicker() {
  const [surface, setStoredSurface] = useSiteSetting("surface")
  const setSurface = (tint: SurfaceTint) =>
    setStoredSurface(normalizeTint(tint))
  const preset = SURFACE_PRESETS.find(({ tint }) => sameTint(tint, surface))
  const strength = Math.round((surface.chroma / SURFACE_MAX_CHROMA) * 100)
  const css = cssFor(surface)

  return (
    <>
      <DemoFrame
        className="flex-col flex-nowrap items-stretch gap-6"
        caption="Start from a preset, or set your own: hue sets --surface-hue and strength sets --surface-chroma (100% is 0.04). Text keeps AA contrast at every strength. The choice applies to the whole site, like the Surface row in the settings menu, and is saved in this browser."
      >
        <ToggleGroup
          aria-label="Surface presets"
          value={preset ? [preset.value] : []}
          onValueChange={(next) => {
            const selected = SURFACE_PRESETS.find(
              ({ value }) => value === next[0]
            )
            if (selected) setSurface(selected.tint)
          }}
          spacing={1}
          size="sm"
          className="flex-wrap"
        >
          {SURFACE_PRESETS.map(({ value, label, tint }) => (
            <ToggleGroupItem
              key={value}
              value={value}
              className="gap-2 rounded-full! ps-2.5 pe-3 text-[13px] text-muted-foreground aria-pressed:text-foreground"
            >
              <TintSwatch tint={tint} />
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="flex flex-col gap-3">
          <SliderRow label="Hue" value={`${Math.round(surface.hue)}°`}>
            {(labelId) => (
              <Slider
                aria-labelledby={labelId}
                value={[surface.hue]}
                min={0}
                max={359}
                step={1}
                onValueChange={(value) =>
                  setSurface({
                    hue: Array.isArray(value) ? value[0] : value,
                    chroma: surface.chroma,
                  })
                }
                style={{ "--hue-track": HUE_TRACK } as React.CSSProperties}
                className="[&_[data-slot=slider-range]]:bg-transparent [&_[data-slot=slider-track]]:[background:var(--hue-track)]"
              />
            )}
          </SliderRow>
          <SliderRow label="Strength" value={`${strength}%`}>
            {(labelId) => (
              <Slider
                aria-labelledby={labelId}
                value={[strength]}
                min={0}
                max={100}
                step={1}
                onValueChange={(value) =>
                  setSurface({
                    hue: surface.hue,
                    chroma:
                      ((Array.isArray(value) ? value[0] : value) / 100) *
                      SURFACE_MAX_CHROMA,
                  })
                }
              />
            )}
          </SliderRow>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ThemeScene mode="light" />
          <ThemeScene mode="dark" />
        </div>
      </DemoFrame>

      <figure className="not-typeset relative my-6 overflow-hidden rounded-xl bg-code">
        <figcaption className="border-b px-4 py-3 text-[13px] text-muted-foreground">
          {isNeutralTint(surface)
            ? "globals.css (neutral: these are the defaults)"
            : "globals.css"}
        </figcaption>
        <CopyButton value={css} className="top-1.5" />
        <pre className="no-scrollbar overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-code-foreground">
          <code>{css}</code>
        </pre>
      </figure>
    </>
  )
}
