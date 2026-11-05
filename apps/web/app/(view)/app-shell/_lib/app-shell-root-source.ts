// The small file between a project's router and its App Shell layout: the
// current path, and the router's link so moving between pages doesn't reload them.

import type { Framework } from "@fabricator-ui/setup"

function rootComponent(
  imports: string[],
  body: string[],
  { isClient = false }: { isClient?: boolean } = {}
) {
  return [
    ...(isClient ? ['"use client"', ""] : []),
    'import * as React from "react"',
    ...imports,
    "",
    'import { AppShellLayout } from "./app-shell-layout"',
    "",
    "export function AppShellRoot({ children }: { children: React.ReactNode }) {",
    ...body,
    "}",
    "",
  ].join("\n")
}

const ROOTS: Partial<Record<Framework, string>> = {
  next: rootComponent(
    [
      'import Link from "next/link"',
      'import { usePathname } from "next/navigation"',
    ],
    [
      "  const pathname = usePathname()",
      "  return (",
      "    <AppShellLayout",
      "      pathname={pathname}",
      '      renderLink={(item) => <Link href={item.href ?? "/"} />}',
      "    >",
      "      {children}",
      "    </AppShellLayout>",
      "  )",
    ],
    { isClient: true }
  ),
  "react-router": rootComponent(
    ['import { Link, useLocation } from "react-router"'],
    [
      "  const { pathname } = useLocation()",
      "  return (",
      "    <AppShellLayout",
      "      pathname={pathname}",
      '      renderLink={(item) => <Link to={item.href ?? "/"} />}',
      "    >",
      "      {children}",
      "    </AppShellLayout>",
      "  )",
    ]
  ),
  start: rootComponent(
    ['import { useLocation, useRouter } from "@tanstack/react-router"'],
    [
      "  const router = useRouter()",
      "  const pathname = useLocation({ select: (location) => location.pathname })",
      "  return (",
      "    <AppShellLayout",
      "      pathname={pathname}",
      "      renderLink={(item) => (",
      "        <a",
      "          href={item.href}",
      "          onClick={(event) => {",
      "            event.preventDefault()",
      '            router.history.push(item.href ?? "/")',
      "          }}",
      "        />",
      "      )}",
      "    >",
      "      {children}",
      "    </AppShellLayout>",
      "  )",
    ]
  ),
  // The Vite template has no router: the path is state, kept in the address.
  vite: rootComponent(
    [],
    [
      "  const [pathname, setPathname] = React.useState(window.location.pathname)",
      "",
      "  React.useEffect(() => {",
      "    const onPopState = () => setPathname(window.location.pathname)",
      '    window.addEventListener("popstate", onPopState)',
      '    return () => window.removeEventListener("popstate", onPopState)',
      "  }, [])",
      "",
      "  return (",
      "    <AppShellLayout",
      "      pathname={pathname}",
      "      renderLink={(item) => (",
      "        <a",
      "          href={item.href}",
      "          onClick={(event) => {",
      "            event.preventDefault()",
      '            const href = item.href ?? "/"',
      '            window.history.pushState(null, "", href)',
      "            setPathname(href)",
      "          }}",
      "        />",
      "      )}",
      "    >",
      "      {children}",
      "    </AppShellLayout>",
      "  )",
    ]
  ),
}

/** Undefined where the shell isn't mounted for you: Astro and Laravel, for now. */
export function buildAppShellRoot(framework: Framework) {
  return ROOTS[framework]
}

/** Expo Router's version, for the native shell. */
export const NATIVE_APP_SHELL_ROOT = [
  'import * as React from "react"',
  'import { router, usePathname, type Href } from "expo-router"',
  "",
  'import { AppShellLayout } from "./app-shell-layout"',
  "",
  "export function AppShellRoot({ children }: { children: React.ReactNode }) {",
  "  const pathname = usePathname()",
  "  return (",
  "    <AppShellLayout",
  "      pathname={pathname}",
  "      onNavigate={(item) => {",
  "        if (item.href) router.push(item.href as Href)",
  "      }}",
  "    >",
  "      {children}",
  "    </AppShellLayout>",
  "  )",
  "}",
  "",
].join("\n")
