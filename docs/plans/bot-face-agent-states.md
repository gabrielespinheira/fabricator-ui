# BotFace: agent states and fluid expressions

Status: implemented, 2026-11-16. Section 19 refines in-state motion and the questioning curl. Section 18 refines thinking; section 17 refines questioning; section 16 refines eye morphing. Section 15 removes playback controls; section 14 records custom colours and configuration code; section 13 records symbolic eyes and shape gestures. Earlier sections retain prior implementation results. Simulator visual/accessibility checks remain unavailable.

## 1. Direction

Keep the silhouette anchored and express the session through the eyes. Add a small, explicit state API, share the expression model across web and native, and preserve the displayed pose whenever a new state arrives.

The result should read as a calm assistant in a toolbar or conversation. Working, thinking and waiting for a person must be distinguishable without a bouncing body, changing size or relying on colour.

### Motion limits

- Keep the root dimensions, silhouette and centre fixed across states. Body translation stays at zero and body scale stays at one.
- Allow at most 6 degrees of body tilt, 14 degrees of pitch and 12 degrees of yaw. Listening nods in agreement, working turns with its scan, and idle keeps the body level.
- Cap combined gaze movement at 6% of the face dimension. At the existing 40px small size this is 2.4px. Validate the expression at that size before polishing the 120px demo.
- Carry emotion through independent eye opening, angle, curvature and gaze, plus waveform, loader, question and error contours. Keep two eyes; omit mouths, eyebrows, particles, whole-body spinning, flashing and whole-face opacity pulses.
- Keep the selected `shape`, `color`, `eyes` and `size`. A session state never changes those props implicitly.

These revised budgets keep the body anchored while making eye movement and expression legible. The first implementation was too restrained; the user requested clearer ongoing state animation.

## 2. Current component audit

Reviewed sources:

- [Shared web renderer](../../apps/web/registry/fabricator/shared/ui/bot-face.tsx)
- [Shared geometry and timing model](../../apps/web/registry/fabricator/shared/lib/bot-face-model.ts)
- [Native renderer](../../apps/web/registry/native/ui/bot-face.tsx)
- [Web style map](../../apps/web/registry/styles/fabricator/bot-face.css) and [native style map](../../apps/web/registry/styles/native/bot-face.css)
- [Current documentation](../../apps/web/content/docs/components/base/bot-face.mdx), examples and existing model/palette tests

| Before                                                                                                                                        | After                                                                                   | Why                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| No session or emotion state; every face shares idle glances and blinking                                                                      | Add `state`, backed by shared expression poses                                          | A running task, a question and a permission request communicate different things |
| Body follows gaze with up to 2% translation and about 9.85 degrees of rotation                                                                | Fixed centre and scale, with the small tilt budget above                                | The current maximum rotation is too large for the requested direction            |
| Both eyes use the same rectangle geometry and blink transform                                                                                 | Persistent, independently posed eyes with a shared blink envelope                       | Asymmetry and curvature provide expression without extra facial features         |
| The web effect resets transforms, gaze and its clock when `gaze`, `blink` or `followPointer` change                                           | Keep one animation lifecycle; update its targets independently                          | Controlled inputs should retarget the visible pose                               |
| `syncMotion()` resets the pose for class/style changes on the root and every ancestor, intersection callbacks and document visibility changes | Re-read effective motion settings; pause or retime only when needed, retaining the pose | An unrelated theme/layout update should not send the face through neutral        |
| Blink/glance timing and smoothing are fixed numbers; web only checks whether motion scale is zero                                             | Use Fabricator motion roles for transitions and named shared cadence values             | Scoped speed settings must work on both renderers                                |
| Tests cover gaze, blink, silhouettes and palette                                                                                              | Add session sequences and interrupted-transition checks                                 | Existing tests cannot establish continuity under rapid state changes             |

The reset paths are confirmed in source and reproduced in a real Chromium browser on all three web bases. Adding an unrelated root class cleared the body transform and restarted its settling motion. This establishes a continuity bug; whether an empty-transform flash is painted depends on frame timing. No claim that new state transitions are flicker-free can be made before implementation.

## 3. State vocabulary and expression design

Add `BotFaceState` and `state?: BotFaceState`, defaulting to `idle`. Preserve all existing props, exports and slots; add the `BotFaceState` export and root `data-state` attribute.

| State                 | Meaning                                                     | Expression and motion                                                                |
| --------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `idle`                | Ready, with no active work                                  | Relaxed, open eyes; long centred rests, occasional small glance and natural blink    |
| `listening`           | Receiving microphone input                                  | Two agreement nods with coordinated eye opening and vertical gaze                    |
| `thinking`            | Preparing a response or planning                            | Rotating eye arcs, alternating held looks toward the upper corners                   |
| `working`             | Executing a tool, generating output or waiting on a service | Focused eye scan with a coordinated restrained turn of the shape                     |
| `speaking`            | Audio playback is actually active                           | Six sound-wave bars, independent heights and cadence; no body pulse                  |
| `happy`               | Explicit positive feedback or successful run completion     | Shallow upward eye crescents; one small acknowledgement, then a held expression      |
| `sad`                 | An explicitly requested subdued emotion                     | Soft downward gaze and slightly inward-raised eye angles; no shake or repeated droop |
| `questioning`         | Waiting for clarification or an answer                      | Question-mark eyes and a gentle alternating inquisitive tilt                         |
| `awaiting-permission` | A manual approval is pending                                | Paired eye raises with a small expectant head lift                                   |
| `error`               | The current run has an unrecovered failure                  | Crossed error eyes and a slow settling lean, without flashing                        |

Keep `sad` separate from `error`. A denied permission or cancelled run should return to its actual session state without a disappointed response. Text streaming alone maps to `working`; `speaking` requires audio playback evidence.

The selected eye style shapes ordinary expressions and waveform caps; thinking, questioning and error use their own symbolic contours. Use one persistent path per eye with matching path commands across poses, generated from a small numeric geometry model. Auxiliary contours collapse into the eyes when unused, supporting punctuation and multiple bars without swapping nodes or crossfading duplicate eyes. Confirm crispness and contrast at 40px.

