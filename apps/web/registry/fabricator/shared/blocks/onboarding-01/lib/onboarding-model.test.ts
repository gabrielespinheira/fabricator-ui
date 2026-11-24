import { describe, expect, it } from "vitest"

import {
  canOpenStep,
  getAddress,
  getAddressState,
  getDefaultAnswers,
  getInviteProblem,
  getNextStep,
  getOpenStep,
  getPreview,
  getPreviousStep,
  getReadableColor,
  getReadyAction,
  getReviewRows,
  getStepIssue,
  getStepPosition,
  getSteps,
  isOnboardingStep,
  parseAnswers,
  resolveStep,
  splitEmails,
  toAddress,
  toggleValue,
  withUse,
  type OnboardingAnswers,
} from "@/registry/fabricator/shared/blocks/onboarding-01/lib/onboarding-model"

const defaults = getDefaultAnswers("ada@acme.com")

const answered: OnboardingAnswers = {
  ...withUse(defaults, "projects"),
  sources: ["github"],
  invites: ["maya@acme.com", "lucas@acme.com"],
}

describe("getDefaultAnswers", () => {
  it("reads the company from the email", () => {
    expect(defaults).toMatchObject({
      use: null,
      size: 2,
      name: "Acme",
      address: "acme",
      sources: [],
      invites: [],
    })
  })

  it("leaves the name open for a personal address", () => {
    expect(getDefaultAnswers("ada@gmail.com")).toMatchObject({
      name: "",
      address: "",
      size: 0,
    })
  })
})

describe("getSteps", () => {
  it("ends with the review", () => {
    expect(getSteps(answered)).toEqual([
      "use",
      "team",
      "workspace",
      "connect",
      "invite",
      "review",
    ])
  })

  it("has no one to invite for a team of one", () => {
    expect(getSteps({ ...answered, size: 0 })).not.toContain("invite")
  })
})

describe("moving", () => {
  it("goes to the next step and back", () => {
    expect(getNextStep("use", answered)).toBe("team")
    expect(getNextStep("review", answered)).toBe("ready")
    expect(getNextStep("ready", answered)).toBe("ready")
    expect(getPreviousStep("team", answered)).toBe("use")
    expect(getPreviousStep("use", answered)).toBeNull()
    expect(getPreviousStep("ready", answered)).toBe("review")
  })

  it("skips over a step that is not asked", () => {
    const solo = { ...answered, size: 0 }
    expect(getNextStep("connect", solo)).toBe("review")
    expect(getPreviousStep("review", solo)).toBe("connect")
  })

  it("knows the position", () => {
    expect(getStepPosition("team", answered)).toEqual({ index: 2, count: 6 })
    expect(getStepPosition("ready", answered)).toEqual({ index: 6, count: 6 })
    expect(getStepPosition("review", { ...answered, size: 0 })).toEqual({
      index: 5,
      count: 5,
    })
  })
})

describe("canOpenStep", () => {
  it("needs the answers before it", () => {
    expect(canOpenStep("use", defaults)).toBe(true)
    expect(canOpenStep("team", defaults)).toBe(false)
    expect(canOpenStep("review", answered)).toBe(true)
    expect(canOpenStep("review", { ...answered, name: "" })).toBe(false)
    expect(canOpenStep("workspace", { ...answered, name: "" })).toBe(true)
  })

  it("doesn't open a step that isn't asked", () => {
    expect(canOpenStep("invite", { ...answered, size: 0 })).toBe(false)
  })
})

describe("resolveStep", () => {
  it("sends a link to the first step still open", () => {
    expect(resolveStep("review", defaults)).toBe("use")
    expect(resolveStep("review", { ...answered, name: "" })).toBe("workspace")
    expect(resolveStep("nowhere", answered)).toBe("use")
    expect(resolveStep("connect", answered)).toBe("connect")
    expect(resolveStep("invite", { ...answered, size: 0 })).toBe("review")
  })
})

describe("getOpenStep", () => {
  it("is the first question without an answer", () => {
    expect(getOpenStep(defaults)).toBe("use")
    expect(getOpenStep({ ...answered, name: "" })).toBe("workspace")
    expect(getOpenStep(answered)).toBeNull()
  })
})

describe("getReadableColor", () => {
  it("is the one that reads on the color", () => {
    expect(getReadableColor("#2563eb")).toBe("#ffffff")
    expect(getReadableColor("#fde047")).toBe("#000000")
    expect(getReadableColor("#334155")).toBe("#ffffff")
    expect(getReadableColor("nonsense")).toBe("#ffffff")
  })
})

describe("getStepIssue", () => {
  it("says what is missing", () => {
    expect(getStepIssue("use", defaults)).toBe("Choose one to continue.")
    expect(getStepIssue("workspace", { ...answered, name: " " })).toBe(
      "Name the workspace."
    )
    expect(
      getStepIssue("workspace", { ...answered, address: "northwind" })
    ).toBe("northwind is taken. Try northwind-hq.")
    expect(getStepIssue("connect", answered)).toBeUndefined()
    expect(
      getStepIssue("invite", { ...answered, invites: ["maya@acme"] })
    ).toBe("Fix or remove 1 address.")
  })
})

describe("addresses", () => {
  it("makes one from a name", () => {
    expect(toAddress("Acme Inc.")).toBe("acme-inc")
    expect(toAddress("  Café Müller ")).toBe("cafe-muller")
    expect(toAddress("---")).toBe("")
  })

  it("says whether it is free", () => {
    expect(getAddressState("acme")).toEqual({ status: "free" })
    expect(getAddressState("ac")).toEqual({
      status: "invalid",
      message: "Use at least 3 characters.",
    })
    expect(getAddressState("")).toMatchObject({ status: "invalid" })
    expect(getAddressState("northwind")).toEqual({
      status: "taken",
      message: "northwind is taken. Try northwind-hq.",
      suggestion: "northwind-hq",
    })
  })

  it("writes it in full", () => {
    expect(getAddress("acme")).toBe("acme.example.com")
  })
})

