import { lazy, Suspense, useEffect, useMemo, useState } from "react"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BoxIcon,
  CheckIcon,
  CodeIcon,
  Grid2X2Icon,
  HomeIcon,
  LayersIcon,
  Settings2Icon,
  SmartphoneIcon,
} from "@fabricator-ui/icons"
import { useTheme } from "next-themes"
import { blocks, catalog, demos } from "virtual:fabricator-explorer"

import {
  getExplorerInstallNames,
  getExplorerNavGroups,
} from "@/lib/component-explorer"
import { COMPONENT_GROUPS } from "@/lib/component-groups"
import { SoundEffects } from "@/styles/base-fabricator/components/sound-effects"
import { AppNav, AppNavBottomBar } from "@/styles/base-fabricator/ui/app-nav"
import {
  AppShell,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
  AppShellStatusBar,
  createLocalStorage,
} from "@/styles/base-fabricator/ui/app-shell"
import { Badge } from "@/styles/base-fabricator/ui/badge"
import { Button } from "@/styles/base-fabricator/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/styles/base-fabricator/ui/card"
import { DensityProvider } from "@/styles/base-fabricator/ui/density"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/styles/base-fabricator/ui/empty"
import { Input } from "@/styles/base-fabricator/ui/input"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/styles/base-fabricator/ui/sidebar"
import { Toaster as SonnerToaster } from "@/styles/base-fabricator/ui/sonner"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/styles/base-fabricator/ui/tabs"
import { ThemeToggle } from "@/styles/base-fabricator/ui/theme-toggle"
import { Toaster } from "@/styles/base-fabricator/ui/toast"

import type { ExplorerHost } from "./explorer-host"
import {
  filterCatalog,
  resolveExplorerRoute,
  writeExplorerRoute,
  type CatalogItem,
} from "./explorer-model"
import { DemoFrame, keepInDemo, LoadingDemo, RenderDemo } from "./render-demo"
import { useSettings } from "./settings"
import { SettingsPage } from "./settings-page"
import { surfaceDemos } from "./surface-demos"
import { useExplorerRoute, useMobileViewport } from "./use-explorer"

const components = catalog.filter((item) => item.type !== "registry:block")
const blockItems = catalog.filter((item) => item.type === "registry:block")
const explorerComponents = components.flatMap((item) => {
  const group = COMPONENT_GROUPS.find((value) => value === item.group)
  return group ? [{ slug: item.name, title: item.title, group }] : []
})
const storage = createLocalStorage()

