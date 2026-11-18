# SwiftUI and Kotlin Compose

These native renderers are under qualification. Read their installed README and
the renderer's current parity report before assuming an advanced behavior exists.
Source coverage and a browsable demo do not prove behavioral parity.

1. Read `fabricator.json`: renderer, platforms, packageName, sourceRoot and
   installed items. Use the installed Swift/Kotlin declarations to determine
   composition and bindings. React props and DOM attributes do not translate
   literally to native APIs.
2. Reuse installed `Fabricator*` controls, layout parts and generated Fabricator
   icons. Component slugs stay the same. Use `view <slug>` to inspect the owning
   source and `add <slug>` to install its dependency closure.
3. Keep semantic color names, Inter typography, generated radius/density values
   and motion roles. `muted` is a surface; `muted-foreground` is text. Use the
   renderer's regional theme/density environment. Size compact controls within
   accessible touch targets and preserve Dynamic Type/font scaling.
4. Keep selection, validation, sorting, date/time and document state in pure
   models. Route SDK work through native platform adapters. Text entry retains
   the operating system's IME, selection, autofill and accessibility behavior.
5. Review source updates with `--dry-run` and `--diff`; preserve consumer edits.
   Replacing user-edited files still requires the user's authorization.
6. Compile the consumer package/module and run its behavior tests. Verify the
   running native app in light/dark, phone/tablet/desktop layouts, keyboard and
   screen reader paths. Record any actual implementation gap explicitly.

SwiftUI uses a Swift package with iOS/iPadOS/macOS hosts. Compose uses common
native UI/models plus Android/JVM SDK adapters and a Gradle module. The CLI is a
development tool; Node, React and Tailwind are not native runtime dependencies.

Tauri mobile uses the React web renderer inside a system WebView. Follow the
web component APIs and styles when the project is a Tauri host.
