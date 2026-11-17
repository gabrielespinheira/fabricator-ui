import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { z } from "zod"

import {
  getEditorTheme,
  toNativeHexColor,
  withAlphaShare,
} from "../../web/registry/native/lib/editor-native-model"
import { bundleDomainEngine } from "./bundle-domain-engine"

const contractSchema = z.object({
  themes: z.object({
    light: z.object({ colors: z.record(z.string(), z.string()) }),
    dark: z.object({ colors: z.record(z.string(), z.string()) }),
  }),
})
const coreFiles = [
  "EditorRecords",
  "EditorDocument",
  "EditorTheme",
  "EditorStyler",
  "EditorLayoutFragment",
  "EditorCodeChrome",
  "EditorTableLayout",
  "EditorTextView",
  "EditorNativeTextView",
]

export async function syncEditor(projectRoot: string) {
  const registry = path.join(projectRoot, "apps/web/registry/swiftui")
  const core = path.join(registry, "platform/editor-core")
  await mkdir(core, { recursive: true })
  for (const name of coreFiles) {
    let source = await readFile(
      path.join(projectRoot, "packages/editor-native/ios", `${name}.swift`),
      "utf8"
    )
    source = source
      .replace("import ExpoModulesCore\n", "import Foundation\n")
      .replaceAll("@Field ", "")
      .replaceAll(": Record", ": Decodable")
      .replaceAll(", Enumerable", ", Decodable")
    if (name === "EditorNativeTextView") {
      source = source
        .replace(
          "EditorNativeTextView: ExpoView",
          "EditorNativeTextView: UIView"
        )
        .replaceAll("EventDispatcher()", "FabricatorEditorEventDispatcher()")
        .replace(
          "UITextViewDelegate, NSTextLayoutManagerDelegate",
          "UITextViewDelegate, @preconcurrency NSTextLayoutManagerDelegate"
        )
        .replace(
          "UIGestureRecognizerDelegate, EditorDecorationSource",
          "UIGestureRecognizerDelegate, @preconcurrency EditorDecorationSource"
        )
        .replace(
          "setViewSize(CGSize(width: bounds.width, height: height))",
          "invalidateIntrinsicContentSize()"
        )
      source = source.replace(
        "required init(appContext: AppContext? = nil) {\n    super.init(appContext: appContext)",
        'override init(frame: CGRect) {\n    super.init(frame: frame)\n    textView.accessibilityLabel = "Rich text editor"'
      )
      source = source.replace(
        "  override func layoutSubviews()",
        '  @available(*, unavailable)\n  required init?(coder: NSCoder) { fatalError("Use init(frame:)") }\n\n  override func layoutSubviews()'
      )
    }
    const filename = name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()
    await writeFile(
      path.join(core, `${filename}.swift`),
      `// Generated from packages/editor-native/ios/${name}.swift by apps/swiftui/scripts/sync-editor.ts.\n#if os(iOS)\n${source}\n#endif\n`
    )
  }
  const contract = contractSchema.parse(
    JSON.parse(
      await readFile(path.join(registry, "resources/contract.json"), "utf8")
    )
  )
  const themes = Object.fromEntries(
    (["light", "dark"] as const).map((mode) => {
      const colors = contract.themes[mode].colors
      function color(token: string) {
        const value = toNativeHexColor(colors[token])
        if (!value) throw new Error(`Missing editor color ${token}`)
        return value
      }
      const syntax = Object.fromEntries(
        Object.entries(colors)
          .filter(([name]) => name.startsWith("syntax-"))
          .map(([name, value]) => [
            name.slice(7),
            toNativeHexColor(value) ?? color("foreground"),
          ])
      )
      return [
        mode,
        Object.fromEntries(
          (["sm", "default", "lg"] as const).map((size) => [
            size,
            getEditorTheme(
              size,
              {
                regular: "InterVariable",
                medium: "InterVariable",
                semibold: "InterVariable",
                mono: "GeistMono-Regular",
              },
              syntax,
              {
                foreground: color("foreground"),
                muted: color("muted-foreground"),
                link: color("primary-text"),
                codeBackground: color("surface-2"),
                quoteBar: color("border"),
                border: color("border"),
                caret: color("primary"),
                selection: withAlphaShare(color("primary"), 0.2),
                placeholder: color("muted-foreground"),
                checkbox: color("primary"),
                tableHeader: withAlphaShare(color("muted"), 0.6),
                inlineCode: color("hover"),
                checkboxForeground: color("primary-foreground"),
                checkboxBorder: withAlphaShare(color("foreground"), 0.25),
              }
            ),
          ])
        ),
      ]
    })
  )
  await writeFile(
    path.join(registry, "resources/editor-themes.json"),
    `${JSON.stringify(themes)}\n`
  )
  await bundleDomainEngine(projectRoot, "editor")
  await bundleDomainEngine(projectRoot, "calendar")
}
