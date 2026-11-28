# Dashboard recipe

Working code for the parts of a dashboard and of any page of cards. The rules behind them (the grid, card anatomy, numbers, order) are in [patterns.md](../patterns.md#dashboards); widget states are in [states.md](states.md).

Change the content and keep the layout and alignment classes: they are what line every card up with the page and every row up with its card. Import paths follow `components.json`; icons come from the project's icon package (`@fabricator-ui/icons` by default). Every recipe uses APIs shared by the three web bases; where a base differs (a row as a link, a toggle group's value), the comment says so and the component's docs settle it.

## Contents

- Page
- Page menu
- Toolbar
- Delta
- KPI row
- Chart card
- List card
- Table card
- Checks

---

## Page

The page sits in the App Shell of the `app-shell-03` block (a `Sidebar` with `WorkspaceSwitcher`, `AppNav` and `UserMenu`); this is its main column.

```tsx
<AppShellMain>
  <AppShellHeader>
    <AppShellBreadcrumb
      items={[{ label: "Acme Inc", href: "/" }, { label: "Overview" }]}
    />
    <AppShellHeaderActions
      actions={[
        { id: "share", label: "Share", icon: ShareIcon, onSelect: share },
      ]}
      menuLabel="Dashboard options"
      menu={<DashboardMenu />}
    />
  </AppShellHeader>
  <AppShellContent size="lg">
    <div className="@container flex flex-col gap-(--density-24)">
      <div className="flex flex-col gap-(--density-4)">
        <AppShellPageTitle>Overview</AppShellPageTitle>
        <p className="text-[15px] text-pretty text-muted-foreground">
          Revenue, customers and what needs you today.
        </p>
      </div>
      <DashboardToolbar />
      <div className="grid grid-cols-1 gap-(--density-16) @4xl:grid-cols-12">
        <KpiRow metrics={metrics} className="@4xl:col-span-12" />
        <RevenueCard days={days} className="@4xl:col-span-12" />
        <AttentionCard tasks={tasks} className="@4xl:col-span-6" />
        <TopCustomersCard customers={customers} className="@4xl:col-span-6" />
      </div>
    </div>
  </AppShellContent>
</AppShellMain>
```

## Page menu

Page-wide settings and rare actions live behind the header's ellipsis: `menu` on `AppShellHeaderActions` keeps it on every width, and on phones the header's actions join it as its first group. Base UI shown. Radix: add `onSelect={(event) => event.preventDefault()}` to checkbox and radio items so they keep the menu open, and use `onSelect` on items. React Aria: checkable rows are a `DropdownMenuGroup` with `selectionMode` and `selectedKeys`, sub-menus use `DropdownMenuSubContent`, and items use `onAction`.

```tsx
function DashboardMenu() {
  // View choices persist for the person; put them in the URL when they change
  // what a shared link shows.
  return (
    <>
      <DropdownMenuGroup>
        <DropdownMenuLabel>View</DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={isComparing}
          onCheckedChange={setIsComparing}
        >
          <HistoryIcon />
          Compare with previous period
        </DropdownMenuCheckboxItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <LayoutGridIcon />
            Cards
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {cards.map((card) => (
              <DropdownMenuCheckboxItem
                key={card.id}
                checked={shownCards.has(card.id)}
                onCheckedChange={(isShown) => toggleCard(card.id, isShown)}
              >
                {card.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <RefreshCwIcon />
            Auto-refresh
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={refresh} onValueChange={setRefresh}>
              <DropdownMenuRadioItem value="off">Off</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="1m">
                Every minute
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="5m">
                Every 5 minutes
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem onClick={copyLink}>
          <LinkIcon />
          Copy link
          <DropdownMenuShortcut>⇧⌘C</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportCsv}>
          <DownloadIcon />
          Export as CSV
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem onClick={openSettings}>
          <SlidersHorizontalIcon />
          Dashboard settings…
        </DropdownMenuItem>
        <DropdownMenuItem onClick={resetLayout}>
          <RotateCcwIcon />
          Reset layout
        </DropdownMenuItem>
      </DropdownMenuGroup>
    </>
  )
}
```

"Dashboard settings…" opens a `Sheet` with the fields (currency, fiscal year, targets). A card's own rare options go in that card's ghost "More" menu in its `CardAction`, never here.

## Toolbar

Show up to four period presets with the default `TabsList`. Use a `Select` for more presets or where the full labels do not fit beside the other controls. Keep the same URL value for either control. In Next.js, code that reads the URL needs a Suspense boundary.

```tsx
<Tabs value={period} onValueChange={setPeriod}>
  <div className="flex flex-wrap items-center gap-(--density-8)">
    <TabsList aria-label="Period">
      <TabsTrigger value="7d">7 days</TabsTrigger>
      <TabsTrigger value="30d">30 days</TabsTrigger>
      <TabsTrigger value="90d">90 days</TabsTrigger>
      <TabsTrigger value="12m">12 months</TabsTrigger>
    </TabsList>
    <span className="text-(length:--density-text-12) text-muted-foreground">
      Compared with the previous 30 days
    </span>
    <div className="ms-auto flex items-center gap-(--density-4) text-(length:--density-text-12) text-muted-foreground">
      <span>Updated 2 min ago</span>
      {/* base; radix uses <TooltipTrigger asChild> around the Button */}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="Refresh" />
          }
        >
          <RefreshCwIcon />
        </TooltipTrigger>
        <TooltipContent>Refresh</TooltipContent>
      </Tooltip>
    </div>
  </div>
  <TabsContent value={period}>
    <DashboardCards period={period} />
  </TabsContent>
</Tabs>
```

