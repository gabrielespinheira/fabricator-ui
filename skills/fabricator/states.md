# States and flows

The happy path is one of about a dozen things a screen does. Design the rest in the same pass: work through the two lists below for the feature, keep the rows that can happen, and give each an answer. Code for the common ones is in [recipes/states.md](recipes/states.md); skeleton and layout-shift rules are in [rules/loading.md](rules/loading.md).

## Every region

A region is a card, a list, a panel or a page's body. Its frame, title and controls render at once; the state lives where the content would be, at the content's size.

| State | Shows | Offers |
| --- | --- | --- |
| First load | One `Skeleton` per card content or row, after about 300ms | |
| Refresh, filter | The old content, dimmed or under the table's bar | Nothing moves; scroll and selection stay |
| First use | `Empty`: icon, what will be here, why it helps | The primary action, and an import or a sample |
| Nothing to do | `Empty` that says so plainly ("No open incidents") | Where to look next; no confetti |
| No results | `Empty` naming the search or filters | Clear, with the count that would come back |
| Partial | What loaded, plus an `Alert` in the failed part only | Retry for that part |
| Stale | The last data with its time ("Data from 10:42 AM") and a warning `Badge` or dot | Refresh, or what it waits for |
| Failed | `Alert variant="error"` with what failed and what still works | Retry; the filters and input are kept |
| Denied | `Empty` with what is restricted and who can grant it | Request access |
| Not found, gone | `Empty` saying deleted, moved or never existed | The way back; Restore when it can be |
| Read only | The content with its controls disabled and one line saying why (archived, plan, role, lock) | The action that lifts it |
| Waiting on others | The object with an info `Badge` ("Waiting for Priya") | Nudge, withdraw |
| Very many | Virtual rows or pages, a total, and a way to narrow | Search, saved views |
| Long or missing | Truncated names with a tooltip, "None" for a missing value | |

Waiting is not empty: an empty state shows only after a load finished with nothing.

## Every action

| Moment | The interface |
| --- | --- |
| Not allowed | Never for this person: left out. Not yet: disabled, with the reason in a description or tooltip and the way to fix it |
| Before | Checks that block and checks that warn, listed next to the action, each linking to its fix |
| Commit | Reversible: act at once. Irreversible: `AlertDialog` |
| Pending | The control that started it: `Spinner` in the icon's place, "-ing" label, same width. Past a few seconds, say what is happening |
| Long running | Leaves the dialog: a `Progress` row with words and time left, "You can leave this page", Cancel, and a toast when it ends |
| Success | The result itself, in place. A toast with Undo when it can be undone. A success screen only ends a flow |
| Invalid | Red ring and message at the field, focus to the first one, everything typed kept |
| Refused by a rule | What the rule is and the nearest thing that would pass ("Seats are full. Add a seat or remove someone") |
| Conflict | Someone changed it: show theirs and yours, offer Keep mine, Use theirs, or Copy mine. Never overwrite quietly |
| Partly done | The split ("18 of 20 sent"), the failures as rows with a reason and a fix each, Retry the failed ones |
| Failed | Error toast for a row or menu action, `Alert` above the buttons in an overlay: the reason, what was kept, Retry |
| Unknown | Timed out: say it may have worked, check before offering to repeat it; never blindly resend money or messages |
| Offline | Queue what can wait and mark it pending; refuse what can't, saying when it will work |
| Session ended | Sign in over the page and return to the same state with input kept |
| Undo | Puts back the exact previous state, and says so |
| Leaving unsaved | Autosave, so there is nothing to lose; otherwise an `AlertDialog` that offers Save, Discard, Keep editing |

## How loud

Match the message's reach to what it affects and its volume to what happens if it is ignored. Use the lowest row that works.

| Reach | Component | For |
| --- | --- | --- |
| One value | `FieldError`, `FieldDescription`, tooltip | Invalid, or worth knowing before choosing |
| One row | `Badge`, a status dot, a warning icon with a tooltip | A stage, a health, a problem with that record |
| One region | `Alert` in the region | It failed, is stale, or has a limit |
| The page | `Alert` as the first row of the body | Something wrong the page's job depends on, only while true |
| The whole product | One `Alert` above the content on every page | Trial ended, payment failed, incident, read-only maintenance |
| A result just now | Toast | It worked, with Undo; a background job ended |
| A decision, now | `AlertDialog` | Only what can't be undone |

- One alert per region. Two problems become one alert with a list, worst first.
- A toast disappears, so nothing that must be acted on lives only there.
- `Alert` rests low contrast (neutral, coloured icon). `contrast="high"` is for the one thing that must be dealt with.
- Nothing blocks the page for information. No modal on arrival.

**Severity.** Pick by consequence, then keep it the same everywhere for that condition:

| Level | Means | Colour | Blocks |
| --- | --- | --- | --- |
| Note | Good to know | neutral | No |
| Under way | Happening, no action needed | `info` | No |
| Warning | Will become a problem, or odd | `warning` | No; says what happens if ignored |
| Error | Failed or invalid | `destructive` | That action or region |
| Danger | About to be irreversible | `destructive` | Until confirmed |

A warning is not an error: no red ring, no `data-invalid`, no disabled button. Put it in the description with a warning icon, and let people go on.

## Limits and plans

- **Show the limit before it bites:** usage beside the action that spends it ("18 of 20 seats"), `Progress` on the plan page.
- **80%:** warning `Badge` on the number. **Near the end** (95%, or when the next ordinary use would pass it): a page `Alert` with the forecast ("At this pace you reach it on Thursday") and the action.
- **At the limit:** the action stays visible and explains itself when pressed, offering upgrade, free up, or ask an admin. People who can't upgrade get the admin's name.
- **A locked feature** shows its real interface or a short description with the plan's `Badge`, once, where it belongs. Work already made is never locked away.

## Confirming

- **Reversible:** act, then "Undo" in the toast.
- **Irreversible:** `AlertDialog` titled with the verb and the object ("Delete Northwind?"), the consequence in numbers ("14 members lose access now"), a cancel that says what it keeps ("Keep workspace"), and the verb again on the action.
- **Catastrophic** (workspace, production data): the same, with the name typed to enable the action.
- **In bulk:** the count and a sample of names; the action repeats the count ("Delete 12 customers").
- **Outward** (emails, publishing, charging): state who it reaches, when and how much, on the confirming screen itself. Offer a test or a delay with Cancel.
- **Automated** (an agent, a schedule): show what it will do and let people stop, edit or approve before it does; afterwards show what it did with a way to reverse it.

## People and roles

Design the screen for each person who opens it: the owner, a member, a viewer, someone invited, someone removed, the only admin. For each, decide what is absent, what is disabled with a reason, and what is asked of someone else. Guard the edges: the last owner can't leave or be demoted, people can't remove themselves by accident, an expired invitation says so and offers a new one.

## Writing messages

1. **What happened,** in the product's words: "The card was declined".
2. **What it means, or what was kept:** "Your plan stays active until Nov 30".
3. **The next step,** as the button: "Update card".

No blame, no codes as the message (put them in a copyable detail line), no "Oops", no "Something went wrong" alone. Say the same thing the same way everywhere.

## Forcing the states

Make each state reachable while building: a query parameter, a story, a mock. Then look at it in both themes and on a phone. A state nobody has seen is not done.
