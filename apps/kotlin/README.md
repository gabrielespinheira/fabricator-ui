# Fabricator UI for Kotlin

Android and desktop Compose examples using the reusable Kotlin source registry.
The gallery has routes for the current 109 component families/guides and 32
blocks. Source coverage is not a claim of complete behavior or visual parity.

## Toolchain

The project pins Kotlin **2.4.21**, Compose Multiplatform **1.12.2**, Android
Gradle Plugin **9.3.3**, Activity Compose **1.13.0**, OpenJFX **21.0.13.1**, and
kotlinx.serialization JSON **1.13.0**. OpenJFX is the desktop audio/video adapter;
JSON parsing is an editor adapter. A Button-only consumer does not install those
media/editor dependencies.

Provide these tools before a native build:

- JDK 17 and Gradle 9.5.0.
- Android SDK Platform 37.0, Build Tools 36.0.0 and platform-tools for Android.
- An attached/emulated Android API 26+ phone or tablet for launch commands.
- The corresponding desktop OS for its native package. The desktop app uses a
  JVM and Skia; release size, startup, memory and frame-time budgets are unmeasured.

`gradlew` delegates to an installed Gradle. It is not a bootstrapping wrapper and
does not install a JDK, Gradle, SDK or emulator. Gradle resolves the pinned project
dependencies when a build runs. Follow the repository's installation permission
rule before the first native dependency resolution.

## Commands

From the repository root:

```sh
bun run example:mobile-kotlin
bun run example:mobile-kotlin:tablet
bun run example:mobile-kotlin:build
bun run example:mobile-kotlin:check
bun run example:desktop-kotlin
bun run example:desktop-kotlin:build
bun run example:desktop-kotlin:check
```

Phone/tablet launch chooses a connected device by its logical screen width.
Set `FABRICATOR_ANDROID_SERIAL` to select a particular device. Build and check
commands do not need a connected device. Android checks assemble and lint the
app; desktop checks compile the host and run `:ui:desktopTest`.

These source checks need only the repository's existing Bun dependencies:

```sh
bun run --cwd apps/kotlin generate
bun run --cwd apps/kotlin typecheck
bun run --cwd apps/kotlin check:source
```

Launch/check/build prepares the shared contract before the Kotlin adapter, so a
clean clone does not need checked-in generated JSON. The UI module compiles
generated source copies from the same manifest targets used by consumer
installation. Kotlin source does not import the gallery. Generated Kotlin,
Inter fonts and BotFace assets are ignored by Git.

The contract also supplies the native color palette, all 22 spinner patterns,
control press curves, Inter fonts and calendar color/wash recipes. Adapters
retain the source font, icon and brand licenses in consumer installations.

## Verification and remaining work

As of 2026-11-15, strict TypeScript checks and the source inventory/dependency
closure checks pass. **All 42 Kotlin behavior tests are unrun.** There is no
usable JDK, Gradle or Android SDK in the current session, and dependency/toolchain
installation approval is pending. No Android/JVM binary, device flow or Kotlin
screenshot has been verified. A successful source inventory is not a native
compilation check.

The tests cover table filtering/editing/pinning, civil dates and zoned recurrence,
scoped calendar changes/undo, overlap lanes, block-document editing/serialization,
authentication validation, uptime models, spinner interpolation and sound/BotFace
math. Run the real native tests and application after installing the approved
toolchain, then check phone/tablet/desktop layouts, light/dark modes, keyboard,
TalkBack, IME composition and release performance.

Implementation gaps remain in complete chart options/geometry and interaction
parity, CommonMark/editor extension and cross-block input edge cases, complete
calendar series/exception and all-day behavior, full App Shell/window integration,
all look options, and audio synthesis parity. The 32 block compositions are now
ported individually; their rendered layouts remain unverified. System picker and
media chrome follows its platform. See the dated, machine-readable
[Compose parity exceptions](../web/registry/compose/parity-exceptions.json) for
the current boundary between implemented source, incomplete behavior and
platform mappings.
