# Patterns

How a screen is laid out, which pattern fits the job, and blueprints for the features almost every SaaS product has. Class-level layout is in the recipes.

## Contents

[Page anatomy](#page-anatomy) · [Hierarchy](#hierarchy) · [The grid](#the-grid) · [Cards](#cards) · [Choose a pattern](#choose-a-pattern) · [Dashboards](#dashboards) · [Feature blueprints](#feature-blueprints) · [Making it engaging](#making-it-engaging) · [Words](#words) · [Websites](#websites)

## Page anatomy

The frame around the page is [app-shell.md](app-shell.md); this is what goes inside `AppShellMain`.

Four bands at most, 24px apart, inside `AppShellContent`:

1. **Header:** where I am (`AppShellBreadcrumb`) and what I can do to this page (`AppShellHeaderActions`: two or three actions, one primary, the page menu behind the ellipsis).
2. **Title:** `AppShellPageTitle`, its status `Badge`, and one lead sentence that says something true now ("4 of 5 ready. Saved just now."), when the name isn't enough.
3. **Toolbar:** what I am looking at. Period or view first, then search and filters; count and freshness at the end.
4. **Body:** one list, table, document or setup, or one grid of cards.

A fifth band (a second toolbar, tabs under tabs) means two pages, or a page and a panel.

- **Widths:** `size="sm"` 672px for settings and forms, `"md"` 896px for most pages, `"lg"` 1152px for dashboards and dense pages, none for tables people work in, boards, editors, transcripts.
- **One scroller.** A second only for a pane with content of its own.
- **One start edge** for title, toolbar and body. Centre only what stands alone: an empty state, a sign-in card, a hero.
- **Fill or cap:** records take the column; what people read or fill in is capped.
- **The page menu** holds what belongs to the whole page without being used each visit, in this order: view options, sharing and export, settings ("Dashboard settings…"), anything destructive alone and last.
- **Sections** inside a page are a Title-role heading with 40px above it. Nothing is drawn around them.

## Hierarchy

A screen has a small budget of emphasis. Spend it in this order and stop at the first that works: position and space, size, weight, foreground against grey, a raised surface, colour.

- One focal point. Equal things look equal, and a difference in look means a difference in meaning.
- Frequent is visible, occasional is one press away, rare is in a menu, dangerous is last and alone.
- The answer comes before the controls that change it.

## The grid

Pages of cards sit on 12 columns with 16px gutters, by container width: 12 columns from a 896px column (`@4xl:`), one below.

| Rhythm (one per page) | Rows it allows | Gutters at |
| --- | --- | --- |
| Quarters | 4 stats, 6 + 6, 3 + 3 + 6, 12 | 3, 6 and 9 |
| Thirds | 3 stats, 8 + 4, 4 + 4 + 4, 12 | 4 and 8 |

Gutters continue down the page. Cards in a row share a height and their parts. A half-width card on a laptop is about 480px: design for that. A work page with a main column and a supporting one uses 7 + 5 or 8 + 4 with a 24px gutter, the supporting column sticky.

## Cards

A card is one discrete thing: a metric, a chart, a list of things to do, a plan, an integration, a group of settings.

- **Header:** `CardTitle` names it in a few words; `CardDescription` gives its scope (the grain, the sort, the count needing you); `CardAction` holds one quiet control.
- **Content:** the one thing. Lists and tables run to the edges with their text on the inset.
- **Footer:** only when it has content.
- Kinds: stat, goal (`Progress` and "62% of $80K"), chart, list (five to seven), table (five rows and "View all"), settings group, checklist, object, plan, connection.
- Cards don't nest, don't wrap sections, and carry no icon tile, coloured header or border.

## Choose a pattern

| The screen is about | Pattern | Regions | Start from |
| --- | --- | --- | --- |
| The state of things | Dashboard | Period toolbar, KPI row, hero chart, work, breakdowns | `recipes/dashboard.md`, `finance-01` |
| Many records | List | View tabs, search, filters, table, selection bar, detail panel | `recipes/list.md` |
| One record | Detail | Title with status, one primary, views as tabs, metadata panel, activity | `app-shell-01` |
| A queue to clear | List and detail | List and open item as two panes of the main column, one at a time on phones ([recipe](recipes/app-shell.md#a-queue)), context in a panel; a list people resize is a start panel with `mobile="swap"`; ↑ ↓ to move, act and advance | `mail-01`, `app-shell-05` |
| Something to configure before it goes live | Setup | One-line answers that open in place, checks and preview beside them | `recipes/setup.md` |
| Preferences | Settings | Cards of one-line settings that save at once, danger last | `recipes/settings.md` |
| One small thing to make | Create | Dialog or drawer, three asks | `recipes/create.md` |
| A first run, a decision tree | Steps | One decision per step, progress on top, review at the end | `Questionnaire` |
| Work moving through stages | Board | `Kanban` edge to edge under one row, projects and saved views in the sidebar, the open card beside it | `board-01` |
| Things in time | Calendar | `EventCalendar` filling the column, sources in the sidebar, agenda on phones | `calendar-app-01` |
| Several open documents | Workbench | `TabStrip`, full-width body, `FileTree`, inspector panels, status bar; compact | `app-shell-02` |
| One document | Document | Reading-width column, `Editor`, saves itself, comments in a panel | `app-shell-01` |
| A conversation | Chat | `MessageScroller` above a docked `ChatInput`, conversations in the sidebar | `assistant-01`, `messenger-01` |
| How something compares | Comparison | Two to four columns of the same rows, differences marked, one action per column | `Table` |
| What happened | Log | `DataTable` newest first, filters in the URL, a row opens before and after | `recipes/list.md` |
| Getting in | Sign in | One centred 384px column on `bg-surface-0` | `sign-in-01`, `sign-up-01` |
| Selling the product | Website | Spacious, smooth; hero, proof, product, pricing, questions, close | |

## Dashboards

A dashboard answers, in order: what needs me now, how are we doing against before, where do I go to act. Every number and row is a way in.

1. **Alert** only while something is wrong, with its action.
2. **KPI row:** four headline numbers, three to six at most; a metric that changes no decision is left out.
3. **Hero chart:** the trend of the most important number, with its headline above.
4. **Work:** what needs the person, as a list with ways in, beside the records they check most.
5. **Breakdowns:** rankings, mixes, recent activity.

Numbers are locale formatted, compact from 10,000 in stats, whole units for money in stats and cents in transactions. A rate changes in points. The comparison is said once, in the toolbar. Missing is "No data", never zero.

Types: **overview** (default density, quarters), **analytics** (filters, metric picker, rankings whose rows filter), **operations** (compact and instant on desktop, default density with full-width row actions on phones; thirds; open incidents first, a `StatusBar` per service, latency, "Live" with Pause), **revenue** (movements as stacked bars, plans beside failed payments), **usage** (a goal card per limit beside the plan).

## Feature blueprints

Each: what is on the page, the component that carries it, how little it asks, and the flows people forget.

**Billing and plan.** Plan card (name, status, price, renewal) beside the payment method with its brand mark; usage as goal cards; invoices in a table card. Change plan is a page of plan cards under monthly and yearly `Tabs`, showing the prorated charge. *Flows:* card declined, trial ending, downgrade that exceeds the new limits (list what must go first), cancel with the end date and what is kept, invoice pending, tax details missing, non-admin view.

**Members and roles.** `Table` with coloured avatars, a quiet role picker in the row, last active, "More". Seats in one line of the lead or toolbar. Invite is a dialog with one box that takes a paste ([recipes/create.md](recipes/create.md#many-values-in-one-box)) and role choice cards. Pending invitations are rows with a "Pending" badge, not a second page. Sign-in domains are a setting: one true line in the lead, changed in a `Sheet` from the page menu. *Flows:* seats full, already a member, wrong domain, some invitations failed, expired, resend, last owner, demoting yourself, transferring ownership, removing someone who owns things (choose who gets them), SSO-managed members shown read only.

**Integrations.** Connection cards with brand marks, grouped, searchable; state in place (Connect, connecting, connected with `Switch` and Manage, needs attention). *Flows:* consent denied, token expired, missing scope, sync failing since a time with the last success, rate limited, disconnecting (what stops, what is kept).

**API keys and webhooks.** Keys in a table, masked, with last used; the new key shown once in `SyntaxHighlight` with Copy and a reminder it won't show again. Scopes as switch choice cards, expiry as a `Select` with a date. Webhooks list endpoints with a status dot and a success rate; deliveries open in a `Sheet` with payload, response and Redeliver. *Flows:* key never used, expiring soon, revoked while in use, endpoint failing and paused, signature secret rotated with an overlap.

**Notifications.** An inbox in a `Popover` from a bell; preferences as a matrix of events by channel (`Checkbox` cells, one row per event) with a digest picker. *Flows:* nothing new, marked read across devices, a channel not set up yet, muted until a time.

**Onboarding.** A checklist card on the overview until done: `Progress`, an `Item` per step, only the next one filled. Questions are choice cards, one per step, and each visibly changes what comes next. *Flows:* skip, resume later, an invited person who needs half of it, sample data to remove.

**Import and export.** Drop a file, map columns with suggestions already chosen, preview with problems marked in the rows, import with progress in the background. *Flows:* wrong encoding, duplicates (skip, update, keep both), some rows failed (download them with reasons), undo the import, export ready by toast and email.

**Search.** ⌘K across everything with recent and suggested before typing, results grouped by kind with their icon, filters that become chips. *Flows:* nothing found (offer creating it), no access to a result, offline.

**Approvals and review.** A queue with the decision in the row for simple cases and a detail panel for the rest; Approve primary, Reject asks for a reason from a few choices. *Flows:* someone decided first, over your limit, delegated while away, bulk, reversing a decision.

**Reports.** A dashboard with a fixed period in its title, saved views, scheduled delivery. *Flows:* period not finished, data delayed, a metric's definition changed (marked on the chart).

**Automations and workflows.** Draft-first setup of a trigger, conditions as a sentence, actions as ordered rows; test with a real recent event; a run history. *Flows:* a step fails (retry, skip, pause), loops, a connection it needs is gone, edited while running, paused with a reason.

**Scheduling and bookings.** `EventCalendar` with availability as shading; a new event asks for the who and reuses the rest. *Flows:* conflict (with the next free time), time zones named for both sides, recurring edits (this, following, all), cancelled by the other side.

**Files and media.** A grid or list with previews, upload by dropping anywhere, details in a panel. *Flows:* too large, wrong type, duplicate name, upload interrupted and resumed, processing, storage full, shared with someone who left.

**Status and incidents.** Services with a dot and a `StatusBar`, open incidents first, who is on call, response times. Acknowledge, resolve and escalate in the row; silence with a duration. *Flows:* the monitor itself is stale or unreachable, acknowledged by someone else, silenced service still failing, resolved and reopened, nobody on call.

**Feature flags and experiments.** A table with a `Switch` per environment, rollout as a `Slider` with the number of people, the exposure over time. *Flows:* production changes confirmed with their reach, conflicting rules, stale flags, not enough data yet.

**Audit log.** `DataTable` of time, actor, action, object, source; a row opens before and after in a `Sheet`. *Flows:* retention limit reached, actor deleted, export too large.

**Account deletion and data.** The last settings card. Numbers in the consequence, an export offered first, a grace period with a way back.

## Making it engaging

A page is dull when every card is the same shape and every value grey text. Use the system's range:

- **Vary shapes** down the page: a row of stats, one wide chart, a list with faces, a short table, a ranking, a goal.
- **Show people and things:** avatars, brand marks, file icons, a colour the person chose.
- **Show state and progress:** `StatusBar`, `HeatCalendar`, `Progress`, deltas, dots.
- **Let it respond:** a headline that follows the pointer along its chart, rows that open their record, controls that switch a card in place, numbers that update as a slider moves.
- **Give the signature the room,** and let the rest be quiet around it.
- **Treat empty moments as design:** one line that means something and one action.

## Words

- **One noun per object, one verb per action,** from the customer's vocabulary, the same in navigation, titles, buttons, toasts and emails.
- **A lead says something true now** ("3 need you today", "Saved just now"), never what the page is ("Manage your members here").
- **A card's description is its scope:** the grain, the sort, the count. A choice's description is its consequence. A field's help is why, or what for.
- **Titles** are a few words, labels three at most, descriptions one sentence. Sentence case, no final period on titles and labels, no exclamation marks, no "please", no "successfully".
- **Numbers do the talking:** "12,480 people", "Done by about 9:40 AM", "Saves $192 a year".
- **Real content while designing:** names of different lengths and alphabets, odd amounts, a negative change, yesterday's date, one record with nothing filled in.

## Websites

Spacious density, smooth motion, a site header and content up to 1152px. The story follows the product and its evidence, in this order: hero, proof, what it does, how it works, pricing, questions, close, footer.

- **Hero:** what the product does in one line, a lead, a filled and an outline button, then the product itself on `bg-surface-3 shadow-surface-3`. Real screens, no illustrations.
- **Sections** carry one idea each, and neighbours have different layouts. A grid of icon cards is never the story.
- **Pricing:** monthly and yearly `Tabs` over one `Card` per plan, the recommended one filled. Questions in an `Accordion`.
- Centre only the hero and the close. The call to action uses the same words everywhere.
