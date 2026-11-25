"use client"

import * as React from "react"

import {
  notifyFailed,
  notifySaved,
} from "@/registry/bases/__base__/blocks/settings-01/components/settings-controls"
import { saveSetting } from "@/registry/bases/__base__/blocks/settings-01/lib/settings-api"
import {
  type SettingKey,
  type WorkspaceSettings,
} from "@/registry/bases/__base__/blocks/settings-01/lib/settings-model"

export type SaveStatus = "saving" | "saved" | "failed"

export type SaveOptions = {
  /** Names the change in a toast that can undo it: "Week starts on Monday". */
  undo?: string
}

export type SaveSetting = <Key extends SettingKey>(
  key: Key,
  value: WorkspaceSettings[Key],
  options?: SaveOptions
) => Promise<boolean>

const SAVED_TIME = 2400

/**
 * The workspace's settings. A change shows at once; when the server refuses
 * it, the old value comes back and a toast says why, with Retry.
 */
export function useWorkspaceSettings(initial: WorkspaceSettings) {
  const [settings, setSettings] = React.useState(initial)
  const [statuses, setStatuses] = React.useState<
    Partial<Record<SettingKey, SaveStatus>>
  >({})
  const [hasSaved, setHasSaved] = React.useState(false)
  const latest = React.useRef(initial)
  const timers = React.useRef(
    new Map<SettingKey, ReturnType<typeof setTimeout>>()
  )

  React.useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((timer) => clearTimeout(timer))
  }, [])

  const write = React.useCallback(
    <Key extends SettingKey>(key: Key, value: WorkspaceSettings[Key]) => {
      latest.current = { ...latest.current, [key]: value }
      setSettings(latest.current)
    },
    []
  )

  const mark = React.useCallback((key: SettingKey, status?: SaveStatus) => {
    clearTimeout(timers.current.get(key))
    setStatuses((current) => ({ ...current, [key]: status }))
    if (status !== "saved") return
    timers.current.set(
      key,
      setTimeout(
        () => setStatuses((current) => ({ ...current, [key]: undefined })),
        SAVED_TIME
      )
    )
  }, [])

  const save: SaveSetting = React.useCallback(
    async function save(key, value, options = {}) {
      const previous = latest.current[key]
      if (Object.is(previous, value)) return true
      write(key, value)
      mark(key, "saving")
      try {
        await saveSetting()
      } catch (error) {
        // A newer change owns the value now; leave it alone.
        if (Object.is(latest.current[key], value)) write(key, previous)
        mark(key, "failed")
        notifyFailed(
          "That change wasn't saved",
          error instanceof Error ? error.message : "The server didn't answer.",
          () => void save(key, value, options)
        )
        return false
      }
      mark(key, "saved")
      setHasSaved(true)
      if (options.undo)
        notifySaved(options.undo, () => void save(key, previous))
      return true
    },
    [mark, write]
  )

  return { settings, statuses, hasSaved, save }
}
