import { describe, expect, it } from "vitest"

import { getAndroidEnvironment } from "./android-environment.mjs"

const home = "/Users/ada"
const studioSdk = "/Users/ada/Library/Android/sdk"
const jdk = "/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home"

const read = (overrides = {}) =>
  getAndroidEnvironment({
    env: {},
    platform: "darwin",
    home,
    hasDirectory: () => true,
    findJdk: () => jdk,
    ...overrides,
  })

describe("getAndroidEnvironment", () => {
  it("finds Android Studio's SDK and the JDK when nothing is set", () => {
    expect(read()).toEqual({ ANDROID_HOME: studioSdk, JAVA_HOME: jdk })
  })

  it("keeps the rest of the environment", () => {
    expect(read({ env: { PATH: "/bin" } }).PATH).toBe("/bin")
  })

  it("keeps the SDK and JDK someone chose", () => {
    expect(
      read({ env: { ANDROID_HOME: "/sdk", JAVA_HOME: "/jdk" } })
    ).toMatchObject({ ANDROID_HOME: "/sdk", JAVA_HOME: "/jdk" })
  })

  it("reads the SDK's older variable", () => {
    expect(read({ env: { ANDROID_SDK_ROOT: "/sdk" } }).ANDROID_HOME).toBe(
      "/sdk"
    )
  })

  it("uses the default SDK folder of each platform", () => {
    expect(read({ platform: "linux" }).ANDROID_HOME).toBe(
      "/Users/ada/Android/Sdk"
    )
    expect(
      read({ platform: "win32", env: { LOCALAPPDATA: "/local" } }).ANDROID_HOME
    ).toBe("/local/Android/Sdk")
  })

  it("says what to install without an SDK", () => {
    expect(() => read({ hasDirectory: () => false })).toThrow(
      /Library\/Android\/sdk.*Android Studio/
    )
  })

  it("leaves the JDK to the PATH when none is found", () => {
    expect(read({ findJdk: () => null })).not.toHaveProperty("JAVA_HOME")
  })
})
