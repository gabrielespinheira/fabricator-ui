import { useEffect, useState, useSyncExternalStore } from "react"
import { z } from "zod"

export const settingsSchema = z.object({
  density: z.enum(["auto", "compact", "default", "spacious"]),
  motion: z.enum(["smooth", "default", "snappy", "instant", "off"]),
  radius: z.enum(["rounded", "pill"]),
  surface: z.enum(["neutral", "slate", "stone"]),
  sounds: z.boolean(),
})

export type Settings = z.infer<typeof settingsSchema>

export const defaultSettings: Settings = {
  density: "auto",
  motion: "default",
  radius: "rounded",
  surface: "neutral",
  sounds: false,
}

const settingsKey = "fabricator.tauri-mobile.settings"

function subscribePhoneWidth(listener: () => void) {
  const query = window.matchMedia("(max-width: 767px)")
  query.addEventListener("change", listener)
  return () => query.removeEventListener("change", listener)
}

function readSettings() {
  const saved = localStorage.getItem(settingsKey)
  if (!saved) return defaultSettings
  const parsed = z
    .string()
    .transform((value, context) => {
      try {
        const result: unknown = JSON.parse(value)
        return result
      } catch {
        context.addIssue({
          code: "custom",
          message: "Saved settings are not valid JSON.",
        })
        return z.NEVER
      }
    })
    .pipe(settingsSchema)
    .safeParse(saved)
  return parsed.success ? parsed.data : defaultSettings
}

export function useSettings() {
  const [settings, setSettings] = useState(readSettings)
  const isPhone = useSyncExternalStore(
    subscribePhoneWidth,
    () => window.matchMedia("(max-width: 767px)").matches,
    () => false
  )
  const density =
    settings.density === "auto"
      ? isPhone
        ? "spacious"
        : "default"
      : settings.density
  useEffect(() => {
    localStorage.setItem(settingsKey, JSON.stringify(settings))
    const root = document.documentElement
    root.dataset.motion = settings.motion
    root.dataset.density = density
    root.style.setProperty(
      "--radius",
      settings.radius === "pill" ? "1.25rem" : "0.5rem"
    )
    root.style.setProperty(
      "--surface-hue",
      settings.surface === "slate"
        ? "260"
        : settings.surface === "stone"
          ? "70"
          : "0"
    )
    root.style.setProperty(
      "--surface-chroma",
      settings.surface === "neutral" ? "0" : "0.02"
    )
  }, [settings, density])
  return [settings, setSettings, density] as const
}
