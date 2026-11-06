import { describe, expect, it } from "vitest"

import { addDesktopWindowToLayout } from "./layout-window"

const LAYOUT = `"use client"

import * as React from "react"

import { AppShell } from "@/components/ui/app-shell"

export function AppShellLayout({
  pathname,
  children,
}: {
  pathname: string
  children: React.ReactNode
}) {
  return (
    <AppShell storageKey="app">
      {children}
    </AppShell>
  )
}
`

describe("addDesktopWindowToLayout", () => {
  it("adds the hook and the prop", () => {
    const out = addDesktopWindowToLayout(LAYOUT, "@/hooks") ?? ""
    expect(out).toContain(
      'import { useDesktopWindow } from "@/hooks/use-desktop-window"'
    )
    expect(out).toContain(
      "}) {\n  const { shellWindow } = useDesktopWindow({ hasTitlebar: false })"
    )
    expect(out).toContain('<AppShell window={shellWindow} storageKey="app">')
  })

  it("does nothing the second time", () => {
    const once = addDesktopWindowToLayout(LAYOUT, "@/hooks") ?? ""
    expect(addDesktopWindowToLayout(once, "@/hooks")).toBe(once)
  })

  it("refuses a file it didn't write", () => {
    expect(
      addDesktopWindowToLayout("export const a = 1\n", "@/hooks")
    ).toBeNull()
  })
})