No amplitude, emotion-intensity, animation-preset or per-state timing props in this iteration.

## 4. Session integration

Keep transport events and SDK objects outside `BotFace`. The renderer receives a visual state; a pure mapper and a small optional controller turn a normalized session snapshot into that state.

```tsx
<BotFace state="working" aria-label="Assistant working" />

// Proposed optional helper; snapshot is supplied by the application's adapter.
const state = useBotFaceState(snapshot)
<BotFace state={state} aria-hidden />
```

The helper belongs to the BotFace item and uses a pure, tested `getBotFaceState` mapper. Direct `state` updates retarget immediately; only the session helper adds the brief presentation holds below. Avoid a global store or provider.

The normalized snapshot needs the current run identity, an ordered revision, lifecycle, active activity, unresolved manual permissions, unresolved questions, and an explicit completion outcome. Use discriminated types for lifecycle/activity. The application adapter assigns revisions at its session boundary, consolidates concurrent tools and validates external payloads with its existing schema boundary. A late event from an older run must not replace a newer snapshot.

Resolve the current run in this order:

1. Terminal failure → `error`; cancelled, stopped or paused → `idle`, accompanied by the application's accurate text label. Terminal runs clear obsolete blockers.
2. Any unresolved manual permission → `awaiting-permission`, even if another tool is still active.
3. Any unresolved user question → `questioning`.
4. Actual audio playback → `speaking`; microphone capture → `listening`.
5. Executing tools, streaming text or awaiting service results → `working`.
6. Explicit planning/reasoning activity, or a submitted request before output → `thinking`.
7. A confirmed successful run completion → one brief `happy` acknowledgement, then `idle`.
8. Otherwise → `idle`.

Rules for noisy sessions:

- Do not infer success from transport `ready`, a closed stream, or one completed tool. Require a successful run outcome and deduplicate its acknowledgement by run/completion identity.
- Keep permission state until every current manual request is answered or withdrawn. An approval response is not proof that execution has resumed; use the next session snapshot.
- An automatically resolved approval never produces `awaiting-permission`. User denial and intentional cancellation do not produce `sad` or a success acknowledgement.
- Ignore duplicate/older revisions and stale events from previous runs. On a deliberate session switch, cancel all old holds and retarget the same mounted face to the new session.
- Treat `working → ready → working` gaps within the same running turn as presentation noise. Initially hold the outgoing busy pose for 250ms before displaying idle; cancel that hold if work resumes. Never delay permissions, questions or failures.
- Coalesce ordinary activity changes within an initial 250ms presentation window. Enter busy immediately from idle; while already busy, display the latest target when the window expires rather than replaying queued expressions.
- Show completion feedback for an initial 750ms. New work, a question, an error or a permission request interrupts it immediately. These are semantic display holds, named and tested in the session model, independent of animation speed. With motion disabled the same feedback is a static expression; the hook does not need to inspect a DOM element or accept motion configuration.
- Status text and approval controls update immediately from real session state, independently of decorative pose holds.

Start with a documented adapter example for the installed AI SDK because Chat Input already uses `ready`, `submitted`, `streaming` and `error`. Its status alone cannot supply questions, manual approvals or reliable run outcomes. Inspect current tool parts and explicit application lifecycle events as well. Add another SDK adapter only when there is an actual consumer; introduce no agent SDK runtime dependency to the component.

## 5. Continuous animation model

Use the existing requestAnimationFrame renderer on web and Reanimated on native. Add no animation dependency. Keep the pure geometry, expression targets and transition calculations shared and compatible with native worklets.

Maintain three independent pieces of state:

1. **Expression:** current eye pose and target pose, including per-eye opening, angle, curvature and bounded body tilt.
2. **Attention:** current gaze and its target. Explicit `gaze` takes precedence; otherwise active-state attention takes precedence over pointer/touch tracking; ambient pointer/touch tracking applies in idle. Clamp the combined result once.
3. **Blink:** a stable per-instance phase that modulates the current expression's opening. Blinks never replace the expression or reset on state changes. `blink={false}` disables the blink envelope only.

Implementation rules:

- Mount one persistent body and eye subtree. Never key the face, SVG or eyes by state. Preserve all existing `data-slot` names.
- Keep current pose, velocity where needed, target and active-time clock outside React render state. Apply frame updates to leaf transforms/eye geometry, without a React render per frame.
- On a new state, retarget from the currently displayed pose. Do not clear transforms, reopen both eyes or move through idle first. Preserve velocity for continuously moving gaze channels; expression channels must at least preserve position and ease into their new target without overshoot.
- Keep cadence continuous for repeated updates to the same state. Token chunks must not restart blinks, scans or completion feedback.
- Use `move` for expression transitions and the established `settle` response for gaze. Read effective motion tokens from the rendered element; native resolves the same roles. Do not add literal easing curves to component source.
- Store slower glance/blink rhythms as named shared cadence values. Keep these calm under `snappy`; speed settings should not turn idle glances into rapid scanning.
- Restrict settings observers to checking effective values. Compare values before doing work. Ordinary class/style mutations do not reset the pose or rebuild subscriptions.
- Suspend the loop while offscreen or the document/app is inactive, retaining pose and phase. Rebase the previous-frame timestamp on resume so hidden time is not integrated as one large step. Read the latest target before resuming.
- Guard reduced motion and motion-off before starting a loop. With `animated={false}`, reduced motion or motion-off, show the requested static expression with centred gaze, open blink envelope and level body. This preserves the current documented absence of gaze motion while allowing static states to remain meaningful.
- At `instant`, keep static state poses and remove continuous movement. Retarget expressions according to the system's instant/reduced-motion policy without a travelling body.
- Initialize the static pose from the initial `state` during render, on both server and client. Start animation from that pose; hydration should not flash a neutral face first.
- Cleanup cancels frames, observers and presentation timers. React Strict Mode setup/cleanup must not create two clocks or trigger a visible neutral reset.

