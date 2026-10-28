import * as React from "react"

import {
  COLOR_ROLES,
  normalizeRoleColor,
  ROLE_DEFAULTS,
  roleMaxChroma,
  sameRoleColor,
  type ColorRole,
  type RoleColor,
} from "@/registry/fabricator/color-roles"
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
 * - iconLibrary: the icon pack the site's previews render (Lucide by default).
 * - radius: "rounded" (--radius 0.5rem) or "pill" (--radius 1.25rem).
 * - motion: the motion speed, data-motion on <html> (smooth to instant, or off).
 * - surface: the surface tint, --surface-hue and --surface-chroma on <html>.
 * - colors: each colour role's hue and chroma, --<role>-hue and
 *   --<role>-chroma on <html>.
 */
export const ICON_LIBRARIES = [
  { value: "lucide", label: "Lucide" },
  { value: "tabler", label: "Tabler" },
  { value: "hugeicons", label: "HugeIcons" },
  { value: "phosphor", label: "Phosphor" },
  { value: "remixicon", label: "Remix Icon" },
] as const

export type SiteIconLibrary = (typeof ICON_LIBRARIES)[number]["value"]
export type SiteRadius = "rounded" | "pill"

/** The foundations' motion speeds (registry/fabricator/motion.ts), slowest first, then Off. */
export const MOTION_SPEEDS = [
  { value: "smooth", label: "Smooth" },
  { value: "default", label: "Default" },
  { value: "snappy", label: "Snappy" },
  { value: "instant", label: "Instant" },
  { value: "off", label: "Off" },
] as const

export type SiteMotion = (typeof MOTION_SPEEDS)[number]["value"]

/** Named surface tints for the settings menu and the Colors page. */
export const SURFACE_PRESETS: {
  value: string
  label: string
  tint: SurfaceTint
}[] = [
  { value: "neutral", label: "Neutral", tint: NEUTRAL_TINT },
  { value: "slate", label: "Slate", tint: { hue: 260, chroma: 0.02 } },
  { value: "sand", label: "Sand", tint: { hue: 75, chroma: 0.018 } },
  { value: "sage", label: "Sage", tint: { hue: 145, chroma: 0.022 } },
  { value: "ocean", label: "Ocean", tint: { hue: 220, chroma: 0.035 } },
  { value: "indigo", label: "Indigo", tint: { hue: 272, chroma: 0.04 } },
  { value: "plum", label: "Plum", tint: { hue: 325, chroma: 0.035 } },
  { value: "rose", label: "Rose", tint: { hue: 15, chroma: 0.03 } },
]

export type RolePreset = { value: string; label: string; color: RoleColor }

/** A named hue at a strong but calm chroma: its maximum, up to 0.22. */
function tone(value: string, label: string, hue: number): RolePreset {
  return {
    value,
    label,
    color: { hue, chroma: Math.min(roleMaxChroma(hue), 0.22) },
  }
}

const WHEEL = [
  tone("blue", "Blue", 260),
  tone("indigo", "Indigo", 277),
  tone("violet", "Violet", 300),
  tone("pink", "Pink", 350),
  tone("red", "Red", 25),
  tone("orange", "Orange", 45),
  tone("amber", "Amber", 75),
  tone("green", "Green", 150),
  tone("teal", "Teal", 190),
]

/**
 * Named colours for each role. Primary and secondary start neutral and take
 * any hue; each status offers tones of its own family, its default among them.
 */
export const ROLE_PRESETS: Record<ColorRole, RolePreset[]> = {
  primary: [
    { value: "neutral", label: "Neutral", color: ROLE_DEFAULTS.primary },
    ...WHEEL,
  ],
  secondary: [
    { value: "neutral", label: "Neutral", color: ROLE_DEFAULTS.secondary },
    ...WHEEL,
  ],
  info: [
    tone("sky", "Sky", 232),
    { value: "blue", label: "Blue", color: ROLE_DEFAULTS.info },
    tone("indigo", "Indigo", 272),
  ],
  success: [
    tone("lime", "Lime", 132),
    { value: "green", label: "Green", color: ROLE_DEFAULTS.success },
    tone("emerald", "Emerald", 165),
  ],
  warning: [
    tone("orange", "Orange", 52),
    { value: "amber", label: "Amber", color: ROLE_DEFAULTS.warning },
    tone("yellow", "Yellow", 92),
  ],
  destructive: [
    tone("rose", "Rose", 14),
    { value: "red", label: "Red", color: ROLE_DEFAULTS.destructive },
    tone("orange", "Orange", 42),
  ],
}

export type SiteSettings = {
  sound: boolean
  iconLibrary: SiteIconLibrary
  radius: SiteRadius
  motion: SiteMotion
  surface: SurfaceTint
  colors: Record<ColorRole, RoleColor>
}

export const SITE_SETTINGS_STORAGE_KEY = "fabricator-settings"

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  sound: true,
  iconLibrary: "lucide",
  radius: "rounded",
  motion: "default",
  surface: NEUTRAL_TINT,
  colors: ROLE_DEFAULTS,
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
    iconLibrary: ICON_LIBRARIES.some(
      (library) => library.value === stored.iconLibrary
    )
      ? (stored.iconLibrary as SiteIconLibrary)
      : DEFAULT_SITE_SETTINGS.iconLibrary,
    radius:
      stored.radius === "pill" || stored.radius === "rounded"
        ? stored.radius
        : DEFAULT_SITE_SETTINGS.radius,
    motion: MOTION_SPEEDS.some((speed) => speed.value === stored.motion)
      ? (stored.motion as SiteMotion)
      : DEFAULT_SITE_SETTINGS.motion,
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
    localStorage.setItem(SITE_SETTINGS_STORAGE_KEY, JSON.stringify(current))
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
 * speed, surface tint or colour role doesn't flash the defaults first. Keep
 * in step with the rules in app/fabricator-site.css, applySurfaceTint and
 * applyColorRoles.
 */
export const SITE_SETTINGS_SCRIPT = `try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(
  SITE_SETTINGS_STORAGE_KEY
)})||"{}"),r=document.documentElement,d=r.dataset,t=s.surface;if(s.radius==="pill")d.radius="pill";if(s.motion&&s.motion!=="default")d.motion=s.motion;if(t&&isFinite(t.hue)&&t.chroma>0&&t.chroma<=${SURFACE_MAX_CHROMA}){r.style.setProperty("--surface-hue",t.hue);r.style.setProperty("--surface-chroma",t.chroma)}var c=s.colors||{},k=${JSON.stringify(
  COLOR_ROLES
)};for(var i=0;i<k.length;i++){var v=c[k[i]];if(v&&isFinite(v.hue)&&isFinite(v.chroma)&&v.chroma>=0&&v.chroma<=0.4){r.style.setProperty("--"+k[i]+"-hue",v.hue);r.style.setProperty("--"+k[i]+"-chroma",v.chroma)}}}catch(e){}`
