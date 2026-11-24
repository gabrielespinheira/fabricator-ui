// Runs the example on Android: `bun run demo react-native:android`. Uses a connected device
// or a running emulator, or starts the first one in Android Studio's Device
// Manager. To choose, `bun run demo react-native:android --device "<name>"`.
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { homedir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { getAndroidEnvironment } from "./android-environment.mjs"

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const expo = path.join(root, "node_modules/.bin/expo")

// React Native builds with JDK 17. Elsewhere Gradle takes the one on the PATH.
function findJdk() {
  if (process.platform !== "darwin") return null
  const { status, stdout } = spawnSync(
    "/usr/libexec/java_home",
    ["-F", "-v", "17"],
    { encoding: "utf8" }
  )
  return status === 0 ? stdout.trim() : null
}

function readEnvironment() {
  try {
    return getAndroidEnvironment({
      env: process.env,
      platform: process.platform,
      home: homedir(),
      hasDirectory: existsSync,
      findJdk,
    })
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

const { status } = spawnSync(expo, ["run:android", ...process.argv.slice(2)], {
  cwd: root,
  env: readEnvironment(),
  stdio: "inherit",
})
process.exit(status ?? 1)
