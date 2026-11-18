import { spawn, spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { simulatorInventorySchema } from "./schemas"
import { syncDataTableExamples } from "./sync-data-table-examples"
import { syncDocumentExamples } from "./sync-document-examples"

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.."
)
const appRoot = path.join(projectRoot, "apps/swiftui")
const input = process.argv.slice(2)
const target = input[0] ?? "ios"
if (!["ios", "ipad", "macos"].includes(target))
  throw new Error("Use ios, ipad or macos.")
if (process.platform !== "darwin")
  throw new Error("SwiftUI examples require macOS with Xcode installed.")
const isMac = target === "macos"
const scheme = isMac ? "FabricatorSwiftUI-macOS" : "FabricatorSwiftUI-iOS"

async function run(command: string[], capture = false) {
  const [executable, ...argumentsList] = command
  if (!executable) throw new Error("An executable is required.")
  return new Promise<string>((resolve, reject) => {
    const child = spawn(executable, argumentsList, {
      cwd: projectRoot,
      stdio: capture ? ["inherit", "pipe", "inherit"] : "inherit",
    })
    let output = ""
    child.stdout?.on("data", (chunk: unknown) => {
      output += String(chunk)
    })
    child.on("error", reject)
    child.on("close", (status) => {
      if (status !== 0) {
        reject(new Error(`${executable} failed with exit code ${status}.`))
        return
      }
      resolve(output)
    })
  })
}

if (spawnSync("xcodegen", ["--version"], { stdio: "ignore" }).status !== 0)
  throw new Error(
    "XcodeGen is required to generate the demo project. Install it explicitly before running this command."
  )
await run(["bun", "run", "platforms:generate"])
await run(["bun", "apps/swiftui/scripts/sync-contract.ts"])
await syncDocumentExamples(projectRoot)
await syncDataTableExamples(projectRoot)
await run(["xcodegen", "generate", "--spec", "apps/swiftui/project.yml"])
if (input.includes("--check")) {
  await run([
    "bun",
    "node_modules/typescript/bin/tsc",
    "--project",
    "apps/swiftui/tsconfig.json",
  ])
  await run([
    "bun",
    "node_modules/typescript/bin/tsc",
    "--project",
    "apps/swiftui/tsconfig.editor.json",
  ])
  await run(["swift", "test", "--package-path", "apps/web/registry/swiftui"])
}
const destination = isMac
  ? `platform=macOS,arch=${process.arch === "arm64" ? "arm64" : "x86_64"}`
  : "generic/platform=iOS Simulator"
await run([
  "xcodebuild",
  "-quiet",
  "-project",
  path.join(appRoot, "FabricatorSwiftUI.xcodeproj"),
  "-scheme",
  scheme,
  "-destination",
  destination,
  "-derivedDataPath",
  path.join(appRoot, ".build/xcode"),
  "CODE_SIGNING_ALLOWED=NO",
  "ONLY_ACTIVE_ARCH=YES",
  `ARCHS=${process.arch === "arm64" ? "arm64" : "x86_64"}`,
  "build",
])
const bundle = path.join(
  appRoot,
  ".build/xcode/Build/Products",
  isMac ? "Debug" : "Debug-iphonesimulator",
  "FabricatorSwiftUI.app"
)
process.stdout.write(`Built ${bundle}\n`)
if (input.includes("--build") || input.includes("--check")) process.exit(0)
const pageIndex = input.indexOf("--page")
const selectedPage = input[pageIndex + 1]
const appArguments: string[] =
  pageIndex >= 0 && selectedPage ? ["--page", selectedPage] : []
if (input.includes("--dark")) appArguments.push("--dark")
if (input.includes("--large-text")) appArguments.push("--large-text")
if (isMac) {
  await run(["open", "-n", bundle, "--args", ...appArguments])
  process.exit(0)
}
const inventory = simulatorInventorySchema.parse(
  JSON.parse(
    await run(
      ["xcrun", "simctl", "list", "devices", "available", "--json"],
      true
    )
  )
)
const devices = Object.values(inventory.devices)
  .flat()
  .filter(
    (device) =>
      device.isAvailable &&
      (target === "ipad"
        ? /ipad/i.test(device.name)
        : /iphone/i.test(device.name))
  )
const deviceIndex = input.indexOf("--device")
const requestedDevice =
  deviceIndex >= 0
    ? input[deviceIndex + 1]
    : target === "ipad"
      ? process.env.FABRICATOR_IPAD_DEVICE
      : process.env.FABRICATOR_IOS_DEVICE
const projectDevices = devices.filter((candidate) =>
  /^Fabricator(?: UI)? /.test(candidate.name)
)
const device = requestedDevice
  ? devices.find(
      (candidate) =>
        candidate.udid === requestedDevice || candidate.name === requestedDevice
    )
  : (projectDevices.find((candidate) => candidate.state === "Booted") ??
    projectDevices[0])
if (!device)
  throw new Error(
    `No Fabricator ${target === "ipad" ? "iPad" : "iPhone"} simulator is available. Open this project's simulator through Relay or pass --device <name|UDID>.`
  )
if (device.state !== "Booted")
  await run(["xcrun", "simctl", "boot", device.udid])
await run(["xcrun", "simctl", "bootstatus", device.udid, "-b"])
await run(["xcrun", "simctl", "install", device.udid, bundle])
await run([
  "open",
  "-a",
  "Simulator",
  "--args",
  "-CurrentDeviceUDID",
  device.udid,
])
await run([
  "xcrun",
  "simctl",
  "launch",
  "--terminate-running-process",
  device.udid,
  "app.fabricator-ui.swiftui",
  ...appArguments,
])
process.stdout.write(
  `Launched Fabricator UI on ${device.name} (${device.udid}).\n`
)
