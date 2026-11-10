// Which simulator to run on: their names differ per machine, and `expo run:ios`
// asks for one. Takes the `devices` of `xcrun simctl list devices available -j`.

const IOS_RUNTIME = /SimRuntime\.iOS-(\d+)-(\d+)/

const isFamily = (family) => (device) =>
  device.deviceTypeIdentifier?.includes(`SimDeviceType.${family}`) ?? false

const isPro = (device) => device.deviceTypeIdentifier.includes("iPad-Pro")

const byBest = (a, b) =>
  Number(b.device.state === "Booted") - Number(a.device.state === "Booted") ||
  b.major - a.major ||
  b.minor - a.minor ||
  Number(isPro(b.device)) - Number(isPro(a.device)) ||
  a.device.name.localeCompare(b.device.name)

function pick(devicesByRuntime, family) {
  const candidates = Object.entries(devicesByRuntime).flatMap(
    ([runtime, devices]) => {
      const version = IOS_RUNTIME.exec(runtime)
      if (!version) return []
      const [, major, minor] = version.map(Number)
      return devices
        .filter(isFamily(family))
        .map((device) => ({ device, major, minor }))
    }
  )
  return candidates.sort(byBest)[0]?.device ?? null
}

/**
 * One already running, or the newest iOS, preferring an iPad Pro: it's wide enough
 * to show the shell's docked sidebar and panel together. Null without an iPad.
 */
export function pickIpad(devicesByRuntime) {
  return pick(devicesByRuntime, "iPad")
}

/** One already running, or the newest iOS. Null without an iPhone. */
export function pickIphone(devicesByRuntime) {
  return pick(devicesByRuntime, "iPhone")
}
