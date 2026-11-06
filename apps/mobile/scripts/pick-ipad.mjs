// Which iPad simulator to run on: their names differ per machine, and `expo run:ios`
// asks for one. Takes the `devices` of `xcrun simctl list devices available -j`.

const IOS_RUNTIME = /SimRuntime\.iOS-(\d+)-(\d+)/

const isIpad = (device) =>
  device.deviceTypeIdentifier?.includes("SimDeviceType.iPad") ?? false

const isPro = (device) => device.deviceTypeIdentifier.includes("iPad-Pro")

const byBest = (a, b) =>
  Number(b.device.state === "Booted") - Number(a.device.state === "Booted") ||
  b.major - a.major ||
  b.minor - a.minor ||
  Number(isPro(b.device)) - Number(isPro(a.device)) ||
  a.device.name.localeCompare(b.device.name)

/**
 * One already running, or the newest iOS, preferring an iPad Pro: it's wide enough
 * to show the shell's docked sidebar and panel together. Null without an iPad.
 */
export function pickIpad(devicesByRuntime) {
  const candidates = Object.entries(devicesByRuntime).flatMap(
    ([runtime, devices]) => {
      const version = IOS_RUNTIME.exec(runtime)
      if (!version) return []
      const [, major, minor] = version.map(Number)
      return devices.filter(isIpad).map((device) => ({ device, major, minor }))
    }
  )
  return candidates.sort(byBest)[0]?.device ?? null
}
