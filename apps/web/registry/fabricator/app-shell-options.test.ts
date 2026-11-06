import { describe, expect, it } from "vitest"

import {
  getHiddenShellOptions,
  getShellOptionSections,
  getShellPlatform,
  getTabChoices,
  isPeekAvailable,
  splitShellOptionGroups,
  type ShellOptionSection,
  type ShellOptionValues,
  type ShellProject,
} from "./app-shell-options"

const OPTIONS: ShellOptionValues = {
  variant: "inset",
  collapse: "icon",
  peek: "none",
  mobileSidebar: "reveal",
  switcher: "menu",
  account: "footer",
  customize: false,
  reorder: true,
  breadcrumb: true,
  actions: true,
  tabs: "none",
  contentSize: "md",
  panel: true,
  panelMobile: "drawer",
  status: true,
  bottomNav: false,
  bottomNavStyle: "flat",
  window: "web",
  fullscreen: false,
  glass: true,
}

const web: ShellProject = { hasWeb: true, hasDesktop: false, hasMobile: false }
const desktop: ShellProject = {
  hasWeb: true,
  hasDesktop: true,
  hasMobile: false,
}
const everything: ShellProject = {
  hasWeb: true,
  hasDesktop: true,
  hasMobile: true,
}
const expo: ShellProject = { hasWeb: false, hasDesktop: false, hasMobile: true }

const getKeys = (section: ShellOptionSection | undefined) =>
  section?.groups.flatMap((group) => group.rows.map((row) => row.key))

const getRow = (
  sections: readonly ShellOptionSection[],
  key: keyof ShellOptionValues
) =>
  sections
    .flatMap((section) => section.groups)
    .flatMap((group) => group.rows)
    .find((row) => row.key === key)

const getSection = (
  sections: readonly ShellOptionSection[],
  id: ShellOptionSection["id"]
) => sections.find((section) => section.id === id)

