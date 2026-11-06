"use client"

import * as React from "react"

import { useConfig } from "@/hooks/use-config"
import type { PackageManager } from "@/app/(app)/(create)/lib/setup"

function subscribeNothing() {
  return () => {}
}

/**
 * The package manager commands are written for. The stored choice is read on
 * the client; the server renders bun.
 */
export function usePackageManager() {
  const [config, setConfig] = useConfig()
  const isHydrated = React.useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false
  )
  return {
    isHydrated,
    packageManager: isHydrated ? config.packageManager : "bun",
    setPackageManager: (packageManager: PackageManager) =>
      setConfig({ ...config, packageManager }),
  }
}
