import * as React from "react"

/**
 * Website preferences (the settings menu in the header and the docs panel).
 * Theme lives in next-themes; everything else lives here, in localStorage.
 *
 * - sound: whether components play interface sounds (off by default).
 * - iconLibrary: the icon pack the site's previews render (Lucide by default).
 * - radius: "rounded" (--radius 0.5rem) or "pill" (--radius 1.25rem).
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

export type SiteSettings = {
  sound: boolean
  iconLibrary: SiteIconLibrary
  radius: SiteRadius
}

export const SITE_SETTINGS_STORAGE_KEY = "fabricator-settings"

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  sound: false,
  iconLibrary: "lucide",
  radius: "rounded",
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

/**
 * Runs before paint (inlined in <head>) so a stored Pill radius doesn't flash
 * Rounded first. Keep in step with the radius rule in app/fabricator-site.css.
 */
export const SITE_SETTINGS_SCRIPT = `try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(
  SITE_SETTINGS_STORAGE_KEY
)})||"{}");if(s.radius==="pill")document.documentElement.dataset.radius="pill"}catch(e){}`
