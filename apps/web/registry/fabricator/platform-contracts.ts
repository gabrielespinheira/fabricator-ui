import tailwindColors from "tailwindcss/colors"
import { z } from "zod"

import { COMPONENT_GROUPS, getComponentGroup } from "@/lib/component-groups"
import { COLOR_ROLES, roleLiterals } from "@/registry/fabricator/color-roles"
import { DENSITIES, DENSITY_NAMES } from "@/registry/fabricator/density"
import { FABRICATOR_PALETTE } from "@/registry/fabricator/foundation-tokens"
import { DEFAULT_LOOK, type FabricatorLook } from "@/registry/fabricator/look"
import { ROLE_PRESETS } from "@/registry/fabricator/look-presets"
import {
  MOTION_ROLES,
  MOTION_SPEED_NAMES,
  MOTION_SPEEDS,
} from "@/registry/fabricator/motion"
import {
  getNativeCssVariables,
  getNativeTheme,
  resolveNativeColor,
} from "@/registry/fabricator/native-theme"
import { BOT_FACE_COLORS } from "@/registry/fabricator/shared/lib/bot-face-model"
import { getColumnTypeDefaults } from "@/registry/fabricator/shared/lib/data-table-model"
import {
  EVENT_CALENDAR_COLORS,
  EVENT_CALENDAR_ROLES,
  EVENT_CHIP_WASH,
  getEventColorVariables,
} from "@/registry/fabricator/shared/lib/event-calendar-model"
import {
  GOOEY_DEFAULTS,
  GOOEY_EFFECTS,
  GOOEY_GEOMETRY,
} from "@/registry/fabricator/shared/lib/gooey-model"
import {
  SOUND_DEFINITIONS,
  SOUND_MASTER_LEVEL,
} from "@/registry/fabricator/shared/lib/sound-recipes"
import {
  getSpinnerDots,
  getSpinnerDuration,
  getSpinnerMotion,
  SPINNER_VALUES,
  SPINNERS,
} from "@/registry/fabricator/shared/lib/spinner-model"

const itemSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]*$/),
  title: z.string().min(1),
  group: z.enum([...COMPONENT_GROUPS, "Blocks"]),
  type: z.enum([
    "registry:ui",
    "registry:component",
    "registry:block",
    "guide",
  ]),
})
const densitySchema = z.object({
  space: z.record(z.string(), z.number().nonnegative()),
  text: z.record(z.string(), z.number().positive()),
  icon: z.record(z.string(), z.number().positive()),
})
const motionSchema = z.object({
  durations: z.record(
    z.enum(MOTION_ROLES),
    z.object({
      enter: z.number().nonnegative(),
      exit: z.number().nonnegative(),
    })
  ),
  easings: z.object({
    enter: z.string(),
    move: z.string(),
    exit: z.string(),
    feedback: z.string(),
    drawer: z.string(),
    theme: z.string(),
  }),
  scales: z.object({
    press: z.number(),
    tooltip: z.number(),
    popup: z.number(),
    dialog: z.number(),
  }),
  travel: z.object({ tooltip: z.number(), popup: z.number() }),
  popupBlur: z.number(),
  bounce: z.number(),
  settle: z.number(),
})
const themeSchema = z.object({
  colors: z.record(z.string(), z.string()),
  variables: z.record(z.string(), z.union([z.string(), z.number()])),
  radius: z.object({
    sm: z.number(),
    md: z.number(),
    lg: z.number(),
    xl: z.number(),
    "2xl": z.number(),
  }),
  shadows: z.record(z.string(), z.string()),
})
const iconSchema = z.object({
  name: z.string(),
  node: z.array(
    z.tuple([
      z.enum([
        "path",
        "circle",
        "rect",
        "line",
        "polyline",
        "polygon",
        "ellipse",
      ]),
      z.record(z.string(), z.string()),
    ])
  ),
})

const tableColumnTypeSchema = z.enum([
  "text",
  "number",
  "currency",
  "percent",
  "date",
  "status",
  "tags",
  "person",
  "link",
  "email",
  "boolean",
  "progress",
])

