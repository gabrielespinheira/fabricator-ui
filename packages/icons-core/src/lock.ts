import fs from "node:fs"
import type { z } from "zod"

import { LOCK_FILE } from "./paths"
import { iconsLockSchema, readJson } from "./schemas"

export type IconsLock = z.infer<typeof iconsLockSchema>

export function readLock(): IconsLock {
  if (!fs.existsSync(LOCK_FILE)) return {}
  return readJson(LOCK_FILE, iconsLockSchema)
}

export function writeLock(lock: IconsLock) {
  fs.writeFileSync(LOCK_FILE, `${JSON.stringify(lock, null, 2)}\n`)
}
