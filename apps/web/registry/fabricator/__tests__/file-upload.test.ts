import { describe, expect, it } from "vitest"

import {
  checkFiles,
  formatFileSize,
  isFileTypeAccepted,
} from "@/registry/fabricator/shared/ui/file-upload"

function createFile(name: string, type: string, size = 10) {
  return new File([new Uint8Array(size)], name, { type })
}

const photo = createFile("photo.PNG", "image/png")
const report = createFile("report.pdf", "application/pdf")
const notes = createFile("notes.md", "")

describe("isFileTypeAccepted", () => {
  it("accepts everything without an accept string", () => {
    expect(isFileTypeAccepted(photo, undefined)).toBe(true)
    expect(isFileTypeAccepted(notes, "")).toBe(true)
    expect(isFileTypeAccepted(report, " ")).toBe(true)
  })

  it("matches a MIME wildcard", () => {
    expect(isFileTypeAccepted(photo, "image/*")).toBe(true)
    expect(isFileTypeAccepted(report, "image/*")).toBe(false)
  })

  it("matches an exact MIME type, ignoring case", () => {
    expect(isFileTypeAccepted(report, "application/PDF")).toBe(true)
    expect(isFileTypeAccepted(photo, "image/jpeg")).toBe(false)
  })

  it("matches an extension, ignoring case", () => {
    expect(isFileTypeAccepted(photo, ".png")).toBe(true)
    expect(isFileTypeAccepted(notes, ".md,.txt")).toBe(true)
    expect(isFileTypeAccepted(report, ".png")).toBe(false)
  })

  it("matches any entry of a list", () => {
    expect(isFileTypeAccepted(report, "image/*, .pdf")).toBe(true)
    expect(isFileTypeAccepted(notes, "image/*, application/pdf")).toBe(false)
  })

  it("treats */* and * as anything", () => {
    expect(isFileTypeAccepted(notes, "*/*")).toBe(true)
    expect(isFileTypeAccepted(report, "*")).toBe(true)
  })

  it("never lets a wildcard match a file with no type", () => {
    expect(isFileTypeAccepted(notes, "text/*")).toBe(false)
  })
})

describe("checkFiles", () => {
  it("accepts every file when nothing limits them", () => {
    expect(checkFiles([photo, report], {})).toEqual({
      accepted: [photo, report],
      rejected: [],
    })
  })

  it("rejects files of the wrong type", () => {
    expect(checkFiles([photo, report], { accept: "image/*" })).toEqual({
      accepted: [photo],
      rejected: [{ file: report, reason: "type" }],
    })
  })

  it("rejects files over the size limit", () => {
    const large = createFile("large.png", "image/png", 2048)

    expect(checkFiles([photo, large], { maxSize: 1024 })).toEqual({
      accepted: [photo],
      rejected: [{ file: large, reason: "size" }],
    })
  })

  it("accepts a file exactly at the size limit", () => {
    expect(checkFiles([photo], { maxSize: 10 }).accepted).toEqual([photo])
  })

  it("reports the type before the size", () => {
    const large = createFile("large.pdf", "application/pdf", 2048)

    expect(
      checkFiles([large], { accept: "image/*", maxSize: 1024 }).rejected
    ).toEqual([{ file: large, reason: "type" }])
  })

  it("rejects files past the count, counting the files already picked", () => {
    const third = createFile("third.png", "image/png")

    expect(
      checkFiles([photo, report, third], { maxFiles: 3, existingCount: 1 })
    ).toEqual({
      accepted: [photo, report],
      rejected: [{ file: third, reason: "count" }],
    })
  })

  it("rejects everything once the count is reached", () => {
    expect(checkFiles([photo], { maxFiles: 2, existingCount: 2 })).toEqual({
      accepted: [],
      rejected: [{ file: photo, reason: "count" }],
    })
  })

  it("doesn't let a rejected file use up the count", () => {
    expect(
      checkFiles([report, photo], { accept: "image/*", maxFiles: 1 })
    ).toEqual({
      accepted: [photo],
      rejected: [{ file: report, reason: "type" }],
    })
  })
})

describe("formatFileSize", () => {
  it("writes bytes, kilobytes, megabytes and gigabytes", () => {
    expect(formatFileSize(0)).toBe("0 B")
    expect(formatFileSize(512)).toBe("512 B")
    expect(formatFileSize(1024)).toBe("1 KB")
    expect(formatFileSize(1536)).toBe("1.5 KB")
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5 MB")
    expect(formatFileSize(1.84 * 1024 * 1024)).toBe("1.8 MB")
    expect(formatFileSize(3 * 1024 ** 3)).toBe("3 GB")
  })

  it("rounds large values to whole units", () => {
    expect(formatFileSize(123.4 * 1024 * 1024)).toBe("123 MB")
  })
})
