import { describe, expect, it } from "vitest"

import { addRoutesToConfig } from "./pages"
import { mountAstroRoot, mountNativeRoot, mountWebRoot } from "./root"

const NEXT_LAYOUT = `import { Geist } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
`

const VITE_MAIN = `import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
)
`

const START_ROOT = `import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"

import appCss from "../styles.css?url"

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
`

const ROUTER_ROOT = `import { Outlet } from "react-router"

import type { Route } from "./+types/root"
import "./app.css"

export default function App() {
  return <Outlet />
}
`

const both = { shell: true, sounds: true }

describe("mountWebRoot", () => {
  it("wraps Next's children and adds the sounds", () => {
    const out = mountWebRoot(NEXT_LAYOUT, "next", both)
    expect(out).toContain(
      'import { AppShellRoot } from "@/components/app-shell-root"'
    )
    expect(out).toContain(
      'import { SoundEffects } from "@/components/sound-effects"'
    )
    expect(out).toContain(`        <ThemeProvider>
          <AppShellRoot>{children}</AppShellRoot>
          <SoundEffects />
        </ThemeProvider>`)
  })

  it("adds only what was asked for", () => {
    const shell = mountWebRoot(NEXT_LAYOUT, "next", {
      shell: true,
      sounds: false,
    })
    expect(shell).toContain("<AppShellRoot>{children}</AppShellRoot>")
    expect(shell).not.toContain("SoundEffects")
    const sounds = mountWebRoot(NEXT_LAYOUT, "next", {
      shell: false,
      sounds: true,
    })
    expect(sounds).not.toContain("AppShellRoot")
    expect(sounds).toContain("{children}\n          <SoundEffects />")
  })

  it("wraps Vite's app", () => {
    const out = mountWebRoot(VITE_MAIN, "vite", both)
    expect(out).toContain(`      <AppShellRoot>
        <App />
      </AppShellRoot>
      <SoundEffects />`)
  })

  it("wraps TanStack Start's document", () => {
    const out = mountWebRoot(START_ROOT, "start", both)
    expect(out).toContain(`        <AppShellRoot>{children}</AppShellRoot>
        <SoundEffects />
        <Scripts />`)
  })

  it("wraps React Router's outlet", () => {
    const out = mountWebRoot(ROUTER_ROOT, "react-router", both)
    expect(out).toContain(`  return (
    <>
      <AppShellRoot>
        <Outlet />
      </AppShellRoot>
      <SoundEffects />
    </>
  )`)
  })

  it("imports through the project's own alias", () => {
    const out = mountWebRoot(ROUTER_ROOT, "react-router", {
      ...both,
      componentsAlias: "~/components",
    })
    expect(out).toContain('from "~/components/app-shell-root"')
    expect(out).toContain('from "~/components/sound-effects"')
  })

  it("puts imports after the last one", () => {
    const out = mountWebRoot(ROUTER_ROOT, "react-router", both) ?? ""
    expect(out.indexOf('import "./app.css"')).toBeLessThan(
      out.indexOf("AppShellRoot")
    )
  })

  it("does nothing the second time", () => {
    const once = mountWebRoot(NEXT_LAYOUT, "next", both) ?? ""
    expect(mountWebRoot(once, "next", both)).toBe(once)
  })

  it("leaves a file it doesn't recognise alone", () => {
    expect(
      mountWebRoot(
        "export default function A() { return null }\n",
        "next",
        both
      )
    ).toBeNull()
    expect(
      mountWebRoot(
        NEXT_LAYOUT.replace(
          "<ThemeProvider>{children}</ThemeProvider>",
          "<A>{children}</A><B>{children}</B>"
        ),
        "next",
        both
      )
    ).toBeNull()
  })

  it("has no shape for the frameworks it doesn't mount", () => {
    expect(mountWebRoot(NEXT_LAYOUT, "laravel", both)).toBeNull()
  })
})

const ASTRO = `---
import "@workspace/ui/globals.css"
---

<html lang="en">
  <body>
    <slot />
  </body>
</html>
`

describe("mountAstroRoot", () => {
  it("adds the sounds as an island before the body ends", () => {
    const out = mountAstroRoot(ASTRO)
    expect(out).toContain(
      '---\nimport "@workspace/ui/globals.css"\nimport { SoundEffects } from "@/components/sound-effects"\n---'
    )
    expect(out).toContain(
      "    <slot />\n    <SoundEffects client:load />\n  </body>"
    )
  })

  it("does nothing the second time, and refuses other shapes", () => {
    const once = mountAstroRoot(ASTRO) ?? ""
    expect(mountAstroRoot(once)).toBe(once)
    expect(mountAstroRoot("<div />\n")).toBeNull()
  })
})

describe("mountNativeRoot", () => {
  const TEMPLATE = `import AppTabs from '@/components/app-tabs';

export default function TabLayout() {
  return <AppTabs />;
}
`
  const options = { shell: true, sounds: true, cssImport: "../global.css" }

  it("replaces Expo's demo layout", () => {
    const out = mountNativeRoot(TEMPLATE, options)
    expect(out).toContain('import "../global.css"')
    expect(out).toContain('from "expo-router"')
    expect(out).toContain(`    <FabricatorRoot>
      <SoundEffects>
        <AppShellRoot>
          <Slot />
        </AppShellRoot>
      </SoundEffects>
    </FabricatorRoot>`)
    expect(out).not.toContain("AppTabs")
  })

  it("leaves out what wasn't asked for", () => {
    const out = mountNativeRoot(TEMPLATE, {
      ...options,
      shell: false,
      sounds: false,
    })
    expect(out).toContain(`    <FabricatorRoot>
      <Slot />
    </FabricatorRoot>`)
  })

  it("wraps an app's own navigator", () => {
    const out = mountNativeRoot(
      `import { Stack } from "expo-router"

export default function Layout() {
  return <Stack />
}
`,
      options
    )
    expect(out).toContain('import "../global.css"')
    expect(out).toContain(`        <AppShellRoot>
          <Stack />
        </AppShellRoot>`)
  })

  it("does nothing the second time, and refuses other shapes", () => {
    const once = mountNativeRoot(TEMPLATE, options) ?? ""
    expect(mountNativeRoot(once, options)).toBe(once)
    expect(
      mountNativeRoot("export default function A() {}\n", options)
    ).toBeNull()
  })
})

describe("addRoutesToConfig", () => {
  const ROUTES = `import { type RouteConfig, index } from "@react-router/dev/routes"

export default [index("routes/home.tsx")] satisfies RouteConfig
`
  it("adds a route for each page", () => {
    const out = addRoutesToConfig(ROUTES, [
      { path: "inbox", file: "routes/inbox.tsx" },
      { path: "projects/launch", file: "routes/projects.launch.tsx" },
    ])
    expect(out).toContain(
      'import { type RouteConfig, index, route } from "@react-router/dev/routes"'
    )
    expect(out).toContain(`export default [
  index("routes/home.tsx"),
  route("inbox", "routes/inbox.tsx"),
  route("projects/launch", "routes/projects.launch.tsx"),
] satisfies RouteConfig`)
  })

  it("refuses other shapes", () => {
    expect(addRoutesToConfig("export default []\n", [])).toBeNull()
  })
})
