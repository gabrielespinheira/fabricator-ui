# List recipe

Records with views, search, filters, selection and a detail panel, from 390px up. One table serves every width: columns fold under the name instead of scrolling sideways. Past about a hundred rows, or when people sort, filter and edit all day, use `DataTable` with the same toolbar order.

Verified at 390 and 1440px in both themes, with the panel open and closed. Base UI shown.

## Page

```tsx
<AppShellMain>
  <AppShellHeader>
    <AppShellBreadcrumb items={[{ label: "Customers" }]} />
    <AppShellHeaderActions
      primaryAction={{ id: "add", label: "Add customer", icon: PlusIcon, onSelect: add }}
      menuLabel="Customer options"
      menu={<ListMenu />}
    />
    <AppShellPanelTrigger panel="customer" />
  </AppShellHeader>
  <AppShellContent size="lg">
    {/* The padding keeps the phone's floating primary off the last row. */}
    <div className="@container flex flex-col gap-(--density-24) in-data-[size=phone]:pb-20">
      <div className="flex flex-col gap-(--density-4)">
        <AppShellPageTitle>Customers</AppShellPageTitle>
        <p className="text-[15px] text-pretty text-muted-foreground">
          1 account at risk, $12,400 MRR riding on it.
        </p>
      </div>
      {/* No toolbar over an account with no customers. */}
      {total > 0 && (selected.size > 0 ? <SelectionBar /> : <Toolbar />)}
      <ListBody />
    </div>
  </AppShellContent>
</AppShellMain>

<AppShellPanel id="customer" label="Customer">
  <AppShellPanelHeader>
    <AppShellPanelTitle>Customer</AppShellPanelTitle>
    <AppShellPanelClose />
  </AppShellPanelHeader>
  <AppShellPanelContent>
    <CustomerDetail />
  </AppShellPanelContent>
</AppShellPanel>
```

Opening a row sets the record in the URL and calls `useShellPanel("customer").setOpen(true)`. The panel docks on desktop, floats on tablets and is a drawer on phones; for a queue people clear, use `mobile="swap"`.

## Toolbar

View first, then search and filters; the count ends it. Filters are outline menus that show how many are on, and one Clear removes everything.

```tsx
<div className="flex flex-wrap items-center gap-(--density-8)">
  <Tabs value={view} onValueChange={setView}>
    <TabsList aria-label="View">
      <TabsTrigger value="all">All</TabsTrigger>
      <TabsTrigger value="risk">At risk</TabsTrigger>
      <TabsTrigger value="trial">Trials</TabsTrigger>
    </TabsList>
  </Tabs>
  <Search collapsible={false} width="11rem" placeholder="Search customers" value={query} onValueChange={setQuery} />
  <DropdownMenu>
    <DropdownMenuTrigger render={<Button variant="outline" />}>
      <ListFilterIcon data-icon="inline-start" />
      Status{statuses.size > 0 && <span className="tabular-nums">· {statuses.size}</span>}
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start">
      <DropdownMenuGroup>
        <DropdownMenuLabel>Status</DropdownMenuLabel>
        {/* DropdownMenuCheckboxItem per status */}
      </DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu>
  {isFiltered && (
    <Button variant="ghost" onClick={clear}>
      <XIcon data-icon="inline-start" />
      Clear
    </Button>
  )}
  {/* Only while rows are on screen: over an error or a skeleton the count is false. */}
  {hasRows && (
    <span aria-live="polite" className="ms-auto text-(length:--density-text-12) text-muted-foreground tabular-nums">
      {rows.length} of {total}
    </span>
  )}
</div>
```

Past three filters, phones get one "Filters" button opening a `Drawer`. The selection bar takes the toolbar's place and height:

```tsx
<div className="flex min-h-(--density-36) flex-wrap items-center gap-(--density-8)">
  <span aria-live="polite" className="font-medium text-foreground tabular-nums">2 selected</span>
  <Button variant="outline" size="sm"><TagIcon data-icon="inline-start" />Change owner</Button>
  <Button variant="outline" size="sm"><DownloadIcon data-icon="inline-start" />Export</Button>
  <Button variant="destructive" size="sm"><TrashIcon data-icon="inline-start" />Delete…</Button>
  <Button variant="ghost" size="sm" className="ms-auto" onClick={clearSelection}>Clear</Button>
</div>
```

## Table

The negative margin lets the row's wash bleed past the page's edge while its text stays on it. The name cell takes the slack (`w-full max-w-0`) and truncates; the status moves under the name when its column folds.

