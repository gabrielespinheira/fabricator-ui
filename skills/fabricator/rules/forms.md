# Fields

How controls are written. Which control, how many, and whether to ask at all: [asking.md](../asking.md).

## Contents

- Field, FieldGroup, FieldSet
- Orientation
- Input groups
- Validation
- Warnings
- Choice cards
- Disabled and read only
- With a form library

---

## Field, FieldGroup, FieldSet

`FieldGroup` spaces fields, `Field` holds one control with its label, help and error, `FieldSet` + `FieldLegend` names a group of related controls. Never a `div` with `space-y-*`.

```tsx
<FieldGroup>
  <Field>
    <FieldLabel htmlFor="email">Work email</FieldLabel>
    <Input id="email" type="email" autoComplete="email" inputMode="email" />
    <FieldDescription>Invoices go here.</FieldDescription>
  </Field>
  <FieldSet>
    <FieldLegend variant="label">Notify me about</FieldLegend>
    <FieldGroup className="gap-(--density-12)">
      <Field orientation="horizontal">
        <Checkbox id="mentions" />
        <FieldLabel htmlFor="mentions" className="font-normal">Mentions</FieldLabel>
      </Field>
    </FieldGroup>
  </FieldSet>
</FieldGroup>
```

A hidden label is `<FieldLabel className="sr-only">`; a placeholder is never the label. A control without an `id` target (`Tabs`, a `Slider`) is named by `aria-label`, or by `aria-labelledby` pointing at a `FieldTitle`.

## Orientation

- **Vertical** (default): label above. Forms.
- **`horizontal`**: label and control side by side at every width. `Switch`, `Checkbox`, `RadioGroupItem`, `ColorPickerPopover`, small buttons.
- **`responsive`**: stacked on phones, side by side from `@md/field-group`. Controls with a width of their own: `Select`, `Combobox`, `Tabs`, `NumberField`. Needs a `FieldGroup` around it; cap the control with `@md/field-group:max-w-*`.

A `Switch` or `Checkbox` in a `responsive` field stretches on phones and collapses on desktop, so it is always `horizontal`.

## Input groups

`InputGroupInput` or `InputGroupTextarea` first, then the addons; `align` places them. Buttons inside are `InputGroupButton`.

```tsx
<InputGroup>
  <InputGroupInput id="key" value={key} readOnly />
  <InputGroupAddon align="inline-end">
    <InputGroupButton size="icon-xs" aria-label="Copy">
      <CopyIcon />
    </InputGroupButton>
  </InputGroupAddon>
</InputGroup>
```

A fixed part is `InputGroupText` ("https://", ".relaymail.com", "kg"). A `Textarea` takes `align="block-start"` or `"block-end"`.

## Validation

`data-invalid` on the `Field` colours the label; `aria-invalid` on the control draws the ring; `FieldError` says what to do. All three together.

```tsx
<Field data-invalid={!!error || undefined}>
  <FieldLabel htmlFor="slug">Address</FieldLabel>
  <Input id="slug" aria-invalid={!!error || undefined} aria-describedby="slug-error" />
  {error && <FieldError id="slug-error">{error}</FieldError>}
</Field>
```

`FieldError errors={issues}` takes React Hook Form errors and Standard Schema issues (Zod, Valibot, ArkType) and lists several. After a failed submit, focus the first invalid control. A server error that belongs to a field goes to that field; any other is an `Alert` above the buttons.

## Warnings

Something worth knowing that doesn't block: `FieldDescription` with a warning icon, and no invalid state ([recipes/states.md](../recipes/states.md#a-warning-on-a-field)).

## Choice cards

A `FieldLabel` wrapped around a horizontal `Field`, with a `RadioGroupItem`, `Checkbox` or `Switch` at the end.

```tsx
<RadioGroup value={plan} onValueChange={setPlan}>
  <FieldLabel htmlFor="yearly">
    <Field orientation="horizontal">
      <FieldContent>
        <FieldTitle>Yearly</FieldTitle>
        <FieldDescription>$96 a seat, billed today. Saves 20%.</FieldDescription>
      </FieldContent>
      <RadioGroupItem value="yearly" id="yearly" />
    </Field>
  </FieldLabel>
</RadioGroup>
```

A `FieldLabel` beside a `Switch`, `Checkbox` or `RadioGroupItem` stretches its press area over the whole `FieldContent`, so a link or button inside it can't be pressed. Put it after the `Field`, or in the row that appears once the option is chosen. Descriptions on a chosen card take `text-foreground/70`.

## Disabled and read only

`data-disabled` on the `Field`, `disabled` on the control, and the reason in the description. A value people may need to copy is `readOnly`, not `disabled`.

## With a form library

Follow the project's library. Share one schema between client and server. Bind `Tabs`, `Select`, `DatePicker`, `Slider` and the other controlled components through the library's controller with `value` and the base's change callback ([base-vs-radix.md](base-vs-radix.md)).
