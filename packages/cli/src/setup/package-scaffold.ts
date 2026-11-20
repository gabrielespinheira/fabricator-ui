import { execFileSync } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs"
import path from "node:path"
import {
  projectName,
  REACT_PACKAGE,
  REACT_PACKAGE_STYLES,
} from "@fabricator-ui/setup"
import { z } from "zod"

import {
  fetchPackageLook,
  REACT_PACKAGE_VERSION,
  wirePackageStyles,
} from "./package-install"
import type { SetupContext } from "./steps"
import {
  buildReactEslintConfig,
  PRETTIER_CONFIG,
  PRETTIER_IGNORE,
  REACT_ESLINT_DEPENDENCIES,
  TOOLING_VERSIONS,
} from "./tooling"
import { buildWorkspaceRoot, PNPM_WORKSPACE_CONFIG } from "./workspace-config"

const FRAMEWORK_DEPENDENCIES = { next: "16.4.6", vite: "8.3.8" }
const REACT_VERSION = "19.3.1"
const TYPE_DEPENDENCIES = {
  "@types/react": "19.3.0",
  "@types/react-dom": "19.3.0",
  "@types/node": "22.20.5",
  typescript: "6.0.3",
}
const STARTER = `import { Button } from "${REACT_PACKAGE}/button"

export default function Home() {
  return (
    <main>
      <h1>Get started with Fabricator UI</h1>
      <Button>Get started</Button>
    </main>
  )
}
`
const STYLES = `@import "${REACT_PACKAGE_STYLES}";

body {
  margin: 2rem;
  background: var(--background);
  color: var(--foreground);
  font-family: system-ui, sans-serif;
}
`
const NEXT_LAYOUT = `import type { Metadata } from "next"
import type { ReactNode } from "react"

import "./globals.css"

export const metadata: Metadata = {
  title: "Fabricator UI",
  description: "A React web project using Fabricator UI components.",
}

export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>
}
`
const VITE_DOCUMENT = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Fabricator UI</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`
const VITE_ENTRY = `import { createRoot } from "react-dom/client"

import App from "./app"
import "./index.css"

const root = document.getElementById("root")
if (!root) throw new Error("Missing application root")
createRoot(root).render(<App />)
`

const marker = z.object({
  name: z.string(),
  fabricatorDistribution: z.literal("package"),
})

export function checkPackageScaffold(root: string, name: string) {
  if (!existsSync(root) || readdirSync(root).length === 0) return
  const manifest = path.join(root, "package.json")
  const existing =
    existsSync(manifest) &&
    marker.safeParse(JSON.parse(readFileSync(manifest, "utf8")))
  if (!existing || !existing.success || existing.data.name !== name) {
    throw new Error(
      `Choose an empty project directory. ${root} already contains files.`
    )
  }
}

function writeStarterFile(root: string, filename: string, value: string) {
  const target = path.join(root, filename)
  if (existsSync(target)) return
  mkdirSync(path.dirname(target), { recursive: true })
  writeFileSync(target, value, { flag: "wx" })
}

function json(value: object) {
  return `${JSON.stringify(value, null, 2)}\n`
}

export async function scaffoldPackageWeb(context: SetupContext) {
  const { root, webDir, setup, packageManager } = context
  const { framework } = setup
  if (framework !== "vite" && framework !== "next")
    throw new Error("Choose Next.js or Vite for a package scaffold.")
  const name = projectName(setup)
  checkPackageScaffold(root, name)
  const look = await fetchPackageLook(context)
  const isNext = framework === "next"
  const managerVersion = execFileSync(packageManager, ["--version"], {
    encoding: "utf8",
  }).trim()
  writeStarterFile(
    root,
    "package.json",
    json({
      ...buildWorkspaceRoot(name),
      packageManager: `${packageManager}@${managerVersion}`,
      fabricatorDistribution: "package",
      scripts: {
        build: "turbo build",
        lint: "turbo lint",
        typecheck: "turbo typecheck",
        format: 'prettier --write "apps/**/*.{ts,tsx,css}"',
      },
      devDependencies: {
        turbo: "2.11.11",
        prettier: TOOLING_VERSIONS.prettier,
      },
    })
  )
  if (packageManager === "pnpm")
    writeStarterFile(root, "pnpm-workspace.yaml", PNPM_WORKSPACE_CONFIG)
  writeStarterFile(
    root,
    ".gitignore",
    "node_modules\n.next\ndist\n.turbo\n.DS_Store\n"
  )
  if (setup.runner === "turborepo")
    writeStarterFile(
      root,
      "turbo.json",
      json({
        tasks: {
          dev: { persistent: true, cache: false },
          build: { outputs: [".next/**", "!.next/cache/**", "dist/**"] },
          lint: {},
          typecheck: {},
        },
      })
    )
  if (setup.tooling === "eslint-prettier") {
    writeStarterFile(root, ".prettierrc", PRETTIER_CONFIG)
    writeStarterFile(root, ".prettierignore", PRETTIER_IGNORE)
    writeStarterFile(
      webDir,
      "eslint.config.js",
      buildReactEslintConfig([".next", "dist"])
    )
  }
  writeStarterFile(
    webDir,
    "package.json",
    json({
      name: "web",
      private: true,
      type: "module",
      scripts: {
        dev: isNext ? "next dev" : "vite",
        build: isNext ? "next build" : "tsc --noEmit && vite build",
        typecheck: "tsc --noEmit",
        ...(setup.tooling === "eslint-prettier" && { lint: "eslint ." }),
      },
      dependencies: {
        [REACT_PACKAGE]: REACT_PACKAGE_VERSION,
        react: REACT_VERSION,
        "react-dom": REACT_VERSION,
        ...(isNext && { next: FRAMEWORK_DEPENDENCIES.next }),
      },
      devDependencies: {
        ...TYPE_DEPENDENCIES,
        ...(!isNext && { vite: FRAMEWORK_DEPENDENCIES.vite }),
        ...(setup.tooling === "eslint-prettier" && REACT_ESLINT_DEPENDENCIES),
      },
    })
  )
  writeStarterFile(
    webDir,
    "tsconfig.json",
    json({
      compilerOptions: {
        target: "ES2022",
        lib: ["DOM", "DOM.Iterable", "ESNext"],
        strict: true,
        skipLibCheck: true,
        noEmit: true,
        module: "ESNext",
        moduleResolution: "Bundler",
        jsx: "react-jsx",
        ...(isNext
          ? {
              allowJs: true,
              incremental: true,
              esModuleInterop: true,
              resolveJsonModule: true,
              isolatedModules: true,
              plugins: [{ name: "next" }],
            }
          : { types: ["vite/client"] }),
      },
      include: [
        "**/*.ts",
        "**/*.tsx",
        ...(isNext ? [".next/types/**/*.ts", ".next/dev/types/**/*.ts"] : []),
      ],
      exclude: ["node_modules"],
    })
  )
  if (isNext) {
    writeStarterFile(webDir, "app/page.tsx", STARTER)
    writeStarterFile(webDir, "app/globals.css", STYLES)
    writeStarterFile(webDir, "app/layout.tsx", NEXT_LAYOUT)
  } else {
    writeStarterFile(webDir, "index.html", VITE_DOCUMENT)
    writeStarterFile(webDir, "src/app.tsx", STARTER)
    writeStarterFile(webDir, "src/index.css", STYLES)
    writeStarterFile(webDir, "src/main.tsx", VITE_ENTRY)
  }
  if (look) context.notes.push(...wirePackageStyles(webDir, framework, look))
}
