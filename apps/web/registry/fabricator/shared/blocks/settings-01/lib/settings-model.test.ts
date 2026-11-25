import { describe, expect, it } from "vitest"

import {
  addDomains,
  canSaveName,
  cleanDomain,
  countExpiredFiles,
  describeRetention,
  getExportStep,
  getExportTimeLeft,
  getRetentionLabel,
  isNameConfirmed,
  isTextDirty,
} from "./settings-model"

describe("dirty text", () => {
  it("ignores spaces around it", () => {
    expect(isTextDirty("Acme Inc ", "Acme Inc")).toBe(false)
    expect(isTextDirty("Acme", "Acme Inc")).toBe(true)
  })

  it("never saves a blank name", () => {
    expect(canSaveName("  ", "Acme Inc")).toBe(false)
    expect(canSaveName("Acme", "Acme Inc")).toBe(true)
  })
})

describe("domains", () => {
  it("takes a domain out of an address or a link", () => {
    expect(cleanDomain("ada@Acme.com")).toBe("acme.com")
    expect(cleanDomain("https://www.acme.co.uk/team")).toBe("acme.co.uk")
  })

  it("adds a pasted list once", () => {
    expect(addDomains(["acme.com"], "acme.com, acme.dev\nacme.co.uk")).toEqual({
      domains: ["acme.com", "acme.dev", "acme.co.uk"],
      error: null,
    })
  })

  it("refuses public and broken domains, and keeps the good ones", () => {
    const result = addDomains([], "gmail.com acme.dev")
    expect(result.domains).toEqual(["acme.dev"])
    expect(result.error).toContain("gmail.com")
    expect(addDomains([], "acme").error).toContain("not a domain")
  })
})

describe("retention", () => {
  const ages = [
    { days: 400, files: 12 },
    { days: 100, files: 300 },
    { days: 20, files: 50 },
  ]

  it("counts what is older", () => {
    expect(countExpiredFiles(ages, 90)).toBe(312)
    expect(countExpiredFiles(ages, Infinity)).toBe(0)
  })

  it("says what will happen, and when", () => {
    expect(describeRetention(ages, 90, "December 1")).toBe(
      "312 files in Trash are older, and will be gone on December 1."
    )
    expect(describeRetention(ages, 730, "December 1")).toContain("Nothing")
    expect(describeRetention(ages, Infinity, "December 1")).toContain("stay")
  })

  it("labels each stop", () => {
    expect(getRetentionLabel(365)).toBe("1 year")
    expect(getRetentionLabel(Infinity)).toBe("Forever")
  })
})

describe("export", () => {
  it("names the step and the time left", () => {
    expect(getExportStep(10)).toContain("customers")
    expect(getExportStep(99)).toContain("Packing")
    expect(getExportStep(100)).toContain("Packing")
    expect(getExportTimeLeft(50, 20)).toBe("About 10 seconds left")
    expect(getExportTimeLeft(99, 20)).toBe("Almost done")
  })
})

describe("isNameConfirmed", () => {
  it("asks for the name, whatever the case", () => {
    expect(isNameConfirmed("acme inc ", "Acme Inc")).toBe(true)
    expect(isNameConfirmed("acme", "Acme Inc")).toBe(false)
  })
})
