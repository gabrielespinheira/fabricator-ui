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
  it("draws an auth block as its form", () => {
    expect(getBlockLayout(["authentication"])).toBe("auth")
  })

  it("draws an onboarding block as its questions beside their preview", () => {
    expect(getBlockLayout(["onboarding"])).toBe("onboarding")
  })

  it("draws every other block as an app", () => {
    expect(getBlockLayout(["dashboard"])).toBe("app")
    expect(getBlockLayout(["app-shell", "dashboard"])).toBe("app")
  })
})