Small SVG eye morphs can require paint; measure them rather than assuming they are compositor-only. Do not animate root dimensions, layout, filters or whole-face opacity. The client adds zero new third-party dependency bytes; measure the compiled BotFace item delta after implementation.

## 6. Accessibility and component contract

- Remain decorative by default. If adjacent text already names the assistant and state, hide the face from assistive technology.
- Preserve the current labelled-image behavior for standalone identity. Let the application own a concise text status and, when needed, a polite live region that announces meaningful state changes once. Never announce frame updates or blink changes.
- Permission requests retain real, labelled approval/deny controls and an explanation in the surrounding UI. The face only indicates that attention is needed.
- Check that working, questioning and permission states are distinguishable in grayscale and with motion disabled. State information must also remain available in text.
- Preserve every existing prop, export, silhouette, eye style and size, plus platform element props and refs. The smaller ambient motion is an intentional visual refinement and should be called out in the changelog.
- Implement the same API and expression model in Base UI, Radix, React Aria and native. Web continues to use the existing shared source; native remains a renderer over the shared model.

## 7. Implementation sequence

1. **Model and failing tests.** Add expression geometry and state types to `shared/lib/bot-face-model.ts`; add colocated session mapping/controller tests before implementation. Cover the priority and lifecycle rules above using synthetic time and explicit event sequences.
2. **Web continuity.** Separate target updates from animation setup in `shared/ui/bot-face.tsx`; retain pose across updates, scope settings checks, and implement persistent eye geometry. First prove idle/working/permission transitions, then add the remaining expressions.
3. **Session helper.** Add `shared/lib/bot-face-session.ts` and `shared/hooks/use-bot-face-state.ts`. The hook only owns presentation timing; the application retains session/SDK I/O. Document the normalized snapshot and one tested AI SDK adapter example.
4. **Native parity.** Update `registry/native/ui/bot-face.tsx` with the same poses, clamps, interruption semantics, motion policy and hook API. Share the controller/model through the existing native registry mapping; handle native app visibility through its lifecycle boundary.
5. **Review demo.** Add `bot-face-states` examples for all web bases and expand the native example. Include manual state selection, slow playback, rapid switching and a scripted session: idle → thinking → working → permission → working → question → working → happy → idle. Include error, cancellation and denial sequences. Keep one face mounted throughout.
6. **Documentation and packaging.** Update all four BotFace docs pages, both design guides' BotFace entries, item description/files/dependencies in `registry/fabricator/registry.ts`, native registration/mapping as required, and `content/docs/changelog/unreleased.mdx`. Add any CSS tokens through the item's `cssVars` and preserve existing token meanings. Rebuild generated output through the full registry build.

Paths in this sequence are under `apps/web` unless stated otherwise. Do not hand-edit compiled `styles/`, public registry JSON or generated indexes.

## 8. Verification and acceptance

### Automated behavior

- Test state resolution with simultaneous tools/blockers, manual versus automatic approval, multiple pending requests, recoverable tool errors, terminal failure, cancellation, stale runs and duplicate completions.
- Use fake time to test busy-gap suppression, latest-target wins, completion interruption and timer cleanup. A completed tool must never acknowledge an unfinished run.
- Sample transition output at 60Hz and 120Hz. Assert pose continuity at interruption, finite geometry, fixed body centre/scale, bounded gaze/tilt, stable blink phase and equivalent results for equivalent elapsed time.
- Add a browser regression using the repository's Puppeteer convention. Exercise rapid state changes, changing controlled gaze, toggling blink, unrelated ancestor class/style changes, live motion settings, visibility resume, unmount and Strict Mode. Assert no neutral reset or subtree replacement. Inspect captured frames at normal and slow speed as well; numerical continuity alone cannot prove visual quality.
- Run the same scripted state sequences against Base UI, Radix and React Aria. Check native against the shared model fixtures and on simulators.

### Visual acceptance

- At 40, 80 and 120px, each state remains readable with a stable silhouette and no size/position jump. Prioritize small-size readability over a dramatic large demo.
- Inspect light/dark, grayscale, phone/desktop widths, all three eye styles, and a representative set of silhouettes. Sweep all silhouettes for clipping.
- Observe arbitrary mid-blink and mid-gaze interruptions. There must be no open-eye flash, duplicate eyes, neutral frame, replayed scan or body drift.
- Check all motion speeds, reduced motion and animation-off, both initially and when toggled live. Background/resume retains continuity and shows the latest session state.
- Check demo keyboard controls and axe on touched pages. Check VoiceOver/TalkBack with the application's separate text status and approval controls.
- Profile one face during a streaming session and a group of faces. No React commit per animation frame, no frames scheduled for inactive/offscreen faces, no per-frame layout reads, and no new console errors. Record timings and bundle delta rather than claiming an unmeasured frame rate.

### Repository completion checks

- [x] `bun run check` and `bun run test` pass.
- [x] Full `bun run registry:build` passes; committed generated indexes are updated and gitignored outputs are not staged.
- [ ] Local `add bot-face --dry-run` succeeds for every web base and a fresh Expo install resolves the new shared files.
- [x] Style coverage, contrast, motion and density checks pass; run upstream parity when an upstream style map/build path is affected.
- [ ] `bun run native:parity`, native docs generation, mobile types and applicable mobile checks pass. Inspect iPhone/iPad and Android, and report unavailable device/accessibility checks explicitly.
- [x] All touched docs and the unreleased changelog describe the final API and motion policy.
- [x] Screenshots/frame evidence and test results are recorded before calling the implementation complete.

## 9. Audit evidence and limits

