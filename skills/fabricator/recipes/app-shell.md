# App Shell recipe

A product's frame: one layout, navigation as data, pages that bring their own header and panel. The rules and what breaks them: [app-shell.md](../app-shell.md).

Verified at 390, 834 and 1440px with the sidebar open, collapsed to a rail and behind the page, with a panel docked, floating, full screen and absent, and as a queue. Base UI and Next.js shown; another router changes `Link` and the pathname.

## Navigation

A pure function in a client module. It is the only place a destination is declared.

```tsx
"use client"

export type NavigationInput = {
  role: "admin" | "member"
  counts: { inbox: number }
  projects: { id: string; name: string }[]
}

export function getNavigation(
  { role, counts, projects }: NavigationInput,
  { onNewProject }: { onNewProject?: () => void } = {}
): AppNavGroup[] {
  return [
    {
      id: "work",
      items: [
        { id: "home", label: "Home", href: "/", icon: HomeIcon, match: { exact: true }, mobile: "tab" },
        { id: "inbox", label: "Inbox", href: "/inbox", icon: InboxIcon, badge: counts.inbox || undefined, mobile: "tab" },
        { id: "customers", label: "Customers", href: "/customers", icon: BuildingIcon, mobile: "tab" },
      ],
    },
    {
      id: "projects",
      label: "Projects",
      collapsible: true,
      actions: onNewProject && [{ id: "new-project", label: "New project", icon: PlusIcon, onSelect: onNewProject }],
      items: projects.map((project) => ({
        id: `project-${project.id}`,
        label: project.name,
        href: `/projects/${project.id}`,
        icon: FolderIcon,
      })),
    },
    {
      id: "manage",
      label: "Manage",
      items: [
        ...(role === "admin"
          ? [{ id: "billing", label: "Billing", href: "/billing", icon: CreditCardIcon }]
          : []),
        {
          id: "settings",
          label: "Settings",
          href: "/settings/general",
          icon: SettingsIcon,
          match: { prefixes: ["/settings"] },
          mobile: "tab",
        },
      ],
    },
  ]
}

export const SETTINGS_NAVIGATION: AppNavGroup[] = [
  {
    id: "settings-back",
    items: [{ id: "back", label: "Back to app", href: "/", icon: ArrowLeftIcon, match: { exact: true } }],
  },
  {
    id: "settings-workspace",
    label: "Workspace",
    items: [
      { id: "general", label: "General", href: "/settings/general", icon: SettingsIcon },
      { id: "members", label: "Members", href: "/settings/members", icon: UsersIcon },
      { id: "keys", label: "API keys", href: "/settings/keys", icon: KeyIcon },
    ],
  },
]

/** The router's link, without children: the rows bring their own. */
export function renderNavLink(item: { href?: string }) {
  return <Link href={item.href ?? "/"} />
}
```

Test it as what it is: a member has no Billing, zero shows no badge, every id is unique, and `getActiveNavItem(groups, path)` picks the right row for a detail page.

## Sidebar

```tsx
export function AppSidebar({ navigation, onNewProject }: AppSidebarProps) {
  const pathname = usePathname()
  const isSettings = pathname.startsWith("/settings")
  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-(--density-4)">
          <WorkspaceSwitcher
            workspaces={workspaces}
            activeId={workspace.id}
            onSelect={switchWorkspace}
            switchingTo={switchingTo}
          />
          <SidebarTrigger className="ms-auto shrink-0 group-data-[collapsible=icon]:hidden" />
        </div>
        <SearchRow /> {/* in settings too: it registers ⌘K */}
      </SidebarHeader>
      <SidebarContent>
        <AppNav
          key={isSettings ? "settings" : "app"}
          groups={isSettings ? SETTINGS_NAVIGATION : getNavigation(navigation, { onNewProject })}
          pathname={pathname}
          renderLink={renderNavLink}
        />
      </SidebarContent>
      <SidebarFooter>
        <SeatsMeter />
        <UserMenu user={user}>
          <DropdownMenuGroup>
            <DropdownMenuItem><UserIcon />Profile</DropdownMenuItem>
            <DropdownMenuItem><LogOutIcon />Sign out</DropdownMenuItem>
          </DropdownMenuGroup>
        </UserMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
```

Custom rows are the sidebar's own parts, so the highlight, the rail and the arrow keys include them:

