import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

import {
  findExecutable,
  readProcess,
  runProcess,
  startProcess,
} from "./process"

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
const task = process.argv[2] ?? "desktop"
const tasks: Record<string, string[]> = {
  desktop: [":desktopApp:run"],
  "build-desktop": [":desktopApp:packageDistributionForCurrentOS"],
  "check-desktop": [":ui:desktopTest", ":desktopApp:compileKotlin"],
  android: [":androidApp:installDebug"],
  tablet: [":androidApp:installDebug"],
  "build-android": [":androidApp:assembleDebug"],
  "check-android": [":androidApp:assembleDebug", ":androidApp:lintDebug"],
  check: [
    ":ui:desktopTest",
    ":androidApp:assembleDebug",
    ":androidApp:lintDebug",
  ],
}
const gradleTasks = tasks[task]
if (!gradleTasks) throw new Error(`Unknown Kotlin example task: ${task}`)
const typecheck = runProcess(
  "bun",
  ["../../node_modules/typescript/bin/tsc", "-p", "tsconfig.json"],
  root
)
if (typecheck !== 0) process.exit(typecheck)
for (const script of [
  "scripts/prepare-source.ts",
  "../../apps/web/scripts/compose/check-source.ts",
  "scripts/check-routes.ts",
]) {
  const exitCode = runProcess("bun", ["run", script], root)
  if (exitCode !== 0) process.exit(exitCode)
}
const java = findExecutable("java")
if (!java || readProcess(java, ["-version"], root).code !== 0) {
  process.stderr.write(
    "Kotlin examples require JDK 17+, Gradle 9.5.0 and, for Android, SDK 36. No tools were installed.\n"
  )
  process.exit(1)
}
const gradle = findExecutable("gradle")
if (!gradle) {
  process.stderr.write(
    "Gradle 9.5.0 is missing. Install it with permission before running this target. No dependencies were downloaded.\n"
  )
  process.exit(1)
}
let serial = process.env.FABRICATOR_ANDROID_SERIAL
if (task === "android" || task === "tablet") {
  const adb = findExecutable("adb")
  if (!adb)
    throw new Error(
      "Android platform-tools are missing. Install them with permission first."
    )
  if (!serial) {
    const connected = readProcess(adb, ["devices"], root)
      .output.split("\n")
      .filter((line) => line.endsWith("\tdevice"))
      .map((line) => line.split("\t")[0])
      .filter((value): value is string => Boolean(value))
    serial = connected.find((device) => {
      const dimensions = [
        ...readProcess(
          adb,
          ["-s", device, "shell", "wm", "size"],
          root
        ).output.matchAll(/(\d+)x(\d+)/g),
      ].at(-1)
      const density = [
        ...readProcess(
          adb,
          ["-s", device, "shell", "wm", "density"],
          root
        ).output.matchAll(/(\d+)/g),
      ].at(-1)
      if (!dimensions || !density) return false
      const shortEdge =
        (Math.min(Number(dimensions[1]), Number(dimensions[2])) * 160) /
        Number(density[1])
      return task === "tablet" ? shortEdge >= 600 : shortEdge < 600
    })
  }
  if (!serial)
    throw new Error(
      `Connect a ${task === "tablet" ? "tablet" : "phone"} or set FABRICATOR_ANDROID_SERIAL. No emulator or SDK is installed automatically.`
    )
}
const exitCode = await startProcess(
  gradle,
  [...gradleTasks, "--console=plain"],
  root,
  { ...process.env, ...(serial ? { ANDROID_SERIAL: serial } : {}) }
)
if (exitCode !== 0) process.exit(exitCode)
if (serial)
  process.exit(
    runProcess(
      "adb",
      [
        "-s",
        serial,
        "shell",
        "am",
        "start",
        "-n",
        "dev.fabricator.gallery/dev.fabricator.gallery.android.MainActivity",
      ],
      root
    )
  )
