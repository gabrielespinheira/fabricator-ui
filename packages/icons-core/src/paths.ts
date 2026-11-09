import path from "node:path"
import { fileURLToPath } from "node:url"

export const PACKAGE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
export const SOURCES = path.join(PACKAGE_ROOT, "sources")
export const LUCIDE_SOURCES = path.join(SOURCES, "lucide")
export const OUTLINE_SOURCES = path.join(SOURCES, "outline")
export const BRAND_SOURCES = path.join(SOURCES, "brands")
export const FILE_SOURCES = path.join(SOURCES, "files")
export const DUOTONE_SOURCES = path.join(SOURCES, "duotone")
export const ANIMATED_SOURCES = path.join(SOURCES, "animated")
export const ANIMATED_MAP = path.join(SOURCES, "animated.json")
export const LOCK_FILE = path.join(PACKAGE_ROOT, "icons.lock.json")
