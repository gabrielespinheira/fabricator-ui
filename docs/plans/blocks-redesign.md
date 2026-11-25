# Blocks redesign

Take the eight screen blocks from "correct components on a page" to screens someone would ship. [`blocks.md`](blocks.md) records how the blocks were built; this plan changes how they look, read and behave. Every screen follows [`DESIGN.md`](../../DESIGN.md) and the repo's [fabricator skill](../../skills/fabricator/SKILL.md).

Audited on 24 November 2026 at `0a093109`, in the running site on the `base-fabricator` style: 390, 820, 1440 and 1920px, light and dark, the main flows, axe, and icon checks on Radix and Aria. The fabricator skill's `probe.js` ran at 390 and 1440. Screenshots and scripts are in `tmp/blocks-audit/` (gitignored); no sub-agent has judged them yet.

## What is wrong

### Broken

| #   | Where                       | Problem                                                                                                                                                                                                                                                                                                                          | Cause                                                                                                                                                               |
| --- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | `AppNav`, Base UI only      | Every linked row loses its icon. Finance has a text-only sidebar; Messenger's icon rail shows "Cha", "Call", "Con". Live on fabricator-ui.vercel.app, so in Base projects that added `app-nav` since that change (18 Nov) was deployed.                                                                                          | `98e9b266` gave the default `renderAnchor` its own children for a Biome rule. Base UI's `render` element keeps its own children, so the icon and label are dropped. |
| B2  | `AppShellPanelTabs`         | Two empty 16px pills in `app-shell-01` and `-02`.                                                                                                                                                                                                                                                                                | Under 360px the labels hide to leave icons, but these views have no icon. The default panel is 320px.                                                               |
| B3  | `EventCalendar`, time grids | Overlapping events cover each other's title and time (Interviews / Standup, Design review / Dentist).                                                                                                                                                                                                                            | FullCalendar's default `slotEventOverlap`.                                                                                                                          |
| B4  | Mail, phone                 | An open thread has no back button, only a panel icon at the far end.                                                                                                                                                                                                                                                             | The thread is an end panel.                                                                                                                                         |
| B5  | Accessibility               | Assistant has no `h1` and text outside a landmark. Messenger's initials avatar fails contrast in light; on phones its list text is 4.05:1 on the frame grey, and Tab reaches nine controls of the conversation it covers. Mail's stars are too small to touch. Calendar's 42 day buttons have names that don't match their text. | Block markup; `Avatar`; `AppShellPanel` on phones; `EventCalendarMiniMonth`.                                                                                        |

### Off the design guide

| #   | Where                        | Problem                                                                                                                                                                                                    |
| --- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | Finance, Mail, Calendar RSVP | Short single choices are ghost `ToggleGroup`s. The guide and the skill's recipes say default `Tabs`; the blocks predate them.                                                                              |
| G2  | Finance                      | No focal point: a flat line in the top third of a 0 to 2M axis. Total cash and its −8.7% appear twice. "Home" appears three times above the fold.                                                          |
| G3  | Finance                      | Four tinted badges, an alert and five status badges compete. Normal transactions shout "Completed" in green.                                                                                               |
| G4  | Mail                         | The reading pane is 480px at every width. At 1920 the list takes 1168px and the mail itself gets 480.                                                                                                      |
| G5  | Mail                         | 84px rows with three lines, an outlined label, a checkbox and a star each: nine threads at 900px. Unread differs by a dot only.                                                                            |
| G6  | Messenger                    | Emphasis is inverted: incoming bubbles are the heaviest grey (L 0.91), your own the faintest tint (L 0.95).                                                                                                |
| G7  | Calendar                     | "November 2026" twice and "Calendar" above it, in two header rows. The event panel is three lines in a 340 × 880 column.                                                                                   |
| G8  | Calendar, phone              | The toolbar wraps to two rows and three 97px columns truncate nearly every event.                                                                                                                          |
| G9  | Auth                         | The column re-centres per page and per step: the logo is at 150px on sign in, 98 on sign up, 265 on reset. The code input fills half the column.                                                           |
| G10 | Type and edges               | Titles use `font-semibold` instead of `weight-semibold`; Mail and Messenger set 14px and 18px by hand. Near misses: breadcrumb 268 / title 280, assistant logo 8 / rows 16, compose icon 330 / search 376. |
| G11 | Demo data                    | Four different signed-in people. Finance, Mail and Messenger freeze on 17 November while Calendar is live.                                                                                                 |

### The site

