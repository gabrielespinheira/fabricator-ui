import { describe, expect, it } from "vitest"

import { pickIpad } from "../../../../../mobile/scripts/pick-ipad.mjs"

const IOS_26 = "com.apple.CoreSimulator.SimRuntime.iOS-26-0"
const IOS_27 = "com.apple.CoreSimulator.SimRuntime.iOS-27-0"

const ipad = (name: string, state = "Shutdown", type = "iPad-Air-11-inch") => ({
  name,
  state,
  udid: `udid-${name}`,
  deviceTypeIdentifier: `com.apple.CoreSimulator.SimDeviceType.${type}`,
})

const iphone = ipad("iPhone 17", "Booted", "iPhone-17")

describe("pickIpad", () => {
  it("never picks a phone", () => {
    expect(pickIpad({ [IOS_27]: [iphone, ipad("iPad")] })?.name).toBe("iPad")
  })

  it("reuses one that's already running", () => {
    const running = ipad("Old iPad", "Booted")
    expect(
      pickIpad({ [IOS_26]: [running], [IOS_27]: [ipad("New iPad")] })
    ).toBe(running)
  })

  it("takes the newest iOS otherwise", () => {
    const newest = ipad("New iPad")
    expect(pickIpad({ [IOS_26]: [ipad("Old iPad")], [IOS_27]: [newest] })).toBe(
      newest
    )
  })

  it("orders iOS versions as numbers", () => {
    const ten = "com.apple.CoreSimulator.SimRuntime.iOS-26-10"
    const two = "com.apple.CoreSimulator.SimRuntime.iOS-26-2"
    const newest = ipad("Later")
    expect(pickIpad({ [two]: [ipad("Earlier")], [ten]: [newest] })).toBe(newest)
  })

  it("prefers an iPad Pro, whose width shows the shell's docked layout", () => {
    const pro = ipad("Z Pro", "Shutdown", "iPad-Pro-13-inch-M5")
    expect(pickIpad({ [IOS_27]: [ipad("A Air"), pro] })).toBe(pro)
  })

  it("picks the same one every run", () => {
    const first = ipad("A iPad")
    expect(pickIpad({ [IOS_27]: [ipad("B iPad"), first] })).toBe(first)
  })

  it("has nothing to pick without an iPad", () => {
    expect(pickIpad({ [IOS_27]: [iphone] })).toBeNull()
    expect(pickIpad({})).toBeNull()
  })
})
