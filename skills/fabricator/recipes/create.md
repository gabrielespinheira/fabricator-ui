# Create recipe

A small create or edit overlay: a dialog on desktop, a bottom drawer on phones, one set of contents and one state. Three asks at most; everything else has a default or waits ([asking.md](../asking.md)).

Verified at 390 and 1440px in both themes. Base UI shown; the Radix and React Aria drawers take other props for the handle.

## The overlay

```tsx
import { useIsMobile } from "@/hooks/use-mobile"

function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  footer: React.ReactNode
  children: React.ReactNode
}) {
  const isMobile = useIsMobile()
  if (isMobile)
    return (
      <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-(--density-16)">{children}</div>
          {/* Reversed, so the primary is on top and Cancel under the thumb's rest. */}
          <DrawerFooter className="flex-col-reverse">{footer}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

## Contents

The form has an `id` so the footer's submit works from outside it. The failure sits at the top of the form with Retry, and the input is kept.

```tsx
<ResponsiveDialog
  open={isOpen}
  onOpenChange={setOpen}
  title="New project"
  description="You can change all of this later."
  footer={
    <>
      <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      <Button type="submit" form="new-project" disabled={!name.trim() || isTaken || isPending}>
        {isPending && <Spinner data-icon="inline-start" />}
        {isPending ? "Creating…" : "Create project"}
      </Button>
    </>
  }
>
  <form id="new-project" onSubmit={submit}>
    <FieldGroup>
      {hasFailed && (
        <Alert variant="error">
          <AlertTitle>The project wasn't created</AlertTitle>
          <AlertDescription>We couldn't reach the server. Nothing you entered is lost.</AlertDescription>
          <AlertAction>
            <Button type="submit" variant="outline" size="sm">Retry</Button>
          </AlertAction>
        </Alert>
      )}
      <Field data-invalid={isTaken || undefined}>
        <FieldLabel htmlFor="name">Name</FieldLabel>
        <Input id="name" autoFocus value={name} aria-invalid={isTaken || undefined} onChange={…} placeholder="Website relaunch" />
        {isTaken && <FieldError>Q4 planning exists already. Open it, or pick another name.</FieldError>}
      </Field>
      <FieldSet>
        <FieldLegend variant="label">Who can see it</FieldLegend>
        <RadioGroup value={access} onValueChange={setAccess} className="gap-(--density-8)">
          {ACCESS.map((option) => (
            <FieldLabel key={option.id} htmlFor={option.id}>
              <Field orientation="horizontal">
                <option.icon className="mt-0.5 size-(--density-icon-16) shrink-0 self-start text-muted-foreground" />
                <FieldContent>
                  <FieldTitle>{option.title}</FieldTitle>
                  <FieldDescription className="text-foreground/70">{option.consequence}</FieldDescription>
                </FieldContent>
                <RadioGroupItem value={option.id} id={option.id} />
              </Field>
            </FieldLabel>
          ))}
        </RadioGroup>
      </FieldSet>
    </FieldGroup>
  </form>
</ResponsiveDialog>
```

- A chosen card is a wash, so its description is `text-foreground/70`.
- Consequences come from real data: "14 people can open and edit it".
- Creating opens the new thing, where the rest is set in place.
- Closing with something typed keeps it for the next opening; nothing to confirm.
- An overlay opened from a menu item or a header action has no trigger to return to: pass `finalFocus` on the content (Base UI; `onCloseAutoFocus` on Radix) pointing at the button that led to it.

## Many values in one box

People, tags, domains, keys: paste a list or type one at a time. `MultiSelect` picks from `items`, so the text being typed is offered as its one item; Enter, Tab, a separator or leaving the field adds it.

```tsx
const split = (text: string) => text.split(/[\s,;]+/).filter(Boolean)

function ValuesField({ id, label, help, placeholder, values, onValuesChange }: ValuesFieldProps) {
  const [draft, setDraft] = React.useState("")
  const add = (text: string) => {
    onValuesChange([...new Set([...values, ...split(text)])])
    setDraft("")
  }
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <MultiSelect
        items={split(draft).slice(0, 1)}
        value={values}
        onValueChange={onValuesChange}
        inputValue={draft}
        onInputValueChange={setDraft}
        open={draft.trim() !== ""}
        onOpenChange={(isOpen) => {
          if (!isOpen && draft.trim()) add(draft)
        }}
      >
        <MultiSelectTrigger>
          <MultiSelectValue />
          <MultiSelectInput
            id={id}
            autoComplete="off"
            inputMode="email"
            enterKeyHint="done"
            placeholder={placeholder}
            onKeyDown={(event) => {
              if (!["Enter", "Tab", ",", ";", " "].includes(event.key) || !draft.trim()) return
              if (event.key !== "Tab") event.preventDefault()
              add(draft)
            }}
            onPaste={(event) => {
              const text = event.clipboardData.getData("text")
              if (split(text).length < 2) return
              event.preventDefault()
              add(`${draft} ${text}`)
            }}
          />
        </MultiSelectTrigger>
        <MultiSelectContent>
          <MultiSelectEmpty>Keep typing.</MultiSelectEmpty>
          <MultiSelectList>
            {(item: string) => <MultiSelectItem key={item} value={item}>Add {item}</MultiSelectItem>}
          </MultiSelectList>
        </MultiSelectContent>
      </MultiSelect>
      <FieldDescription>{help}</FieldDescription>
    </Field>
  )
}
```

Check each value as it lands. The bad ones become `<Item role="listitem" variant="muted" size="sm">` rows in an `ItemGroup` under the field, each with its reason in `text-foreground/70` ("Did you mean northwind.com?") and a Fix button. The primary counts what it will do: "Send 2 invitations".