export const platformContractSchema = z
  .object({
    schemaVersion: z.literal(1),
    themes: z.object({ light: themeSchema, dark: themeSchema }),
    densities: z.record(z.enum(DENSITY_NAMES), densitySchema),
    typography: z.object({
      weights: z.object({
        medium: z.number().min(100).max(900),
        semibold: z.number().min(100).max(900),
      }),
    }),
    motion: z.record(z.enum(MOTION_SPEED_NAMES), motionSchema),
    items: z.array(itemSchema),
    icons: z.array(iconSchema),
    soundMasterLevel: z.number().min(0).max(1),
    dataTable: z.record(
      tableColumnTypeSchema,
      z.object({
        size: z.number().positive(),
        minSize: z.number().positive(),
        align: z.enum(["start", "center", "end"]),
        sortDescFirst: z.boolean(),
      })
    ),
    calendar: z.object({
      colors: z.array(z.string()),
      chipWash: z.object({
        light: z.object({
          rest: z.number(),
          hover: z.number(),
          past: z.number(),
        }),
        dark: z.object({
          rest: z.number(),
          hover: z.number(),
          past: z.number(),
        }),
      }),
    }),
    gooey: z.object({
      resting: z.array(z.number()).length(50),
      effects: z.record(z.enum(GOOEY_EFFECTS), z.array(z.number()).length(50)),
      subtle: z.number(),
      expressive: z.number(),
      waviness: z.number(),
    }),
    spinners: z.object({
      durationMs: z.number().positive(),
      variants: z.array(
        z.object({
          value: z.enum(SPINNER_VALUES),
          label: z.string(),
          description: z.string(),
          dots: z.array(
            z.object({
              x: z.number(),
              y: z.number(),
              phase: z.number(),
              opacity: z.number(),
              width: z.number(),
              height: z.number(),
              shape: z.enum(["circle", "square", "triangle", "hexagon"]),
              travelX: z.number(),
              travelY: z.number(),
            })
          ),
          motion: z.array(
            z.object({
              at: z.number(),
              opacity: z.number(),
              scaleX: z.number(),
              scaleY: z.number(),
              translateX: z.number(),
              translateY: z.number(),
              rotation: z.number(),
            })
          ),
        })
      ),
    }),
    sounds: z.array(
      z.object({
        name: z.string(),
        category: z.string(),
        description: z.string(),
        usedBy: z.string(),
        partials: z.array(
          z.object({
            wave: z.enum(["sine", "square", "sawtooth", "triangle", "noise"]),
            freq: z.number(),
            to: z.number().optional(),
            at: z.number().optional(),
            length: z.number(),
            attack: z.number().optional(),
            gain: z.number(),
            lowpass: z.number().optional(),
            q: z.number().optional(),
          })
        ),
      })
    ),
  })
  .superRefine((contract, context) => {
    for (const key of ["items", "icons"] as const) {
      const names = new Set<string>()
      contract[key].forEach((item, index) => {
        if (names.has(item.name))
          context.addIssue({
            code: "custom",
            path: [key, index, "name"],
            message: `Duplicate ${key} name: ${item.name}`,
          })
        names.add(item.name)
      })
    }
  })

export type PlatformContract = z.infer<typeof platformContractSchema>
export type PlatformItem = z.infer<typeof itemSchema>
type RegistryEntry = { name: string; title?: string; type: string }

/** Public families come from registry ownership, never a second handwritten catalog. */
export function collectPlatformItems(
  entries: readonly RegistryEntry[]
): PlatformItem[] {
  const items = new Map<string, PlatformItem>()
  for (const entry of entries) {
    if (
      entry.type !== "registry:ui" &&
      entry.type !== "registry:component" &&
      entry.type !== "registry:block"
    )
      continue
    items.set(entry.name, {
      name: entry.name,
      title:
        entry.title ??
        entry.name
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" "),
      group:
        entry.type === "registry:block"
          ? "Blocks"
          : getComponentGroup(entry.name),
      type: entry.type,
    })
  }
  items.set("typography", {
    name: "typography",
    title: "Typography",
    group: "Basics",
    type: "guide",
  })
  return [...items.values()].sort((left, right) =>
    left.name.localeCompare(right.name)
  )
}

class PlatformThemeError extends Error {
  override name = "PlatformThemeError"
}

function resolveBotFaceColors(
  mode: "light" | "dark",
  colors: Record<string, string>
) {
  return Object.fromEntries(
    BOT_FACE_COLORS.flatMap((name) => {
      const role = COLOR_ROLES.find((role) => role === name)
      let fill = role ? colors[role] : colors.foreground
      if (!role && name !== "neutral") {
        const preset = ROLE_PRESETS.primary.find(
          (preset) => preset.value === name
        )
        if (name === "gray")
          fill = resolveNativeColor(
            `oklch(${mode === "light" ? 0.48 : 0.74} 0 0)`
          )
        else if (preset)
          fill = resolveNativeColor(
            roleLiterals("primary", mode, preset.color).primary
          )
        else
          throw new PlatformThemeError(`Missing BotFace color preset: ${name}`)
      }
      return [
        [`bot-face-${name}-fill`, fill],
        [
          `bot-face-${name}-eyes`,
          role ? colors[`${role}-foreground`] : colors.background,
        ],
      ]
    })
  )
}

