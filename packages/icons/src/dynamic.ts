"use client"

import { createElement, useEffect, useState, type ReactNode } from "react"

import type { BrandIconComponent } from "./brand-icon.js"
import { brandImports, outlineImports } from "./generated/dynamic-imports.js"
import type { IconSet } from "./generated/runtime/types.js"
import type { IconComponent, IconProps } from "./icon.js"

type LoadedIcon = IconComponent | BrandIconComponent

const loaded = new Map<string, LoadedIcon | null>()

function cacheKey(name: string, set: IconSet) {
  return `${set}:${name}`
}

/**
 * Loads an icon by name or alias. Resolves to null for a name the set doesn't
 * have, so names stored in data degrade instead of throwing.
 */
export async function loadIcon(
  name: string,
  set: IconSet = "outline"
): Promise<LoadedIcon | null> {
  const key = cacheKey(name, set)
  const cached = loaded.get(key)
  if (cached !== undefined) return cached
  const load = (set === "brands" ? brandImports : outlineImports)[name]
  const component = load ? (await load()).default : null
  loaded.set(key, component)
  return component
}

export type DynamicIconProps = IconProps & {
  name: string
  set?: IconSet
  /** Rendered while the icon loads, and for names the set doesn't have. */
  fallback?: ReactNode
}

/** Renders an icon whose name comes from data: `<DynamicIcon name="house" />`. */
export function DynamicIcon({
  name,
  set = "outline",
  fallback = null,
  ...props
}: DynamicIconProps) {
  const key = cacheKey(name, set)
  const [, setLoadedKey] = useState<string>()

  useEffect(() => {
    if (loaded.has(key)) return
    let isCurrent = true
    void loadIcon(name, set).then(() => {
      if (isCurrent) setLoadedKey(key)
    })
    return () => {
      isCurrent = false
    }
  }, [key, name, set])

  const Component = loaded.get(key)
  if (!Component) return fallback
  return createElement(Component, props)
}
