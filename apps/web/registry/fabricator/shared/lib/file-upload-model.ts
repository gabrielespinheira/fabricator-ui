type FileRejectionReason = "type" | "size" | "count"

type UploadFile = { name: string; type: string; size: number }

type FileRejection<TFile extends UploadFile = UploadFile> = {
  file: TFile
  reason: FileRejectionReason
}

type FileCheckOptions = {
  /** The `accept` attribute: MIME types, `type/*` wildcards and extensions. */
  accept?: string
  /** Largest size in bytes. */
  maxSize?: number
  /** Most files in all, counting `existingCount`. */
  maxFiles?: number
  /** Files already picked. */
  existingCount?: number
}

/**
 * Whether a file matches an `accept` string, as the browser's picker reads
 * it: `.pdf` matches the name's extension, `image/*` the MIME family and
 * `application/pdf` the exact type. A file with no type only matches by
 * extension.
 */
function isFileTypeAccepted(
  file: Pick<UploadFile, "name" | "type">,
  accept: string | undefined
) {
  const patterns = (accept ?? "")
    .split(",")
    .map((pattern) => pattern.trim().toLowerCase())
    .filter(Boolean)
  if (patterns.length === 0) return true

  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()

  return patterns.some((pattern) => {
    if (pattern === "*" || pattern === "*/*") return true
    if (pattern.startsWith(".")) return name.endsWith(pattern)
    if (!type) return false
    if (pattern.endsWith("/*")) return type.startsWith(pattern.slice(0, -1))
    return type === pattern
  })
}

/**
 * Splits picked or dropped files into the accepted and the rejected, with a
 * reason for each rejection. Type is checked first, then size, then the
 * count, so a file of the wrong type never uses up a place.
 */
function checkFiles<TFile extends UploadFile>(
  files: readonly TFile[],
  {
    accept,
    maxSize = Infinity,
    maxFiles = Infinity,
    existingCount = 0,
  }: FileCheckOptions
) {
  const accepted: TFile[] = []
  const rejected: FileRejection<TFile>[] = []

  for (const file of files) {
    if (!isFileTypeAccepted(file, accept)) {
      rejected.push({ file, reason: "type" })
    } else if (file.size > maxSize) {
      rejected.push({ file, reason: "size" })
    } else if (existingCount + accepted.length >= maxFiles) {
      rejected.push({ file, reason: "count" })
    } else {
      accepted.push(file)
    }
  }

  return { accepted, rejected }
}

const FILE_SIZE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const

/** A byte count for people: `512 B`, `1.5 KB`, `5 MB`, `123 MB`. */
function formatFileSize(bytes: number) {
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < FILE_SIZE_UNITS.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  const rounded =
    unitIndex === 0 || value >= 100
      ? Math.round(value)
      : Math.round(value * 10) / 10
  return `${rounded} ${FILE_SIZE_UNITS[unitIndex]}`
}

export {
  checkFiles,
  isFileTypeAccepted,
  formatFileSize,
  type UploadFile,
  type FileRejection,
  type FileRejectionReason,
}
