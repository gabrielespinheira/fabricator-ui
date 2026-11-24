import { mkdir, readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { format } from "prettier"
import { z } from "zod"

const root = resolve(fileURLToPath(new URL("../../../..", import.meta.url)))
const catalog = z
  .object({
    items: z.array(
      z.object({ name: z.string(), group: z.string(), type: z.string() })
    ),
  })
  .parse(
    JSON.parse(
      await readFile(
        resolve(root, "apps/web/generated/platforms/contract.json"),
        "utf8"
      )
    )
  )
const file = (path: string, target?: string) => ({
  path,
  target:
    target ??
    `src/commonMain/kotlin/dev/fabricator/ui/${path.replace(/^(ui|models)\//, "")}`,
})
const source = (name: string) => file(`ui/${name}.kt`)
const items = [
  {
    name: "foundations",
    files: [
      source("theme"),
      source("icon"),
      source("font"),
      file(
        "models/component-models.kt",
        "src/commonMain/kotlin/dev/fabricator/ui/models/component-models.kt"
      ),
      file(
        "models/calendar-model.kt",
        "src/commonMain/kotlin/dev/fabricator/ui/models/calendar-model.kt"
      ),
      file("models/sound-model.kt"),
      file("models/spinner-model.kt"),
      file(
        "platform/common/platform-services.kt",
        "src/commonMain/kotlin/dev/fabricator/ui/platform-services.kt"
      ),
      file(
        "platform/common/calendar-time-zone.kt",
        "src/commonMain/kotlin/dev/fabricator/ui/calendar-time-zone.kt"
      ),
      file(
        "platform/jvm/calendar-time-zone.kt",
        "src/androidMain/kotlin/dev/fabricator/ui/calendar-time-zone.kt"
      ),
      file(
        "platform/jvm/calendar-time-zone.kt",
        "src/desktopMain/kotlin/dev/fabricator/ui/calendar-time-zone.kt"
      ),
      file(
        "platform/android/android-services.kt",
        "src/androidMain/kotlin/dev/fabricator/ui/android-services.kt"
      ),
      file(
        "platform/desktop/desktop-services.kt",
        "src/desktopMain/kotlin/dev/fabricator/ui/desktop-services.kt"
      ),
      file("platform/consumer/settings.gradle.kts", "settings.gradle.kts"),
      file("platform/consumer/build.gradle.kts", "build.gradle.kts"),
      file("platform/consumer/gradle.properties", "gradle.properties"),
      file(
        "../../generated/platforms/compose/fabricator-generated.kt",
        "src/commonMain/kotlin/dev/fabricator/ui/generated/fabricator-generated.kt"
      ),
      file(
        "../fabricator/assets/fonts/InterVariable.ttf",
        "src/commonMain/composeResources/font/inter_variable.ttf"
      ),
      file(
        "../fabricator/assets/fonts/InterVariable-Italic.ttf",
        "src/commonMain/composeResources/font/inter_variable_italic.ttf"
      ),
      file(
        "../fabricator/assets/fonts/LICENSE.txt",
        "src/commonMain/composeResources/files/inter-license.txt"
      ),
      file(
        "../../generated/platforms/icons-license.txt",
        "src/commonMain/composeResources/files/icons-license.txt"
      ),
      file(
        "../../generated/platforms/brands-notices.md",
        "src/commonMain/composeResources/files/brands-notices.md"
      ),
      file(
        "../../../../LICENSE.md",
        "src/commonMain/composeResources/files/fabricator-license.md"
      ),
      file(
        "../../../../NOTICE.md",
        "src/commonMain/composeResources/files/fabricator-notice.md"
      ),
    ],
    dependencies: [],
  },
  {
    name: "native-media",
    files: [
      file(
        "platform/common/platform-media.kt",
        "src/commonMain/kotlin/dev/fabricator/ui/platform-media.kt"
      ),
      file(
        "platform/android/android-media.kt",
        "src/androidMain/kotlin/dev/fabricator/ui/android-media.kt"
      ),
      file(
        "platform/desktop/desktop-media.kt",
        "src/desktopMain/kotlin/dev/fabricator/ui/desktop-media.kt"
      ),
    ],
    dependencies: ["@fabricator/foundations"],
  },
  {
    name: "native-images",
    files: [
      file(
        "platform/common/platform-image.kt",
        "src/commonMain/kotlin/dev/fabricator/ui/platform-image.kt"
      ),
      file(
        "platform/android/android-image.kt",
        "src/androidMain/kotlin/dev/fabricator/ui/android-image.kt"
      ),
      file(
        "platform/desktop/desktop-image.kt",
        "src/desktopMain/kotlin/dev/fabricator/ui/desktop-image.kt"
      ),
    ],
    dependencies: [
      "@fabricator/foundations",
      "@fabricator/button",
      "@fabricator/spinner",
    ],
  },
  ...catalog.items.map((item) => {
    let family: string
    let dependencies: string[]
    if (item.type === "registry:block") {
      family = "blocks"
      dependencies = [
        "field",
        "app-shell",
        "markdown",
        "dialog",
        "file-tree",
        "calendar",
        "popover",
        "context-menu",
        "tab-strip",
      ]
    } else if (item.name === "spinner") {
      family = "spinner"
      dependencies = []
    } else if (
      ["fabricator-root", "density", "typography", "text"].includes(item.name)
    ) {
      family = "primitives"
      dependencies = ["spinner"]
    } else if (item.name === "sounds") {
      family = "sounds"
      dependencies = ["button", "app-shell", "markdown"]
    } else if (item.name === "status-bar") {
      family = "status-bar"
      dependencies = ["button", "markdown"]
    } else if (item.group === "Charts") {
      family = "charts"
      dependencies = ["button"]
    } else if (item.group === "Chat") {
      family = "chat"
      dependencies = ["field", "markdown"]
    } else if (item.name === "file-tree") {
      family = "advanced"
      dependencies = ["field", "markdown"]
    } else if (item.name === "image-compare") {
      family = "image-compare"
      dependencies = ["button"]
    } else if (item.name === "audio-player" || item.name === "video-player") {
      family = item.name
      dependencies =
        item.name === "audio-player"
          ? ["button", "markdown", "native-media"]
          : ["native-media"]
    } else if (
      item.name === "editor" ||
      item.name === "data-table" ||
      item.name === "event-calendar"
    ) {
      family = item.name
      dependencies = ["field", "markdown"]
    } else if (item.name === "syntax-highlight") {
      family = "content"
      dependencies = ["button", "app-shell"]
    } else if (
      item.group === "Forms" ||
      ["time-wheel", "form", "workspace-switcher"].includes(item.name)
    ) {
      family = "forms"
      dependencies = ["button", "dialog", "app-shell"]
    } else if (item.group === "Overlays") {
      family = "overlays"
      dependencies = ["button"]
    } else if (item.group === "Structure") {
      family = "navigation"
      dependencies = ["button", "dialog"]
    } else if (item.group === "Content") {
      family = "content"
      dependencies = ["button", "app-shell"]
    } else {
      family = "primitives"
      dependencies = ["spinner"]
    }
    const files = [source(family)]
    if (item.name === "status-bar")
      files.push(file("models/status-bar-model.kt"))
    if (item.name === "editor") {
      files.push(
        file(
          "models/editor-document.kt",
          "src/commonMain/kotlin/dev/fabricator/ui/models/editor-document.kt"
        ),
        file(
          "models/editor-markdown.kt",
          "src/commonMain/kotlin/dev/fabricator/ui/models/editor-markdown.kt"
        ),
        file(
          "platform/common/editor-json-adapter.kt",
          "src/commonMain/kotlin/dev/fabricator/ui/editor-json-adapter.kt"
        )
      )
      dependencies.push("native-images")
    }
    if (item.name === "bot-face")
      files.push(
        source("bot-face"),
        file("models/bot-face-model.kt"),
        file(
          "../../generated/platforms/compose/fabricator-bot-face.bin",
          "src/commonMain/composeResources/files/fabricator-bot-face.bin"
        )
      )
    return {
      name: item.name,
      files,
      dependencies: [
        "@fabricator/foundations",
        ...dependencies
          .filter((name) => name !== item.name)
          .map((name) => `@fabricator/${name}`),
      ],
    }
  }),
]
const output = resolve(root, "apps/web/registry/compose/manifest.json")
await mkdir(resolve(output, ".."), { recursive: true })
await writeFile(
  output,
  await format(
    JSON.stringify({ schemaVersion: 1, renderer: "compose", items }),
    { parser: "json" }
  )
)
