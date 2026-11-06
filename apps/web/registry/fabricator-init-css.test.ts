import path from "node:path"
import { NextRequest } from "next/server"
import { transformCss } from "@shadcn/registry/internal/updaters/update-css"
import { transformCssVars } from "@shadcn/registry/internal/updaters/update-css-vars"
import tailwindcss from "@tailwindcss/postcss"
import postcss from "postcss"
import {
  configSchema,
  registryItemSchema,
  type RegistryItem,
} from "shadcn/schema"
import { describe, expect, it } from "vitest"

import { GET } from "@/app/(app)/(create)/init/route"

import { buildRegistryBase, DEFAULT_CONFIG } from "./config"
import { toFabricatorRegistryBase } from "./fabricator-init"
import { FABRICATOR_FOUNDATIONS } from "./fabricator/foundations"
import { DEFAULT_LOOK } from "./fabricator/look"

const config = configSchema.parse({
  style: "base-nova",
  rsc: true,
  tsx: true,
  tailwind: { css: "globals.css", baseColor: "neutral", cssVariables: true },
  aliases: { components: "@/components", utils: "@/lib/utils" },
  resolvedPaths: Object.fromEntries(
    [
      "cwd",
      "tailwindConfig",
      "tailwindCss",
      "utils",
      "components",
      "lib",
      "hooks",
      "ui",
    ].map((key) => [key, process.cwd()])
  ),
})

describe("Fabricator init CSS", () => {
  for (const base of ["base", "radix", "aria"] as const) {
    for (const surface of [DEFAULT_LOOK.surface, { hue: 260, chroma: 0.02 }]) {
      it(`compiles ${base} with surface chroma ${surface.chroma}`, async () => {
        const payload = toFabricatorRegistryBase(
          buildRegistryBase({ ...DEFAULT_CONFIG, base }),
          {
            config: { ...DEFAULT_CONFIG, base },
            palette: true,
            look: { ...DEFAULT_LOOK, surface },
          }
        )
        const css = await transformCssVars(
          '@import "tailwindcss" source(none);',
          payload.cssVars,
          config,
          { tailwindVersion: "v4" }
        )
        const result = await postcss([tailwindcss()]).process(
          `${css}\nbody { @apply bg-background text-foreground; }\n.card { @apply bg-card; }\n.popover { @apply bg-popover; }\n.sidebar { @apply bg-sidebar; }`,
          { from: path.join(process.cwd(), "init-regression.css") }
        )
        expect(result.css).toContain("background-color: var(--background)")
        expect(result.css).toContain("background-color: var(--card)")
        expect(result.css).toContain("background-color: var(--popover)")
        expect(result.css).toContain("background-color: var(--sidebar)")
      })
    }
  }
})

const TEMPLATES = [
  "next",
  "next-monorepo",
  "vite",
  "vite-monorepo",
  "start",
  "start-monorepo",
  "react-router",
  "react-router-monorepo",
  "astro",
  "astro-monorepo",
  "laravel",
] as const

// Keep the consumer contract independent of the palette implementation.
const COLOR_UTILITIES = [
  "bg-background",
  "text-foreground",
  "bg-card",
  "text-card-foreground",
  "bg-popover",
  "text-popover-foreground",
  "bg-primary",
  "text-primary-foreground",
  "bg-secondary",
  "text-secondary-foreground",
  "bg-muted",
  "text-muted-foreground",
  "bg-accent",
  "text-accent-foreground",
  "bg-destructive",
  "border-border",
  "border-input",
  "outline-ring/50",
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
  "bg-sidebar",
  "text-sidebar-foreground",
  "bg-sidebar-primary",
  "text-sidebar-primary-foreground",
  "bg-sidebar-accent",
  "text-sidebar-accent-foreground",
  "border-sidebar-border",
  "ring-sidebar-ring",
  "bg-surface-1",
  "bg-surface-8",
  "bg-info",
  "text-info-foreground",
  "bg-success",
  "text-success-foreground",
  "bg-warning",
  "text-warning-foreground",
  "text-primary-text",
  "border-secondary-border",
  "bg-destructive-surface-3",
] as const

async function getInitPayload(query: string) {
  const response = await GET(
    new NextRequest(`http://localhost:4000/init?${query}`)
  )
  expect(response.status).toBe(200)
  const payload = registryItemSchema.parse(await response.json())
  if (payload.type !== "registry:base") {
    throw new Error(`Expected registry:base, received ${payload.type}`)
  }
  return payload
}

