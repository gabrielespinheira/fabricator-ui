// The placeholder pages behind the App Shell's sample navigation, so its links
// work on the first run of a new project. Never written into an existing one.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import type { Framework } from "@fabricator-ui/setup"

type Page = { route: string; title: string }

const WEB_PAGES: Page[] = [
  { route: "inbox", title: "Inbox" },
  { route: "projects", title: "Projects" },
  { route: "projects/launch", title: "Q4 launch" },
  { route: "projects/website", title: "Website" },
  { route: "team", title: "Team" },
  { route: "settings", title: "Settings" },
]

const NATIVE_PAGES: Page[] = [
  { route: "inbox", title: "Inbox" },
  { route: "projects", title: "Projects" },
  { route: "team", title: "Team" },
  { route: "settings", title: "Settings" },
]

const NOTE = "A page of your own goes here."

function webPage({ title }: Page) {
  return [
    "export default function Page() {",
    "  return (",
    '    <div className="flex flex-col gap-2 p-6">',
    `      <h1 className="text-xl font-medium">${title}</h1>`,
    `      <p className="text-muted-foreground">${NOTE}</p>`,
    "    </div>",
    "  )",
    "}",
    "",
  ].join("\n")
}

function startPage(page: Page, routePath: string) {
  return [
    'import { createFileRoute } from "@tanstack/react-router"',
    "",
    `export const Route = createFileRoute("${routePath}")({ component: Page })`,
    "",
    "function Page() {",
    "  return (",
    '    <div className="flex flex-col gap-2 p-6">',
    `      <h1 className="text-xl font-medium">${page.title}</h1>`,
    `      <p className="text-muted-foreground">${NOTE}</p>`,
    "    </div>",
    "  )",
    "}",
    "",
  ].join("\n")
}

function nativePage({ title }: Page) {
  return [
    'import { View } from "react-native"',
    "",
    'import { Text } from "@/components/ui/text"',
    "",
    "export default function Page() {",
    "  return (",
    '    <View className="flex-1 gap-2 p-6">',
    `      <Text className="text-xl font-medium">${title}</Text>`,
    `      <Text className="text-muted-foreground">${NOTE}</Text>`,
    "    </View>",
    "  )",
    "}",
    "",
  ].join("\n")
}

const NATIVE_HOME = nativePage({ route: "index", title: "Home" })

function writeIfMissing(file: string, content: string) {
  if (existsSync(file)) return
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, content)
}

export type RouteEntry = { path: string; file: string }

/** Adds routes to a React Router `app/routes.ts`, or null for another shape. */
export function addRoutesToConfig(source: string, routes: RouteEntry[]) {
  const list = /export default \[([^\]]*)\] satisfies RouteConfig/.exec(source)
  const named = /import \{ type RouteConfig, index \} from/.exec(source)
  if (!list || !named) return null
  const entries = [
    ...(list[1] ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
    ...routes.map((entry) => `route("${entry.path}", "${entry.file}")`),
  ]
  return source
    .replace(named[0], "import { type RouteConfig, index, route } from")
    .replace(
      list[0],
      `export default [\n${entries.map((entry) => `  ${entry},`).join("\n")}\n] satisfies RouteConfig`
    )
}

/** Writes the sample nav's pages for a web framework. Returns manual notes. */
export function writeWebPages(appDir: string, framework: Framework): string[] {
  const resolve = (...parts: string[]) => path.join(appDir, ...parts)
  if (framework === "next") {
    const appRoot = existsSync(resolve("src/app")) ? "src/app" : "app"
    for (const page of WEB_PAGES) {
      writeIfMissing(resolve(appRoot, page.route, "page.tsx"), webPage(page))
    }
    return []
  }
  if (framework === "start") {
    for (const page of WEB_PAGES) {
      const isParent = WEB_PAGES.some((other) =>
        other.route.startsWith(`${page.route}/`)
      )
      writeIfMissing(
        resolve(
          "src/routes",
          isParent ? `${page.route}/index.tsx` : `${page.route}.tsx`
        ),
        startPage(page, isParent ? `/${page.route}/` : `/${page.route}`)
      )
    }
    return []
  }
  if (framework === "react-router") {
    const routes = WEB_PAGES.map((page) => {
      const file = `routes/${page.route.replaceAll("/", ".")}.tsx`
      writeIfMissing(resolve("app", file), webPage(page))
      return { path: page.route, file }
    })
    const configFile = resolve("app/routes.ts")
    if (!existsSync(configFile)) return []
    const next = addRoutesToConfig(readFileSync(configFile, "utf8"), routes)
    if (next) {
      writeFileSync(configFile, next)
      return []
    }
    return ["Add the placeholder pages in app/routes to app/routes.ts."]
  }
  return []
}

/** Writes the native nav's screens, and a plain Home in place of Expo's demo. */
export function writeNativePages(appDir: string) {
  const root = path.join(appDir, "src/app")
  if (!existsSync(root)) return
  writeFileSync(path.join(root, "index.tsx"), NATIVE_HOME)
  for (const page of NATIVE_PAGES) {
    writeIfMissing(path.join(root, `${page.route}.tsx`), nativePage(page))
  }
}