```tsx
function SearchRow() {
  const [isOpen, setOpen] = React.useState(false)
  useShellShortcut(
    { id: "search", keys: "mod+k", label: "Search", allowInInputs: true },
    () => setOpen(true)
  )
  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton icon={SearchIcon} tooltip="Search" onClick={() => setOpen(true)}>
            <span>Search</span>
            <Kbd className="ms-auto group-data-[collapsible=icon]:hidden max-md:hidden">⌘K</Kbd>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <SearchDialog open={isOpen} onOpenChange={setOpen} />
    </>
  )
}

function SeatsMeter() {
  return (
    <section aria-label="Plan usage" className="flex flex-col gap-(--density-6) px-(--density-8) py-(--density-4) text-(length:--density-text-12) group-data-[collapsible=icon]:hidden">
      <span className="flex justify-between text-foreground/70">
        <span>Seats</span>
        <span className="tabular-nums">18 of 20</span>
      </span>
      <Progress value={90} aria-label="Seats used" />
    </section>
  )
}
```

While the rows load, the rest is real:

```tsx
<SidebarGroup>
  <SidebarGroupContent>
    <SidebarMenu>
      {Array.from({ length: 4 }, (_, index) => (
        <SidebarMenuItem key={index}><SidebarMenuSkeleton showIcon /></SidebarMenuItem>
      ))}
    </SidebarMenu>
  </SidebarGroupContent>
</SidebarGroup>
```

## Layout

Rendered once. It ends at the sidebar, so each page can bring its column and its panel.

```tsx
// app/(app)/layout.tsx, a server component
export default async function Layout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  return (
    <AppShell
      storageKey="northwind"
      defaultLayout={readShellLayoutCookie(cookieStore.get("app-shell.northwind.layout")?.value)}
      defaultOpen={cookieStore.get("sidebar_state")?.value !== "false"}
    >
      <AppSidebar navigation={await getNavigationInput()} />
      {children}
      <WorkspaceStatus /> {/* renders AppShellStatusBar; leave it out when nothing is true of the whole workspace */}
    </AppShell>
  )
}
```

## Page frame

A fragment, so its parts stay direct children of the shell.

```tsx
export function PageFrame({ trail, actions, primaryAction, menu, menuLabel, size, panel, children }: PageFrameProps) {
  const pathname = usePathname()
  const navigation = useNavigationInput()
  return (
    <>
      <AppShellMain>
        <AppShellHeader>
          <AppShellBreadcrumb items={trail} renderLink={renderNavLink} />
          <AppShellHeaderActions actions={actions} primaryAction={primaryAction} menu={menu} menuLabel={menuLabel} />
          {panel && <AppShellPanelTrigger panel={panel.id} />}
        </AppShellHeader>
        <AppShellContent size={size}>
          <div className="@container flex flex-col gap-(--density-24) in-data-[size=phone]:pb-20">{children}</div>
        </AppShellContent>
        <AppNavBottomBar groups={getNavigation(navigation)} pathname={pathname} renderLink={renderNavLink} />
      </AppShellMain>
      {panel && (
        <AppShellPanel id={panel.id} label={panel.label} mobile={panel.mobile} defaultOpen={panel.defaultOpen}>
          <AppShellPanelHeader>
            <AppShellPanelTitle>{panel.label}</AppShellPanelTitle>
            <AppShellPanelClose />
          </AppShellPanelHeader>
          <AppShellPanelContent className="p-(--density-16)">{panel.content}</AppShellPanelContent>
        </AppShellPanel>
      )}
    </>
  )
}
```

A page without a size (table, board, editor) renders its content without the wrapper.

## A page with a panel

The state is the page's. The panel's content remounts when it changes from docked to sheet to drawer, so anything typed or selected in it lives above.

```tsx
function ProjectPage({ project }: { project: Project }) {
  const [note, setNote] = React.useState(project.note)
  const details = useShellPanel("details")
  return (
    <PageFrame
      size="lg"
      trail={[{ label: "Projects", href: "/projects" }, { label: project.name }]}
      primaryAction={{ id: "new-task", label: "New task", icon: PlusIcon, shortcut: "c", onSelect: createTask }}
      panel={{
        id: "details",
        label: "Details",
        defaultOpen: true,
        content: <Textarea aria-label="Note" value={note} onChange={(event) => setNote(event.target.value)} />,
      }}
    >
      <AppShellPageTitle>{project.name}</AppShellPageTitle>
      <Button variant="outline" onClick={() => details.setOpen(true)}>Show details</Button>
    </PageFrame>
  )
}
```