async function installCss(
  payload: RegistryItem,
  input = '@import "tailwindcss" source(none);'
) {
  // The resolver merges dependency tokens before the init payload's overrides.
  const cssVars = {
    theme: {
      ...FABRICATOR_FOUNDATIONS.cssVars.theme,
      ...payload.cssVars?.theme,
    },
    light: {
      ...FABRICATOR_FOUNDATIONS.cssVars.light,
      ...payload.cssVars?.light,
    },
    dark: { ...FABRICATOR_FOUNDATIONS.cssVars.dark, ...payload.cssVars?.dark },
  }
  let css = await transformCssVars(input, cssVars, config, {
    tailwindVersion: "v4",
    overwriteCssVars: true,
  })
  css = await transformCss(css, FABRICATOR_FOUNDATIONS.css)
  return transformCss(css, payload.css ?? {})
}

async function compileConsumerCss(css: string) {
  const consumer = COLOR_UTILITIES.map(
    (utility, index) => `.contract-${index} { @apply ${utility}; }`
  ).join("\n")
  const result = await postcss([tailwindcss()]).process(`${css}\n${consumer}`, {
    from: path.join(process.cwd(), "init-consumer.css"),
  })
  for (const [index, utility] of COLOR_UTILITIES.entries()) {
    const rules: string[] = []
    result.root.walkRules(`.contract-${index}`, (rule) => {
      rules.push(rule.toString())
    })
    expect(rules.join(""), utility).toContain("var(--")
    expect(rules.join(""), utility).not.toContain("@apply")
  }
  return result.root
}

describe("/init consumer CSS compilation", () => {
  for (const base of ["base", "radix", "aria"] as const) {
    for (const template of TEMPLATES) {
      for (const surface of ["0_0", "145_0.022"]) {
        it(`installs ${base}/${template} with surface ${surface}`, async () => {
          const payload = await getInitPayload(
            `base=${base}&template=${template}&preset=fabricator&surface=${surface}`
          )
          expect(payload.config?.style).toBe(`${base}-nova`)
          await compileConsumerCss(await installCss(payload))
        })
      }
    }
  }

  it.each([
    "primary=260_0.15",
    "secondary=300_0.12",
    "destructive=30_0.15",
    "info=240_0.12&success=145_0.12&warning=80_0.1",
    "surface=260_0.02&primary=260_0.15&shape=pill&motion=off&density=spacious",
    "surface=25_0.02&secondary=300_0.12&motion=snappy&density=compact",
  ])("compiles custom look %s", async (query) => {
    const payload = await getInitPayload(`preset=fabricator&${query}`)
    await compileConsumerCss(await installCss(payload))
  })

  it.each(["theme", "theme,font"])(
    "compiles a partial %s installation",
    async (only) => {
      const payload = await getInitPayload(
        `preset=fabricator&surface=260_0.02&only=${only}`
      )
      expect(payload.config?.registries).toBeUndefined()
      await compileConsumerCss(await installCss(payload))
    }
  )

  it("repairs CSS from the broken tinted-surface installation", async () => {
    const payload = await getInitPayload("preset=fabricator&surface=260_0.02")
    const installed = await installCss(payload)
    const broken = postcss.parse(installed)
    broken.walkAtRules("theme", (rule) => {
      rule.walkDecls(
        /^--color-(background|card|popover|sidebar)$/,
        (declaration) => {
          declaration.remove()
        }
      )
    })
    // Proves this fixture still triggers the original failure.
    await expect(compileConsumerCss(broken.toString())).rejects.toThrow(
      "bg-background"
    )
    await compileConsumerCss(await installCss(payload, broken.toString()))
  })

  it("reapplies a tinted theme without duplicating mappings or losing custom CSS", async () => {
    const payload = await getInitPayload(
      "preset=fabricator&surface=145_0.022&only=theme"
    )
    const original =
      '@import "tailwindcss" source(none);\n:root { --my-brand: #123456; }\n.custom { padding: 13px; }'
    const once = await installCss(payload, original)
    const twice = await installCss(payload, once)
    const parsed = postcss.parse(twice)
    for (const token of ["background", "card", "popover", "sidebar"]) {
      const values: string[] = []
      parsed.walkAtRules("theme", (rule) => {
        rule.walkDecls(`--color-${token}`, (declaration) => {
          values.push(declaration.value)
        })
      })
      expect(values).toEqual([`var(--${token})`])
    }
    expect(twice).toContain("--my-brand: #123456")
    expect(twice).toContain("padding: 13px")
    await compileConsumerCss(twice)
  })

  it("changes a neutral installation to tinted surfaces in both color modes", async () => {
    const neutral = await getInitPayload("preset=fabricator")
    const tinted = await getInitPayload(
      "preset=fabricator&surface=145_0.022&only=theme"
    )
    const updated = await installCss(tinted, await installCss(neutral))
    const parsed = postcss.parse(updated)
    for (const selector of [":root", ".dark"]) {
      const backgrounds: string[] = []
      parsed.walkRules(selector, (rule) => {
        rule.walkDecls("--background", (declaration) => {
          backgrounds.push(declaration.value)
        })
      })
      expect(backgrounds).toEqual(["var(--surface-1)"])
    }
    await compileConsumerCss(updated)
  })
})
