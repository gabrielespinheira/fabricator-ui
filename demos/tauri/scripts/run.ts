import { execFileSync, spawn } from "node:child_process"
import { accessSync, constants, existsSync } from "node:fs"
import { arch } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { z } from "zod"

const directory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
const action = process.argv[2] ?? "ios"
const extraArguments = process.argv.slice(3)
const tauri = path.resolve(directory, "../../node_modules/.bin/tauri")

async function run(command: string[]) {
  const [executable, ...args] = command
  if (!executable) throw new Error("A command executable is required.")
  const child = spawn(executable, args, {
    cwd: directory,
    stdio: "inherit",
    env: process.env,
  })
  const code = await new Promise<number>((resolve, reject) => {
    child.once("error", reject)
    child.once("exit", (status) => resolve(status ?? 1))
  })
  if (code !== 0) process.exit(code)
}

function requireExecutable(executable: string, guidance: string) {
  const found = (process.env.PATH ?? "").split(path.delimiter).some((entry) => {
    try {
      accessSync(path.join(entry, executable), constants.X_OK)
      return true
    } catch {
      return false
    }
  })
  if (!found) throw new Error(`${executable} is required. ${guidance}`)
}

async function requireRustTarget(target: string) {
  requireExecutable(
    "rustup",
    "Install Rust with rustup before running the mobile host."
  )
  const output = execFileSync("rustup", ["target", "list", "--installed"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  })
  if (!output.split(/\s+/).includes(target))
    throw new Error(
      `Rust target ${target} is missing. Install it explicitly with rustup target add ${target}.`
    )
}

const appleTargets = {
  aarch64: "aarch64-apple-ios",
  "aarch64-sim": "aarch64-apple-ios-sim",
  x86_64: "x86_64-apple-ios",
}

function readSimulators() {
  const list = execFileSync(
    "xcrun",
    ["simctl", "list", "devices", "available", "--json"],
    { encoding: "utf8" }
  )
  const simulator = z.object({
    name: z.string(),
    udid: z.string(),
    state: z.string(),
    deviceTypeIdentifier: z.string(),
  })
  return Object.values(
    z
      .object({ devices: z.record(z.string(), z.array(simulator)) })
      .parse(JSON.parse(list)).devices
  ).flat()
}

function selectSimulator(name: string | undefined, family: "iPhone" | "iPad") {
  const simulators = readSimulators()
  const matches = name
    ? simulators.filter(
        (device) => device.name === name || device.udid === name
      )
    : simulators.filter((device) =>
        device.deviceTypeIdentifier.includes(`.${family}-`)
      )
  const booted = matches.filter((device) => device.state === "Booted")
  const device =
    matches.length === 1
      ? matches[0]
      : !name && booted.length === 1
        ? booted[0]
        : undefined
  if (
    !device ||
    simulators.filter(({ name }) => name === device.name).length > 1
  ) {
    const choices = (matches.length ? matches : simulators)
      .map(({ name, state }) => `${name} (${state})`)
      .join(", ")
    throw new Error(
      `Select a unique simulator by name. Available devices: ${choices || "none"}.`
    )
  }
  return device.name
}

async function checkApple(targets: string[]) {
  requireExecutable("xcrun", "Select an installed Xcode toolchain.")
  requireExecutable(
    "xcodegen",
    "Install xcodegen explicitly before initializing Tauri. The launcher never installs tools."
  )
  requireExecutable(
    "pod",
    "Install CocoaPods explicitly before initializing Tauri. The launcher never installs tools."
  )
  for (const target of targets) await requireRustTarget(target)
  if (!existsSync(path.join(directory, "src-tauri/gen/apple")))
    throw new Error(
      "The Tauri Apple project is not initialized. After installing all prerequisites, run bun run tauri ios init --ci --skip-targets-install yourself. The initializer may install missing native tools."
    )
}

async function checkAndroid() {
  requireExecutable("java", "Install a supported JDK explicitly.")
  execFileSync("java", ["-version"], { stdio: ["ignore", "ignore", "inherit"] })
  requireExecutable(
    "adb",
    "Configure ANDROID_HOME and add the Android SDK platform-tools directory to PATH."
  )
  await requireRustTarget("aarch64-linux-android")
  if (!existsSync(path.join(directory, "src-tauri/gen/android")))
    throw new Error(
      "The Tauri Android project is not initialized. After installing the Android SDK/NDK and JDK, run bun run tauri android init --ci --skip-targets-install yourself."
    )
}

try {
  if (action === "check") {
    await run(["bun", "run", "typecheck"])
    await run(["bun", "run", "build"])
    await run(["bun", "run", "check:assets"])
    await run([
      "cargo",
      "check",
      "--offline",
      "--locked",
      "--manifest-path",
      "src-tauri/Cargo.toml",
    ])
  } else if (action === "ios" || action === "ipad" || action === "build:ios") {
    if (action === "build:ios") {
      const targets = extraArguments.flatMap((argument) => {
        const value = argument.replace(/^--target=/, "")
        return Object.entries(appleTargets)
          .filter(([name]) => value === name)
          .map(([, target]) => target)
      })
      await checkApple(targets.length ? targets : [appleTargets.aarch64])
      await run([tauri, "ios", "build", ...extraArguments])
    } else {
      await checkApple([
        arch() === "arm64" ? appleTargets["aarch64-sim"] : appleTargets.x86_64,
      ])
      const [first] = extraArguments
      const hasDevice = first !== undefined && !first.startsWith("-")
      const device = selectSimulator(
        hasDevice ? first : undefined,
        action === "ipad" ? "iPad" : "iPhone"
      )
      await run([
        tauri,
        "ios",
        "dev",
        device,
        ...extraArguments.slice(hasDevice ? 1 : 0),
      ])
    }
  } else if (action === "android" || action === "build:android") {
    await checkAndroid()
    await run([
      tauri,
      "android",
      action === "build:android" ? "build" : "dev",
      ...extraArguments,
    ])
  } else {
    throw new Error(`Unknown Tauri action: ${action}`)
  }
} catch (error: unknown) {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`
  )
  process.exit(1)
}
