# Asking

How a feature collects what it needs without becoming a form. An **ask** is every value the interface wants from a person: a field, a switch, a picker, a filter. Each ask costs attention, so it has to earn its place, and a screen is judged by how few it makes.

## The ladder

List every value the feature needs. Place each on the highest rung that works; move down only with a reason.

| Rung | The value is | On the screen |
| --- | --- | --- |
| 1. Known | In the session, the workspace, the URL, the record | Shown as text where it matters, never asked |
| 2. Inferred | Derived from another answer or the device | Filled in with its source said: "Lisbon time, your workspace's zone" |
| 3. Defaulted | Right for most people | Pre-set and visible, changed in place |
| 4. Deferred | Not needed to start | Left out of creation; asked when it first matters, on the object's page |
| 5. Offered | One or some of a set, a range, a date, a picture | The control made for that shape ([Choosing a control](#choosing-a-control)) |
| 6. Imported | Already written somewhere else | A file dropped, text pasted, an account connected, a template or a duplicate |
| 7. Typed | Only in the person's head | `Input` or `Textarea` |

Common inferences worth making: name and company from the email; slug from the name; currency, time zone and number format from the workspace; unit from the last value used; owner is the person creating; due date from the previous cycle; the first free port, colour or key; the file's name as the title; a pasted URL's title, icon and type.

**Budget.** Typed fields on screen at once: three. Controls in one open group: five. A dialog: three asks, the name included. Past eight asks in total it stops being a form: pick a shape below.

## Choosing the shape

| The feature collects | Shape |
| --- | --- |
| One value about something on screen | Edit it where it is: a `Select` or `Switch` in the row, text that becomes an `Input`, a `Popover` on the value |
| A name and one or two choices | A dialog, a drawer on phones ([recipes/create.md](recipes/create.md)) |
| Four to seven values that need the list or page beside them | A `Sheet`, grouped, with the result visible behind it |
| Many values before something goes live (a campaign, a workflow, a job post, a deployment) | **Draft first** ([recipes/setup.md](recipes/setup.md)): create it from a name, then a page of one-line answers that open one at a time, with checks and a live preview beside them |
| Values that change how things behave, revisited later | Settings cards that save at once ([recipes/settings.md](recipes/settings.md)) |
| Decisions that depend on each other, or a first run | One decision per step: `Questionnaire`, or choice cards with a `Progress` |
| The same few values for many records | `DataTable` with `editable` cells, or a bulk action on a selection |
| A rule or a query | A sentence with controls in it: "Notify [on-call] when [latency] is above [400 ms] for [5 min]" |
| Many people, tags, rows or keys | One box that takes a paste and splits it into chips, checked as it lands ([recipes/create.md](recipes/create.md#many-values-in-one-box)), or a CSV drop with a preview table |
| Files | `FileUploadDropzone`; the upload starts on drop and the rest is inferred from the file |
| Something visual (theme, layout, template, icon) | Pictures of the options to pick from, applied to a live preview |

### Draft first

The pattern for anything that would otherwise be a long form, and the one that looks most finished:

1. **Creating takes one ask,** the name, or none ("Untitled campaign", selected for renaming). The draft exists at once and saves itself, so nothing can be lost.
2. **Every decision is one line:** a state icon (done, to do, warning), its name, its current answer in grey. Lines with good defaults are already done, so people see a page that is nearly finished.
3. **A line opens in place** to the one to four controls that change it, and closes back to its answer. One open at a time. A decision that needs room (a template gallery, a table of segments) opens a `Sheet` or its own page.
4. **The consequence sits beside it:** a live preview, the number affected, the cost, the time it ends. It updates as choices change.
5. **Checks replace validation:** a list of what blocks, what to look at, and what is fine. Each row opens the line that fixes it. The primary action names what is missing when it can't run.

### Multi-step flow

One decision per step, answered by choosing. Position on top ("Step 2 of 4" or a `Progress`), Back at the start, the primary at the end, a ghost Skip when the step is optional. Answers survive Back and reload, later steps adapt to earlier ones, and the last step shows every answer with a way to change each before it commits.

## Choosing a control

By the shape of the answer:

| The answer is | Control |
| --- | --- |
| On or off, applied at once | `Switch` |
| Yes or no, sent with the rest | `Checkbox` |
| One of two to four, labels fit one line | `Tabs` with the default `TabsList`, every label visible |
| One of a few that need a sentence each | Choice cards: `RadioGroup` of `FieldLabel` > horizontal `Field`, each stating its consequence |
| One of five or more, or long labels | `Select` |
| One of many, or found by typing | `Combobox` |
| Several of many | `MultiSelect` |
| Several independent options | `Checkbox`es in a `FieldSet`, or switch choice cards |
| A level or a share | `Slider` with its value beside the label; `showSteps` for stops; two values for a range |
| An exact number | `NumberField` with steppers; `format` for currency, percent, units |
| A score | `Rating` |
| A date, month or year | `DatePicker` (`granularity`, `hasTime`, `editable` reads "tomorrow at 9pm") |
| A time, or a span on one day | `TimeInput`, `TimeRangeInput` |
| A date range | Range `Calendar` in a `Popover` with presets beside it |
| A colour | `ColorPickerPopover`, brand swatches first |
| Files | `FileUploadDropzone`; `FileUploadField` inside a form |
| A person | `Combobox` with avatars; `AvatarGroup` shows the result |
| An icon | A searchable grid in a `Popover` ([rules/icons.md](rules/icons.md)) |
| A one-time code | `InputOTP` |
| A URL, price, handle or size | `InputGroup` with the fixed part as an addon |
| A place in a list | Dragging, with Move up and Move down in the row's menu |
| Formatted text | `Editor` |
| A short or long text of their own | `Input`, `Textarea` |

Browser date, time, number, colour, file and select controls never appear.

## Make choosing pleasant

- **Show what a choice does,** in the choice: "Billed yearly, save 20%", "14 people can open it".
- **Show the number it changes** beside it, live: "20% · 2,496 people".
- **Put the recommended option first** with a quiet `Badge`, and preselect it.
- **Keep a choice's extra controls hidden until it is chosen,** directly under it.
- **Name what stays the same:** "Applies to new members only", "You can change this later".
- **Options people rarely touch** go in a closed "Advanced" `AccordionItem` whose line says what it holds and whether anything differs from the default.
- **Offer the nearest valid answer** when one is refused: "acme is taken. Try acme-hq."

## When text fields remain

- One column, `AppShellContent size="sm"` or about 384px in an overlay; two short related fields may share a row. A field's width hints at its answer.
- A visible label, the control, then help that says why or what for. The placeholder shows an example. Mark the rarer of required and optional.
- The first field has focus, Enter submits, Escape closes, and `autoComplete`, `inputMode` and `enterKeyHint` are set so phones show the right keyboard.
- Validate on leaving the field and on submit; a rule people are still meeting (password strength, length) updates as they type without turning red.
- The submit row ends the form: outline Cancel, then the primary saying what it does.

Field code: [rules/forms.md](rules/forms.md). What happens when it fails: [states.md](states.md).