function CatalogGrid({
  items,
  query,
}: {
  items: CatalogItem[]
  query: string
}) {
  const filtered = filterCatalog(items, query)
  if (filtered.length === 0)
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No components found</EmptyTitle>
          <EmptyDescription>
            Try a component name, a group, or a shorter search.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {filtered.map((item) => (
        <Card key={item.name} size="sm">
          <CardHeader>
            <CardTitle>{item.title}</CardTitle>
            <CardDescription>{item.group}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              className="w-full justify-between"
              variant="ghost"
              render={
                <a
                  href={writeExplorerRoute({
                    page:
                      item.type === "registry:block" ? "block" : "component",
                    name: item.name,
                  })}
                />
              }
            >
              <span>
                Explore {item.type === "registry:block" ? "block" : "component"}
              </span>
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

function Overview({
  host,
  query,
  onQueryChange,
}: {
  host: ExplorerHost
  query: string
  onQueryChange: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex max-w-2xl flex-col items-start gap-4">
        <Badge variant="secondary">Fabricator UI · {host.name}</Badge>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          One design. Every component.
        </h1>
        <p className="max-w-xl leading-relaxed text-muted-foreground">
          The complete Fabricator web library. Explore controls, charts,
          conversations and app layouts with the same tokens and behavior.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button render={<a href="#/components/button" />}>
            Explore components
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
          <Button
            variant="outline"
            render={<a href="#/components/app-shell" />}
          >
            Open App Shell
          </Button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{components.length} component families</CardTitle>
            <CardDescription>The current shared catalog.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              {demos.length + Object.keys(surfaceDemos).length} registry
              scenarios
            </CardTitle>
            <CardDescription>Real examples from the registry.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{blockItems.length} app compositions</CardTitle>
            <CardDescription>Full screens from the registry.</CardDescription>
          </CardHeader>
        </Card>
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight">
            Component library
          </h2>
          <Badge variant="outline">8 groups</Badge>
        </div>
        <Input
          type="search"
          aria-label="Search component library"
          placeholder="Search components or groups…"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className="max-w-xl"
        />
        <CatalogGrid items={components} query={query} />
      </div>
    </div>
  )
}

function ComponentPage({
  item,
  scenario,
}: {
  item: CatalogItem
  scenario?: string
}) {
  const examples = demos
    .filter((demo) => demo.item === item.name)
    .toSorted((first, second) => first.title.localeCompare(second.title))
  const selected =
    examples.find((demo) => demo.id === scenario) ??
    examples.find((demo) => demo.id === `${item.name}-demo`) ??
    examples[0]
  const surfaceDemo = Object.entries(surfaceDemos).find(
    ([name]) => name === item.name
  )?.[1]
  const SurfaceDemo = surfaceDemo
  const webName =
    item.name === "text"
      ? "typography"
      : item.name === "time-wheel"
        ? "time-input"
        : item.name === "fabricator-root"
          ? "density"
          : item.name
  const installNames = getExplorerInstallNames(webName, false)
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-3">
        <Badge variant="secondary">{item.group}</Badge>
        <h1 className="text-3xl font-semibold tracking-tight">{item.title}</h1>
        <p className="text-muted-foreground">
          The web component, compiled from the registry.
        </p>
      </div>
      {selected ? (
        <Tabs
          value={selected.id}
          onValueChange={(id) => {
            window.location.hash = writeExplorerRoute({
              page: "component",
              name: item.name,
              scenario: id,
            })
          }}
        >
          <div className="overflow-x-auto pb-2">
            <TabsList>
              {examples.map((demo) => (
                <TabsTrigger key={demo.id} value={demo.id}>
                  {demo.title}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <TabsContent value={selected.id}>
            {selected.isFullPage ? (
              <DemoFrame
                key={selected.id}
                preview={{ kind: "demo", id: selected.id }}
                title={`${item.title}: ${selected.title}`}
              />
            ) : (
              <div className="demo-stage" onClick={keepInDemo}>
                <RenderDemo demo={selected} />
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : SurfaceDemo ? (
        <div className="demo-stage" onClick={keepInDemo}>
          <SurfaceDemo />
        </div>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No web scenario is registered</EmptyTitle>
            <EmptyDescription>
              This catalog item has no browser example. Its status is recorded
              here rather than replaced with a different component.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      <Card size="sm">
        <CardHeader>
          <CardTitle>Installation</CardTitle>
          <CardDescription>Installs from the web registry.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre
            tabIndex={0}
            aria-label="Installation command"
            className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-xs"
          >
            <code>
              {installNames.length > 0
                ? `bunx --bun fabricator-ui@latest add ${installNames.join(" ")}`
                : "Use semantic HTML with the installed Fabricator typography tokens."}
            </code>
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}

const IconsPage = lazy(() =>
  import("./icons-page").then((module) => ({ default: module.IconsPage }))
)

function App({ host }: { host: ExplorerHost }) {
  const { Services } = host
  const hasServices = Services !== undefined
  const route = resolveExplorerRoute(useExplorerRoute(), { hasServices })
  const [query, setQuery] = useState("")
  const [settings, setSettings, density] = useSettings()
  const { resolvedTheme, setTheme } = useTheme()
  useMobileViewport()
  const groups = useMemo(
    () =>
      getExplorerNavGroups(
        explorerComponents.filter((item) =>
          `${item.title} ${item.group}`
            .toLowerCase()
            .includes(query.toLowerCase())
        ),
        {
          overview: HomeIcon,
          groups: {
            Basics: BoxIcon,
            Forms: CheckIcon,
            Overlays: LayersIcon,
            Structure: Grid2X2Icon,
            Content: CodeIcon,
            Charts: LayersIcon,
            Chat: BoxIcon,
            Advanced: Settings2Icon,
          },
        },
        {
          pages: [
            {
              id: "blocks",
              label: "Blocks",
              href: "/blocks",
              icon: LayersIcon,
            },
            {
              id: "icons",
              label: "Icons",
              href: "/icons",
              icon: Grid2X2Icon,
              mobile: "tab",
            },
            ...(hasServices
              ? [
                  {
                    id: "services",
                    label: "Native services",
                    href: "/services",
                    icon: SmartphoneIcon,
                  },
                ]
              : []),
            {
              id: "settings",
              label: "Settings",
              href: "/settings",
              icon: Settings2Icon,
              mobile: "tab",
            },
          ],
        }
      ),
    [query, hasServices]
  )
  const item =
    route.page === "component"
      ? components.find((component) => component.name === route.name)
      : route.page === "block"
        ? blockItems.find((block) => block.name === route.name)
        : undefined
  const blockDemo =
    route.page === "block"
      ? blocks.find((block) => block.id === route.name)
      : undefined
  const title =
    item?.title ??
    (route.page === "overview"
      ? "Overview"
      : route.page === "services"
        ? "Native services"
        : route.page.charAt(0).toUpperCase() + route.page.slice(1))
  const pathname = writeExplorerRoute(route).slice(1).split("?")[0] ?? "/"
  useEffect(() => {
    document.title = `${title} · Fabricator UI`
  }, [title])
  const renderLink = (link: { href?: string }) => (
    <a href={`#${link.href ?? "/"}`} />
  )

  return (
    <DensityProvider density={density}>
      <Toaster>
        <SoundEffects enabled={settings.sounds} />
        <AppShell
          className="explorer-host"
          data-explorer-route={writeExplorerRoute(route)}
          storage={storage}
          storageKey="fabricator-demo"
          persist
          mobileSidebar="reveal"
          sidebarWidth="17rem"
        >
          <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader className="mobile-sidebar-header">
              <div className="flex items-center gap-3 p-2">
                <BoxIcon className="size-6 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate font-semibold">Fabricator UI</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Component explorer
                  </p>
                </div>
              </div>
              <Input
                aria-label="Filter sidebar components"
                type="search"
                placeholder="Search components…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </SidebarHeader>
            <SidebarContent>
              <AppNav
                groups={groups}
                pathname={pathname}
                renderLink={renderLink}
              />
            </SidebarContent>
            <SidebarFooter>
              <p className="px-3 py-2 text-xs text-muted-foreground">
                {host.status}
              </p>
            </SidebarFooter>
          </Sidebar>
          <AppShellMain>
            <AppShellHeader>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Go back"
                onClick={() => window.history.back()}
              >
                <ArrowLeftIcon />
              </Button>
              <span className="min-w-0 flex-1 truncate font-medium">
                {title}
              </span>
              <ThemeToggle
                theme={resolvedTheme === "dark" ? "dark" : "light"}
                onThemeChange={setTheme}
                variant="circle-blur"
              />
            </AppShellHeader>
            <AppShellContent
              size="lg"
              key={
                route.page === "component" || route.page === "block"
                  ? `${route.page}-${route.name}`
                  : route.page
              }
            >
              {route.page === "overview" && (
                <Overview host={host} query={query} onQueryChange={setQuery} />
              )}
              {route.page === "component" && item && (
                <ComponentPage item={item} scenario={route.scenario} />
              )}
              {route.page === "blocks" && (
                <CatalogGrid items={blockItems} query="" />
              )}
              {route.page === "block" && blockDemo && (
                <DemoFrame
                  preview={{ kind: "block", id: blockDemo.id }}
                  title={blockDemo.title}
                />
              )}
              {route.page === "settings" && (
                <SettingsPage settings={settings} onChange={setSettings} />
              )}
              {route.page === "services" && Services && <Services />}
              {route.page === "icons" && (
                <Suspense fallback={<LoadingDemo />}>
                  <IconsPage />
                </Suspense>
              )}
              {(route.page === "component" || route.page === "block") &&
                !item && (
                  <Empty>
                    <EmptyHeader>
                      <EmptyTitle>Item not found</EmptyTitle>
                      <EmptyDescription>
                        Choose an item from the current component catalog.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
            </AppShellContent>
            <AppNavBottomBar
              groups={groups}
              pathname={pathname}
              renderLink={renderLink}
            />
          </AppShellMain>
          <AppShellStatusBar>
            <span>
              {components.length} components · {blockItems.length} blocks
            </span>
            <span className="ms-auto">Fabricator · {host.name}</span>
          </AppShellStatusBar>
        </AppShell>
        <SonnerToaster />
      </Toaster>
    </DensityProvider>
  )
}

export { App }