- Passed: existing BotFace model and palette tests, 2 files and 7 tests (`bun run test -- bot-face-model bot-face-palette` from `apps/web`).
- Reviewed: the live local Base UI documentation demo in Relay at desktop width, including its dark appearance. This is a baseline review, not verification of the proposed states.
- Reproduced: on Base UI, Radix and React Aria, let pointer tracking settle, observe the body style, then add an unrelated class to the root. Each cleared its transform and restarted near 4.12 degrees after holding about 9.33 degrees. The following frames settled back toward the old gaze. This confirms a reset, without claiming a frame-by-frame visual flash was observed. The temporary probe and raw output are in `tmp/bot-face-audit.mjs` and `tmp/bot-face-audit.json` (gitignored); the reproduction steps and result are retained here.
- Passed: plan formatting, local link validation and `git diff --check`.
- Full repository checks, registry rebuild, new-state visual/axe checks and device checks are deferred to implementation because this task changes only the plan. Native conclusions here come from source review.

## 10. Primary references

- React documents effect cleanup on changed dependencies and its extra development setup/cleanup cycle. These lifecycle rules support keeping animation targets independent from effect setup: [useEffect](https://react.dev/reference/react/useEffect).
- MDN documents timestamp-based animation and background-tab suspension. Resume must account for the clock boundary: [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame).
- AI SDK documents chat transport statuses and tool approval states separately. Manual and automatic approvals can share approval states, so the adapter must inspect whether human action is pending: [chat status](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot#status), [tool approvals](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage#client-side-approval-ui). SDK-specific code must be checked against the installed version when implemented.

## 11. First implementation results

Implemented the ten-state API, persistent eye geometry, bounded gaze/tilt and pose-preserving motion on all three web bases and native. The shared motion solver uses exact critically damped integration, with the existing move/settle durations, so gaze retains its velocity on interruption. Web settings changes retime the existing loop, and visibility pauses retain the pose and clock. Native pauses on app inactivity; it does not independently detect clipping inside arbitrary scroll views.

The optional `useBotFaceState` hook and pure session controller ship with the item. Revisions increase across runs within a conversation. Ordinary activity changes and busy-to-idle gaps have a 250ms presentation hold; successful completion is acknowledged once for 750ms. Questions, manual permissions, errors and new runs interrupt immediately. The docs describe the application-owned SDK boundary, including current AI SDK manual/automatic approval fields verified against the installed source. No SDK or animation dependency was added.

### Verification

- Passed: `bun run check` (20 tasks) and `bun run test` (9 tasks; web: 189 files, 3,508 tests). An initial check raced the registry build's temporary-file cleanup; the completed build was followed by clean runs. An initial full test run had icon-loader teardown rejections; subsequent full runs passed.
- Passed: full `bun run registry:build`, including native output, after the final component changes. Committed example indexes were rebuilt; nothing is staged.
- Passed: `bun run test:parity`; all compared upstream items match.
- Passed: `bun run native:parity` (110 of 112 components clean, no gaps; the two existing Data Table deferrals remain), mobile types, and regenerated native docs.
- Passed: local `shadcn add --dry-run` for Base UI, Radix, React Aria and native payloads. Each web install resolves the component, three models and the session hook. Native also resolves its existing motion dependencies.
- Passed: Expo iOS production export, 4,991 modules, including the new Reanimated eye geometry. This verifies bundling, not on-device rendering or frame rate.
- Browser regression: real pointer and keyboard state selection, persistent face/eye nodes, unrelated-class continuity, phone/desktop widths, light/dark, reduced motion, and axe on the playground and BotFace docs content. The final run also exercises the complete timed session sequence.
- Reviewed: Relay's running documentation page and saved desktop/phone screenshots. Browser evidence lives in `tmp/bot-face/browser/`; detailed check/build/install logs are under `tmp/bot-face-*`.

### Bundle cost

Measured with Bun's minified browser bundler and gzip, excluding the existing shared React, JSX runtime, `cn` and class-variance-authority dependencies:

| Entry                                  | Before           | After            | Change                   |
| -------------------------------------- | ---------------- | ---------------- | ------------------------ |
| BotFace with its models                | 3,067 bytes gzip | 4,330 bytes gzip | +1,263 bytes             |
| BotFace plus the optional session hook | —                | 4,914 bytes gzip | +584 bytes over the face |

These are isolated entry measurements, not a complete application bundle. The measurement is saved in `tmp/bot-face-bundle.json`.

### Remaining limits

- Relay refused simulator boot because both agent device slots were occupied by another project's active run. iPhone/iPad/Android visual checks, VoiceOver/TalkBack and real-device frame profiling were not run. No device lease was displaced.
- A full-page axe audit also found the existing sidebar search `⌘K` label's colour contrast. BotFace's own docs content and playground are checked separately; the sidebar component was not changed.
- A fresh Expo dependency installation was not performed. The native payload dry run and existing Expo app's typecheck/production export passed.
- The global `registry:capture` and `pages:capture` commands target block thumbnails and the dashboard/tasks/playground/authentication static page assets. Those assets are unchanged; BotFace screenshots were captured by its browser regression instead.
- No production frame-rate claim is made. The shared solver's 60/120Hz equivalence, motion bounds and interruption behavior are covered by tests.

## 12. Revision: expressive gestures and one configurable preview

The first pass separated state selection from appearance controls and made most states static. The revised playground combines state, shape, palette/theme colour and eye style on one persistent face. Appearance selections survive state changes and scripted session playback. The native demo combines these controls too.

| Before                                                      | After                                                                     | Why                                                                               |
| ----------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Separate state and appearance previews                      | One larger preview with all four controls                                 | Judge the actual combination being selected                                       |
| Most emotions remain static after entering                  | A distinct state-local gesture for every state                            | Read activity from motion as well as from the label                               |
| Gaze limited to 3%; eyes have fixed width                   | Gaze up to 6%, coordinated width/opening/curvature/spacing                | Make changes legible at avatar sizes without moving or resizing the body          |
| Slanted eyes keep the same diagonal even in a smile         | Expression-dependent slant, with rounded eye caps and a curved centreline | Smiles, drooping lids and focused eyes should have different silhouettes          |
| A shared clock can enter a state midway through its gesture | Separate gesture playback and continuous blink clocks                     | Start the new gesture while preserving the current pose, velocity and blink phase |

### Gesture direction

- **Idle:** unhurried glances, small eye breathing and independent blinking.
- **Listening:** upright, receptive eyes that open and lift together on a two-second cadence.
- **Thinking:** asymmetric lids and held upward glances that alternate sides.
- **Working:** narrow, wider eyes scanning left and right with pauses and a slight downward line change.
- **Speaking:** staggered eye opening and width changes, rather than a nearly invisible uniform pulse.
- **Happy:** clearly curved smiling eyes, rising slightly and widening through the smile; a small alternating tilt.
- **Sad:** downcast curved lids and a slow eye-level exhale, distinct from an execution error.
- **Questioning:** one tall raised eye and one flattened eye, with an inquisitive bounded tilt.
- **Permission:** paired eye raises in two beats, followed by a forward-facing hold. The body stays level.
- **Error:** unequal eye shapes and a concerned lean, without flashing or repeated shaking.

The eye silhouette remains rounded in slant/dot mode and softly square in square mode. One persistent closed path per eye morphs throughout. Body translation and scale remain zero and one; tilt remains within three degrees. Reduced motion retains a readable static pose.

### Reference study

The reference study informed the emphasis on coordinated eyelid shape, gaze and timing. These are design choices for BotFace, not a claim that its states have been validated in a perception study. The robot-eye research evaluates nonverbal expression through eye-region features: [Penčić et al., 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9024502/). The RoboEyes documentation demonstrates separate controls for mood, curiosity and gaze: [FluxGarage RoboEyes](https://github.com/FluxGarage/RoboEyes). No third-party implementation was copied.

Frame studies across all ten states and all three eye styles were generated and inspected in `tmp/bot-face-study/`. They exposed angular end-cap artifacts in the first curved geometry; the revision uses rounded cubic corners and bends the complete eye centreline. The browser regression now checks that shape, colour and eyes can be changed in the actual docs preview and are retained through state changes.

### Revision verification

- Passed: `bun run check` (20 tasks), `bun run test` (9 tasks; web: 189 files and 3,512 tests), and all 23 focused BotFace tests.
- Passed: full `bun run registry:build` after the final source changes; generated indexes and native output rebuilt. No generated files were hand-edited or staged.
- Passed: browser regression on Base UI, Radix and Aria. It exercises combined shape/colour/eye/state selection on the actual docs page, retention of appearance, scripted session playback, persistent nodes, interrupted transitions, keyboard controls, light/dark, 390/1280px widths, reduced motion and axe on BotFace's docs content.
- Passed: mobile types, native API parity (the same two pre-existing Data Table deferrals), and the Expo iOS production export. Simulator slots remain occupied; native visual and VoiceOver/TalkBack checks remain unavailable.
- Passed: install dry runs for Base UI, Radix, Aria and native registry payloads. No dependency installation or new runtime dependency was needed.
- Reviewed: frame sequences captured from the actual running component in `tmp/bot-face-gestures/contact.png`, in addition to the pure geometry studies. Working visibly scans, speaking alternates eye articulation, happy and sad have distinct curved lids, and permission uses paired attention raises. The first captured frame includes the ongoing transition; it does not reset to neutral.
- Bundle measurement: the isolated face with models is 5,313 bytes gzip (983 bytes over the first implementation); including the optional session hook is 5,879 bytes gzip. Same excluded shared dependencies and measurement method as section 11. Saved in `tmp/bot-face-revision-bundle.json`.
- Full check/build/browser/native-export logs use `tmp/bot-face-revision-*`. The existing sidebar shortcut contrast finding and unavailable native device checks from section 11 remain outside this revision's verified scope.

## 13. Revision: symbolic eyes, shape gestures and grouped controls

The playground now puts shape, palette/theme colour and eye controls in an Appearance column on the left. Agent states and Play session, Pause motion and Slow playback share the right column. The two groups stack on a phone and continue to control one persistent face.

The motion model now includes explicit waveform, loader, question and error contours. Speaking has six independently animated bars; thinking has rotating eye arcs and held upper-left/upper-right gaze; questioning has question-mark eyes; error has crossed eyes. Each eye retains one SVG node with three matching contour paths. Auxiliary contours collapse into the ordinary eye when unused, allowing interrupted morphs without swapping nodes or opacity layers. Symbols stay open while the existing blink clock continues, so returning to an ordinary expression retains its phase.

Listening makes two agreement nods with coordinated eyelids and vertical gaze. Working turns with its scan. Happy, sad, questioning and permission have coordinated head angles. Root position and dimensions stay fixed and no scale or translation is applied. Body rotation is bounded to 6 degrees of tilt, 14 degrees of pitch and 12 degrees of yaw. Pitch and yaw slightly change the projected silhouette. The shared solver retains the pose and velocity on every change, on both web and native; reduced motion levels the head and retains a static expression.

The selected eye style still affects ordinary expressions and waveform caps. Thinking, questioning and error use their symbolic shapes across all three styles. This is documented rather than silently claiming the original eye silhouette remains unchanged.

The new behavior tests were run failing before implementation, then passed. They cover independently moving waveform bars, rotating upper-corner thinking eyes, symbol legibility through blinking, coordinated head movement, consistent contour commands and interruption continuity. Browser checks exercise the actual docs waveform as well as the standalone playground, preventing an old docs bundle from passing on state labels alone.

### Verification

- Passed: `bun run check` (20 tasks), `bun run test` (9 tasks; web: 189 files, 3,516 tests) and all 27 focused BotFace tests.
- Passed: the full `bun run registry:build` after the final product-source changes, including native output. Generated files were rebuilt; nothing is staged.
- Passed: Base UI, Radix and Aria browser assertions for the two-column grouping, all combined controls, visible shape/eye movement in listening/thinking/working/speaking, fixed layout, interrupted states, persistent nodes, session playback, keyboard, reduced motion and axe. Standalone widths: 390, 640, 768 and 1280px; actual docs: phone/desktop and both themes, including an explicit speaking-waveform geometry check.
- Reviewed: the fresh running docs in Relay with the waveform visible, all ten states in actual browser frame sequences (`tmp/bot-face-gestures/contact.png`), and all three eye styles in the geometry studies (`tmp/bot-face-study/`). Phone and desktop dark screenshots show the grouped controls. Old open dev tabs were refreshed after regeneration before judging the final result.
- Passed: native API parity (110/112 components clean with the same two existing Data Table deferrals), mobile types, native docs regeneration (105 pages), and Expo iOS production export. The normalized session boundary and public component API are unchanged.
- Passed: local Base UI, Radix, Aria and native install dry runs, and `git diff --check`. No dependency was installed or added.
- Bundle cost: 6,477 bytes gzip for the isolated face and models, 1,164 bytes over section 12; 7,051 bytes with the optional session hook. Same exclusions and method as section 11. Measurement: `tmp/bot-face-symbols-bundle.json`.
- Logs use `tmp/bot-face-symbols-*`. Native device visuals, VoiceOver/TalkBack, fresh Expo installation and real-device profiling remain unverified. Relay still reports both simulator slots occupied. The existing sidebar shortcut contrast issue remains outside the BotFace docs-content audit.

## 14. Revision: gray, custom hex colours and configuration code

`BotFaceColor` now accepts named colours plus `#`-prefixed CSS hex strings with 3, 4, 6 or 8 digits. The new `gray` preset is a medium gray in both themes, distinct from the foreground-based `neutral`. Existing theme-role values remain valid. Web and native use the same validated hex parser and select black or white eyes from the RGB fill's relative luminance. Alpha is retained; the actual contrast of a translucent fill depends on its backdrop.

The hex parser is the existing Color Picker model's `parseHex`, now exported. BotFace installs that shared model too. It does not install the Color Picker UI or introduce a runtime package dependency.

The docs playground removes its Theme options and offers eleven named colours plus the existing `ColorPickerPopover` under Custom. Opening Custom selects the retained custom value. The picker updates the face without remounting it; palette selection preserves the custom value for the next use. The native example offers the same colour choices.

The configuration block displays the matching import and component props, including shape, colour, eyes, state, size and animation setting. Slow playback adds the region's `data-motion` value. Scripted playback updates the displayed state in the code. Copy uses the existing clipboard hook and reports success after the actual write.

New model tests were run failing before implementation and then passed. Browser coverage exercises gray selection, the real Color Picker, hex painting, configuration changes and an actual clipboard write/read. Its initial run failed on the old renderer ignoring the hex fill, before the registry rebuild.

### Verification

- Passed: `bun run check` (20 tasks), `bun run test` (9 tasks; web: 189 files, 3,519 tests), including all 30 BotFace tests. An initial full run hit the unrelated spinner consumer-typecheck test's 5-second timeout under load; the full rerun passed without changing that test.
- Passed: full `bun run registry:build` after the final product/example changes. The shared colour model is included in web and native install payloads. Generated files were rebuilt, not edited by hand, and nothing is staged.
- Passed: Base UI, Radix and Aria browser checks, including gray, Custom picker typing/Enter/Escape, matching code for selected appearance/state/playback settings, actual clipboard write/read and hex fill painting. The picker and docs configuration pass axe after the popup entrance settles. Phone/desktop, light/dark, keyboard and the existing motion/continuity checks pass.
- Fixed during verification: the configuration block now explicitly uses foreground text instead of inheriting the docs preview's muted prose colour. Native status-colour examples keep the preserved theme API covered without adding Theme options to the playground.
- Reviewed: the live Custom picker in Relay and the live configuration/Copy action in the actual docs. Screenshots: `tmp/bot-face-color-picker-open.png`, `tmp/bot-face-color-configuration-docs.png` and the updated phone/desktop browser captures in `tmp/bot-face/browser/`.
- Passed: upstream parity, native parity (110/112 clean; the same two existing Data Table deferrals), native docs generation (105 pages), mobile types, Expo iOS production export and all four install dry runs.
- Bundle: isolated face/models 6,942 bytes gzip, +465 bytes over section 13; with the optional session hook, 7,518 bytes gzip. Same exclusions/method as section 11. No new package dependency. Measurement: `tmp/bot-face-color-bundle.json`.
- Logs use `tmp/bot-face-color-*`. Native device visuals and screen readers remain unverified because both Relay simulator slots are occupied. The prior full-page sidebar contrast finding remains outside the BotFace docs-content audit. No fresh dependency installation was performed.

## 15. Revision: remove playback controls

Removed Play session, Pause motion and Slow playback from all three web playgrounds, along with their session script, timers, state and hook import. Manual state selection, appearance choices, Custom Color Picker and live copyable configuration remain. The configuration omits the removed animation/speed options. The native example also removes its pause toggle; the component API and agent-session hook remain available to applications.

Updated the browser regression for the simpler controls and removed obsolete scripted-playback steps. Existing state-transition, colour-picker, clipboard, keyboard, theme, width and accessibility coverage remains.

Only existing examples, docs and browser checks changed. The component, style maps and registry declarations are unchanged from section 14. The examples build refreshed previews; the final full registry build also refreshes compiled examples, native output and the generated indexes' canonical formatting.

- Passed: `bun run check` (20 tasks), `bun run test` (9 tasks; web: 189 files and 3,519 tests), the final full `bun run registry:build`, native parity, mobile types and native docs generation (105 pages).
- Passed: updated browser checks on Base UI, Radix and Aria, including absence of the controls, retained state/appearance/Custom/Copy behavior, light/dark, keyboard, phone/desktop widths and scoped axe. Verified compiled example sources contain none of the removed controls.
- Reviewed: the running docs in Relay (`tmp/bot-face-controls-docs.png`) and the updated dark phone capture in `tmp/bot-face/browser/`. No new dependency or component API change; nothing staged. Logs: `tmp/bot-face-controls-*`.
- Native device visuals remain unverified: both Relay simulator slots are still occupied. No fresh install, device build or upstream parity run was needed for these demo-only edits; component payloads and style maps are unchanged from section 14.

## 16. Revision: morph the visible eye outlines

The previous renderer blended expression parameters and unrelated cubic control points. This created pinched intermediate shapes, and the loader could nearly disappear when its rotation vector crossed zero on exit. The before/after study in `tmp/bot-face-morph/comparison.png` reproduces the loader pinch at 50ms and shows the revised transition retaining its visible outline.

The new shared `bot-face-eye-morph` model samples each closed contour at 48 equal perimeter distances. On a state or eye-style change it matches contour winding and chooses the cyclic correspondence with the least travel from the current visible outline. That correspondence remains fixed during the state's gesture. Exact critically damped integration preserves every point's velocity when interrupted. The response uses the average of the existing move/settle timings; scoped speed settings still apply.

Additional bars and question dots grow from a nearby point on the current eye boundary and merge into a nearby point on the destination eye. Smooth quadratic contours avoid corner overshoot. Each renderer keeps the same two SVG path nodes and three closed contours per eye, with no opacity crossfade or neutral reset. Initial and static rendering use the same sampled geometry as animation. Motion-off/reduced motion use the target immediately; resuming matches from that visible outline. The body, gaze and blink clock retain their existing solver and lifecycle.

Both web and native renderers use this model; no props or controls were added. The new model is included in all install payloads and native shared-file mapping. No new package dependency was introduced.

Six new behavior tests cover every ordered state pair across the three eye styles, nonzero eye area, bounded frame movement, retained position/velocity on interruption, loader exits at different rotations, 60/120Hz equivalence, motion-off and rapid state/style interruptions. The existing browser regression additionally verifies the new quadratic morph paths in the actual docs.

### Visual and performance evidence

- Reviewed the before/after comparison and actual running-browser transition frames in `tmp/bot-face-morph/browser-frames.png`. The latter captures both eyes at roughly 50ms intervals across six transitions. Raw snapshots are in `browser-frames.json` alongside it.
- The standalone browser samples recorded 30 animation frames in approximately 500ms for each of those transitions. This is a local observation, not a production or native frame-rate claim.
- Pure morph stepping plus formatting both eye paths averaged 0.195ms per frame over 1,200 frames in Bun, including regular retargets. This excludes browser SVG paint and native rendering. Measurement: `tmp/bot-face-morph-timing.json`.
- Isolated face/models: 8,027 bytes gzip, +1,085 bytes over section 14; with the optional session hook: 8,602 bytes gzip. Same method/exclusions as section 11. Measurement: `tmp/bot-face-morph-bundle.json`.

### Verification

- Passed: `bun run check` (20 tasks), `bun run test` (9 tasks; web: 190 files, 3,525 tests), including all 36 focused BotFace tests. An earlier check caught formatting in two concurrently edited setup files; the final full check passes without modifying those files here.
- Passed: the final full `bun run registry:build`, upstream parity and Base UI, Radix, Aria and native install dry runs. Generated output was rebuilt; no dependency was installed or added and nothing is staged.
- Passed: browser regression on all three web bases, including actual docs geometry, every state, interrupted transitions, persistent SVG nodes, appearance controls, Custom Color Picker, real clipboard copying, absence of playback controls, light/dark, keyboard, 390/640/768/1280px widths and scoped axe.
- Reviewed: the running docs in Relay with the thinking eyes visible (`tmp/bot-face-morph-docs-final.png`), plus the before/after and actual browser frame studies listed above.
- Passed: mobile types, native parity (110/112 components clean with the same two existing Data Table deferrals), native docs generation (105 pages) and Expo iOS production export. Native and web use the same contour model and public API.
- Passed: `git diff --check`. Logs use `tmp/bot-face-morph-*`. No commit or push was made.
- Native device visuals, VoiceOver/TalkBack and real-device performance remain unverified: both Relay simulator slots are occupied. The existing full-page sidebar shortcut contrast finding remains outside the BotFace docs-content audit.

## 17. Revision: questioning eyes with a short curl

Replaced the thin question-mark glyphs and detached dots with thick, connected eye contours. A shallow curl suggests a question while the substantial lower half retains the eye silhouette. The left eye is shorter and raised relative to the right, and dot/square styles retain compact proportions. The existing inquisitive head tilt and gaze remain. Questioning now blinks naturally; loader, waveform and crossed eyes keep their existing blink treatment.

The shared contour recipe updates all three web bases and native together. The matched-outline morph engine is unchanged, including retained velocity and persistent SVG nodes. No props, controls, dependency or style-map changes were added.

Reviewed two shape iterations at 32, 48 and 120 pixels and an idle-to-questioning frame study (`tmp/bot-face-curious/study.png`). Regression tests first failed on the old detached dots and suppressed blinking. They now require compact, connected questioning eyes, distinct eye-style proportions and natural blinking. The browser regression also checks the actual docs for a compact questioning contour with collapsed auxiliary paths.

### Verification

- Passed: `bun run check` (20 tasks), `bun run test` (9 tasks; web: 190 files, 3,526 tests), including all 37 focused BotFace tests.
- Passed: full `bun run registry:build` after the final source changes, and local Base UI, Radix, Aria and native install dry runs. Generated files were rebuilt; nothing is staged.
- Passed: browser regression across all three bases, including the actual docs' compact questioning geometry, state transitions, persistent paths, selected appearance, Custom/Copy, keyboard, reduced motion, phone/desktop widths, light/dark and scoped axe.
- Reviewed: the running questioning expression in Relay (`tmp/bot-face-curious/docs-desktop.png`), the 32/48/120px study and actual docs transition frames (`tmp/bot-face-curious/browser-frames.png`).
- Passed: mobile types, native parity (110/112 components clean with the same two Data Table deferrals), native docs generation (105 pages) and `git diff --check`. Web/native continue to share the pure contour recipe.
- Updated the three web component docs, design specs and unreleased changelog. No API or token change. No new dependency; isolated face/models measure 8,060 bytes gzip (+33 bytes), or 8,631 bytes with the session hook, using the same exclusions as section 16. Measurement: `tmp/bot-face-curious-bundle.json`.
- Native simulator/mobile visual checks, VoiceOver/TalkBack and real-device profiling remain unverified; Relay reports both agent simulator slots occupied. Fresh Expo installation/export, upstream parity and whole-catalog recapture were not repeated for this exclusive shared-geometry change; native types/install checks and targeted state captures cover the changed payload and appearance. No commit or push was made. Logs use `tmp/bot-face-curious-*`.

## 18. Revision: focused thinking eyes

Replaced the rotating arc eyes with focused eyes in the selected Slanted, Dots or Squares style. Thinking holds an upper-corner glance before searching the opposite corner. Brief staggered eye lifts and squints create a left-to-right processing rhythm, with pauses between gestures. Eye opening, width, curvature and vertical position coordinate with the gaze. The existing bounded head turn and upward pitch remain, with a small lift accompanying each eye gesture. Thinking now blinks naturally.

Removed the unused loader contour, rotation vectors and loader blend weight from the shared internal pose model. Public component props and state values are unchanged. Web and native use the same target recipe; the persistent paths, matched-outline morphs and retained point velocities are unchanged. No controls, dependency, token or style-map changes were added.

New behavior coverage first rejected the old uniform arc geometry, unchanged eyelids and suppressed thinking blinks. The 38 focused BotFace tests now cover held upward glances, staggered eye articulation, compact style-specific still eyes, natural blinking, every state-pair morph and interrupted thinking gestures. The browser regression checks the actual docs for focused dot-eye proportions and audits thinking in both themes and phone/desktop widths. The source shape study compares the old and new cycle across all three eye styles and checks 32/48px output (`tmp/bot-face-thinking/study.png`).

### Verification

- Passed: all 38 focused BotFace tests and `bun run test` (9 tasks; web: 190 files, 3,527 tests).
- Passed: full `bun run registry:build` after the final source changes, and local Base UI, Radix, Aria and native install dry runs. Generated output was rebuilt.
- Passed: browser regression on all three bases, including actual thinking geometry, state/style transitions, persistent paths, appearance/Custom/Copy controls, keyboard, reduced motion, phone/desktop widths, light/dark and scoped axe.
- Reviewed: the running thinking expression in Relay (`tmp/bot-face-thinking/docs-desktop.png`), the small-size source study, and actual element screenshots across the thinking cycle and interrupted transitions (`tmp/bot-face-thinking/browser-frames.png`).
- Passed: isolated strict TypeScript consumer check of the current BotFace source, scoped ESLint/Prettier, mobile types, native parity (110/112 clean with the same two Data Table deferrals), native docs generation (105 pages) and `git diff --check`.
- Repository-wide `bun run check` did not pass: unrelated concurrent edits leave `packages/setup/src/plan.test.ts` unformatted. A separate web typecheck reported possibly undefined `node.children` in `project-tree.tsx` and incomplete `platform-contracts` imports/types while that work was in progress. Those files were left untouched; the isolated current-source BotFace consumer passes. Logs: `tmp/bot-face-thinking-check.log`, `tmp/bot-face-thinking-web-types.log` and `tmp/bot-face-thinking-consumer-types.log`.
- Updated component docs, design specs and unreleased changelog. No new dependency; isolated face/models measure 7,818 bytes gzip, 242 bytes smaller than section 17, or 8,385 bytes with the session hook. Same method/exclusions as before; `tmp/bot-face-thinking-bundle.json`.
- Native device visuals, VoiceOver/TalkBack and real-device performance remain unverified; both Relay simulator slots remain occupied. Fresh Expo installation/export, upstream parity and whole-catalog recapture were not repeated for this exclusive shared-model change; types/install checks and targeted state captures cover the changed payload and appearance. This task ran no commit or push command. Logs use `tmp/bot-face-thinking-*`.

## 19. Revision: alive gestures and a questioning curl

Questioning keeps a rounded eye body and bends a thick curl from the upper-right corner. The curl eases from a softer eye to a clearer hook and back. The left eye leads; the right eye uses a milder curl. Slanted, Dots and Squares stay in their own proportions. The still pose, used when motion is reduced, already shows the curl.

Inside each state the shape holds, then moves. Idle breathes and follows its glance. Listening lids lead the two nods. Thinking holds an upward look, then shifts, with a staggered lift and squint. Working squints on each saccade. Speaking pulses the six bars. Happy plays two smile beats. Sad droops and partly recovers. Permission raises one eye ahead of the other. Error settles the crosses slowly and unevenly. Eye shape and symbols use a shorter channel than the head, so the expression arrives and the head follows. Root position and size stay fixed. The existing critically damped solver keeps rapid state changes continuous.

### Verification

- Passed: 41 BotFace tests across motion, morph, session, model, palette and native geometry. The questioning test requires a connected eye, a wide lower half, and a visible curl change over the cycle.
- Passed: `bun run registry:build` after the final contour. Generated styles include the curl.
- Passed: browser regression on Base UI, Radix and Aria, including state transitions, persistent paths, keyboard, phone and desktop widths, light and dark, and scoped axe. Log: `tmp/bot-face-alive-browser.log`.
- Reviewed: the running docs in Relay, plus cropped frames of the questioning cycle at 120ms, 1400ms and 2300ms, and Dots, Squares, listening, thinking, working, speaking and happy (`tmp/bot-face-alive/docs-q-1400.png` and the sibling captures). Happy was reached from questioning through the state controls.
- Scoped ESLint and Prettier on the motion module passed. `git diff --check` is clean for the BotFace files.
- Docs already describe the curl easing between a softer eye and a clearer question, with one eye leading and the head following. No API or dependency change.
- Native device visuals remain unverified. Both Relay simulator slots are on hard leases for other work. No commit or push. Logs use `tmp/bot-face-alive-*`.
