/**
 * End-to-end install tests for the fabricator-ui CLI and the @fabricator
 * registry. See ../README.md.
 */
import { spawnSync } from "node:child_process"
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

// Fabricator-only components: not in blend mode, so only the Fabricator
// scenarios install them.
const FABRICATOR_ONLY_COMPONENTS = ["search"]

const args = process.argv.slice(2)
const only = getArg("--only")?.split(",")
const keep = args.includes("--keep")

function getArg(name: string) {
  const index = args.indexOf(name)
  return index === -1 ? undefined : args[index + 1]
}

const env = {
  ...process.env,
  FABRICATOR_REGISTRY_URL: REGISTRY_URL,
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

function assertRegistry(appDir: string, mode: "fabricator" | "blend") {
  const config = readJson(path.join(appDir, "components.json"))
  const url: string | undefined = config.registries?.["@fabricator"]
  const expected =
    mode === "fabricator"
      ? `${REGISTRY_URL}/r/fabricator/{style}/{name}.json`
      : `${REGISTRY_URL}/r/{style}/{name}.json`
  assert(
    url === expected,
    `components.json @fabricator is ${url}, expected ${expected}`
  )
  if (mode === "fabricator") {
    assert(
      config.$schema === "https://fabricator-ui.com/schema.json",
      `components.json $schema is ${config.$schema}`
    )
  }
  assert(
    /^(base|radix|aria)-[a-z]+$/.test(config.style),
    `components.json style ${config.style} is not a valid shadcn style id`
  )
  return config
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

type Scenario = { name: string; run: (dir: string) => void }

const scenarios: Scenario[] = [
  ...(["base", "radix", "aria"] as const).map((base) => ({
    name: `vite-${base}`,
    run(dir: string) {
      cli(["init", "-t", "vite", "-b", base, "-n", "app", "-y", "-c", dir], dir)
      const appDir = path.join(dir, "app")
      assertRegistry(appDir, "fabricator")
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
      writeViteApp(appDir, base)
      run("bun", ["run", "build"], appDir)
    },
  })),
  {
    name: "next-base",
    run(dir: string) {
      cli(
        ["init", "-t", "next", "-b", "base", "-n", "app", "-y", "-c", dir],
        dir
      )
      const appDir = path.join(dir, "app")
      assertRegistry(appDir, "fabricator")
      cli(["add", "dialog", "field", "-y", "-o", "-c", appDir], appDir)
      run("bun", ["run", "build"], appDir)
    },
  },
  {
    name: "existing-shadcn",
    run(dir: string) {
      // A plain shadcn project created from ui.shadcn.com, untouched by Fabricator.
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
      const appDir = path.join(dir, "app")
      const before = readJson(path.join(appDir, "components.json"))
      assert(
        !before.registries?.["@fabricator"],
        "fresh shadcn project already has @fabricator"
      )

      // `init` in an existing project adds the registry in blend mode (with --yes).
      cli(["init", "-y", "-c", appDir], appDir)
      const after = assertRegistry(appDir, "blend")
      assert(after.style === before.style, "init changed the project's style")

      cli(["add", ...COMPONENTS, "-y", "-o", "-c", appDir], appDir)
      writeViteApp(appDir, "base")
      run("bun", ["run", "build"], appDir)

      // `apply` switches the theme to Fabricator and keeps the build green.
      cli(["apply", "-y", "-c", appDir], appDir)
      run("bun", ["run", "build"], appDir)
    },
  },
]

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
