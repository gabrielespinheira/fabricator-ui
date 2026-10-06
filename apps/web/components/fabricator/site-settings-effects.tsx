"use client"

import * as React from "react"

import { useSiteSettings } from "@/lib/site-settings"
import { SoundEffects } from "@/styles/base-fabricator/components/sound-effects"

/** Applies the website settings that live outside React's tree. */
export function SiteSettingsEffects() {
  const { radius, sound, motion } = useSiteSettings()

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

  // Every component on the site plays its sounds through one listener.
  return <SoundEffects enabled={sound} />
}
