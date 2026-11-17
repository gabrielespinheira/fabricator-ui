# Blocks

Ready-made screens people install with the CLI or copy, shown on a new `/blocks` page and in a tabbed showcase under the homepage hero. Every block follows [`DESIGN.md`](../../DESIGN.md).

## Blocks

| Block                | Screen                                                                           | Pattern in DESIGN.md      | Installs to                    |
| -------------------- | -------------------------------------------------------------------------------- | ------------------------- | ------------------------------ |
| `sign-in-01`         | Sign in: providers, email and password, errors in the form                       | Sign in and sign up       | `app/sign-in/page.tsx`         |
| `sign-up-01`         | Sign up: providers, name, work email, password rule                              | Sign in and sign up       | `app/sign-up/page.tsx`         |
| `forgot-password-01` | Reset in three steps: email, a code (`InputOTP`), a new password, then done      | Multi-step flow           | `app/forgot-password/page.tsx` |
| `finance-01`         | Business banking home: KPI strip, balance trend, approvals, accounts, spending   | Dashboards (Revenue type) | `app/dashboard/page.tsx`       |
| `assistant-01`       | AI chat: chat history, transcript with tool calls, `ChatInput` + `ModelPicker`   | Chat, AI and chat         | `app/chat/page.tsx`            |
| `messenger-01`       | Messenger: icon rail, conversations in a start panel, transcript, details        | Chat, List and detail     | `app/messages/page.tsx`        |
| `mail-01`            | Email: folders and labels, a searchable inbox with bulk actions, thread, compose | List and detail, List     | `app/mail/page.tsx`            |
| `calendar-app-01`    | Calendar: mini month, calendars to show, `EventCalendar`, event details panel    | List and detail, Create   | `app/calendar/page.tsx`        |

Names avoid upstream's catalog (`login-*`, `signup-*`, `dashboard-01`, `calendar-*`). On phones the messenger opens on its list, and the calendar's details become a bottom drawer.

Suggested next: `settings-01` (settings cards), `billing-01` (plan, usage, invoices), `members-01` (team table, invite dialog), `board-01` (kanban), `integrations-01` (connection cards), `onboarding-01` (multi-step choice cards), `pricing-01` (website pricing section).

## Source

- Each block lives in `apps/web/registry/fabricator/shared/blocks/<name>/`: `page.tsx`, its parts in `components/`, pure data and rules in `lib/` with colocated tests. Shared files import `@/registry/bases/__base__/…`; the build writes one copy per base (contract 5).
- Parts whose API differs by base (triggers, `ToggleGroup`, `Select`, `Tabs` state) live in `registry/fabricator/{base,radix,aria}/blocks/<name>/components/`, with the same exports in each.
- Icons are `IconPlaceholder`s; company logos come from `@fabricator-ui/icons/brands`.
- Every App Shell block uses the inset sidebar (`<Sidebar variant="inset">`): the main column and panels are cards on the frame. The auth blocks stand alone on `bg-surface-0`, without a shell.
- Declared in `registry/fabricator/registry.ts` with `categories` and `meta.fabricator`.

## Site

- The build indexes Fabricator blocks in the Fabricator styles' index and component shards, so `/view/<base>-fabricator/<block>` renders the compiled block (the App Shell blocks gain previews too).
- `/blocks` (`app/(app)/blocks/`): blocks grouped by category; each in a viewer with Preview and Code, desktop, tablet and phone widths, the install command and a full-screen link. The old `/blocks` redirect goes.
- Homepage: the hero gets "Get started" and "Browse blocks"; under it a `Tabs` showcase renders the dashboard, assistant, messenger, calendar and sign-in blocks in a frame, mounting only the open tab.
- "Blocks" joins the header navigation and the sitemap.

## Platforms

React Native, SwiftUI and Compose ports come later. Each new block gets a dated entry in `registry/native/parity-exceptions.json` (the parity check learns `kind: "block"`) and in the SwiftUI and Compose `parity-exceptions.json`.

## Done when

- [ ] `bun run registry:build`, `bun run check`, `bun run test` and `native:parity --strict` pass.
- [ ] Each block checked in the running site: light and dark, phone and desktop, keyboard.
- [ ] `/blocks` and the homepage showcase checked at phone and desktop widths.
- [ ] `shadcn add --dry-run` of each block succeeds against the local registry for each base.
- [ ] Changelog `unreleased.mdx` and the owning docs (`WEBSITE.md`, `STYLES.md`) updated.