describe("getShellOptionSections", () => {
  it("has a place for every option, once", () => {
    const sections = getShellOptionSections({
      options: OPTIONS,
      project: everything,
    })
    const keys = sections.flatMap(getKeys)
    expect(keys).toHaveLength(new Set(keys).size)
    expect([...keys].sort()).toEqual(Object.keys(OPTIONS).sort())
  })

  it("starts with what applies everywhere, then each kind of screen", () => {
    const ids = (project: ShellProject) =>
      getShellOptionSections({ options: OPTIONS, project }).map(({ id }) => id)
    expect(ids(desktop)).toEqual(["all", "desktop", "mobile"])
    expect(ids(everything)).toEqual(["all", "desktop", "mobile"])
    // A React Native project is mostly phones, so they come before tablets.
    expect(ids(expo)).toEqual(["all", "mobile", "desktop"])
  })

  it("keeps what every screen shows out of the platform sections", () => {
    const sections = getShellOptionSections({
      options: OPTIONS,
      project: everything,
    })
    expect(getKeys(getSection(sections, "all"))).toEqual([
      "variant",
      "switcher",
      "account",
      "reorder",
      "customize",
      "tabs",
      "contentSize",
      "breadcrumb",
      "actions",
      "panel",
    ])
    expect(getKeys(getSection(sections, "desktop"))).toEqual([
      "collapse",
      "peek",
      "status",
      "window",
      "fullscreen",
      "glass",
    ])
    expect(getKeys(getSection(sections, "mobile"))).toEqual([
      "mobileSidebar",
      "panelMobile",
      "bottomNav",
      "bottomNavStyle",
    ])
  })

  it("names the sections for the apps a project has", () => {
    const titles = (project: ShellProject) =>
      getShellOptionSections({ options: OPTIONS, project }).map(
        ({ title }) => title
      )
    expect(titles(desktop)).toEqual(["All platforms", "Desktop", "Mobile"])
    expect(titles(expo)).toEqual(["All platforms", "Phones", "Tablets"])

    const describeDesktop = (project: ShellProject) =>
      getSection(
        getShellOptionSections({ options: OPTIONS, project }),
        "desktop"
      )?.description
    expect(describeDesktop(web)).toBe("Wide browser windows.")
    expect(describeDesktop(desktop)).toBe(
      "Wide browser windows and desktop apps."
    )
    expect(describeDesktop(everything)).toBe(
      "Wide browser windows, desktop apps and tablets."
    )
  })

  it("drops what's hidden, and a group or section left empty", () => {
    const sections = getShellOptionSections({
      options: OPTIONS,
      project: desktop,
      hidden: new Set(["window", "fullscreen", "glass", "bottomNav"]),
    })
    const titles = (id: ShellOptionSection["id"]) =>
      getSection(sections, id)?.groups.map(({ title }) => title)
    expect(titles("desktop")).toEqual(["Sidebar", "Main"])
    expect(getKeys(getSection(sections, "mobile"))).toEqual([
      "mobileSidebar",
      "panelMobile",
      "bottomNavStyle",
    ])
    expect(
      getShellOptionSections({
        options: OPTIONS,
        project: desktop,
        hidden: new Set([
          "mobileSidebar",
          "panelMobile",
          "bottomNav",
          "bottomNavStyle",
        ]),
      }).map(({ id }) => id)
    ).toEqual(["all", "desktop"])
  })

  it("gives a switch a label, and a choice its choices", () => {
    const sections = getShellOptionSections({
      options: OPTIONS,
      project: desktop,
    })
    expect(getRow(sections, "reorder")).toMatchObject({
      kind: "switch",
      label: "Drag to reorder",
    })
    expect(getRow(sections, "variant")).toMatchObject({
      kind: "choice",
      label: "Style",
      choices: [
        { value: "inset", label: "Inset" },
        { value: "sidebar", label: "Flush" },
        { value: "floating", label: "Floating" },
      ],
    })
  })

  it("offers titlebar tabs only with a window", () => {
    const tabs = (project: ShellProject) => {
      const row = getRow(
        getShellOptionSections({ options: OPTIONS, project }),
        "tabs"
      )
      return row?.kind === "choice"
        ? row.choices.map(({ value }) => value)
        : undefined
    }
    expect(tabs(web)).toEqual(["none", "main"])
    expect(tabs(desktop)).toEqual(["none", "main", "titlebar"])
    expect(tabs(expo)).toEqual(["none", "main"])
  })

  it("says what a disabled row is waiting for", () => {
    const off = getShellOptionSections({
      options: {
        ...OPTIONS,
        panel: false,
        bottomNav: false,
        collapse: "icon",
        window: "web",
      },
      project: desktop,
    })
    for (const key of [
      "peek",
      "panelMobile",
      "bottomNavStyle",
      "fullscreen",
      "glass",
    ] as const) {
      const row = getRow(off, key)
      expect(row?.isDisabled, key).toBe(true)
      expect(row?.note, key).toMatch(/^Needs /)
    }

    const on = getShellOptionSections({
      options: {
        ...OPTIONS,
        panel: true,
        bottomNav: true,
        collapse: "offcanvas",
        window: "macos",
      },
      project: desktop,
    })
    for (const key of [
      "peek",
      "panelMobile",
      "bottomNavStyle",
      "fullscreen",
      "glass",
    ] as const) {
      expect(getRow(on, key)?.isDisabled, key).toBe(false)
      expect(getRow(on, key)?.note, key).toBeUndefined()
    }
  })

  it("leaves window rows on where the real window decides", () => {
    const sections = getShellOptionSections({
      options: { ...OPTIONS, window: "web" },
      project: desktop,
      hidden: new Set(["window", "fullscreen"]),
    })
    expect(getRow(sections, "glass")?.isDisabled).toBe(false)
  })

  it("shows a project's note until a requirement replaces it", () => {
    const notes = { glass: "macOS only.", status: "Somewhere." }
    const free = getShellOptionSections({
      options: { ...OPTIONS, window: "macos" },
      project: desktop,
      notes,
    })
    expect(getRow(free, "status")?.note).toBe("Somewhere.")
    expect(getRow(free, "glass")?.note).toBe("macOS only.")

    const waiting = getShellOptionSections({
      options: { ...OPTIONS, window: "web" },
      project: desktop,
      notes,
    })
    expect(getRow(waiting, "glass")?.note).toMatch(/^Needs /)
  })
})

