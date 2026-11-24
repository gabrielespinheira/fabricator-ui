# State recipes

Code for the states in [states.md](../states.md). Verified at 390 and 1440px in both themes. Base UI shown.

## A card's content at one height

The card's header is always real. Its content keeps one height through every state, so nothing on the page moves.

```tsx
type Load<T> =
  | { status: "loading" }
  | { status: "error"; retry: () => void }
  | { status: "denied"; owner: string }
  | { status: "ready"; data: T }

function CardState<T>({
  load,
  label,
  className,
  empty,
  children,
}: {
  load: Load<T[]>
  label: string
  /** The content's height, such as "min-h-44". */
  className: string
  empty: React.ReactNode
  children: (data: T[]) => React.ReactNode
}) {
  switch (load.status) {
    case "loading":
      return <Skeleton role="status" aria-busy aria-label={`Loading ${label}`} className={className} />
    case "error":
      return (
        <div className={className}>
          <Alert variant="error">
            <TriangleAlertIcon />
            <AlertTitle>Couldn't load {label}</AlertTitle>
            <AlertDescription>The rest of this page is up to date.</AlertDescription>
            <AlertAction>
              <Button variant="outline" size="sm" onClick={load.retry}>Retry</Button>
            </AlertAction>
          </Alert>
        </div>
      )
    case "denied":
      return (
        <Empty className={className}>
          <EmptyHeader>
            <EmptyMedia variant="icon"><LockIcon /></EmptyMedia>
            <EmptyTitle>Billing is restricted</EmptyTitle>
            <EmptyDescription>{load.owner} can give you access.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent><Button variant="outline">Request access</Button></EmptyContent>
        </Empty>
      )
    case "ready":
      return (
        <div className={className}>
          {load.data.length === 0 ? empty : children(load.data)}
        </div>
      )
  }
}
```

Charts take `loading` and `empty` themselves; `DataTable` draws its own.

## Page alerts

First row of the body, full width, only while true. `contrast="high"` for the one that must be dealt with. `AlertAction` sits in the corner over the text's end padding, so its label is one or two words; a longer one goes in a button row under the description.

```tsx
<Alert variant="warning" contrast="high">
  <TriangleAlertIcon />
  <AlertTitle>9,120 of 10,000 emails sent this month</AlertTitle>
  <AlertDescription>Sending stops at the limit. At this pace you reach it on Thursday.</AlertDescription>
  <AlertAction><Button variant="outline" size="sm">See plans</Button></AlertAction>
</Alert>

<Alert>
  <CloudOffIcon />
  <AlertTitle>You're offline</AlertTitle>
  <AlertDescription>Showing data from 10:42 AM. Edits are kept here and sync when you reconnect.</AlertDescription>
</Alert>
```

## A warning on a field

Worth knowing, not wrong: no `data-invalid`, no red, nothing disabled.

```tsx
<Field>
  <FieldLabel htmlFor="subject">Subject</FieldLabel>
  <Input id="subject" aria-describedby="subject-note" … />
  <FieldDescription id="subject-note" className="flex items-center gap-(--density-6)">
    <TriangleAlertIcon className="size-(--density-icon-14) shrink-0 text-warning" />
    63 characters. Phones show about 45.
  </FieldDescription>
</Field>
```

## A long job

```tsx
<Card>
  <CardHeader>
    <CardTitle>Importing contacts</CardTitle>
    <CardDescription>You can leave this page.</CardDescription>
    <CardAction>
      <Button variant="ghost" size="sm" className="-me-3">Cancel</Button>
    </CardAction>
  </CardHeader>
  <CardContent>
    <Progress value={62} aria-label="Importing contacts">
      <span className="text-(length:--density-text-12) text-muted-foreground tabular-nums">
        744 of 1,200 rows · about 2 min left
      </span>
    </Progress>
  </CardContent>
</Card>
```

## Partly done

The split is the title; each failure is a row with its reason and its fix; the rest is one line.

```tsx
<Card>
  <CardHeader>
    <CardTitle>18 of 20 invitations sent</CardTitle>
    <CardDescription>2 need you</CardDescription>
  </CardHeader>
  <CardContent className="px-[calc(var(--card-spacing)-var(--density-12))]">
    <ItemGroup>
      <Item role="listitem" size="sm">
        <ItemMedia variant="icon"><CircleXIcon className="text-destructive" /></ItemMedia>
        <ItemContent>
          <ItemTitle>jonas@northwnd.com</ItemTitle>
          <ItemDescription>That domain doesn't exist. Did you mean northwind.com?</ItemDescription>
        </ItemContent>
        <ItemActions><Button variant="outline" size="sm">Fix</Button></ItemActions>
      </Item>
      <Item role="listitem" size="sm">
        <ItemMedia variant="icon"><CircleCheckIcon className="text-success" /></ItemMedia>
        <ItemContent>
          <ItemTitle>18 people</ItemTitle>
          <ItemDescription>Invitations expire on Dec 1.</ItemDescription>
        </ItemContent>
      </Item>
    </ItemGroup>
  </CardContent>
</Card>
```

## Act, then Undo

```tsx
function archive(project: Project) {
  const previous = projects
  setProjects(projects.filter(({ id }) => id !== project.id)) // the result, at once
  // Base UI. Radix and React Aria: toast("Archived", { action: { label: "Undo", onClick } })
  const id = toast.add({
    title: `${project.name} archived`,
    actionProps: {
      children: "Undo",
      onClick() {
        setProjects(previous)
        toast.close(id)
      },
    },
  })
  save(project).catch(() => {
    setProjects(previous)
    toast.close(id)
    toast.add({
      type: "error",
      title: `${project.name} wasn't archived`,
      description: "The server didn't answer. Nothing changed.",
      actionProps: { children: "Retry", onClick: () => archive(project) },
    })
  })
}
```

## A conflict

```tsx
<AlertDialog open={hasConflict}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Priya changed this 2 minutes ago</AlertDialogTitle>
      <AlertDialogDescription>
        They set the price to $49. You set it to $45.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel onClick={takeTheirs}>Use $49</AlertDialogCancel>
      <AlertDialogAction onClick={keepMine}>Keep $45</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```
