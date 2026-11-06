import { describe, expect, it } from "vitest"

import { applyDataVariants } from "./data-variants"

describe("applyDataVariants", () => {
  it("keeps the class of a variant whose attribute matches", () => {
    expect(
      applyDataVariants(
        "text-foreground data-[selected-single=true]:text-primary-foreground",
        { "data-selected-single": true }
      )
    ).toBe("text-foreground text-primary-foreground")
  })

  it("drops a variant whose attribute differs or is absent", () => {
    expect(
      applyDataVariants(
        "text-foreground data-[outside=true]:text-muted-foreground data-[state=open]:font-medium",
        { "data-state": "closed" }
      )
    ).toBe("text-foreground")
  })

  it("matches a false attribute, as the stylesheet does", () => {
    expect(
      applyDataVariants("data-[outside=false]:text-foreground", {
        "data-outside": false,
      })
    ).toBe("text-foreground")
  })

  it("keeps the other variants stacked on a data variant", () => {
    expect(
      applyDataVariants("dark:data-[active=true]:text-foreground", {
        "data-active": true,
      })
    ).toBe("dark:text-foreground")
  })

  it("needs every data variant in a stack to match", () => {
    expect(
      applyDataVariants("data-[a=true]:data-[b=true]:text-foreground", {
        "data-a": true,
        "data-b": false,
      })
    ).toBe("")
  })

  it("leaves classes without a data variant alone", () => {
    expect(
      applyDataVariants("active:text-foreground dark:bg-card", {
        "data-active": true,
      })
    ).toBe("active:text-foreground dark:bg-card")
  })
})
