import { describe, expect, it } from "vitest"

import { getNativeApiName, hasNativeDeclaration } from "./native-platforms"

describe("native registry source ownership", () => {
  it("requires an actual API declaration instead of a catalog label or call site", () => {
    expect(
      hasNativeDeclaration("FabricatorStepper", [
        'Text("FabricatorStepper")',
        "FabricatorStepper()",
      ])
    ).toBe(false)
    expect(
      hasNativeDeclaration("FabricatorStepper", [
        "public struct FabricatorStepper: View {}",
      ])
    ).toBe(true)
    expect(
      hasNativeDeclaration("FabricatorStepper", [
        "@Composable fun FabricatorStepper() {}",
      ])
    ).toBe(true)
    expect(
      hasNativeDeclaration("FabricatorDataTable", [
        "@Composable fun <T> FabricatorDataTable(rows: List<T>) {}",
      ])
    ).toBe(true)
  })

  it("keeps explicit semantic mappings for native roots, typography and sounds", () => {
    expect(getNativeApiName("input-otp", "swiftui")).toBe("FabricatorInputOTP")
    expect(getNativeApiName("input-otp", "compose")).toBe("FabricatorInputOtp")
    expect(getNativeApiName("calendar", "swiftui")).toBe(
      "FabricatorCalendarView"
    )
    expect(getNativeApiName("fabricator-root", "compose")).toBe(
      "FabricatorRoot"
    )
    expect(getNativeApiName("typography", "swiftui")).toBe("FabricatorText")
    expect(getNativeApiName("sounds", "swiftui")).toBe("FabricatorSoundEffects")
  })
})