```tsx
<div className="-mx-(--density-12)">
  <Table aria-label="Customers">
    <TableHeader>
      <TableRow>
        <TableHead className="w-8">
          <Checkbox
            aria-label="Select all"
            checked={isAllSelected}
            indeterminate={!isAllSelected && selected.size > 0}
            onCheckedChange={selectAll}
          />
        </TableHead>
        <TableHead>Customer</TableHead>
        <TableHead className="hidden @lg:table-cell">Status</TableHead>
        <TableHead className="hidden @3xl:table-cell">Owner</TableHead>
        <TableHead className="hidden @2xl:table-cell">Last seen</TableHead>
        <TableHead className="text-end">MRR</TableHead>
        <TableHead className="w-10"><span className="sr-only">Actions</span></TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.map((row) => (
        <TableRow
          key={row.id}
          data-state={selected.has(row.id) ? "selected" : undefined}
          // The selected wash is too dark for muted text.
          className="data-[state=selected]:[&_button]:text-foreground data-[state=selected]:[&>td]:text-foreground"
        >
          <TableCell>
            <Checkbox aria-label={`Select ${row.name}`} checked={selected.has(row.id)} onCheckedChange={…} />
          </TableCell>
          <TableCell className="w-full max-w-0 min-w-36">
            <button
              type="button"
              onClick={() => open(row.id)}
              className="flex w-full min-w-0 cursor-pointer items-center gap-(--density-10) rounded-md text-start outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <Avatar><AvatarFallback style={getAvatarStyle(row.id)}>{row.initials}</AvatarFallback></Avatar>
              <span className="flex min-w-0 flex-col items-start gap-(--density-4)">
                <span className="max-w-full truncate font-medium text-foreground">{row.name}</span>
                <span className="flex items-center gap-(--density-8) text-(length:--density-text-12) @lg:hidden">
                  <StatusMark status={row.status} />
                  <span className="text-muted-foreground">{row.lastSeen}</span>
                </span>
              </span>
            </button>
          </TableCell>
          <TableCell className="hidden @lg:table-cell">
            <StatusMark status={row.status} />
          </TableCell>
          <TableCell className="hidden @3xl:table-cell"><OwnerPicker row={row} /></TableCell>
          <TableCell className="hidden @2xl:table-cell">{row.lastSeen}</TableCell>
          <TableCell className="text-end text-foreground tabular-nums">
            {row.mrr ? formatMoney(row.mrr) : <span className="text-muted-foreground">None</span>}
          </TableCell>
          <TableCell className="text-end"><RowMenu row={row} /></TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

- `getAvatarStyle` gives a record without a photo its own hue, the same everywhere ([components.md](../components.md#showing-records)).
- One status map per product, used by every screen. The normal state is a dot and its word; a badge is for what stands out, so the exceptions are what the eye finds:

```tsx
const STATUS = {
  active: { label: "Active", dot: "bg-success" },
  trial: { label: "Trial", variant: "info" },
  risk: { label: "At risk", variant: "warning" },
  churned: { label: "Churned", variant: "outline" },
} as const

function StatusMark({ status }: { status: keyof typeof STATUS }) {
  const mark = STATUS[status]
  if ("variant" in mark) return <Badge variant={mark.variant}>{mark.label}</Badge>
  return (
    <span className="inline-flex items-center gap-(--density-6) text-foreground">
      <span aria-hidden className={cn("size-2 shrink-0 rounded-full", mark.dot)} />
      {mark.label}
    </span>
  )
}
```

- What needs someone sorts first, until they choose another order.
- A value people change often is edited in its cell and saves at once. It rests as text, because a column of framed selects is the loudest thing on the page: a ghost trigger, pulled out by its padding so the label sits on the column's line.

```tsx
<DropdownMenu>
  <DropdownMenuTrigger
    render={<Button variant="ghost" size="sm" className="-ms-3" aria-label={`Owner of ${row.name}: ${row.owner}`} />}
  >
    {row.owner}
    <ChevronDownIcon data-icon="inline-end" />
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuRadioGroup value={row.owner} onValueChange={(owner) => changeOwner(row, owner)}>
      {owners.map((owner) => (
        <DropdownMenuRadioItem key={owner} value={owner}>{owner}</DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  </DropdownMenuContent>
</DropdownMenu>
```

- A value someone can't change is the same text without the chevron, with the reason under it in a caption ("Set by Okta").
- The row's menu is also its `ContextMenu`. With a router, the name is a link.

## Body states

```tsx
if (isLoading)
  return (
    <div role="status" aria-busy aria-label="Loading customers" className="flex flex-col gap-(--density-8)">
      {Array.from({ length: 8 }, (_, index) => (
        <Skeleton key={index} className="h-(--density-48)" />
      ))}
    </div>
  )
if (error)
  return (
    <Alert variant="error">
      <TriangleAlertIcon />
      <AlertTitle>Customers didn't load</AlertTitle>
      <AlertDescription>The server took too long to answer. Your filters are kept.</AlertDescription>
      <AlertAction><Button variant="outline" size="sm" onClick={retry}>Retry</Button></AlertAction>
    </Alert>
  )
if (total === 0) return <FirstUse /> // Empty: what will be here, why, the primary, an import
if (rows.length === 0)
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon"><SearchXIcon /></EmptyMedia>
        <EmptyTitle>Nothing matches "{query}"</EmptyTitle>
        <EmptyDescription>Try a shorter name, or clear the filters.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" onClick={clear}>Clear search and filters</Button>
      </EmptyContent>
    </Empty>
  )
```

A refresh keeps the rows on screen, dimmed. `DataTable` draws all of these itself.

## Detail panel

```tsx
<div className="flex flex-col gap-(--density-24) p-(--density-16)">
  <div className="flex items-center gap-(--density-12)">
    <Avatar size="lg"><AvatarFallback>{customer.initials}</AvatarFallback></Avatar>
    <div className="flex min-w-0 flex-col items-start gap-(--density-4)">
      <span className="text-(length:--density-text-14) font-medium text-pretty text-foreground">{customer.name}</span>
      <StatusMark status={customer.status} />
    </div>
  </div>
  <dl className="grid grid-cols-[auto_1fr] gap-x-(--density-16) gap-y-(--density-12) [&>dd]:text-end [&>dd]:text-foreground [&>dt]:text-muted-foreground">
    <dt>MRR</dt><dd className="tabular-nums">{formatMoney(customer.mrr)}</dd>
    <dt>Owner</dt><dd>{customer.owner}</dd>
    <dt>Last seen</dt><dd>{customer.lastSeen}</dd>
  </dl>
</div>
```