`/blocks` is 8,723px of eight full viewers and eight iframes (about 1,050 requests on the dev server, where it never reached network idle in 60s). It opens on the plainest block. Loading placeholders are mosaics of bars, which the guide forbids. No block has a page of its own to link, search or share. The homepage's first tab is Finance, so B1 and the flat chart are the first thing a visitor sees.

### Already right

Surfaces, dark mode, copy, cursors, form errors and menus. No console errors and no sideways scroll at any width. Keep all of it, and keep the pure `lib/` models and their tests.

## Rules for every block

Each block is done when these hold, on top of the guide's [review checklist](../../DESIGN.md#review-checklist):

1. **One sentence, one focal point, one signature.** The file's opening comment names the person and the job. The signature is the element that shows the block's substance, and it gets the best place. The focal point wins the squint test at 1280 × 720, the first fold of the homepage frame.
2. **Say it once.** No value, title, date or person appears twice above the fold.
3. **The job gets the room.** Content that is read or worked takes the main column and grows with the window; lists and details are panels.
4. **Emphasis budget.** One filled button. Status colour only on what needs someone; normal states are plain or outline.
5. **Quiet until needed.** Row actions, checkboxes and stars appear on hover, focus or selection, and stay reachable on touch.
6. **One world.** Ada Lovelace (ada@acme.com) at Acme Inc is signed in everywhere, with the same colleagues and avatars, on Tuesday 24 November 2026 (`SAMPLE_NOW`). Calendar alone follows the real date.
7. **Every state is reachable in the demo:** loading, empty, error, long names.
8. **Phone is its own layout,** with a back path, 44px targets and nothing truncated that identifies a thing.

## Target designs

### Finance (`finance-01`)

Job: a finance lead checks cash and runway, then clears what waits for them. Mode App, rhythm **thirds** (was quarters).

```text
Acme Inc > Overview                                     [Send money]  ...
Overview   4 payments wait for you, $24,526 in total
[7 days|30 days|90 days|12 months]  vs the previous 30 days    Updated 2 min ago
! Cloudflare declined $412.20 on card ••1047                          [Retry]
Money in (4)            | Money out (4)           | Runway (4)
Cash balance, hero (8)                            | Accounts (4)
Needs your approval (8)                           | Spending, without payroll (4)
Recent transactions (12)
```

- Total cash becomes the hero's headline and leaves the KPI row. Accounts sits beside it, because it is where that total lives.
- The data has the saw-tooth of a real account (payouts in, payroll out), so the line fills its plot from zero. No new chart API.
- Spending leaves payroll out and says so in its description; payroll flattens every other bar today.
- Transactions get the full width: payee, date, account, category, status, amount. Completed is an outline badge; pending and declined keep their colour.
- The alert is one line. Transfer and Request payment move into the page menu. The lead says something true now: "4 payments wait for you, $24,526 in total."
- Signature: the cash line beside the accounts that add up to it.
- Approvals: amount and button share the row's centre line; approving removes the row with an Undo toast.

### Assistant (`assistant-01`)

Job: someone asks about their data, follows the work and reuses the answer.

- Signature: the work the assistant shows, from its steps to its sources to the artifact.
- **Steps collapse.** Consecutive tool calls fold into one line ("Worked for 8s, 2 steps") that opens to the list. A step that needs a sign-in is a warning with "Connect", since it isn't a failure.
- **Sources** under a reply that searched: `BrandIcon` chips that open the list.
- **Actions** on every reply: Copy, Try again, Good, Bad. Shown on the last reply, on hover or focus above it.
- **An artifact panel** (end `AppShellPanel`): the reply ends with a card, "Growth by region", which opens the table and a `BarChart`, with Copy and Download. The transcript keeps the summary.
- Numeric columns align to the end. One column width for composer and transcript (720px).
- Sidebar: Search chats (⌘K) and a Pinned group; the logo lines up with the rows; the title is the `h1` and opens the chat menu.
- Bubbles hug their text. `text-pretty` leaves up to 140px of slack in multi-line bubbles: fix it in `bubble.css` and recheck Message and the docs examples.
- Replies match the question; today any follow-up returns the launch email.

### Messenger (`messenger-01`)

Job: someone catches up on conversations and answers.

- Signature: the transcript. B1 restores the rail.
- On phones the covered conversation is inert, so keyboard and screen readers stay on the list.
- **Bubbles:** mine `tinted`, theirs `muted`, so the heaviest grey goes (`default` is a 6% grey, not the primary). Corners join inside a group and one time closes it. Group chats show the sender's avatar and name once.
- **List:** unread names are medium weight with a primary count; presence dots are 10px, ringed in the surface under them (hover and selection included); the new-message button ends on the search field's edge; the phone list sits on the page surface, as on desktop.
- **Details:** presence once, media in a three-column grid with enough photos to fill it, shared files as `Item`s, Mute as a switch row, Block and Report last in the header's menu instead of a red button.
- A new-messages `Marker`, a typing indicator and a failed message with Retry.

