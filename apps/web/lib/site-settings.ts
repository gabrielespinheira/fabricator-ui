import * as React from "react"

import {
  COLOR_ROLES,
  normalizeRoleColor,
  ROLE_DEFAULTS,
  sameRoleColor,
  type ColorRole,
  type RoleColor,
} from "@/registry/fabricator/color-roles"
import {
  DEFAULT_DENSITY,
  isDensityName,
  type DensityName,
} from "@/registry/fabricator/density"
import {
  DENSITY_OPTIONS,
  MOTION_OPTIONS,
  ROLE_PRESETS,
  SURFACE_PRESETS,
  type RolePreset,
} from "@/registry/fabricator/look-presets"
import {
  isSpinnerVariant,
  type SpinnerVariant,
} from "@/registry/fabricator/shared/lib/spinner-model"
import {
  NEUTRAL_TINT,
  normalizeTint,
  SURFACE_MAX_CHROMA,
  type SurfaceTint,
} from "@/registry/fabricator/surface-tint"

/**
 * Website preferences (the settings menu in the header and the docs sidebar).
 * Theme lives in next-themes; everything else lives here, in localStorage.
 *
 * - sound: whether components play interface sounds (on by default).
 * - iconLibrary: the icon pack the site's previews render (Fabricator by default).
 * - radius: "rounded" (--radius 0.5rem) or "pill" (--radius 1.25rem).
 * - motion: the motion speed, data-motion on <html> (smooth to instant, or off).
 * - density: compact, default or spacious, data-density on <html>.
 * - surface: the surface tint, --surface-hue and --surface-chroma on <html>.
 * - colors: each colour role's hue and chroma, --<role>-hue and
 *   --<role>-chroma on <html>.
 */
export const ICON_LIBRARIES = [
  { value: "fabricator", label: "Fabricator" },
  { value: "lucide", label: "Lucide" },
  { value: "tabler", label: "Tabler" },
  { value: "hugeicons", label: "HugeIcons" },
  { value: "phosphor", label: "Phosphor" },
  { value: "remixicon", label: "Remix Icon" },
] as const

export type SiteIconLibrary = (typeof ICON_LIBRARIES)[number]["value"]
export type SiteRadius = "rounded" | "pill"

export { DENSITY_OPTIONS, ROLE_PRESETS, SURFACE_PRESETS }
export { MOTION_OPTIONS as MOTION_SPEEDS }
export type { RolePreset }

export type SiteMotion = (typeof MOTION_OPTIONS)[number]["value"]

export type SiteSettings = {
  sound: boolean
  iconLibrary: SiteIconLibrary
  spinner: SpinnerVariant
  radius: SiteRadius
  motion: SiteMotion
  density: DensityName
  surface: SurfaceTint
  colors: Record<ColorRole, RoleColor>
}

export const SITE_SETTINGS_STORAGE_KEY = "fabricator-settings"

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  sound: true,
  iconLibrary: "fabricator",
  spinner: "orbit",
  radius: "rounded",
  motion: "default",
  density: DEFAULT_DENSITY,
  surface: NEUTRAL_TINT,
  colors: ROLE_DEFAULTS,
}

/** Written with the settings since Fabricator became the default icon pack. */
const ICON_PACK_VERSION = 2

/**
 * Saving any setting saved the whole object, so a stored "lucide" from before
 * version 2 is the old default, not a choice. It moves to the new default,
 * which draws the same icons.
 */
export function resolveStoredIconLibrary(stored: {
  iconLibrary?: unknown
  iconPackVersion?: unknown
}): SiteIconLibrary {
  const library = ICON_LIBRARIES.find(
    ({ value }) => value === stored.iconLibrary
  )?.value
  if (!library) return DEFAULT_SITE_SETTINGS.iconLibrary
  return library === "lucide" && stored.iconPackVersion !== ICON_PACK_VERSION
    ? DEFAULT_SITE_SETTINGS.iconLibrary
    : library
}

const listeners = new Set<() => void>()
let current: SiteSettings | null = null

function read(): SiteSettings {
  if (current) return current
  let stored: Partial<SiteSettings> = {}
  try {
    stored = JSON.parse(
      localStorage.getItem(SITE_SETTINGS_STORAGE_KEY) ?? "{}"
    ) as Partial<SiteSettings>
  } catch {}
  current = {
    sound:
      typeof stored.sound === "boolean"
        ? stored.sound
        : DEFAULT_SITE_SETTINGS.sound,
    iconLibrary: resolveStoredIconLibrary(stored),
    spinner: isSpinnerVariant(stored.spinner)
      ? stored.spinner
      : DEFAULT_SITE_SETTINGS.spinner,
    radius:
      stored.radius === "pill" || stored.radius === "rounded"
        ? stored.radius
        : DEFAULT_SITE_SETTINGS.radius,
    motion: MOTION_OPTIONS.some((speed) => speed.value === stored.motion)
      ? (stored.motion as SiteMotion)
      : DEFAULT_SITE_SETTINGS.motion,
    density: isDensityName(stored.density)
      ? stored.density
      : DEFAULT_SITE_SETTINGS.density,
    surface: normalizeTint(stored.surface),
    colors: normalizeColors(stored.colors),
  }
  return current
}

