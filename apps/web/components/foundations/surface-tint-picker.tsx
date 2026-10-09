"use client"

import * as React from "react"

import { SURFACE_PRESETS, useSiteSetting } from "@/lib/site-settings"
import { CopyButton } from "@/components/copy-button"
import { TintSwatch } from "@/components/fabricator/site-settings"
import { DemoFrame } from "@/components/foundations/demo-frame"
import { SURFACE_PALETTE_LINKS } from "@/registry/fabricator/foundations"
import {
  isNeutralTint,
  normalizeTint,
  sameTint,
  SURFACE_MAX_CHROMA,
  surfaceLadder,
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

// Each ladder sits on its own theme's page (level 1), and each level is a
// tile with that theme's edge, so the light tint reads against the light
// page, not against the docs around it.
const LADDER_THEME = {
  light: {
    label: "Light",
    text: "oklch(0.205 0 0)",
    muted: "oklch(0.556 0 0)",
    edge: "0 0 0 1px oklch(0 0 0 / 0.06), 0 1px 2px -1px oklch(0 0 0 / 0.08)",
  },
  dark: {
    label: "Dark",
    text: "oklch(0.97 0 0)",
    muted: "oklch(0.715 0 0)",
    edge: "inset 0 1px 0 0 oklch(1 0 0 / 0.04), inset 0 0 0 1px oklch(1 0 0 / 0.06)",
  },
}

function Ladder({ mode, tint }: { mode: "light" | "dark"; tint: SurfaceTint }) {
  const theme = LADDER_THEME[mode]
  const ladder = surfaceLadder(mode, tint)

  return (
    <div
      className="flex flex-col gap-3 rounded-xl p-3 ring-1 ring-border"
      style={{ backgroundColor: ladder[0], color: theme.text }}
    >
      <span className="text-[12px]" style={{ color: theme.muted }}>
        {theme.label}
      </span>
      <div className="grid grid-cols-8 gap-1.5">
        {ladder.map((color, index) => (
          <div
            key={index}
            title={`surface-${index + 1}: ${color}`}
            className="flex aspect-square items-end rounded-md p-1 text-[11px] tabular-nums"
            style={{ backgroundColor: color, boxShadow: theme.edge }}
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
          <Ladder mode="light" tint={surface} />
          <Ladder mode="dark" tint={surface} />
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