### Mail (`mail-01`)

Job: someone works through an inbox and answers what matters. The largest change: the list becomes a resizable **start panel** (400px, 320 to 520) and the thread is the **main column**, its text capped at 720px. Messenger already works this way, so phones get list, thread and back for free (B4).

```text
Sidebar | Inbox                  [Compose] | (archive)(trash)(unread)(snooze) ...
        | [ Search mail              ]     | Q4 planning: draft for Thursday  • Work
        | [All | Unread | Starred]         |
        | (A) Maya, me 3         2:52 PM   | Maya Chen   Hi Ada, could you...   16 Nov
        |     Q4 planning  Good call...  • | Ada Lovelace  Looks focused...     16 Nov
        | (S) Stripe             1:05 PM   | Maya Chen                    Today 2:52 PM
        |     Your payout...             • |   Good call. I set it to 40%...
        |                                  | [ Reply to Maya...                      ]
```

- Signature: the open thread with its answer ready. ↑ ↓ move through the list; archive and snooze advance to the next thread, with Undo.
- **Rows:** two lines, about 60px, 13 or more at 900px. Sender and time; subject then preview on one line. Unread is medium weight. Labels are colour dots with a tooltip. The avatar turns into the checkbox on hover, focus or selection, and on tap on touch. A star shows when set or on hover, without a pressed block.
- Selection is an inset rounded row.
- **Reply** is always open at the foot of the thread as one line that grows, replacing three outline buttons.
- **Compose** is a 560px `Dialog` (a `Drawer` on phones) with To, Subject, an `Editor` body and attachments in its footer. The sheet is 60% empty today.
- `DESIGN.md` and the skill's `patterns.md` gain one sentence under List and detail: when the record is what people read (mail, support), the list is the start panel and the record the main column.

### Calendar (`calendar-app-01`)

Job: someone sees their week and prepares for what is next.

- Signature: the week, and the next event waiting beside it.
- **One header row** in `AppShellHeader`: the period as the title (the `h1`), Today, previous and next, a segmented Day / Week / Month / Agenda selector, and Create event. The mini month keeps the only other month name.
- B3: events stand side by side. Short events keep the title and drop the time.
- **Event panel:** title and time, Join as the panel's one filled button, place, guests with their answers, notes, reminder, and a segmented RSVP choice at the foot. Edit and Delete live in its menu. With nothing selected it shows the next event.
- **Sidebar:** rows at control height, an "Up next" item ("Standup in 12 min"), Add calendar.
- Weekends and out-of-hours share one lighter wash. The first hour label isn't clipped.
- **Phone:** Day view with a week strip, one toolbar row, settings in the page menu, titles that wrap.

### Auth (`sign-in-01`, `sign-up-01`, `forgot-password-01`)

- One shared layout: the column starts at a fixed height (`clamp` on viewport height) on all three pages and every step, so the logo never moves. On phones it starts at the top, clear of the keyboard.
- The step line belongs to the title group. `InputOTP` slots fill the column and the code submits when complete.
- Google and Apple share one row. Sign in marks the last method used.
- Terms only on sign up, on one balanced line. A quiet footer (help, language) anchors the page at 1440px.
- Password rules show only once the field has focus.
- Type uses the page-title and lead roles everywhere.

### App Shell starters (`app-shell-01` to `-05`)

B1 and B2 only. Real content in place of their grey boxes is out of scope.

## The site

- **`/blocks` becomes a gallery:** two columns of captured previews (light and dark), filters by category in `Tabs`, no iframes. Order: Dashboards, Chat, Email, Calendar, Authentication.
- **`/blocks/<name>`:** the live viewer at full width, the command, the code, the components used (linked to their docs) and the states included. Own title, OG image and sitemap entry. Old `#name` links redirect on the client.
- **Skeletons:** one block per region (sidebar, main, panel; one for an auth form).
- **Captures** use `blocks:capture` at 1280 × 720. The gallery loads the matching theme and sets the image dimensions.
- **Homepage:** same tabs; the frame shows each block's first fold at 1280 × 720.

## Decisions

Gabs, 24 November 2026:

- Phase 0 ships in v0.10.0.
- Mail's list moves to the start panel, with the exception written into `DESIGN.md`.
- `/blocks` becomes a gallery with a page per block.
- The four SaaS blocks follow the redesign; the App Shell starters get bug fixes only.