function normalizeColors(value: unknown): Record<ColorRole, RoleColor> {
  const stored: Partial<Record<ColorRole, unknown>> =
    value && typeof value === "object" ? value : {}
  return {
    primary: normalizeRoleColor("primary", stored.primary),
    secondary: normalizeRoleColor("secondary", stored.secondary),
    info: normalizeRoleColor("info", stored.info),
    success: normalizeRoleColor("success", stored.success),
    warning: normalizeRoleColor("warning", stored.warning),
    destructive: normalizeRoleColor("destructive", stored.destructive),
  }
}

export function getSiteSettings() {
  return typeof window === "undefined" ? DEFAULT_SITE_SETTINGS : read()
}

export function setSiteSettings(patch: Partial<SiteSettings>) {
  current = { ...read(), ...patch }
  try {
    localStorage.setItem(
      SITE_SETTINGS_STORAGE_KEY,
      JSON.stringify({ ...current, iconPackVersion: ICON_PACK_VERSION })
    )
  } catch {}
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // Keep tabs in sync.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== SITE_SETTINGS_STORAGE_KEY) return
    current = null
    listener()
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

/** The current settings; the defaults during server rendering and hydration. */
export function useSiteSettings(): SiteSettings {
  return React.useSyncExternalStore(
    subscribe,
    read,
    () => DEFAULT_SITE_SETTINGS
  )
}

export function useSiteSetting<K extends keyof SiteSettings>(key: K) {
  const settings = useSiteSettings()
  const set = React.useCallback(
    (value: SiteSettings[K]) =>
      setSiteSettings({ [key]: value } as Partial<SiteSettings>),
    [key]
  )
  return [settings[key], set] as const
}

/** Sets the surface tint on <html>; neutral removes it. */
export function applySurfaceTint(tint: SurfaceTint) {
  const style = document.documentElement.style
  if (tint.chroma === 0) {
    style.removeProperty("--surface-hue")
    style.removeProperty("--surface-chroma")
  } else {
    style.setProperty("--surface-hue", String(tint.hue))
    style.setProperty("--surface-chroma", String(tint.chroma))
  }
}

/** Sets each colour role on <html>; a role at its default is removed. */
export function applyColorRoles(colors: Record<ColorRole, RoleColor>) {
  const style = document.documentElement.style
  for (const role of COLOR_ROLES) {
    const color = colors[role]
    if (sameRoleColor(color, ROLE_DEFAULTS[role])) {
      style.removeProperty(`--${role}-hue`)
      style.removeProperty(`--${role}-chroma`)
    } else {
      style.setProperty(`--${role}-hue`, String(color.hue))
      style.setProperty(`--${role}-chroma`, String(color.chroma))
    }
  }
}

/**
 * Runs before paint (inlined in <head>) so a stored Pill radius, motion
 * speed, density, surface tint or colour role doesn't flash the defaults
 * first. Keep
 * in step with the rules in app/fabricator-site.css, applySurfaceTint and
 * applyColorRoles.
 */
export const SITE_SETTINGS_SCRIPT = `try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(
  SITE_SETTINGS_STORAGE_KEY
)})||"{}"),r=document.documentElement,d=r.dataset,t=s.surface;if(s.radius==="pill")d.radius="pill";if(s.motion&&s.motion!=="default")d.motion=s.motion;if(s.density==="compact"||s.density==="spacious")d.density=s.density;if(t&&isFinite(t.hue)&&t.chroma>0&&t.chroma<=${SURFACE_MAX_CHROMA}){r.style.setProperty("--surface-hue",t.hue);r.style.setProperty("--surface-chroma",t.chroma)}var c=s.colors||{},k=${JSON.stringify(
  COLOR_ROLES
)};for(var i=0;i<k.length;i++){var v=c[k[i]];if(v&&isFinite(v.hue)&&isFinite(v.chroma)&&v.chroma>=0&&v.chroma<=0.4){r.style.setProperty("--"+k[i]+"-hue",v.hue);r.style.setProperty("--"+k[i]+"-chroma",v.chroma)}}}catch(e){}`
