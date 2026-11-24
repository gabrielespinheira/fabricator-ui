# Refine

The loop that ends every change to what a screen looks like: capture it, have it judged, agree what to fix, fix it, look again. It is part of the task. A build that was never looked at is unfinished, and the person who built a screen sees what they meant rather than what is there, so someone else looks.

## Size it

| The change | Capture | Judge |
| --- | --- | --- |
| One control, one label, a spacing fix | The page at 390, 834 and 1440 (anything can wrap), and the states the region shows | Yourself, with [judge.md](judge.md) |
| A region, a card, a state, an overlay | The page at every width, the region's states | A sub-agent when there is one |
| A screen, a redesign, a layout change | The full shot list | A sub-agent |
| A flow or several screens | The full list per screen | One sub-agent per screen, together, plus one shot of each neighbour |
| "Have a look", "what would improve it": a review, nothing built | The full list | A sub-agent; change nothing until answered, Broken included |
| "Make it look right": an existing screen to fix | The full list, as the "before" | A sub-agent; the request is the yes for Broken and Weak, ask about the rest |

Code that changes no pixel needs no refine.

## 1. Capture

**Before the first edit** of an existing screen, capture it. Those pictures are the "before", and they can't be taken later.

**After,** take the shot list. Six to twelve pictures is right for a screen:

- 1440 light, full page; 1440 dark.
- 390 light, first screen and full page; 390 dark.
- 834 light. On a screen with panels, 1280 with the sidebar and a panel open.
- Each state the feature has that looks different: empty, no results, error, limit, loading, denied, offline, longest content.
- Each overlay, opened: dialog, drawer, menu, popover. On 1440 and on 390 when it changes shape.
- A page taller than about 2,000px as consecutive screens: readers shrink tall pictures until the text is gone. A page that fits needs no second, "full" shot.
- More than a dozen states: keep those whose layout differs and those that fail worst, and drop pictures that differ only in words.
- For a native or desktop target: phone and tablet simulator, or the window, in both themes.

**How.** Use what the environment has: its browser or simulator tool first, then the project's Playwright, Puppeteer or end-to-end setup, then an installed Chrome. Installing something for this needs the user's yes. A browser that can't resize shows `390`, `834` and `1440` as `<iframe>`s of those widths on one local page. Reach states through query parameters, stories, mocks or by doing the thing; on phones, App Shell panels start closed, so open them by pressing what opens them.

**A shot is usable** when fonts and data have loaded, pending work has settled, animation has ended, no development overlay or cursor is in it, and the data is realistic. Open each one yourself before it goes to the judge: a half-loaded picture produces false findings. Save them outside version control as `<round>/<screen>-<state>-<width>-<theme>.png`, the same names every round, so pairs line up.

**Probe.** Run [probe.js](probe.js) in the page at each width (`page.evaluate` with the file's text, or the browser tool's script call). It reads the page, changes nothing, and returns what pictures miss: where each band of the page starts and the gap above it, text contrast, sideways scroll in the page or any region, text fields on screen, filled buttons, cut-off and shortened text, covered controls, small touch targets, unnamed controls, heading order. Add axe's violations and the console's errors when you can get them.

**Sweep** the changed files; every hit is replaced or justified:

```bash
rg -n 'space-[xy]-|\bdark:|(bg|text|border|ring)-(red|green|blue|amber|yellow|orange|gray|zinc|slate|neutral)-\d|shadow-(sm|md|lg|xl)|duration-\d|z-\d\d|border-[tblrse]\b|<(Separator|hr|select|input|textarea|button|table)\b|type="(date|time|number|color|file|range)"' <files>
```

Done when every shot on the list exists and has been opened, or is named as missing with the reason. Nothing can be rendered: say so, judge from code and types only, and never call it a visual review.

## 2. Judge

Hand it to a sub-agent whenever the environment has one that can open images (Agent, Task, `spawn_agent` or its equivalent): it has never seen the code, so it sees the screen. Run it in the background and keep working on anything that isn't the screen. Send this, filled in, and nothing more. Leave out the code, the diff, your reasoning and your own doubts; a judge handed a hypothesis returns it confirmed.

