import { execFileSync, spawn } from "node:child_process"
import { accessSync, constants, existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

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

async function checkApple() {
  requireExecutable("xcrun", "Select an installed Xcode toolchain.")
  requireExecutable(
    "xcodegen",
    "Install xcodegen explicitly before initializing Tauri. The launcher never installs tools."
  )
  requireExecutable(
    "pod",
    "Install CocoaPods explicitly before initializing Tauri. The launcher never installs tools."
  )
  await requireRustTarget(
    action === "build:ios" && !extraArguments.includes("--target")
      ? "aarch64-apple-ios"
      : "aarch64-apple-ios-sim"
  )
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
    await run(["bun", "run", "test"])
    await run(["bun", "run", "typecheck"])
    await run(["bun", "run", "build"])
    await run(["bun", "run", "check:assets"])
    await run([
      "cargo",
      "check",
      "--offline",
      "--manifest-path",
      "src-tauri/Cargo.toml",
    ])
  } else if (action === "ios" || action === "ipad" || action === "build:ios") {
    await checkApple()
    await run([
      tauri,
      "ios",
      action === "build:ios" ? "build" : "dev",
      ...(action === "ipad" && extraArguments.length === 0 ? ["iPad"] : []),
      ...extraArguments,
    ])
  } else if (action === "android" || action === "build:android") {
    await checkAndroid()
    await run([
      tauri,
      "android",
      action === "build:android" ? "build" : "dev",
      ...extraArguments,
    ])
  } else {
    throw new Error(`Unknown mobile action: ${action}`)
  }
} catch (error: unknown) {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`
  )
  process.exit(1)
}
