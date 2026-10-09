import * as React from "react"

import {
  NEUTRAL_TINT,
  normalizeTint,
  SURFACE_MAX_CHROMA,
  type SurfaceTint,
} from "@/registry/fabricator/surface-tint"

/**
 * Website preferences (the settings menu in the header and the docs panel).
 * Theme lives in next-themes; everything else lives here, in localStorage.
 *
 * - sound: whether components play interface sounds (off by default).
 * - iconLibrary: the icon pack the site's previews render (Lucide by default).
 * - radius: "rounded" (--radius 0.5rem) or "pill" (--radius 1.25rem).
 * - motion: scales every animation through --motion-scale.
 * - surface: the surface tint, --surface-hue and --surface-chroma on <html>.
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

export const MOTION_SPEEDS = [
  { value: "relaxed", label: "Relaxed", scale: 1.4 },
  { value: "default", label: "Default", scale: 1 },
  { value: "snappy", label: "Snappy", scale: 0.7 },
  { value: "off", label: "Off", scale: 0 },
] as const

export type SiteMotion = (typeof MOTION_SPEEDS)[number]["value"]

/** Named surface tints for the settings menu and the Surfaces page. */
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

export type SiteSettings = {
  sound: boolean
  iconLibrary: SiteIconLibrary
  radius: SiteRadius
  motion: SiteMotion
  surface: SurfaceTint
}

export const SITE_SETTINGS_STORAGE_KEY = "fabricator-settings"

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  sound: false,
  iconLibrary: "lucide",
  radius: "rounded",
  motion: "default",
  surface: NEUTRAL_TINT,
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
  }
  return current
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

/**
 * Runs before paint (inlined in <head>) so a stored Pill radius, motion
 * speed or surface tint doesn't flash the defaults first. Keep in step with
 * the rules in app/fabricator-site.css and with applySurfaceTint.
 */
export const SITE_SETTINGS_SCRIPT = `try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(
  SITE_SETTINGS_STORAGE_KEY
)})||"{}"),r=document.documentElement,d=r.dataset,t=s.surface;if(s.radius==="pill")d.radius="pill";if(s.motion&&s.motion!=="default")d.motion=s.motion;if(t&&isFinite(t.hue)&&t.chroma>0&&t.chroma<=${SURFACE_MAX_CHROMA}){r.style.setProperty("--surface-hue",t.hue);r.style.setProperty("--surface-chroma",t.chroma)}}catch(e){}`
