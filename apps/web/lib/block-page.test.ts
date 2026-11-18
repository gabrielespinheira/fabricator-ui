import { describe, expect, it } from "vitest"

import { getBlockLayout, getBlockPageRoute, getBlockRoute } from "./block-page"

describe("getBlockRoute", () => {
  it("turns a page's install target into its URL path", () => {
    expect(getBlockRoute("app/sign-in/page.tsx")).toBe("/sign-in")
    expect(getBlockRoute("app/dashboard/page.tsx")).toBe("/dashboard")
  })

  it("leaves route groups out of the path", () => {
    expect(getBlockRoute("app/(auth)/forgot-password/page.tsx")).toBe(
      "/forgot-password"
    )
  })

  it("maps the app's root page to /", () => {
    expect(getBlockRoute("app/page.tsx")).toBe("/")
  })
})

describe("getBlockPageRoute", () => {
  it("reads the route from the block's page file", () => {
    expect(
      getBlockPageRoute([
        { type: "registry:page", target: "app/chat/page.tsx" },
        { type: "registry:component" },
      ])
    ).toBe("/chat")
  })

  it("falls back to / when a block has no page", () => {
    expect(getBlockPageRoute([{ type: "registry:component" }])).toBe("/")
  })
})

describe("getBlockLayout", () => {
  it("draws each auth block's own form", () => {
    expect(getBlockLayout("sign-in-01", ["authentication"])).toEqual({
      kind: "auth",
      hasProviders: true,
      fields: 2,
      hasSteps: false,
    })
    expect(getBlockLayout("sign-up-01", ["authentication"])).toMatchObject({
      hasProviders: true,
      fields: 3,
    })
    expect(
      getBlockLayout("forgot-password-01", ["authentication"])
    ).toMatchObject({ hasProviders: false, fields: 1, hasSteps: true })
  })

  it("falls back to a sign-in form for other auth blocks", () => {
    expect(getBlockLayout("login-01", ["authentication"])).toMatchObject({
      kind: "auth",
      fields: 2,
    })
  })

  it("draws every other block as an app", () => {
    expect(getBlockLayout("finance-01", ["dashboard"])).toEqual({ kind: "app" })
    expect(getBlockLayout("app-shell-01", ["app-shell", "dashboard"])).toEqual({
      kind: "app",
    })
  })
})