```text
You are the design judge for <screen> in <product>. Read <absolute path of this skill>/judge.md
and follow it exactly. Don't edit files. Return only what it asks for.

Job: <one person and what they came to do>
Focal point: <…>   Primary action: <…>   Signature: <…>
Platforms: <web, phone, desktop window, React Native>
Scope: <new screen | what changed, and what was there before>
Settled: <path of the project's DESIGN.md; the recipe it was built from; choices the user made>
Limits: <what it may open besides these pictures and this skill; anything it must not touch>

Pictures:
- <absolute path>  (1440, light, default)
- <absolute path>  (390, light, seats full)
- <absolute path>  (neighbouring screen, for consistency only)

Probe, axe and console:
<results>

Round: 1
```

From the second round, continue the same judge when the environment can, or start one with the same prompt; either way add the previous findings with what was done about each, and the "before" pictures beside the "after" ones.

No sub-agent: do it yourself as a separate pass. Finish the capture, put the code away, read [judge.md](judge.md), open the pictures again in its order, and write the findings down before opening a source file.

## 3. Check the findings

You know the code; the judge knows the picture. Go through every finding against both before showing it to anyone:

- **Confirm** it in the picture, and find the cause in the code. Two findings with one cause become one.
- **Reject** it, with a one-line reason, when it is a capture artefact, a settled decision, sample data or something the library owns. Keep rejections for the report.
- **Judge against recipe:** the recipe holds, unless the judge shows a measurement or a cost it didn't foresee. Then the page is right and the recipe is wrong here: fix the page and say so.
- **Sharpen** the fix to files and components, and size it: S (minutes), M (a component), L (a new shape).
- **Split** what this change caused from what was already there.

Broken things in what you just built are unfinished work: fix them now, recapture, and list them as fixed. Everything else waits for the answer. In a review nothing is yours to fix yet, so Broken leads the list.

Done when every finding is confirmed, rejected or fixed, and none reaches the user unverified.

## 4. Ask

Show the pictures that matter (the before and after, or the one or two with findings; their paths when the message can't hold pictures), then the list, worst first, leaving out sections that are empty:

```text
Looked at 9 shots: 1440, 834 and 390, light and dark, seats full, invite dialog. Verdict: refine.
Works well: roles edited in place; invitations among the people.

Fixed already
  1  Floating button covered the last row's menu (390)

Worth fixing
  2  Weak    Framed role select on all 20 rows is the loudest thing on the page
             → text with a ghost trigger, frame on hover                              S
  3  Weak    Seats block pushes the list to the second phone screen
             → one line in the lead with the warning badge                            S
Could be nicer
  4  Polish  Expired and undelivered invitations sort last
             → problems first                                                         S
Already there before this change
  5  Weak    Sidebar squeezes the page at 834px → rail under 1024px                   M
```

Then ask with the environment's question tool (AskUserQuestion, `request_user_input`, a choice card), or in the message when there is none. The question stands alone (some interfaces show only the dialog), so it carries the counts and names:

- **Fix the ones worth fixing (2, 3)**, recommended
- **Fix all of them (2, 3, 4, 5)**
- **Let me pick**, by number
- **Leave it as it is**

A **Rethink** is asked first and alone, with the new shape described in two lines and its size: reshape, refine the current shape, or leave. Findings on the old shape wait for that answer.

Don't ask when there is nothing left to ask, when the user already said to fix things or not to, or when nobody can answer (a routine, a sub-agent, a background job). Then fix Broken and Weak within the scope of the request, leave Polish and what was already there, and list them.

## 5. Fix

- By cause: the token, the shared component or the pattern first, then the instance.
- The smallest change that resolves it, inside the agreed list. What the judge listed under Keep stays as it is.
- Something new you notice goes on the list for the next round, not into the diff.

## 6. Look again

Recapture the same names into the next round's folder, and the pages that share what you changed. Put each pair side by side, then send them back to the judge with the previous findings and what was done. A fix that came back "worse" is reverted.

Stop when there is no Broken or Weak left, when a round brings only Polish, or after three rounds. A finding that survives two attempts is usually a shape problem: say so and ask.

Done when every agreed finding is fixed, or is named as not fixed with the reason.

## 7. Report

- Before and after pictures of what changed, at the widths where it shows.
- Fixed, declined, rejected (with reasons), and left for later, by number.
- What nobody looked at: widths, states, platforms, real devices.

**Learn from it.** A finding the user declines as a matter of taste is a settled decision: pass it to the next judge, and offer to record it in the project's `DESIGN.md`. A finding that comes back on a second screen is a missing rule: offer to add that too.
