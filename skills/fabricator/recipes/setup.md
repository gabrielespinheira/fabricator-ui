# Setup recipe

A draft-first page for anything with many settings before it goes live: a campaign, a workflow, a job post, a deployment. Each decision is one line with its answer; a line opens in place to the few controls that change it; checks and a preview sit beside the lines. Why it works: [asking.md](../asking.md#draft-first).

Verified at 390 and 1440px in both themes. Import paths follow `components.json`. Base UI shown; Radix and React Aria differ in the accordion's value type (Radix takes `type="single"`).

## Page

The draft exists before this page opens: "New campaign" creates it and routes here, or asks for the name in a dialog ([create.md](create.md)). Every change saves itself; the lead says so.

```tsx
<AppShellMain>
  <AppShellHeader>
    <AppShellBreadcrumb
      items={[{ label: "Campaigns", href: "/campaigns" }, { label: campaign.name }]}
      renderLink={(item) => <Link href={item.href ?? "/"} />}
    />
    <AppShellHeaderActions
      actions={[{ id: "test", label: "Send a test", icon: EyeIcon, onSelect: sendTest }]}
      primaryAction={{ id: "review", label: "Review and schedule", icon: SendIcon, onSelect: review }}
      menuLabel="Campaign options"
      menu={<CampaignMenu />}
    />
  </AppShellHeader>
  <AppShellContent size="lg">
    <div className="@container flex flex-col gap-(--density-24) in-data-[size=phone]:pb-20">
      <div className="flex flex-col gap-(--density-4)">
        <div className="flex flex-wrap items-center gap-x-(--density-8) gap-y-(--density-4)">
          <AppShellPageTitle>{campaign.name}</AppShellPageTitle>
          <Badge variant="outline">Draft</Badge>
        </div>
        <p className="text-[15px] text-pretty text-muted-foreground">
          4 of 5 ready. Saved just now.
        </p>
      </div>
      <div className="grid grid-cols-1 items-start gap-(--density-24) @4xl:grid-cols-12">
        <SetupSteps className="@4xl:col-span-7" />
        <div className="flex flex-col gap-(--density-16) @4xl:sticky @4xl:top-0 @4xl:col-span-5">
          <Preview />
          <ChecksCard checks={checks} onFix={openStep} />
        </div>
      </div>
    </div>
  </AppShellContent>
</AppShellMain>
```

`primaryAction` becomes the floating button on phones and shows its icon alone, so always give it one. A paper plane alone doesn't say "Review and schedule", so end the checks card with the same action as a labelled button on phones. When it can't run, keep it enabled and let it open the first blocking check, with a toast naming it.

## Steps

One `AccordionItem` per decision. The trigger is a grid that stacks the answer under the name on narrow columns; `min-w-0` lets the answer truncate.

```tsx
const STEP_ICONS = {
  done: <CircleCheckIcon className="text-success" />,
  todo: <CircleDashedIcon className="text-muted-foreground" />,
  warning: <TriangleAlertIcon className="text-warning" />,
  error: <CircleAlertIcon className="text-destructive" />,
}

const STEP_STATES = { done: "done", todo: "to do", warning: "check this", error: "needs fixing" }

function SetupStep({
  value,
  label,
  answer,
  state,
  children,
}: {
  value: string
  label: string
  answer: string
  state: keyof typeof STEP_ICONS
  children: React.ReactNode
}) {
  return (
    <AccordionItem value={value}>
      <AccordionTrigger className="min-w-0 items-center">
        <span className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-(--density-12) @2xl:grid-cols-[auto_5rem_minmax(0,1fr)] [&>svg]:row-span-2 [&>svg]:size-(--density-icon-16) @2xl:[&>svg]:row-span-1">
          {STEP_ICONS[state]}
          <span>
            {label}
            <span className="sr-only">, {STEP_STATES[state]}</span>
          </span>
          <span className="truncate font-normal text-foreground/70">
            {answer}
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent>{children}</AccordionContent>
    </AccordionItem>
  )
}

<h2 className="sr-only">Setup</h2>
<Accordion value={open} onValueChange={setOpen}>
  <SetupStep value="to" label="To" state="done" answer="Active customers · 12,480 people">
    …
  </SetupStep>
  <SetupStep value="timing" label="Timing" state="done" answer="Thu, Nov 26 at 9:00 AM, Lisbon time">
    <FieldGroup>
      <ToggleGroup
        aria-label="When to send"
        value={[when]}
        onValueChange={([next]) => {
          if (next === "now" || next === "later" || next === "best") setWhen(next)
        }}
        size="sm"
        spacing={0}
        className="bg-foreground/[0.05]"
      >
        <ToggleGroupItem value="now">Now</ToggleGroupItem>
        <ToggleGroupItem value="later">At a set time</ToggleGroupItem>
        <ToggleGroupItem value="best">Best time</ToggleGroupItem>
      </ToggleGroup>
      {when === "later" && (
        <Field>
          <FieldLabel htmlFor="send-at">Date and time</FieldLabel>
          <DatePicker id="send-at" hasTime value={sendAt} onValueChange={setSendAt} />
          <FieldDescription className="text-foreground/70">
            Lisbon time, your workspace's zone. Done by about 9:40 AM.
          </FieldDescription>
        </Field>
      )}
    </FieldGroup>
  </SetupStep>
</Accordion>
```

- Accordion items are a wash, so secondary text on them is `text-foreground/70`; muted grey falls under 4.5:1 there. The hidden `h2` keeps the triggers' `h3`s in order.
- Write the answer as a person would say it, with its consequence: "Testing 2 subjects on 20% of people".
- One to four controls per line. More means the line is two decisions, or it opens a `Sheet`.
- Put optional lines last and prefill them, so they read "done": "Opens and clicks tracked".
- A slider shows what it means beside its label:

```tsx
<Field>
  <FieldTitle className="w-full justify-between">
    Test on
    <span className="text-foreground/70 tabular-nums">
      {split}% · {formatNumber(people * split / 100)} people
    </span>
  </FieldTitle>
  <Slider
    aria-label="Share of people in the test"
    value={[split]}
    onValueChange={(value) => setSplit(Array.isArray(value) ? value[0] : value)}
    min={10}
    max={50}
    step={5}
  />
</Field>
```

## Checks

What blocks, what to look at, what is fine. A row opens the line that fixes it, so it is a button inside its list item.

```tsx
<Card>
  <CardHeader>
    <CardTitle>Before it sends</CardTitle>
    <CardDescription>1 thing to fix, 1 to check</CardDescription>
  </CardHeader>
  <CardContent className="px-[calc(var(--card-spacing)-var(--density-12))]">
    <ItemGroup>
      <div role="listitem">
        <Item
          size="sm"
          render={
            <button type="button" className="text-start" onClick={() => onFix("design")} />
          }
        >
          <ItemMedia variant="icon">
            <CircleAlertIcon className="text-destructive" />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Choose a design</ItemTitle>
            <ItemDescription>The email has no content yet.</ItemDescription>
          </ItemContent>
        </Item>
      </div>
      {/* Warnings use TriangleAlertIcon in text-warning and say "You can send it as it is." */}
    </ItemGroup>
  </CardContent>
</Card>
```

A warning never disables the action. An error does, and the action's press opens it.

## Commit

The primary opens a `ResponsiveDialog` ([create.md](create.md)) that states the reach, the moment and the cost in a `dl`, with the remaining warnings listed and an outline way to test first. Its button repeats the verb: "Schedule for Thu 9:00 AM". Afterwards the same page becomes the object's page: its badge changes, its lines go read only with the reason, and Cancel or Pause replaces the primary.
