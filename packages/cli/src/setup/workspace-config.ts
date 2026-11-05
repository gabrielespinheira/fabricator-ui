// A generated monorepo's root. Phase 0 of docs/plans/get-started-and-cli.md found
// what each package manager needs for Next and Expo to share a workspace: pnpm's
// isolated installs need nothing; the others need one React at Expo's pin, Babel 7
// (the template's ESLint package pulls Babel 8, which breaks Metro's), and bun its
// hoisted linker.

import type { PackageManager } from "@fabricator-ui/setup"

const BABEL_RANGE = "^7.29.0"
export const BUN_HOISTED_CONFIG = '[install]\nlinker = "hoisted"\n'

type RootPackage = Record<string, unknown> & {
  scripts?: Record<string, string>
  overrides?: Record<string, string>
  resolutions?: Record<string, string>
}

/** The field that pins a version across the workspace. */
function pinField(packageManager: PackageManager) {
  return packageManager === "yarn" ? "resolutions" : "overrides"
}

export function withPins(
  pkg: RootPackage,
  packageManager: PackageManager,
  pins: Record<string, string>
): RootPackage {
  if (packageManager === "pnpm") return pkg
  const field = pinField(packageManager)
  return { ...pkg, [field]: { ...pkg[field], ...pins } }
}

/**
 * Native modules that packages hoisted to the root take as peers: Reanimated
 * takes worklets, and the icons take the SVG module. Their ranges would hoist a
 * newer version than Expo's pin, and a native module can't be duplicated.
 */
const NATIVE_PEERS = ["react-native-worklets", "react-native-svg"]

/** Expo's pin for each of them, from its `bundledNativeModules.json`. */
export function getNativePeerPins(bundled: Record<string, unknown>) {
  return Object.fromEntries(
    NATIVE_PEERS.flatMap((name) => {
      const version = bundled[name]
      return typeof version === "string" ? [[name, version]] : []
    })
  )
}

export function buildRootPackage(
  pkg: RootPackage,
  {
    packageManager,
    hasDesktop,
    mobileReact,
  }: {
    packageManager: PackageManager
    hasDesktop: boolean
    /** The React version the Expo template pins, when there's a mobile app. */
    mobileReact?: string
  }
): RootPackage {
  const withScripts: RootPackage = {
    ...pkg,
    scripts: {
      ...pkg.scripts,
      // A plain `turbo dev` would launch Expo and a window too.
      dev: "turbo run dev --filter=web",
      ...(mobileReact
        ? { "dev:mobile": `cd apps/mobile && ${packageManager} run start` }
        : {}),
      ...(hasDesktop
        ? { "dev:desktop": "turbo run dev --filter=web --filter=desktop" }
        : {}),
    },
  }
  if (!mobileReact) return withScripts
  return withPins(withScripts, packageManager, {
    react: mobileReact,
    "react-dom": mobileReact,
    "@babel/core": BABEL_RANGE,
  })
}

/** What apps/web needs for a window to load a static build of it. */
export function buildWebPackageForDesktop(
  pkg: RootPackage & { devDependencies?: Record<string, string> },
  packageManager: PackageManager
) {
  return {
    ...pkg,
    scripts: {
      ...pkg.scripts,
      "build:static": `cross-env FABRICATOR_DESKTOP=1 ${packageManager} run build`,
    },
    devDependencies: Object.fromEntries(
      Object.entries({ ...pkg.devDependencies, "cross-env": "10.1.0" }).sort(
        ([a], [b]) => a.localeCompare(b)
      )
    ),
  }
}