function resolveCalendarColors(
  mode: "light" | "dark",
  colors: Record<string, string>
) {
  const resolve = (value: string) => {
    const token = /^var\(--([a-z-]+)\)$/.exec(value)?.[1]
    if (!token) return resolveNativeColor(value)
    const color = colors[token]
    if (!color)
      throw new PlatformThemeError(`Missing calendar color token: ${token}`)
    return color
  }
  const entries = [
    ...Object.entries(EVENT_CALENDAR_COLORS).map(([name, hue]) => ({
      name,
      variables: getEventColorVariables(hue),
    })),
    ...EVENT_CALENDAR_ROLES.map((name) => ({
      name,
      variables: getEventColorVariables(name),
    })),
  ]
  return Object.fromEntries(
    entries.flatMap(({ name, variables }) => [
      [
        `calendar-color-${name}`,
        resolve(variables[`--event-calendar-fill-${mode}`]),
      ],
      [
        `calendar-color-${name}-text`,
        resolve(variables[`--event-calendar-text-${mode}`]),
      ],
      [
        `calendar-color-${name}-foreground`,
        resolve(variables[`--event-calendar-foreground-${mode}`]),
      ],
    ])
  )
}

function resolveTheme(mode: "light" | "dark", look: FabricatorLook) {
  const theme = getNativeTheme(mode, look)
  const variables = getNativeCssVariables(mode, look)
  const colors = Object.fromEntries(
    Object.entries(variables).flatMap(([key, value]) =>
      typeof value === "string" && /^(#|rgba?\(|transparent$)/.test(value)
        ? [[key.replace(/^--/, ""), value]]
        : []
    )
  )
  return {
    colors: {
      ...theme.colors,
      ...colors,
      ...resolveBotFaceColors(mode, colors),
      ...resolveCalendarColors(mode, colors),
      "rating-fill": resolveNativeColor(tailwindColors.amber[400]),
      "rating-stroke": resolveNativeColor(
        tailwindColors.amber[mode === "dark" ? 400 : 500]
      ),
    },
    variables,
    radius: theme.radius,
    shadows: {
      ...theme.shadows,
      ...Object.fromEntries(
        Array.from({ length: 8 }, (_, index) => {
          const level = index + 1
          return [`surface-${level}`, variables[`--shadow-${level}`]]
        })
      ),
    },
  }
}

export function createPlatformContract(
  items: readonly PlatformItem[],
  icons: unknown,
  look: FabricatorLook = DEFAULT_LOOK
): PlatformContract {
  return platformContractSchema.parse({
    schemaVersion: 1,
    themes: {
      light: resolveTheme("light", look),
      dark: resolveTheme("dark", look),
    },
    densities: DENSITIES,
    typography: {
      weights: {
        medium: Number(FABRICATOR_PALETTE.theme["font-weight-medium"]),
        semibold: Number(FABRICATOR_PALETTE.theme["font-weight-semibold"]),
      },
    },
    motion: MOTION_SPEEDS,
    items,
    icons,
    sounds: SOUND_DEFINITIONS,
    soundMasterLevel: SOUND_MASTER_LEVEL,
    dataTable: Object.fromEntries(
      tableColumnTypeSchema.options.map((type) => [
        type,
        getColumnTypeDefaults(type),
      ])
    ),
    calendar: {
      colors: [...Object.keys(EVENT_CALENDAR_COLORS), ...EVENT_CALENDAR_ROLES],
      chipWash: EVENT_CHIP_WASH,
    },
    gooey: {
      resting: GOOEY_GEOMETRY.resting,
      effects: {
        move: GOOEY_GEOMETRY.move,
        morph: GOOEY_GEOMETRY.morph,
        bend: GOOEY_GEOMETRY.bend,
        melt: GOOEY_GEOMETRY.melt,
      },
      ...GOOEY_DEFAULTS,
    },
    spinners: {
      durationMs: getSpinnerDuration(),
      variants: SPINNERS.map((variant) => ({
        ...variant,
        dots: variant.value === "ring" ? [] : getSpinnerDots(variant.value),
        motion: variant.value === "ring" ? [] : getSpinnerMotion(variant.value),
      })),
    },
  })
}
