import type { NativeLanguageRenderer } from "../../../packages/cli/src/utils/native-files"

/** Native APIs use language casing; registry names remain stable. */
export function getNativeApiName(
  name: string,
  renderer: NativeLanguageRenderer
) {
  if (name === "fabricator-root") return "FabricatorRoot"
  if (name === "typography") return "FabricatorText"
  if (name === "calendar" && renderer === "swiftui")
    return "FabricatorCalendarView"
  if (name === "input-otp" && renderer === "swiftui")
    return "FabricatorInputOTP"
  if (name === "sounds" && renderer === "swiftui")
    return "FabricatorSoundEffects"
  return `Fabricator${name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("")}`
}

export function hasNativeDeclaration(api: string, sources: string[]) {
  return sources.some((source) =>
    new RegExp(
      `\\b(?:struct|class|enum|typealias|fun|func)\\s+(?:<[^>]+>\\s*)?${api}\\b`,
      "i"
    ).test(source)
  )
}
