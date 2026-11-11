// Runs the example on an iPad simulator: `bun run mobile:ipad`. To choose another
// one, `bun run mobile:ipad --device "<name or udid>"`. Reuses a running Metro.
import { execFileSync, spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { pickIpad } from "./pick-simulator.mjs"

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const expo = path.join(root, "node_modules/.bin/expo")
const args = process.argv.slice(2)

function getDeviceArgs() {
  const hasDevice = args.some(
    (arg) => arg === "--device" || arg === "-d" || arg.startsWith("--device=")
  )
  if (hasDevice) return []
  const { devices } = JSON.parse(
    execFileSync("xcrun", ["simctl", "list", "devices", "available", "-j"], {
      encoding: "utf8",
    })
  )
  const ipad = pickIpad(devices)
  if (!ipad) {
    console.error(
      "No iPad simulator found. Add one in Xcode, under Window > Devices and Simulators."
    )
    process.exit(1)
  }
  console.log(`Running on ${ipad.name}`)
  return ["--device", ipad.udid]
}

const { status } = spawnSync(expo, ["run:ios", ...getDeviceArgs(), ...args], {
  cwd: root,
  stdio: "inherit",
})
process.exit(status ?? 1)