A table whose rows open in the panel: the record's id is in the URL, `mobile: "swap"`. Opening sets the URL and calls `setOpen(true)`; closing clears it.

## A queue

Reading and answering are the job, so the list and the open item are panes of the main column: side by side from 672px of column, one at a time below. The panel carries context and stays optional at every width.

```tsx
<AppShellMain>
  <AppShellHeader>
    <AppShellBreadcrumb
      items={open ? [{ label: "Queue", href: "/queue" }, { label: open.subject }] : [{ label: "Queue" }]}
      renderLink={renderNavLink}
    />
    <AppShellHeaderActions />
    {open && <AppShellPanelTrigger panel="customer" />}
  </AppShellHeader>
  <AppShellContent className="overflow-hidden">
    <div className="@container h-full">
      <div className="grid h-full grid-cols-1 grid-rows-[minmax(0,1fr)] @2xl:grid-cols-[18rem_minmax(0,1fr)]">
        <section
          aria-label="Conversations"
          className={cn("overflow-y-auto px-(--density-8) pb-(--density-16)", open && "hidden @2xl:block")}
        >
          {open ? (
            <h2 className="px-(--density-12) py-(--density-8) font-medium">Queue</h2>
          ) : (
            <AppShellPageTitle className="px-(--density-12) py-(--density-8)">Queue</AppShellPageTitle>
          )}
          <ConversationList openId={open?.id} />
        </section>
        <section aria-label="Conversation" className={cn("flex flex-col", !open && "hidden @2xl:flex")}>
          {open ? <Conversation conversation={open} /> : <QueueRest />}
        </section>
      </div>
    </div>
  </AppShellContent>
  {!open && <AppNavBottomBar groups={getNavigation(navigation)} pathname={pathname} renderLink={renderNavLink} />}
</AppShellMain>
{open && (
  <AppShellPanel id="customer" label="Customer" defaultOpen>
    …
  </AppShellPanel>
)}
```

`Conversation` is three rows: a title bar with a `Button` back to `/queue` (`className="@2xl:hidden"`) and the page's `AppShellPageTitle`, the messages (`min-h-0 flex-1 overflow-y-auto`), and the composer with `pb-[max(var(--density-12),env(safe-area-inset-bottom))]`. `QueueRest` is the `Empty` beside the list. Which item is open is the URL, so back, reload and a shared link work at every width; the bottom tabs give way to the composer.

## Several views

```tsx
<AppShellPanel
  id="inspector"
  label="Inspector"
  views={[
    { value: "details", label: "Details", icon: InfoIcon, shortcut: "mod+shift+d" },
    { value: "activity", label: "Activity", icon: ActivityIcon },
  ]}
>
  <AppShellPanelHeader>
    <AppShellPanelTabs />
    <AppShellPanelClose />
  </AppShellPanelHeader>
  <AppShellPanelView value="details" className="p-(--density-16)">…</AppShellPanelView>
  <AppShellPanelView value="activity" className="p-(--density-16)">…</AppShellPanelView>
</AppShellPanel>
```

Each view has an `AppShellPanelView` and an icon: below 360px, and the default is 320, the tabs show only icons.

## Tablets

Collapses to the rail on entering the tablet size, once; the person can open it again.

```tsx
/** Renders nothing. Place it in AppShell, after the sidebar, with collapsible="icon". */
function TabletRail() {
  const { size } = useAppShell()
  const { setOpen } = useSidebar()
  React.useEffect(() => {
    if (size === "tablet") setOpen(false)
  }, [size, setOpen])
  return null
}
```

It saves the collapsed state like any toggle, so an app used on one computer at both sizes may prefer to leave it out.

## Checks

- [probe.js](../probe.js) returns `shellProblems: []` at 1440 and 390, on a page with a panel and one without.
- Going from page to page, the sidebar doesn't remount and the active row moves; settings swaps the rows and back returns them.
- Collapsed, at 834 and at 390 with the sidebar open: every row is readable, nothing is cut, the meter and shortcuts are gone from the rail.
- Type in the panel, resize from 1440 to 900 and back: the text is there. Reload: widths and open panels are kept.
- Each role sees its navigation; a forbidden route isn't in it and isn't reachable by its shortcut.
