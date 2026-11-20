import { describe, expect, it } from "vitest"

import { transformPackageSource } from "./react-package-source"

describe("React package source", () => {
  it("rewrites registry imports and prefixes styles without changing the public API", () => {
    const { content, candidates, dependencies } = transformPackageSource(
      "ui/dialog.tsx",
      `"use client"
import { cva } from "class-variance-authority"
import { Button } from "@/registry/base-fabricator/ui/button"
const styles = cva("group/dialog flex", { variants: { size: { sm: "p-4" } } })
export const Dialog = ({ className }) => <Button data-slot="dialog" className={cn("px-2", className)}><span className="sr-only">Close</span></Button>`,
      new Set(["ui/button.tsx", "ui/dialog.tsx"])
    )
    expect(content).toContain('"use client"')
    expect(content).toContain('from "./button.js"')
    expect(content).toContain('data-slot="dialog"')
    expect(content).toContain('sm: "fab:p-4"')
    expect(content).toContain('cn("fab:px-2", className)')
    expect(candidates).toEqual([
      "fab:group/dialog",
      "fab:flex",
      "fab:p-4",
      "fab:px-2",
      "fab:sr-only",
    ])
    expect(dependencies).toEqual(["class-variance-authority"])
  })

  it("fails on aliases outside the installed component closure", () => {
    expect(() =>
      transformPackageSource(
        "ui/dialog.tsx",
        'import { Button } from "@/lib/site-icons"',
        new Set()
      )
    ).toThrow("site-icons")
  })
})