## Work

Each phase is a pull request that can ship alone. Registry work lands in base, radix and aria together (contract 5).

| Phase | What                                                                                                                                                 | Size |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 0     | **Component fixes, into v0.10.0:** B1, B2, B3, the mini month's names, the avatar's contrast, bubble slack. A failing test first for each behaviour. | S    |
| 1     | **Foundations:** shared people and "now" rules, the guide's List and detail line, `ToggleGroup` to `Tabs`, type roles, the block check (below).      | S    |
| 2     | **Finance and Mail.** The homepage's first tab and the biggest redesign.                                                                             | L    |
| 3     | **Assistant and Messenger.**                                                                                                                         | L    |
| 4     | **Calendar and Auth.**                                                                                                                               | M    |
| 5     | **Site:** gallery, block pages, skeletons, captures.                                                                                                 | M    |
| 6     | **New blocks,** one PR each: `settings-01`, `members-01`, `billing-01`, `onboarding-01`. Names avoid upstream's catalog.                             | L    |

### Phase 0 detail

- **B1. Fixed 24 November, uncommitted.** `AppNav` on Base and the tab bar on Base and Radix empty the link before filling it, which also covers rail menus. The same commit had dropped the tab bar's icons on Base and doubled its labels on Radix. Test: `app-nav-links.test.tsx`. Left: run the generated-project Biome check on it.
- **B2.** Labels hide only when every view has an icon.
- **B3.** `slotEventOverlap: false` in the engine; check drag, resize and `eventMaxStack`.
- Check the React Native component fixes against the owning renderer and update it or its dated exception (contract 9). SwiftUI and Kotlin Compose are outside the redesign scope.

### Review and the block check

Every phase from 2 on ends with the skill's [refine loop](../../skills/fabricator/refine.md): capture before and after, probe, a sub-agent judge that sees only the pictures, one round of fixes agreed with Gabs.

The block check automates the part that needs no eye. Add it beside `registry:capture`: every block at 390, 834, 1280, 1440 and 1920 in both themes, failing on console errors, sideways scroll, axe violations, covered controls, small touch targets, a missing `h1`, or a nav row without an icon where its siblings have one. It would have caught B1 and B5.

### Tests

TDD for `lib/` models and behaviour (approve with Undo, collapsed steps, mail selection and reply, RSVP, OTP submit). Not for layout or copy.

### Verification on 25 November 2026

- All 17 blocks passed the Base UI phone audit at 390px in both themes. Finance, Mail, Assistant, Messenger, Calendar, Settings, Members, Billing, and Onboarding passed the desktop audit at 1440px across Base UI, Radix, and React Aria.
- The gallery and Finance detail passed axe at 390, 834, 1440, and 1920px in both themes. The old-link redirects, detail viewer controls, and homepage preview switching were exercised in the running site.
- Local install dry-runs resolved all 17 blocks on all three bases. The full registry build and strict React Native parity check passed.
- The remaining viewport matrix and final thumbnail refresh depend on the shared dev server. It currently returns HTTP 500 because the Properties demo imports files missing from its registry declaration. The same change and the Kanban controller errors prevent a green root check.

## Risks

- **Superset:** blocks are copied in, so layout may change freely, but item names, routes and file targets stay. Removed files are named in the changelog, because `add` doesn't delete them.
- **`AppNav` users:** the fix ships through `upgrade`; the changelog says who is affected.
- **Bubble CSS** affects every chat example. Recheck Message, Bubble and Chat Input docs.
- **Calendar engine** affects the docs and the native exceptions.
- **Mail** moves from an end to a start panel, so a saved layout under the same `storageKey` would be wrong: use a new key.

## Done when

- [ ] Every row in B1 to B5 and G1 to G11 is closed, with before and after screenshots in the pull request.
- [ ] The rules for every block hold at 390, 834, 1280, 1440 and 1920px, light and dark, keyboard only, on base, radix and aria.
- [ ] The block check passes for all 17 blocks, including the five App Shell starters, and the judge leaves no Broken or Weak finding in the eight redesigned ones.
- [x] `/blocks` loads no iframes and each `/blocks/<name>` loads one.
- [ ] Fabricator style and registry builds pass for Base UI, Radix and React Aria. `bun run check`, `bun run test` and `native:parity --strict` pass.
- [x] `add --dry-run` of each block succeeds for each base.
- [x] `unreleased.mdx`, `WEBSITE.md`, `DESIGN.md`, the skill's recipes and `blocks.md` are updated.
