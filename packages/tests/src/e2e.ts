/**
 * End-to-end install tests for the fabricator-ui CLI and the @fabricator
 * registry. See ../README.md.
 */
import { spawn, spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const ROOT = path.resolve(import.meta.dirname, "../../..")
const CLI = path.join(ROOT, "packages/cli/dist/index.js")
const REGISTRY_URL = (
  process.env.FABRICATOR_REGISTRY_URL ?? "http://localhost:4000"
).replace(/\/$/, "")
// dropdown-menu, select, sidebar and tabs pull in the Fluid Hover lib (every
// base has Fabricator overrides for them); every installed file is typechecked.
const COMPONENTS = [
  "dialog",
  "select",
  "field",
  "sidebar",
  "calendar",
  "dropdown-menu",
  "tabs",
  // Fabricator-only items: sounds (lib + component) and the pill radius theme.
  "sounds",
  "radius-pill",
]

// Fabricator-only components (no upstream item of the same name).
const FABRICATOR_ONLY_COMPONENTS = [
  "search",
  "app-shell",
  "app-nav",
  "tab-strip",
  "workspace-switcher",
  "user-menu",
]

const args = process.argv.slice(2)
const only = getArg("--only")?.split(",")
const keep = args.includes("--keep")

function getArg(name: string) {
  const index = args.indexOf(name)
  return index === -1 ? undefined : args[index + 1]
}

const LOCAL_NPM_PORT = 4873
const LOCAL_NPM = `http://localhost:${LOCAL_NPM_PORT}`

const env = {
  ...process.env,
  FABRICATOR_REGISTRY_URL: REGISTRY_URL,
  // Installs the icons this checkout builds: see local-npm.ts.
  BUN_CONFIG_REGISTRY: LOCAL_NPM,
  npm_config_registry: LOCAL_NPM,
  pnpm_config_registry: LOCAL_NPM,
  // Scaffold and install with Bun (the shadcn CLI reads the user agent).
  npm_config_user_agent: "bun/1.4.0",
  CI: "1",
}

function run(
  command: string,
  commandArgs: string[],
  cwd: string,
  extraEnv: NodeJS.ProcessEnv = {}
) {
  console.log(`  $ ${command} ${commandArgs.join(" ")}`)
  const result = spawnSync(command, commandArgs, {
    cwd,
    env: { ...env, ...extraEnv },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  })
  if (result.status !== 0) {
    throw new Error(
      `${command} ${commandArgs.join(" ")} failed (${result.status}):\n${result.stdout}\n${result.stderr}`.slice(
        -4000
      )
    )
  }
  return result.stdout
}

function cli(cliArgs: string[], cwd: string, extraEnv: NodeJS.ProcessEnv = {}) {
  return run(
    process.execPath.endsWith("bun") ? "node" : process.execPath,
    [CLI, ...cliArgs],
    cwd,
    extraEnv
  )
}

function hasCommand(command: string) {
  return spawnSync(command, ["--version"], { stdio: "ignore" }).status === 0
}

const USER_AGENTS = {
  bun: "bun/1.4.0",
  npm: "npm/11.0.0",
  pnpm: "pnpm/11.25.0",
} as const

type WebFramework = "next" | "vite" | "start" | "react-router" | "astro"

const FRAMEWORK_ROOTS: Record<WebFramework, string> = {
  next: "app/layout.tsx",
  vite: "src/main.tsx",
  start: "src/routes/__root.tsx",
  "react-router": "app/root.tsx",
  astro: "src/layouts/main.astro",
}

/** The pages behind the App Shell's sample nav, so its links work. */
const FRAMEWORK_PAGES: Partial<Record<WebFramework, string[]>> = {
  next: ["app/inbox/page.tsx", "app/projects/launch/page.tsx"],
  start: ["src/routes/inbox.tsx", "src/routes/projects/index.tsx"],
  "react-router": ["app/routes/inbox.tsx", "app/routes/projects.launch.tsx"],
}

function assertMounted(appDir: string, framework: WebFramework) {
  const root = fs.readFileSync(
    path.join(appDir, FRAMEWORK_ROOTS[framework]),
    "utf8"
  )
  assert(root.includes("SoundEffects"), `${framework}: sounds aren't mounted`)
  if (framework === "astro") return
  assert(root.includes("<AppShellRoot"), `${framework}: shell isn't mounted`)
  for (const page of FRAMEWORK_PAGES[framework] ?? []) {
    assert(
      fs.existsSync(path.join(appDir, page)),
      `${framework}: ${page} is missing`
    )
  }
}

function monorepoScenario(
  packageManager: keyof typeof USER_AGENTS,
  desktop: "electron" | "tauri"
) {
  return {
    name: `monorepo-${packageManager}-${desktop}`,
    run(dir: string) {
      if (!hasCommand(packageManager)) {
        console.log(`  Skipped: ${packageManager} isn't installed.`)
        return
      }
      const userAgent = { npm_config_user_agent: USER_AGENTS[packageManager] }
      cli(
        [
          "create",
          "app",
          "--mobile",
          "--desktop",
          desktop,
          "--agents",
          "claude,codex",
          "--yes",
          "-c",
          dir,
        ],
        dir,
        userAgent
      )
      const root = path.join(dir, "app")
      const web = path.join(root, "apps/web")
      const mobile = path.join(root, "apps/mobile")
      const desktopDir = path.join(root, "apps/desktop")

      // Libs live beside the components that import them.
      assert(
        fs.existsSync(path.join(root, "packages/ui/src/lib/fluid-hover.tsx")),
        "fluid-hover isn't in packages/ui"
      )
      assert(
        readJson(path.join(root, "packages/ui/package.json")).exports[
          "./lib/fluid-hover"
        ],
        "packages/ui doesn't export its .tsx lib"
      )
      assert(
        readJson(path.join(web, "package.json")).dependencies[FABRICATOR_ICONS],
        "apps/web doesn't depend on the icons"
      )
      assertMounted(web, "next")
      const layout = fs.readFileSync(
        path.join(web, "components/app-shell-layout.tsx"),
        "utf8"
      )
      assert(
        layout.includes("window={shellWindow}"),
        "the web layout has no runtime window"
      )

      // One file per app, written from the same options.
      assert(
        fs
          .readFileSync(
            path.join(mobile, "src/components/app-shell-layout.tsx"),
            "utf8"
          )
          .includes("icons-react-native"),
        "the mobile layout isn't the native one"
      )
      assert(
        fs
          .readFileSync(path.join(mobile, "src/app/_layout.tsx"), "utf8")
          .includes("<FabricatorRoot>"),
        "the mobile root isn't mounted"
      )
      assert(
        !fs.existsSync(path.join(mobile, "src/components/app-tabs.tsx")),
        "Expo's demo is still there"
      )
      const { expo } = readJson(path.join(mobile, "app.json"))
      assert(expo.name === "app", `The mobile app is called ${expo.name}`)
      assert(
        expo.ios.bundleIdentifier === "app.app.mobile" &&
          expo.android.package === "app.app.mobile",
        "A first native build would have to ask for the app's ids"
      )

      // Assistants and the first commit.
      assert(
        fs.existsSync(path.join(root, ".claude/skills/fabricator/SKILL.md")),
        "Claude Code has no skill"
      )
      assert(
        fs.existsSync(path.join(root, ".agents/skills/fabricator/SKILL.md")),
        "Codex has no skill"
      )
      assert(
        fs
          .readFileSync(path.join(root, ".codex/config.toml"), "utf8")
          .includes('"-c", "apps/web"'),
        "Codex's MCP server doesn't point at the app"
      )
      assert(
        readJson(path.join(root, ".mcp.json")).mcpServers.fabricator,
        "Claude Code has no MCP server"
      )
      assert(
        run("git", ["status", "--porcelain"], root).trim() === "",
        "The first commit left files out"
      )

      // Everything builds.
      run(packageManager, ["run", "build"], web)
      run(packageManager, ["run", "build:static"], web)
      assert(
        fs.existsSync(path.join(web, "out/index.html")),
        "No static build for the window to load"
      )
      run("npx", ["-y", "expo-doctor"], mobile)
      run(
        "npx",
        ["expo", "export", "--platform", "ios", "--output-dir", "dist-ios"],
        mobile
      )
      assertInstalledTypes(mobile)
      if (desktop === "tauri" && hasCommand("cargo")) {
        run(
          "cargo",
          ["check", "--manifest-path", "src-tauri/Cargo.toml"],
          desktopDir
        )
      }
      if (desktop === "electron") {
        assert(
          fs.existsSync(path.join(desktopDir, "electron/main.mjs")),
          "Electron's main process is missing"
        )
      }
    },
  }
}

function readJson(file: string) {
  return JSON.parse(fs.readFileSync(file, "utf8"))
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const FABRICATOR_ICONS = "@fabricator-ui/icons"
const LUCIDE = "lucide-react"

function assertRegistry(appDir: string) {
  const config = readJson(path.join(appDir, "components.json"))
  const entry = config.registries?.["@fabricator"]
  const url: string | undefined = typeof entry === "string" ? entry : entry?.url
  const expected = `${REGISTRY_URL}/r/fabricator/{style}/{name}.json`
  assert(
    url === expected,
    `components.json @fabricator is ${url}, expected ${expected}`
  )
  assert(
    /^(base|radix|aria)-[a-z]+$/.test(config.style),
    `components.json style ${config.style} is not a valid shadcn style id`
  )
  return config
}

// A project's components, its dependencies and its registry entry all agree on
// one icon pack. `iconLibrary` stays "lucide" either way: shadcn knows no other.
function assertIconPack(appDir: string, pack: "fabricator" | "lucide") {
  const config = readJson(path.join(appDir, "components.json"))
  const isFabricator = pack === "fabricator"
  assert(
    config.iconLibrary === "lucide",
    `components.json iconLibrary is ${config.iconLibrary}`
  )
  const params = config.registries?.["@fabricator"]?.params
  assert(
    isFabricator ? params?.icons === "fabricator" : params === undefined,
    `@fabricator params are ${JSON.stringify(params)}, expected ${pack} icons`
  )

  const { dependencies } = readJson(path.join(appDir, "package.json"))
  const [wanted, unwanted] = isFabricator
    ? [FABRICATOR_ICONS, LUCIDE]
    : [LUCIDE, FABRICATOR_ICONS]
  assert(dependencies[wanted], `package.json lacks ${wanted}`)
  assert(!dependencies[unwanted], `package.json has ${unwanted}`)

  const uiDir = path.join(appDir, "src/components/ui")
  const sources = fs
    .readdirSync(uiDir)
    .map((file) => fs.readFileSync(path.join(uiDir, file), "utf8"))
  assert(
    sources.some((source) => source.includes(`from "${wanted}"`)),
    `no installed component imports ${wanted}`
  )
  const stray = sources.filter(
    (source) =>
      source.includes(`from "${unwanted}"`) ||
      source.includes("IconPlaceholder")
  )
  assert(
    stray.length === 0,
    `${stray.length} components import ${unwanted} or keep IconPlaceholder`
  )
}

// Projects created from /init get the Fabricator schema URL.
function assertInitSchema(appDir: string) {
  const config = readJson(path.join(appDir, "components.json"))
  assert(
    config.$schema === "https://fabricator-ui.vercel.app/schema.json",
    `components.json $schema is ${config.$schema}`
  )
}

// React Aria composes dialogs differently: DialogTrigger wraps the button and
// the Dialog, and there is no DialogContent.
function dialogMarkup(base: string) {
  if (base === "aria") {
    return `<DialogTrigger>
          <Button>Open</Button>
          <Dialog>
            <DialogHeader>
              <DialogTitle>Fabricator</DialogTitle>
              <DialogDescription>Installed from @fabricator.</DialogDescription>
            </DialogHeader>
          </Dialog>
        </DialogTrigger>`
  }
  const trigger =
    base === "radix"
      ? `<DialogTrigger asChild><Button>Open</Button></DialogTrigger>`
      : `<DialogTrigger render={<Button />}>Open</DialogTrigger>`
  return `<Dialog>
          ${trigger}
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Fabricator</DialogTitle>
              <DialogDescription>Installed from @fabricator.</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>`
}

function writeViteApp(appDir: string, base: string) {
  fs.writeFileSync(
    path.join(appDir, "src/App.tsx"),
    `import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  ${base === "aria" ? "" : "DialogContent,"}
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { SidebarProvider } from "@/components/ui/sidebar"

export default function App() {
  return (
    <SidebarProvider>
      <main className="flex min-h-svh flex-col items-center justify-center gap-4">
        ${dialogMarkup(base)}
        <Field>
          <FieldLabel>Date</FieldLabel>
          <Calendar />
        </Field>
      </main>
    </SidebarProvider>
  )
}
`
  )
}

// A plain shadcn project created from ui.shadcn.com, untouched by Fabricator.
function scaffoldShadcnApp(dir: string) {
  const shadcnBin = path.join(
    path.dirname(CLI),
    "..",
    "node_modules",
    "shadcn",
    "dist",
    "index.js"
  )
  const bin = fs.existsSync(shadcnBin)
    ? shadcnBin
    : path.join(ROOT, "node_modules/shadcn/dist/index.js")
  run(
    "node",
    [bin, "init", "-t", "vite", "-n", "app", "--defaults", "-y", "-c", dir],
    dir
  )
  return path.join(dir, "app")
}

// The command the App Shell card shows: the shell written out from its options.
// The project's own build then typechecks the file against this base's parts.
function installConfiguredShell(appDir: string) {
  const query =
    "variant=floating&collapse=offcanvas&peek=hover&tabs=main&contentSize=lg"
  cli(
    [
      "add",
      "app-shell",
      `${REGISTRY_URL}/init/app-shell?${query}`,
      "-y",
      "-o",
      "-c",
      appDir,
    ],
    appDir
  )
  const layout = fs.readFileSync(
    path.join(appDir, "src/components/app-shell-layout.tsx"),
    "utf8"
  )
  for (const expected of [
    'variant="floating"',
    'peek="hover"',
    'size="lg"',
    "<TabStripNew />",
    "@/components/ui/app-shell",
  ]) {
    assert(layout.includes(expected), `app-shell-layout lacks ${expected}`)
  }
  assert(
    !layout.includes("@/registry/"),
    "app-shell-layout still imports from the registry"
  )
}

// Imports every installed component, so a bad import fails the bundle.
function writeExpoScreen(appDir: string) {
  const uiDir = path.join(appDir, "src/components/ui")
  const names = fs
    .readdirSync(uiDir)
    .filter((file) => file.endsWith(".tsx"))
    .map((file) => file.replace(/\.tsx$/, ""))
  fs.rmSync(path.join(appDir, "src/app/explore.tsx"), { force: true })
  fs.writeFileSync(
    path.join(appDir, "src/app/index.tsx"),
    `${names.map((name, index) => `import * as C${index} from "@/components/ui/${name}"`).join("\n")}
import { Text, View } from "react-native"

import { Button } from "@/components/ui/button"

const ALL = [${names.map((_name, index) => `C${index}`).join(", ")}]

export default function Index() {
  return (
    <View className="bg-background flex-1 items-center justify-center gap-4">
      <Text className="text-foreground">{ALL.length} modules</Text>
      <Button variant="outline" size="sm">Save</Button>
    </View>
  )
}
`
  )
  fs.writeFileSync(
    path.join(appDir, "src/app/_layout.tsx"),
    `import "../global.css"

import { Stack } from "expo-router"

import { FabricatorRoot } from "@/components/ui/fabricator-root"

export default function RootLayout() {
  return (
    <FabricatorRoot>
      <Stack />
    </FabricatorRoot>
  )
}
`
  )
  return names
}

// Only the library's files: Expo's template has type errors of its own.
function assertInstalledTypes(appDir: string) {
  const result = spawnSync("npx", ["tsc", "--noEmit"], {
    cwd: appDir,
    env,
    encoding: "utf8",
  })
  const errors = result.stdout
    .split("\n")
    .filter((line) => /^src\/(components\/ui|lib)\/.*error TS/.test(line))
  assert(
    errors.length === 0,
    `Installed files have type errors:\n${errors.join("\n")}`
  )
}

type Scenario = { name: string; run: (dir: string) => void }

const scenarios: Scenario[] = [
  ...(["next", "vite", "start", "react-router", "astro"] as const).map(
    (framework) => ({
      name: `create-${framework}`,
      run(dir: string) {
        cli(
          [
            "create",
            "app",
            "-t",
            framework,
            "--no-monorepo",
            "--yes",
            "-c",
            dir,
          ],
          dir
        )
        const appDir = path.join(dir, "app")
        assertRegistry(appDir)
        assertMounted(appDir, framework)
        run("bun", ["run", "build"], appDir)
        // The agent prompt says a fresh project passes this.
        cli(["doctor", "-c", appDir], appDir)
      },
    })
  ),
  {
    name: "create-expo",
    run(dir: string) {
      cli(["create", "app", "-t", "expo", "--yes", "-c", dir], dir)
      const appDir = path.join(dir, "app")
      assert(
        fs
          .readFileSync(path.join(appDir, "src/app/_layout.tsx"), "utf8")
          .includes("<AppShellRoot>"),
        "The native shell isn't mounted"
      )
      for (const page of ["inbox", "projects", "team", "settings"]) {
        assert(
          fs.existsSync(path.join(appDir, `src/app/${page}.tsx`)),
          `The ${page} screen is missing`
        )
      }
      cli(["doctor", "-c", appDir], appDir)
      run(
        "npx",
        ["expo", "export", "--platform", "ios", "--output-dir", "dist"],
        appDir
      )
      assertInstalledTypes(appDir)
    },
  },
  {
    name: "monorepo-web",
    run(dir: string) {
      // A monorepo is what `create` makes when nothing says otherwise.
      cli(["create", "app", "--yes", "-c", dir], dir)
      const root = path.join(dir, "app")
      const web = path.join(root, "apps/web")
      // From the root, the one app is found.
      cli(["add", "dropdown-menu", "tabs", "-y", "-o"], root)
      assertMounted(web, "next")
      run("bun", ["run", "build"], web)
      // The agent prompt's way in, when the setup didn't name the agent.
      cli(["agents", "add", "claude"], root)
      assert(
        fs.existsSync(path.join(root, ".claude/skills/fabricator/SKILL.md")),
        "`agents add` wrote no skill"
      )
      cli(["doctor"], root)
    },
  },
  {
    name: "desktop-only",
    run(dir: string) {
      cli(
        [
          "create",
          "app",
          "--desktop",
          "electron",
          "--no-web",
          "--yes",
          "-c",
          dir,
        ],
        dir
      )
      const root = path.join(dir, "app")
      const web = path.join(root, "apps/web")
      assert(
        fs.existsSync(path.join(root, "apps/desktop/electron/main.mjs")),
        "No Electron app"
      )
      // The window renders it, so it's there without a website.
      assertMounted(web, "next")
      run("bun", ["run", "build"], web)
      run("bun", ["run", "build:static"], web)
    },
  },
  {
    name: "mobile-only",
    run(dir: string) {
      cli(["create", "app", "--mobile", "--no-web", "--yes", "-c", dir], dir)
      const root = path.join(dir, "app")
      assert(
        fs
          .readFileSync(path.join(root, "src/app/_layout.tsx"), "utf8")
          .includes("<AppShellRoot>"),
        "The native shell isn't mounted"
      )
      assert(
        !fs.existsSync(path.join(root, "apps")),
        "A lone mobile app got a monorepo"
      )
      run(
        "npx",
        ["expo", "export", "--platform", "ios", "--output-dir", "dist"],
        root
      )
    },
  },
  {
    name: "monorepo-grow",
    run(dir: string) {
      cli(["create", "app", "--monorepo", "--yes", "-c", dir], dir)
      const root = path.join(dir, "app")
      const web = path.join(root, "apps/web")
      const mobile = path.join(root, "apps/mobile")

      cli(["apps", "add", "desktop", "electron", "-c", root], root)
      assert(
        fs.existsSync(path.join(root, "apps/desktop/electron/main.mjs")),
        "`apps add desktop` wrote no Electron app"
      )
      assert(
        fs
          .readFileSync(
            path.join(web, "components/app-shell-layout.tsx"),
            "utf8"
          )
          .includes("window={shellWindow}"),
        "`apps add desktop` left the web layout without a window"
      )

      cli(["apps", "add", "mobile", "-c", root], root)
      assert(
        fs
          .readFileSync(path.join(mobile, "src/app/_layout.tsx"), "utf8")
          .includes("<FabricatorRoot>"),
        "`apps add mobile` didn't mount the root"
      )
      const scripts = readJson(path.join(root, "package.json")).scripts
      assert(scripts["dev:mobile"], "The root has no dev:mobile script")
      assert(scripts["dev:desktop"], "The root has no dev:desktop script")

      // With two component apps, the root add has to be told which.
      let wasRefused = false
      try {
        cli(["add", "badge", "-y", "-o"], root)
      } catch {
        wasRefused = true
      }
      assert(wasRefused, "`add` guessed between several apps")
      cli(["add", "badge", "--app", "all", "-y", "-o"], root)
      assert(
        fs.existsSync(path.join(root, "packages/ui/src/components/badge.tsx")),
        "`add --app all` skipped the web app"
      )
      assert(
        fs.existsSync(path.join(mobile, "src/components/ui/badge.tsx")),
        "`add --app all` skipped the mobile app"
      )

      assert(
        cli(["doctor", "-c", root], root).includes("mobile"),
        "`doctor` didn't look at the apps"
      )
      cli(["upgrade", "--dry-run", "-c", web], root)

      run("bun", ["run", "build"], web)
      run("bun", ["run", "build:static"], web)
      run(
        "npx",
        ["expo", "export", "--platform", "ios", "--output-dir", "dist-ios"],
        mobile
      )
      assertInstalledTypes(mobile)
    },
  },
  {
    name: "create-everything",
    run(dir: string) {
      cli(
        [
          "create",
          "app",
          "--desktop",
          "tauri",
          "--shell",
          "glass=false",
          "--all",
          "--yes",
          "-c",
          dir,
        ],
        dir
      )
      const root = path.join(dir, "app")
      const web = path.join(root, "apps/web")
      const ui = path.join(root, "packages/ui/src/components")
      for (const component of ["accordion", "sidebar", "tabs"]) {
        assert(
          fs.existsSync(path.join(ui, `${component}.tsx`)),
          `--all left out ${component}`
        )
      }
      const tauri = path.join(root, "apps/desktop/src-tauri")
      assert(
        !fs
          .readFileSync(path.join(tauri, "Cargo.toml"), "utf8")
          .includes("macos-private-api"),
        "A window without glass asks for the private API"
      )
      run("bun", ["run", "build"], web)
      if (hasCommand("cargo")) {
        run(
          "cargo",
          ["check", "--manifest-path", "src-tauri/Cargo.toml"],
          path.dirname(tauri)
        )
      }
    },
  },
  monorepoScenario("bun", "tauri"),
  monorepoScenario("pnpm", "electron"),
  monorepoScenario("npm", "tauri"),
  {
    name: "init-existing-agents",
    run(dir: string) {
      cli(
        [
          "create",
          "app",
          "-t",
          "vite",
          "--no-monorepo",
          "--no-shell",
          "--no-sounds",
          "--yes",
          "-c",
          dir,
        ],
        dir
      )
      const appDir = path.join(dir, "app")
      cli(
        [
          "init",
          "--shell",
          "--sounds",
          "--agents",
          "claude,codex",
          "--yes",
          "-c",
          appDir,
        ],
        appDir
      )
      assertMounted(appDir, "vite")
      cli(["doctor", "-c", appDir], appDir)
      assert(
        fs.existsSync(path.join(appDir, ".claude/skills/fabricator/SKILL.md")),
        "Claude Code has no skill"
      )
      assert(
        fs.existsSync(path.join(appDir, ".codex/config.toml")),
        "Codex has no MCP config"
      )
      run("bun", ["run", "build"], appDir)
    },
  },
  {
    name: "expo",
    run(dir: string) {
      run(
        "bunx",
        ["--bun", "create-expo-app@latest", "app", "--no-install"],
        dir
      )
      const appDir = path.join(dir, "app")
      run("bun", ["install"], appDir)
      cli(["init", "-y", "-c", appDir], appDir)

      const config = readJson(path.join(appDir, "components.json"))
      const expected = `${REGISTRY_URL}/r/fabricator/native/{name}.json`
      assert(
        config.registries?.["@fabricator"] === expected,
        `components.json @fabricator is ${config.registries?.["@fabricator"]}, expected ${expected}`
      )
      // Base styles rewrite asChild at install, which the primitives don't read.
      assert(
        /^radix-[a-z]+$/.test(config.style),
        `components.json style ${config.style} would rewrite asChild`
      )
      assert(
        fs.existsSync(path.join(appDir, "src/fabricator.css")),
        "The theme was not installed"
      )
      const css = fs.readFileSync(path.join(appDir, "src/global.css"), "utf8")
      assert(css.includes('@import "uniwind"'), "global.css lacks Uniwind")
      assert(
        css.includes('@import "./fabricator.css"'),
        "global.css lacks the theme"
      )

      // The template's own collapsible.tsx is replaced: -o answers the prompt.
      cli(["add", "--all", "-y", "-o", "-c", appDir], appDir)
      cli(["add", "native-theme", "sounds", "-y", "-o", "-c", appDir], appDir)
      const names = writeExpoScreen(appDir)
      assert(names.length >= 60, `Only ${names.length} components installed`)
      const button = fs.readFileSync(
        path.join(appDir, "src/components/ui/button.tsx"),
        "utf8"
      )
      assert(button.includes('from "react-native"'), "button.tsx is not native")
      assert(!button.includes("registry/"), "button.tsx has a registry import")

      run(
        "npx",
        [
          "expo",
          "export",
          "--platform",
          "ios",
          "--platform",
          "android",
          "--output-dir",
          "dist",
        ],
        appDir
      )
      assertInstalledTypes(appDir)
    },
  },
  ...(["base", "radix", "aria"] as const).map((base) => ({
    name: `vite-${base}`,
    run(dir: string) {
      cli(["init", "-t", "vite", "-b", base, "-n", "app", "-y", "-c", dir], dir)
      const appDir = path.join(dir, "app")
      assertRegistry(appDir)
      assertInitSchema(appDir)
      const button = fs.readFileSync(
        path.join(appDir, "src/components/ui/button.tsx"),
        "utf8"
      )
      const primitive = {
        base: "@base-ui/react",
        radix: "radix-ui",
        aria: "react-aria-components",
      }[base]
      assert(
        button.includes(primitive),
        `button.tsx does not import ${primitive}`
      )
      cli(
        [
          "add",
          ...COMPONENTS,
          ...FABRICATOR_ONLY_COMPONENTS,
          "-y",
          "-o",
          "-c",
          appDir,
        ],
        appDir
      )
      assert(
        fs.existsSync(path.join(appDir, "src/lib/fluid-hover.tsx")),
        "lib/fluid-hover.tsx was not installed"
      )
      for (const lib of ["app-shell-model.ts", "sortable.tsx"]) {
        assert(
          fs.existsSync(path.join(appDir, "src/lib", lib)),
          `lib/${lib} was not installed`
        )
      }
      assertIconPack(appDir, "fabricator")
      writeViteApp(appDir, base)
      installConfiguredShell(appDir)
      run("bun", ["run", "build"], appDir)
    },
  })),
  {
    name: "vite-lucide",
    run(dir: string) {
      // The setup page's command for a project that keeps Lucide.
      const preset = `${REGISTRY_URL}/init?base=base&template=vite&iconLibrary=lucide`
      cli(
        ["init", "-t", "vite", "-p", preset, "-n", "app", "-y", "-c", dir],
        dir
      )
      const appDir = path.join(dir, "app")
      assertRegistry(appDir)
      cli(["add", "dialog", "select", "-y", "-o", "-c", appDir], appDir)
      assertIconPack(appDir, "lucide")
      run("bun", ["run", "build"], appDir)
    },
  },
  {
    name: "next-base",
    run(dir: string) {
      cli(
        ["init", "-t", "next", "-b", "base", "-n", "app", "-y", "-c", dir],
        dir
      )
      const appDir = path.join(dir, "app")
      assertRegistry(appDir)
      assertInitSchema(appDir)
      cli(["add", "dialog", "field", "-y", "-o", "-c", appDir], appDir)
      run("bun", ["run", "build"], appDir)
    },
  },
  {
    name: "existing-shadcn",
    run(dir: string) {
      const appDir = scaffoldShadcnApp(dir)
      const before = readJson(path.join(appDir, "components.json"))
      assert(
        !before.registries?.["@fabricator"],
        "fresh shadcn project already has @fabricator"
      )

      // `init` in an existing project only adds the registry (with --yes).
      cli(["init", "-y", "-c", appDir], appDir)
      const after = assertRegistry(appDir)
      assert(after.style === before.style, "init changed the project's style")

      cli(
        [
          "add",
          ...COMPONENTS,
          ...FABRICATOR_ONLY_COMPONENTS,
          "-y",
          "-o",
          "-c",
          appDir,
        ],
        appDir
      )
      // An existing project keeps its icons until it asks for Fabricator's.
      assertIconPack(appDir, "lucide")
      writeViteApp(appDir, "base")
      run("bun", ["run", "build"], appDir)

      // `apply` switches the theme to Fabricator and keeps the build green.
      cli(["apply", "-y", "-c", appDir], appDir)
      run("bun", ["run", "build"], appDir)
    },
  },
  {
    name: "configured-shell-in-shadcn",
    run(dir: string) {
      // The App Shell card's command alone sets up the registry its file needs.
      const appDir = scaffoldShadcnApp(dir)
      installConfiguredShell(appDir)
      assertRegistry(appDir)
      run("bun", ["run", "build"], appDir)
    },
  },
]

// Packs the workspace's icons and serves them, in its own process: every step
// below blocks this one with spawnSync.
const packedIcons = ["packages/icons", "packages/icons-react-native"].flatMap(
  (packagePath) => {
    const packDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "fabricator-e2e-npm-")
    )
    const packageDir = path.join(ROOT, packagePath)
    spawnSync("bun", ["pm", "pack", "--destination", packDir, "--quiet"], {
      cwd: packageDir,
      stdio: "inherit",
    })
    const [tarball] = fs.readdirSync(packDir)
    assert(
      tarball,
      `Packing ${packagePath} failed: run \`bun run build\` first`
    )
    return [path.join(packDir, tarball), path.join(packageDir, "package.json")]
  }
)
const localNpm = spawn(
  "bun",
  [
    path.join(import.meta.dirname, "local-npm.ts"),
    String(LOCAL_NPM_PORT),
    ...packedIcons,
  ],
  { stdio: "inherit" }
)
// It must not keep this process alive once the scenarios are done.
localNpm.unref()
process.on("exit", () => localNpm.kill())
for (let attempt = 0; attempt < 50; attempt++) {
  const isUp = await fetch(`${LOCAL_NPM}/${FABRICATOR_ICONS}`).then(
    (response) => response.ok,
    () => false
  )
  if (isUp) break
  await new Promise((resolve) => setTimeout(resolve, 100))
}

