"use client"

import * as React from "react"

import {
  applyColorRoles,
  applySurfaceTint,
  useSiteSettings,
} from "@/lib/site-settings"
import { getSpinnerVariables } from "@/registry/fabricator/shared/lib/spinner-model"
import { SoundEffects } from "@/styles/base-fabricator/components/sound-effects"

/** Applies the website settings that live outside React's tree. */
export function SiteSettingsEffects() {
  const { radius, sound, motion, density, surface, colors, spinner } =
    useSiteSettings()

  React.useEffect(() => {
    const root = document.documentElement
    if (radius === "pill") {
      root.dataset.radius = "pill"
    } else {
      delete root.dataset.radius
    }
  }, [radius])

  React.useEffect(() => {
    const root = document.documentElement
    if (motion === "default") {
      delete root.dataset.motion
    } else {
      root.dataset.motion = motion
    }
  }, [motion])

  React.useEffect(() => {
    const root = document.documentElement
    if (density === "default") {
      delete root.dataset.density
    } else {
      root.dataset.density = density
    }
  }, [density])

  React.useEffect(() => {
    applySurfaceTint(surface)
  }, [surface])

  React.useEffect(() => {
    applyColorRoles(colors)
  }, [colors])

  React.useEffect(() => {
    for (const [key, value] of Object.entries(getSpinnerVariables(spinner))) {
      document.documentElement.style.setProperty(key, value)
    }
  }, [spinner])

  // Every component on the site plays its sounds through one listener.
  return <SoundEffects enabled={sound} />
}
