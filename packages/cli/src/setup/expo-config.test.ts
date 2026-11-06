import { describe, expect, it } from "vitest"

import { nameExpoApp, toMobileIdentifier } from "./expo-config"

describe("toMobileIdentifier", () => {
  it("makes an id both iOS and Android accept", () => {
    expect(toMobileIdentifier("Acme")).toBe("app.acme.mobile")
    // Android allows no hyphen, and no segment that starts with a digit.
    expect(toMobileIdentifier("my-app_2")).toBe("app.myapp2.mobile")
    expect(toMobileIdentifier("123")).toBe("app.a123.mobile")
  })
})

describe("nameExpoApp", () => {
  it("names the app and fills in the ids a first native build would ask for", () => {
    expect(
      nameExpoApp({ expo: { name: "mobile", slug: "mobile" } }, "my-app").expo
    ).toEqual({
      name: "my-app",
      slug: "mobile",
      ios: { bundleIdentifier: "app.myapp.mobile" },
      android: { package: "app.myapp.mobile" },
    })
  })

  it("keeps what the template already set", () => {
    const named = nameExpoApp(
      {
        extra: true,
        expo: {
          ios: { supportsTablet: true },
          android: { adaptiveIcon: { backgroundColor: "#fff" } },
          plugins: ["expo-router"],
        },
      },
      "shop"
    )
    expect(named).toMatchObject({
      extra: true,
      expo: {
        ios: { supportsTablet: true },
        android: { adaptiveIcon: { backgroundColor: "#fff" } },
        plugins: ["expo-router"],
      },
    })
  })
})
