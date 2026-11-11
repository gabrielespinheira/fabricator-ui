import { describe, expect, it } from "vitest"

import { checkFiles } from "./file-upload-model"

describe("file checks across platforms", () => {
  it("keeps native URI assets intact and applies the web rules", () => {
    const file = {
      uri: "file:///report.pdf",
      name: "report.pdf",
      type: "application/pdf",
      size: 2048,
    }
    expect(
      checkFiles([file], { accept: ".pdf", maxSize: 4096 }).accepted[0]
    ).toBe(file)
    expect(checkFiles([file], { maxSize: 1024 }).rejected[0]?.reason).toBe(
      "size"
    )
    expect(
      checkFiles([file], { maxFiles: 1, existingCount: 1 }).rejected[0]?.reason
    ).toBe("count")
  })
})
