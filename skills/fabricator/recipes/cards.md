# Card recipes

Working code for the cards that are not on a dashboard's main path: a meter, an object, a connection and a plan. The KPI row, chart, list and table cards are in [dashboard.md](dashboard.md); a card's states are in [states.md](states.md). Every card in a grid has the same parts in the same order, and a row shares one height (the footer sits on the bottom edge by itself).

Import paths follow `components.json`; icons come from the project's icon package (`@fabricator-ui/icons` by default). Base UI shown: in Radix, `CardLink asChild` wraps the router's link; in React Aria, `CardLink` takes `href` and routes through the `RouterProvider`.

## Contents

- Meter card
- Object card
- Connection card
- Plan card
- Checks

---

## Meter card

The total is the card's value; the Segmented Meter under it keeps its own label and total for screen readers only.

```tsx
<Card>
  <CardHeader>
    <CardTitle>Storage</CardTitle>
    <CardAction>
      <Button variant="outline" size="sm">
        Manage
      </Button>
    </CardAction>
  </CardHeader>
  <CardContent className="flex flex-col gap-(--density-16)">
    <CardValue>
      {formatGigabytes(used)}
      <CardValueCaption>of {formatGigabytes(limit)}</CardValueCaption>
    </CardValue>
    <SegmentedMeter
      label="Storage"
      segments={parts}
      max={limit}
      formatValue={formatGigabytes}
    />
  </CardContent>
</Card>
```

## Object card

One record in a grid: its identity, its name as the link to it, its menu, two lines about it, its people and status. The whole card opens the record; the menu still opens on its own.

```tsx
<Card>
  <CardHeader>
    <CardMedia variant="icon">
      <WorkflowIcon />
    </CardMedia>
    <CardTitle>
      <CardLink render={<Link href={`/agents/${agent.id}`} />}>
        {agent.name}
      </CardLink>
    </CardTitle>
    <CardDescription>{agent.kind}</CardDescription>
    <CardAction>
      <AgentMenu agent={agent} />
    </CardAction>
  </CardHeader>
  <CardContent className="line-clamp-2">{agent.summary}</CardContent>
  <CardFooter className="justify-between">
    <AvatarGroup>
      {/* up to three Avatars and an AvatarGroupCount */}
    </AvatarGroup>
    <Badge variant={agent.isLive ? "success" : "outline"}>
      {agent.isLive ? "Live" : "Paused"}
    </Badge>
  </CardFooter>
</Card>
```

## Connection card

```tsx
<Card size="sm">
  <CardHeader>
    <CardMedia variant="icon">
      <GithubIcon />
    </CardMedia>
    <CardTitle id="github-name">GitHub</CardTitle>
    <CardDescription>Link pull requests to issues</CardDescription>
    <CardAction>
      {isConnected ? (
        <Switch
          checked={isEnabled}
          onCheckedChange={setIsEnabled}
          aria-labelledby="github-name"
        />
      ) : (
        <Button variant="outline" size="sm" onClick={connect}>
          Connect
        </Button>
      )}
    </CardAction>
  </CardHeader>
</Card>
```

## Plan card

The one featured card of its grid on the `tray` variant: who it's for on the shell, the price and what's included on the panel.

```tsx
<Card variant="tray">
  <CardHeader>
    <CardTitle>Team</CardTitle>
    <CardDescription>For teams that ship every week</CardDescription>
    <CardAction>
      <Badge variant="secondary">Popular</Badge>
    </CardAction>
  </CardHeader>
  <CardContent className="flex flex-col gap-(--density-16)">
    <CardValue>
      $24
      <CardValueCaption>per seat a month</CardValueCaption>
    </CardValue>
    <ul className="flex flex-col gap-(--density-8)">{/* what's included */}</ul>
    <Button className="w-full">Choose Team</Button>
  </CardContent>
  <CardFooter>Billed yearly, cancel any time</CardFooter>
</Card>
```

## Checks

- No value is written with classes: every headline figure is a `CardValue`, every change a `Delta` in the header's `CardAction`.
- Only cards that are things carry `CardMedia`; metric, chart and list cards are named by their title alone.
- A card that opens a record has a `CardLink` in its title, and nothing wraps a card in a link or gives it `onClick`.
- At most one `tray` card per grid; `muted` only for secondary cards, empty slots and cards inside a raised surface.
- Cards in a row share a height and their footers line up on the bottom edge.