## Delta

Use the `delta` component (`npx fabricator-ui@latest add delta`); never rebuild it. `change` is in the unit's terms, `null` when there is nothing to compare ("No data", never a zero), `isGoodWhenUp={false}` for churn, cost and latency, `unit="pt"` for rates.

```tsx
<Delta change={12.4} />
<Delta change={-0.4} isGoodWhenUp={false} unit="pt" />
```

## KPI row

A row of stat cards, parted by the gutter alone. Each puts its `Delta` in the header beside the title and its previous value on a line under the number: no dividers, no shared frame. The row's own grid uses the page's 16px gap, so its four cards line up with the quarters below, and goes two by two on phones. Stat cards keep the default size, so each label sits on the same inset as the titles of the cards below.

```tsx
type Metric = {
  label: string
  value: string
  previous: string | null
  change: number | null
  isGoodWhenUp: boolean
  unit?: "%" | "pt" // rates change in points
}

function KpiRow({
  metrics,
  className,
}: {
  metrics: Metric[]
  className?: string
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-(--density-16) @4xl:grid-cols-4",
        className
      )}
    >
      {metrics.map((metric) => (
        <Card key={metric.label}>
          <CardHeader>
            <CardTitle>{metric.label}</CardTitle>
            <CardAction>
              <Delta
                change={metric.change}
                isGoodWhenUp={metric.isGoodWhenUp}
                unit={metric.unit}
              />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-(--density-6)">
            <CardValue>{metric.value}</CardValue>
            <CardValueCaption>
              {metric.previous
                ? `from ${metric.previous}`
                : "First period tracked"}
            </CardValueCaption>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

## Chart card

```tsx
const config = {
  current: { label: "This period" },
  previous: {
    label: "Previous period",
    color: "var(--muted-foreground)",
    dashed: true,
  },
} satisfies ChartConfig

function RevenueCard({ days, className }: { days: Day[]; className?: string }) {
  const [active, setActive] = React.useState<ChartActive<Day> | null>(null)
  const total = days.reduce((sum, day) => sum + day.current, 0)
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Revenue</CardTitle>
        <CardDescription>Daily</CardDescription>
        <CardAction>
          {/* one quiet control: default Tabs (Gross, Net) or a ghost More menu */}
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-(--density-16)">
        <CardValue>
          {formatMoney(active ? active.datum.current : total)}
          <CardValueCaption>
            {active ? active.datum.day : "this period"}
          </CardValueCaption>
        </CardValue>
        <LineChart
          className="h-56 @4xl:h-64"
          data={days}
          index="day"
          config={config}
          label="Daily revenue"
          formatValue={formatMoney}
          onActiveChange={setActive}
        />
      </CardContent>
    </Card>
  )
}
```

## List card

```tsx
<Card className={className}>
  <CardHeader>
    <CardTitle>Needs attention</CardTitle>
    <CardDescription>Ordered by money at risk</CardDescription>
  </CardHeader>
  {/* An ItemGroup lays itself out: rows 8px from the edges, icons on the inset. */}
  <CardContent>
    <ItemGroup>
      {tasks.map((task) => (
        // For a link to where the task is done, wrap a rendered Item in <div role="listitem">.
        <Item role="listitem" key={task.id} size="sm">
          <ItemMedia variant="icon">
            <task.icon />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>{task.title}</ItemTitle>
            <ItemDescription>{task.description}</ItemDescription>
          </ItemContent>
          <ItemActions>
            <ChevronRightIcon className="size-(--density-icon-16) text-muted-foreground" />
          </ItemActions>
        </Item>
      ))}
    </ItemGroup>
  </CardContent>
</Card>
```

## Table card

```tsx
<Card className={className}>
  <CardHeader>
    <CardTitle>Top customers</CardTitle>
    <CardDescription>By monthly recurring revenue</CardDescription>
    <CardAction>
      <Link
        href="/customers"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "-me-3"
        )}
      >
        View all
      </Link>
    </CardAction>
  </CardHeader>
  {/* A Table reaches the card's edges by itself, first and last columns on the inset. */}
  <CardContent>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Customer</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-end">MRR</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map((customer) => (
          <TableRow key={customer.id}>
            <TableCell className="font-medium text-foreground">
              {customer.name}
            </TableCell>
            <TableCell>
              <Badge variant={statusVariants[customer.status]}>
                {customer.status}
              </Badge>
            </TableCell>
            <TableCell className="text-end tabular-nums">
              {formatMoney(customer.mrr)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </CardContent>
</Card>
```

A link styled as a button uses `buttonVariants` on the router's link, which works the same in every base. `-me-3` pulls the small ghost link out by its own padding (small buttons are always 12px across), so its text ends on the inset with the last column.

## Checks

Before calling a dashboard done, look at the running page:

- The page title, the toolbar and every card's outer edge start on one line.
- The header has one ellipsis at every width; no row of its menu wraps, and every action in it leads with an icon.
- Inside each card, the title, the headline value, a list's icons and a table's first column start on the inset; a table's last column ends on it.
- Gutters continue down the page: every row uses the page's one rhythm (quarters or thirds).
- At a 390px width no stat label or value is cut off, and the KPI row is two by two.
- No line parts anything in the layout: the gutter parts the cards, space parts the bands, and only a table keeps its faint row rules.
- In both themes, the only colours are chart series, deltas and status badges.
- No console errors: a Base UI `Button` rendered as a link needs `nativeButton={false}`, which is why the recipes style links with `buttonVariants` instead.
