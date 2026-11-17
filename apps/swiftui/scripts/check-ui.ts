import { spawn } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { parseArgs } from "node:util"
import { z } from "zod"

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    device: { type: "string" },
    only: { type: "string", multiple: true },
  },
})
const device = z
  .uuid({
    error:
      "Pass --device <simulator UDID> or set FABRICATOR_IOS_DEVICE for this project's simulator.",
  })
  .parse(values.device ?? process.env.FABRICATOR_IOS_DEVICE)
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

async function run(executable: string, args: string[]) {
  const child = spawn(executable, args, { cwd: appRoot, stdio: "inherit" })
  const code = await new Promise<number>((resolve, reject) => {
    child.once("error", reject)
    child.once("exit", (status) => resolve(status ?? 1))
  })
  if (code !== 0) process.exit(code)
}

await run(process.execPath, ["scripts/run.ts", "ios", "--build"])
const resultPath = path.join(
  appRoot,
  ".build/ui-tests",
  `${device}-${Date.now()}.xcresult`
)
await run("xcodebuild", [
  "-quiet",
  "-project",
  "FabricatorSwiftUI.xcodeproj",
  "-scheme",
  "FabricatorSwiftUI-iOS",
  "-destination",
  `platform=iOS Simulator,id=${device}`,
  "-derivedDataPath",
  ".build/xcode",
  "-resultBundlePath",
  resultPath,
  "-parallel-testing-enabled",
  "NO",
  "CODE_SIGNING_ALLOWED=NO",
  ...(values.only ?? []).map(
    (test) => `-only-testing:FabricatorSwiftUI-UITests/GalleryTests/${test}`
  ),
  "test",
])
process.stdout.write(`Native UI test results: ${resultPath}\n`)