describe("a card that previews one platform", () => {
  const sections = (project: ShellProject, platform: "desktop" | "mobile") =>
    getShellOptionSections({ options: OPTIONS, project, platform })
  const titles = (project: ShellProject, platform: "desktop" | "mobile") =>
    sections(project, platform).map(({ title }) => title)
  const keys = (project: ShellProject, platform: "desktop" | "mobile") =>
    sections(project, platform).flatMap(({ groups }) =>
      groups.flatMap(({ rows }) => rows.map(({ key }) => key))
    )

  it("shows a tablet what applies everywhere and its own section", () => {
    expect(titles(expo, "desktop")).toEqual(["All platforms", "Tablets"])
  })

  it("shows a phone what applies everywhere and its own section", () => {
    expect(titles(expo, "mobile")).toEqual(["All platforms", "Phones"])
  })

  it("shows a desktop app or a wide browser the desktop section", () => {
    expect(titles(everything, "desktop")).toEqual(["All platforms", "Desktop"])
    expect(titles(desktop, "desktop")).toEqual(["All platforms", "Desktop"])
  })

  it("shows a narrow browser window the mobile section", () => {
    expect(titles(everything, "mobile")).toEqual(["All platforms", "Mobile"])
  })

  it("leaves out what a phone's layout can't show", () => {
    expect(keys(expo, "mobile")).not.toContain("variant")
    expect(keys(expo, "mobile")).not.toContain("contentSize")
  })

  it("keeps those for a tablet", () => {
    expect(keys(expo, "desktop")).toContain("variant")
    expect(keys(expo, "desktop")).toContain("contentSize")
  })

  it("keeps every section for a page with no platform of its own", () => {
    expect(
      getShellOptionSections({ options: OPTIONS, project: expo }).map(
        ({ title }) => title
      )
    ).toEqual(["All platforms", "Phones", "Tablets"])
    expect(
      getShellOptionSections({ options: OPTIONS, project: expo }).flatMap(
        ({ groups }) => groups.flatMap(({ rows }) => rows.map(({ key }) => key))
      )
    ).toContain("variant")
  })

  it("reads the platform from the window's size class", () => {
    expect(getShellPlatform({ isPhone: true })).toBe("mobile")
    expect(getShellPlatform({ isPhone: false })).toBe("desktop")
  })
})

describe("splitShellOptionGroups", () => {
  const group = (title: string, rowCount: number) => ({
    title,
    rows: Array.from({ length: rowCount }, () => ({
      kind: "switch" as const,
      key: "status" as const,
      label: title,
      note: undefined,
      isDisabled: false,
    })),
  })
  const titles = (groups: readonly { title: string }[]) =>
    groups.map(({ title }) => title)

  it("balances the columns by rows, keeping the order", () => {
    const [left, right] = splitShellOptionGroups([
      group("Sidebar", 3),
      group("Main", 2),
      group("Window", 1),
    ])
    expect(titles(left)).toEqual(["Sidebar"])
    expect(titles(right)).toEqual(["Main", "Window"])
  })

  it("leans left on a tie", () => {
    const [left, right] = splitShellOptionGroups([
      group("Sidebar", 3),
      group("Main", 2),
      group("Window", 3),
    ])
    expect(titles(left)).toEqual(["Sidebar", "Main"])
    expect(titles(right)).toEqual(["Window"])
  })

  it("keeps a lone group on the left", () => {
    const [left, right] = splitShellOptionGroups([group("Only", 2)])
    expect(titles(left)).toEqual(["Only"])
    expect(right).toEqual([])
  })
})

describe("what a project's shell offers", () => {
  it("never offers what only the preview uses", () => {
    for (const project of [web, desktop, everything, expo]) {
      const hidden = getHiddenShellOptions(project)
      expect(hidden.has("window")).toBe(true)
      expect(hidden.has("fullscreen")).toBe(true)
    }
  })

  it("offers glass only with a desktop app", () => {
    expect(getHiddenShellOptions(web).has("glass")).toBe(true)
    expect(getHiddenShellOptions(expo).has("glass")).toBe(true)
    expect(getHiddenShellOptions(desktop).has("glass")).toBe(false)
  })

  it("offers peek where there's a pointer", () => {
    expect(getHiddenShellOptions(web).has("peek")).toBe(false)
    expect(getHiddenShellOptions(everything).has("peek")).toBe(false)
    expect(getHiddenShellOptions(expo).has("peek")).toBe(true)
  })

  it("offers the tab bar's style only with a React Native app", () => {
    expect(getHiddenShellOptions(web).has("bottomNavStyle")).toBe(true)
    expect(getHiddenShellOptions(desktop).has("bottomNavStyle")).toBe(true)
    expect(getHiddenShellOptions(everything).has("bottomNavStyle")).toBe(false)
    expect(getHiddenShellOptions(expo).has("bottomNavStyle")).toBe(false)
  })

  it("keeps the tab choices the project can honour", () => {
    const values = (project: ShellProject) =>
      getTabChoices(project).map(({ value }) => value)
    expect(values(web)).toEqual(["none", "main"])
    expect(values(desktop)).toEqual(["none", "main", "titlebar"])
  })

  it("offers peek only for an off-canvas sidebar", () => {
    expect(isPeekAvailable({ collapse: "offcanvas" })).toBe(true)
    expect(isPeekAvailable({ collapse: "icon" })).toBe(false)
  })
})
