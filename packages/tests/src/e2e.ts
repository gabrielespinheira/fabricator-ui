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
  // Scaffold and install with Bun (the shadcn CLI reads the user agent).
  npm_config_user_agent: "bun/1.4.0",
  CI: "1",
}

function run(command: string, commandArgs: string[], cwd: string) {
  console.log(`  $ ${command} ${commandArgs.join(" ")}`)
  const result = spawnSync(command, commandArgs, {
    cwd,
    env,
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

function cli(cliArgs: string[], cwd: string) {
  return run(
    process.execPath.endsWith("bun") ? "node" : process.execPath,
    [CLI, ...cliArgs],
    cwd
  )
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

type Scenario = { name: string; run: (dir: string) => void }

const scenarios: Scenario[] = [
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
const packDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabricator-e2e-npm-"))
const iconsDir = path.join(ROOT, "packages/icons")
spawnSync("bun", ["pm", "pack", "--destination", packDir, "--quiet"], {
  cwd: iconsDir,
  stdio: "inherit",
})
const [tarball] = fs.readdirSync(packDir)
assert(
  tarball,
  "Packing @fabricator-ui/icons failed: run `bun run build` first"
)
const localNpm = spawn(
  "bun",
  [
    path.join(import.meta.dirname, "local-npm.ts"),
    String(LOCAL_NPM_PORT),
    path.join(packDir, tarball),
    path.join(iconsDir, "package.json"),
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
  `${REGISTRY_URL}/r/fabricator/base-nova/registry.json`
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