const health = await fetch(
  `${REGISTRY_URL}/r/fabricator/native/registry.json`
).catch(() => null)
if (!health?.ok) {
  console.error(
    `✖ Registry not reachable at ${REGISTRY_URL}. Start it with \`bun run dev\`.`
  )
  process.exit(1)
}
if (!fs.existsSync(CLI)) {
  console.error(
    "✖ packages/cli/dist/index.js is missing. Run `bun run cli:build`."
  )
  process.exit(1)
}

const selected = scenarios.filter(
  (scenario) => !only || only.includes(scenario.name)
)
const failures: string[] = []

for (const scenario of selected) {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), `fabricator-e2e-${scenario.name}-`)
  )
  const started = Date.now()
  console.log(`\n▶ ${scenario.name} (${dir})`)
  try {
    scenario.run(dir)
    console.log(
      `✔ ${scenario.name} in ${((Date.now() - started) / 1000).toFixed(0)}s`
    )
    if (!keep) fs.rmSync(dir, { recursive: true, force: true })
  } catch (error) {
    failures.push(scenario.name)
    console.error(
      `✖ ${scenario.name}\n${error instanceof Error ? error.message : error}`
    )
  }
}

if (failures.length) {
  console.error(
    `\n✖ ${failures.length}/${selected.length} scenarios failed: ${failures.join(", ")}`
  )
  process.exit(1)
}
console.log(`\n✅ ${selected.length} scenarios passed against ${REGISTRY_URL}.`)
