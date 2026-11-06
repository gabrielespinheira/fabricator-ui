// A desktop app is a window around apps/web: its dev server while developing, and
// a static build in production.

import type { Framework, PackageManager } from "@fabricator-ui/setup"

const DEV_URLS: Partial<Record<Framework, string>> = {
  next: "http://localhost:3000",
  vite: "http://localhost:5173",
  start: "http://localhost:3000",
  "react-router": "http://localhost:5173",
  astro: "http://localhost:4321",
}

const STATIC_OUTPUTS: Partial<Record<Framework, string>> = {
  next: "out",
  vite: "dist",
  start: "dist/client",
  "react-router": "build/client",
  astro: "dist",
}

export function getWebDevUrl(framework: Framework) {
  return DEV_URLS[framework] ?? "http://localhost:3000"
}

/** Where a static build lands, inside apps/web. */
export function getStaticOutput(framework: Framework) {
  return STATIC_OUTPUTS[framework] ?? "dist"
}

/** The config file that turns on a framework's static build. */
export const STATIC_BUILD_FILES: Partial<Record<Framework, string>> = {
  next: "next.config.ts",
  start: "vite.config.ts",
  "react-router": "react-router.config.ts",
}

/**
 * Turns on a static build behind `FABRICATOR_DESKTOP=1`, so the web deploy keeps
 * its server. Null for a file this doesn't recognise.
 */
export function patchStaticBuild(framework: Framework, source: string) {
  if (source.includes("FABRICATOR_DESKTOP")) return source
  switch (framework) {
    case "next": {
      const open = "const nextConfig: NextConfig = {"
      if (!source.includes(open)) return null
      return source.replace(
        open,
        [
          "// The desktop app loads a static build: routes that need a server work on",
          "// the web deploy only.",
          'const isDesktop = process.env.FABRICATOR_DESKTOP === "1"',
          "",
          open,
          '  output: isDesktop ? "export" : undefined,',
          "  images: { unoptimized: isDesktop },",
        ].join("\n")
      )
    }
    case "react-router":
      return source.includes("ssr: true")
        ? source.replace(
            "ssr: true",
            'ssr: process.env.FABRICATOR_DESKTOP !== "1"'
          )
        : null
    case "start":
      return source.includes("tanstackStart()")
        ? source.replace(
            "tanstackStart()",
            `tanstackStart({
      spa: {
        enabled: process.env.FABRICATOR_DESKTOP === "1",
        prerender: { outputPath: "/index" },
      },
    })`
          )
        : null
    default:
      return source
  }
}

export function toAppIdentifier(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return `app.${/^[a-z]/.test(slug) ? slug : `a${slug}`}.desktop`
}

/** Tauri can't move the lights after launch, so its titlebar row stays tall. */
const TAURI_LIGHTS = { x: 16, y: 23 }

/**
 * Tauri refuses to build when this Cargo feature and the config's
 * `macOSPrivateApi` disagree. The App Store rejects the private API, so a
 * window without glass leaves it out.
 */
export function getTauriFeatures(isGlass: boolean) {
  return isGlass ? '"macos-private-api"' : ""
}

export function buildTauriConfig({
  appName,
  framework,
  packageManager,
  isGlass,
}: {
  appName: string
  framework: Framework
  packageManager: PackageManager
  isGlass: boolean
}) {
  return {
    $schema: "https://schema.tauri.app/config/2",
    productName: appName,
    version: "0.1.0",
    identifier: toAppIdentifier(appName),
    build: {
      devUrl: getWebDevUrl(framework),
      frontendDist: `../../web/${getStaticOutput(framework)}`,
      beforeBuildCommand: {
        script: `${packageManager} run build:static`,
        cwd: "../../web",
      },
    },
    app: {
      macOSPrivateApi: isGlass,
      windows: [
        {
          label: "main",
          title: appName,
          width: 1280,
          height: 820,
          minWidth: 900,
          minHeight: 600,
          titleBarStyle: "Overlay",
          hiddenTitle: true,
          trafficLightPosition: TAURI_LIGHTS,
          transparent: isGlass,
          ...(isGlass && {
            windowEffects: {
              effects: ["sidebar"],
              state: "followsWindowActiveState",
            },
          }),
        },
      ],
      security: { csp: null },
    },
    bundle: {
      active: true,
      targets: "all",
      icon: [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/128x128@2x.png",
        "icons/icon.icns",
        "icons/icon.ico",
      ],
    },
  }
}

export function renderTemplate(
  content: string,
  tokens: Record<string, string>
) {
  return Object.entries(tokens).reduce(
    (text, [key, value]) => text.replaceAll(`__${key}__`, value),
    content
  )
}
