# Settings recipe

One column of cards, one subject each, in the order people need them. Choices save at once with Undo; only text waits for a button; the danger comes last.

Verified at 390 and 1440px in both themes. Base UI shown.

## Page

```tsx
<AppShellContent size="sm">
  <div className="flex flex-col gap-(--density-24)">
    <AppShellPageTitle>General</AppShellPageTitle>
    <div className="flex flex-col gap-(--density-16)">
      <WorkspaceCard />
      <AddressCard />
      <JoinCard />
      <DeleteCard />
    </div>
  </div>
</AppShellContent>
```

Past about six cards, split by subject into pages under a sidebar group.

## A setting

Name and effect at the start, the smallest fitting control at the end. `inline` controls (a `Switch`, a `ColorPickerPopover`, a small button) stay beside their label at every width: a `Switch` in a `responsive` field stretches on phones and collapses on desktop. Controls with a width of their own (`Select`, `Combobox`, `ToggleGroup`, `NumberField`) use `responsive` and stack on phones; cap them with `max-w-*`.

```tsx
function Setting({
  title,
  description,
  htmlFor,
  inline,
  children,
}: {
  title: string
  description: string
  htmlFor?: string
  inline?: boolean
  children: React.ReactNode
}) {
  return (
    <Field orientation={inline ? "horizontal" : "responsive"}>
      <FieldContent>
        {htmlFor ? (
          <FieldLabel htmlFor={htmlFor}>{title}</FieldLabel>
        ) : (
          <FieldTitle>{title}</FieldTitle>
        )}
        <FieldDescription>{description}</FieldDescription>
      </FieldContent>
      {children}
    </Field>
  )
}

<Card>
  <CardHeader>
    <CardTitle>Workspace</CardTitle>
    <CardDescription>How Northwind appears to members and customers.</CardDescription>
  </CardHeader>
  <CardContent>
    <FieldGroup>
      <Setting title="Time zone" description="Schedules and reports use it." htmlFor="zone">
        <Combobox items={zones} value={zone} onValueChange={saveZone}>
          <ComboboxInput id="zone" className="@md/field-group:max-w-52" />
          <ComboboxContent>
            <ComboboxEmpty>No zones found.</ComboboxEmpty>
            <ComboboxList>
              {(item: string) => <ComboboxItem key={item} value={item}>{item}</ComboboxItem>}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </Setting>
      <Setting title="Week starts on" description="In calendars and weekly reports.">
        <ToggleGroup
          aria-label="Week starts on"
          value={[week]}
          onValueChange={([next]) => {
            if (next === "sun" || next === "mon") saveWeek(next)
          }}
          size="sm"
          spacing={0}
          className="bg-foreground/[0.05]"
        >
          <ToggleGroupItem value="sun">Sunday</ToggleGroupItem>
          <ToggleGroupItem value="mon">Monday</ToggleGroupItem>
        </ToggleGroup>
      </Setting>
      <Setting inline title="Weekly digest" description="Sent to admins on Monday at 8:00 AM." htmlFor="digest">
        <Switch id="digest" checked={hasDigest} onCheckedChange={saveDigest} />
      </Setting>
      <Setting title="Sign people out after" description="Days without activity." htmlFor="idle">
        <NumberField id="idle" value={idleDays} onValueChange={saveIdleDays} min={1} max={90} className="@md/field-group:max-w-36">
          <NumberFieldGroup>
            <NumberFieldDecrement />
            <NumberFieldInput />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>
      </Setting>
    </FieldGroup>
  </CardContent>
</Card>
```

Saving shows the new value at once; if the server refuses, it goes back and an error toast says why. A change worth reversing offers Undo:

```tsx
// Base UI. Radix and React Aria: toast.success(title, { action: { label: "Undo", onClick: undo } })
const id = toast.add({
  title: "Week start saved",
  actionProps: {
    children: "Undo",
    onClick() {
      undo()
      toast.close(id)
    },
  },
})
```

## A text setting

Text has its own card and its own footer, enabled once something changed. The refusal offers a way out.

```tsx
<CardContent>
  <Field data-invalid={isTaken || undefined}>
    <FieldLabel htmlFor="slug" className="sr-only">Workspace address</FieldLabel>
    <InputGroup>
      <InputGroupInput id="slug" value={slug} aria-invalid={isTaken || undefined} onChange={…} />
      <InputGroupAddon align="inline-end">
        <InputGroupText>.relaymail.com</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
    {isTaken ? (
      <FieldError>acme is taken. Try acme-hq or acme-team.</FieldError>
    ) : (
      <FieldDescription>Lowercase letters, numbers and dashes.</FieldDescription>
    )}
  </Field>
</CardContent>
<CardFooter className="justify-end">
  <Button variant="outline" disabled={!isChanged} onClick={reset}>Cancel</Button>
  <Button disabled={!isChanged || isTaken || isSaving} onClick={save}>
    {isSaving && <Spinner data-icon="inline-start" />}
    {isSaving ? "Saving…" : "Save address"}
  </Button>
</CardFooter>
```

## Choice cards

For a setting that changes how the product behaves. Each says its consequence; one that needs a plan stays visible, disabled, with the plan's badge.

```tsx
<RadioGroup value={join} onValueChange={saveJoin}>
  {options.map((option) => (
    <FieldLabel key={option.id} htmlFor={option.id}>
      <Field orientation="horizontal" data-disabled={option.isLocked || undefined}>
        <FieldContent>
          <FieldTitle>
            {option.title}
            {option.tag && <Badge variant="secondary">{option.tag}</Badge>}
          </FieldTitle>
          <FieldDescription className="text-foreground/70">{option.consequence}</FieldDescription>
        </FieldContent>
        <RadioGroupItem value={option.id} id={option.id} disabled={option.isLocked} />
      </Field>
    </FieldLabel>
  ))}
</RadioGroup>
```

## Danger

```tsx
<Card>
  <CardHeader>
    <CardTitle>Delete workspace</CardTitle>
    <CardDescription>Removes 14 members, 248 customers and every campaign.</CardDescription>
  </CardHeader>
  <CardFooter>
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="destructive" />}>Delete workspace…</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Northwind?</AlertDialogTitle>
          <AlertDialogDescription>
            14 members lose access now. Campaigns, customers and reports can't be
            recovered. Two scheduled campaigns won't send.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep workspace</AlertDialogCancel>
          <AlertDialogAction variant="destructive">Delete Northwind</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </CardFooter>
</Card>
```