describe("invites", () => {
  it("splits a pasted list and drops repeats", () => {
    expect(
      splitEmails(
        "Maya@acme.com, lucas@acme.com; maya@acme.com\n<emma@acme.com>"
      )
    ).toEqual(["maya@acme.com", "lucas@acme.com", "emma@acme.com"])
    expect(splitEmails("  ")).toEqual([])
  })

  it("explains what is wrong and offers the fix", () => {
    const owner = "ada@acme.com"
    expect(getInviteProblem("maya@acme.com", owner)).toBeUndefined()
    expect(getInviteProblem("maya@acme", owner)).toEqual({
      message: "That isn't a full address.",
      suggestion: "maya@acme.com",
    })
    expect(getInviteProblem("maya@acme.con", owner)).toEqual({
      message: "Did you mean maya@acme.com?",
      suggestion: "maya@acme.com",
    })
    expect(getInviteProblem("ada@acme.com", owner)).toEqual({
      message: "That's you. You're already in.",
    })
    expect(getInviteProblem("maya", owner)).toEqual({
      message: "That isn't a full address.",
      suggestion: "maya@acme.com",
    })
  })
})

describe("withUse", () => {
  it("starts on that use's first view and drops sources it doesn't offer", () => {
    const changed = withUse(
      { ...answered, sources: ["github", "google-calendar"], layout: "list" },
      "customers"
    )
    expect(changed.use).toBe("customers")
    expect(changed.layout).toBe("board")
    expect(changed.sources).toEqual(["google-calendar"])
  })

  it("keeps everything when the use is the same", () => {
    const kept = { ...answered, layout: "list" as const }
    expect(withUse(kept, "projects")).toEqual(kept)
  })
})

describe("toggleValue", () => {
  it("adds and removes", () => {
    expect(toggleValue(["a"], "b")).toEqual(["a", "b"])
    expect(toggleValue(["a", "b"], "a")).toEqual(["b"])
  })
})

describe("getPreview", () => {
  it("is empty and waiting before the first answer", () => {
    const preview = getPreview(defaults)
    expect(preview.isBlank).toBe(true)
    expect(preview.view).toBeNull()
  })

  it("follows the use, the view and the size", () => {
    const preview = getPreview(answered)
    expect(preview).toMatchObject({
      isBlank: false,
      name: "Acme",
      address: "acme.example.com",
      view: "board",
      title: "Projects",
    })
    expect(preview.nav.find(({ isActive }) => isActive)?.id).toBe("projects")
    expect(preview.teams.length).toBe(2)
    expect(getPreview({ ...answered, size: 0 }).teams).toEqual([])
    expect(getPreview({ ...answered, size: 4 }).teams.length).toBe(4)
  })

  it("shows reports as charts or a table", () => {
    const reports = withUse(answered, "reports")
    expect(getPreview(reports).view).toBe("charts")
    expect(getPreview({ ...reports, layout: "list" }).view).toBe("list")
  })

  it("lists what is connected and who is coming", () => {
    const preview = getPreview(answered)
    expect(preview.sources).toEqual(["github"])
    expect(preview.invited).toEqual(["maya@acme.com", "lucas@acme.com"])
    expect(getPreview({ ...answered, size: 0 }).invited).toEqual([])
  })

  it("keeps a name on screen while the field is empty", () => {
    expect(getPreview({ ...answered, name: "" }).name).toBe("Your workspace")
  })
})

describe("getReviewRows", () => {
  it("has a row for each step asked, with its answer", () => {
    const rows = getReviewRows(answered)
    expect(rows.map(({ step }) => step)).toEqual([
      "use",
      "team",
      "workspace",
      "connect",
      "invite",
    ])
    expect(rows[1].value).toBe("11 to 50 people, as a board")
    expect(rows[2].value).toBe("Acme, acme.example.com")
    expect(rows[3].value).toBe("GitHub")
    expect(rows[4].value).toBe("2 people")
  })

  it("says none plainly", () => {
    const rows = getReviewRows({ ...answered, sources: [], invites: [] })
    expect(rows[3].value).toBe("Nothing yet")
    expect(rows[4].value).toBe("No one yet")
  })
})

describe("getReadyAction", () => {
  it("is one step, from what they came for", () => {
    expect(getReadyAction(answered).label).toBe("Create the first project")
    expect(getReadyAction(withUse(answered, "reports")).label).toBe(
      "Open the overview"
    )
  })
})

describe("parseAnswers", () => {
  it("reads back what was saved", () => {
    expect(parseAnswers(JSON.stringify(answered), defaults)).toEqual(answered)
  })

  it("falls back for anything it can't trust", () => {
    expect(parseAnswers(null, defaults)).toEqual(defaults)
    expect(parseAnswers("{", defaults)).toEqual(defaults)
    expect(parseAnswers("[]", defaults)).toEqual(defaults)
    expect(
      parseAnswers(
        JSON.stringify({ use: "games", size: 99, name: 4, invites: ["a", 2] }),
        defaults
      )
    ).toEqual({ ...defaults, invites: ["a"] })
  })
})

describe("isOnboardingStep", () => {
  it("guards a hash", () => {
    expect(isOnboardingStep("team")).toBe(true)
    expect(isOnboardingStep("teams")).toBe(false)
  })
})
