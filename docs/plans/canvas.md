# Canvas: plan

Status: built on the web (Base UI, Radix, React Aria) and React Native on 2026-11-27; §21 lists what the build changed against this plan, what was checked and what is left.

A Fabricator-exclusive `canvas` item in the Advanced group: an infinite, zoomable surface of nodes and edges for workflow editors, diagrams, flowcharts, mind maps, schema and architecture maps, and read-only graphs embedded in a page. Web and desktop draw it with React Flow 13 (`@xyflow/react`), restyled entirely by our style map. React Native draws it with our own engine on Reanimated, Gesture Handler and `react-native-svg`. Both run on one shared model and expose the same exports, props and callbacks.

Facts about React Flow were checked against reactflow.dev, xyflow.com, npm and the `@xyflow/system` 1.0.1 source on 2026-11-26; §19 lists what wasn't.

---

## 1. Summary of decisions

| #   | Decision                                      | Pick                                                                                                                                                                       |
| --- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Name                                          | `canvas` ("Canvas"). Free in upstream's catalog (`shadcn search @shadcn -q canvas`, 2026-11-26)                                                                            |
| D2  | Web engine                                    | `@xyflow/react` 13.0.3, exact-pinned, behind a fixed set of engine files; `base.css` only, every visible style from our style map                                          |
| D3  | Native engine                                 | Our own, on Reanimated 4, Gesture Handler 3 and `react-native-svg`, which the native tree already depends on. No new native dependency                                     |
| D4  | Data shape                                    | Our `CanvasNode` and `CanvasEdge` types are a structural subset of React Flow's `Node` and `Edge`, so existing React Flow data drops in and the web adapter copies nothing |
| D5  | Edge geometry                                 | Vendored into the shared model from `@xyflow/system` (MIT) as worklet-safe functions; both platforms draw identical paths. A fixture test compares them to upstream        |
| D6  | Undo, clipboard, validation, keyboard connect | Ours, in the shared model. React Flow ships none of them                                                                                                                   |
| D7  | React Flow UI                                 | Read as upstream, never installed: its items use bare shadcn names (contract 3) and shadcn's look. We rebuild the useful ones as our parts                                 |
| D8  | Auto layout                                   | A separate optional item, `canvas-layout`, on `@dagrejs/dagre` 3.1.4 (MIT) behind a layout port. `elkjs` (EPL-2.0 or GPL-3.0) stays a consumer opt-in                      |
| D9  | Interaction modes                             | One `mode` prop: `edit`, `view` (pan, zoom, select; nothing changes) and `static` (an illustration that fits itself and lets the page scroll)                              |
| D10 | Mutations                                     | Sync by default; async `onConnect` / `onDelete` / `onNodesChange` handlers get optimistic display, revert on rejection and a Retry toast, as Event Calendar does           |

§18 records the calls taken on 2026-11-27: attribution hidden, native in 1.0, layout in 1.0, the name `canvas`, design-tool panning.

---

## 2. Scope

### In (1.0)

- **Surface:** pan, zoom, fit view, zoom limits, a dot, line or cross grid that follows the zoom, snap to grid, alignment guides while dragging, auto-pan at the edges while dragging or connecting.
- **Nodes:** our node parts (header, icon, title, description, content, footer, handles, status, toolbar), a default node, a note node, a group node with children (subflows), resize, collapse, per-node colour from the palette, semantic zoom (detail drops away below a zoom threshold).
- **Edges:** bezier, smooth step, step and straight; arrow markers; labels; an edge with an insert button; animated flow for running pipelines; reconnect by dragging an end.
- **Connections:** typed handles, a validator (type match, max connections, no cycles, no self loops), an invalid-connection state with its reason, connect on drop onto a node body, keyboard and menu connect.
- **Editing:** select, marquee and multi-select, move with mouse, touch and keys, delete, duplicate, copy and paste (within and between canvases), undo and redo with drag coalescing, z-order, group and ungroup.
- **Chrome:** controls (zoom in, out, fit, lock, zoom percentage menu), minimap, a node library to drag or tap nodes from, node search on `Command`, pane, node and edge context menus, a node toolbar, panels in the corners.
- **States:** empty, loading, error, read-only, saving, pending, per-node run status (idle, running, success, warning, error, skipped).
- **Data:** controlled and uncontrolled nodes, edges and viewport; JSON serialize and restore through the controller.
- **Platforms:** web on all three bases, desktop (Electron, Tauri), Tauri mobile, iOS, iPadOS and Android.
- **Blocks:** `canvas-01` workflow editor in the App Shell, `canvas-02` diagram editor.

### Later (the architecture leaves room)

- Real-time collaboration (Yjs or Liveblocks) through a sync port on the controller, with presence cursors.
- Export to PNG and SVG through an export adapter; printing.
- A Skia renderer on native for read-only graphs past 2,000 nodes.
- Freehand drawing, shapes and connectors drawn from scratch (a whiteboard). Canvas is a graph editor; a whiteboard is a different product.
- ELK layouts as a shipped item if its licence question is settled.

### Out

- Running workflows, storing graphs, or any backend. The component draws, edits and reports; the app executes and saves.
- React Flow Pro features and examples. Our source never references them.

---

## 3. Scenarios the component has to serve

Each scenario becomes an example or a block, and each one stresses a different part of the design. A plan that only serves the workflow editor ends up with a canvas that is awkward everywhere else.

| Scenario                         | Example or block                | What it stresses                                                                                           |
| -------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| AI or automation workflow editor | `canvas-01`, `canvas-workflow`  | Node library, typed handles, validation, inspector panel, run status, animated edges, undo, insert on edge |
| Flowchart and process diagram    | `canvas-02`, `canvas-flowchart` | Shapes (decision, start, end), smooth step edges, edge labels, alignment guides, auto layout               |
| Mind map                         | `canvas-mind-map`               | Keyboard creation (Tab adds a child, Enter a sibling), auto layout per branch, collapse                    |
| Org chart or tree, read-only     | `canvas-org-chart`              | `view` mode, dagre layout, large counts, search and focus a node, phone use                                |
| Database schema (ERD)            | `canvas-schema`                 | Rows with a handle per field, many edges, labelled handles, long names                                     |
| State machine                    | `canvas-state-machine`          | Self loops and back edges, edge labels as events, the active state highlighted                             |
| Architecture or system diagram   | `canvas-architecture`           | Groups (subflows), brand icons from Fabricator Icons, notes                                                |
| Pipeline run monitor             | `canvas-pipeline-status`        | Live status updates without re-rendering the graph, animated edges, error node with Retry                  |
| Diagram inside docs or a website | `canvas-static`                 | `static` mode, page scroll passes through, fits its container, no chrome, light and dark                   |
| Large graph                      | `canvas-large`                  | 1,000 nodes and 1,500 edges: culling, semantic zoom, minimap cost                                          |
| Empty and first run              | `canvas-empty`                  | The Empty state, the library opening, the first node placed where the person looks                         |
| Loading and failure              | `canvas-loading`                | Skeleton nodes, an error Alert with Retry, a rejected connection reverting                                 |

---

## 4. Name, group and place

- **`canvas`**, title "Canvas", group **Advanced**: it lays itself out, edits, validates and keeps history, a product of its own like `kanban`. `flow` reads as a form flow and `node-editor` hides the diagram and viewer uses.
- The word also names HTML's `<canvas>`. The docs page says in its first line that Canvas draws with DOM and SVG, so nodes hold real components.
- Blocks `canvas-01` and `canvas-02` don't collide with upstream's blocks.
- `DESIGN.md`'s "Choosing a component" gains a line (§20).

---

## 5. Architecture

Four layers, as in Event Calendar. Domain code never imports React Flow (Ports and Adapters).

| Layer                 | Web and desktop                                                                                                                           | React Native                                            | Shared?                                     |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------- |
| **Model** (pure TS)   | Graph operations, validation, history, clipboard format, geometry, viewport maths, snapping, guides, spatial keyboard navigation, culling | Same files                                              | Yes, one copy                               |
| **Controller** (hook) | `useCanvas`: nodes, edges, viewport, selection, history, optimistic layer, connection in progress                                         | Same API, native file                                   | API identical                               |
| **Engine** (adapter)  | `canvas-engine.tsx`: controller state into `<ReactFlow>` props, React Flow changes back into typed changes                                | `canvas-engine.tsx` (native): our renderer and gestures | Mapping functions shared where shapes match |
| **Parts**             | `CanvasNode`, `CanvasHandle`, `CanvasEdge`, controls, minimap, menus, library, panels                                                     | Same names on native views                              | Names and props identical                   |

- The model decides behaviour: whether a connection is valid and why, where a keyboard move lands, which node an arrow key focuses, what undo restores, where a pasted group lands, which nodes are visible. Both engines only draw and report gestures, so a fix lands once.
- **Files that import `@xyflow/react`:** `canvas-engine.tsx`, and the parts that wrap a React Flow primitive (`canvas-handle.tsx`, `canvas-edge.tsx` for `BaseEdge` and `EdgeLabelRenderer`, `canvas-node-toolbar.tsx`, `canvas-node-resizer.tsx`, `canvas-minimap.tsx`, `canvas-background.tsx`). Nothing else. A React Flow major touches only these.
- **The escape hatch** (web only, a dated parity exception): `reactFlow` passes raw props to `<ReactFlow>`, and `useCanvasEngine()` returns the `ReactFlowInstance`. For features we don't wrap; never needed for the scenarios in §3.

### 5.1 Shared files

| File                              | Holds                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `shared/lib/canvas-model.ts`      | Types, graph operations (add, remove, connect, reconnect, group, ungroup, reparent, z-order), changes   |
| `shared/lib/canvas-validation.ts` | The connection validator: handle types, max connections, cycles, self loops, custom rules with a reason |
| `shared/lib/canvas-history.ts`    | Undo and redo as inverse change sets; a drag or a keyboard nudge run coalesces into one step            |
| `shared/lib/canvas-geometry.ts`   | Bezier, smooth step, step and straight paths, label positions, node bounds, marked `'worklet'`          |
| `shared/lib/canvas-viewport.ts`   | Screen and flow coordinates, fit to bounds, zoom about a point, clamping, visible-node culling          |
| `shared/lib/canvas-guides.ts`     | Snap to grid and alignment guides against nearby nodes' edges and centres                               |
| `shared/lib/canvas-keyboard.ts`   | Spatial navigation (nearest node in a direction), keyboard connect steps, the key map                   |
| `shared/lib/canvas-clipboard.ts`  | The clipboard format (versioned JSON), paste offset and id remapping                                    |

Each has a colocated `*.test.ts`, written first. The clipboard and haptics go through the existing adapters, never the SDKs.

### 5.2 Why geometry is vendored

`@xyflow/system`'s edge and graph utilities touch no DOM (`utils/edges/*.ts`, `utils/graph.ts`), but its single bundle imports `d3-drag`, `d3-selection` and `d3-zoom`, and none of it is worklet code. Native recomputes a dragged node's edges on the UI thread, which needs worklet functions. So the path functions (about 300 lines, MIT) move into `canvas-geometry.ts` with React Flow's copyright in `NOTICE.md` (contract 8 covers upstream; this follows the same rule). Web custom edges call the same functions, so a smooth step edge is the same path on an iPhone and in Chrome. `canvas-geometry.test.ts` runs both implementations over a fixture grid of positions and handle sides and fails on any difference, with `@xyflow/system` as a dev dependency only.

---

## 6. Web engine: React Flow 13

### 6.1 What 13 gives us

- **13.0.0 released 2026-11-16; 13.0.3 is npm's latest** (modified 2026-11-23). MIT. Dependencies: `zustand` 5, `classcat`, `@xyflow/system` 1.0.1, `react-compiler-runtime`. Peers: React and React DOM 18 or later. ESM only.
- **Split stores and per-item hooks:** `useNode(id)`, `useEdge(id)`, `useNodesStore`, `useEdgesStore`, `useViewportStore`, `useSelectionStore`, `useConnectionStore`, `useOptionsStore`. A node part can subscribe to one node, which is the core of our performance rules (§10).
- **Compiled with the React Compiler**, so memoization inside the library no longer depends on how carefully we pass props. Our own props still need stable identity.
- **Styles in `@layer xyflow`**, three sheets: `style.css` (full), `base.css` (structure only), `xy-theme.css` (their theme). Colour mode follows an ancestor `dark` class or `data-theme`, then the OS; `forceColorMode` overrides.
- **Accessibility:** nodes and edges focusable, Enter or Space selects, Escape clears, arrows move selected nodes (Shift for larger steps), Delete removes, focus auto-pans into view, an `aria-live` region announces moves, every string replaceable through `ariaLabelConfig`, `ariaRole` and `domAttributes` per node. No keyboard path to create an edge (§11 adds it).
- **Breaking changes we design around:** changes arrive as `NodeChangeset` / `EdgeChangeset` classes; `onConnectEnd` gives flow coordinates; `paneDragThreshold` and `nodeDragThreshold` replace the click distances; `fitView` padding defaults to 5%; parents no longer need to precede children.

### 6.2 Styling: our look, none of theirs

- The item imports `@xyflow/react/base.css` once, inside a `@layer xyflow` declared after `base` and before `components` and `utilities`. The exact cascade with Tailwind 4 and our generated `fabricator.css` is a Phase 0 check; the consumer's CSS order is set by the CLI's install step, not by the person.
- We never ship `style.css` or `xy-theme.css`. Every `--xy-*` variable React Flow still reads is set on the root part by its placeholder rule, from our tokens: `--xy-edge-stroke` from `foreground/28`, `--xy-selection-background-color` from `primary/8`, and so on. Setting variables keeps the style map within COMPONENTS.md's rule 5, which forbids reaching parts by class name.
- Default node and edge types are replaced by ours, the connection line is our `connectionLineComponent`, and controls, minimap and background are our parts with `data-slot`s. What React Flow still draws itself: the pane, the node and edge wrappers and the selection rectangle (the attribution is hidden, §18). Anything left that needs a class selector (`.react-flow__node` wrapper focus outline) is listed as a Known deviation with its reason.
- Colour mode: our tokens already switch with `.dark`, so React Flow's own colour mode only touches variables we override. Phase 0 confirms a page in light mode on a dark OS draws light.

### 6.3 How we use it

| React Flow                                                                                 | Our use                                                                             |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `nodeTypes`, `edgeTypes`                                                                   | Ours merged with the consumer's into one object, memoized for the canvas's life     |
| `onNodesChange`, `onEdgesChange`, `onConnect`, `onReconnect`                               | Turned into typed `CanvasChange`s, through history and the optimistic layer         |
| `isValidConnection`                                                                        | Calls `canvas-validation`; the reason is kept for the invalid state and its tooltip |
| `snapToGrid`, `snapGrid`                                                                   | From props; alignment guides are ours (`canvas-guides`) drawn in a `ViewportPortal` |
| `panOnScroll`, `zoomActivationKeyCode`, `panOnDrag`, `selectionOnDrag`, `preventScrolling` | Set by `mode` and `panOn` (§8.1)                                                    |
| `onlyRenderVisibleElements`                                                                | On above 300 nodes                                                                  |
| `ariaLabelConfig`                                                                          | From our `labels`                                                                   |
| `NodeToolbar`, `NodeResizer`, `EdgeLabelRenderer`, `ViewportPortal`, `Panel`               | Inside our parts                                                                    |
| `MiniMap`, `Background`                                                                    | Inside `CanvasMinimap` and `CanvasBackground`, styled by variables and class props  |
| `proOptions.hideAttribution`                                                               | On by default (§18, Q1); `reactFlow.proOptions` turns it off                        |

### 6.4 React Flow UI as upstream

React Flow ships a shadcn registry at `ui.reactflow.dev`: Base Node, Node Status Indicator, Node Appendix, Node Tooltip, Database Schema Node, Placeholder Node, Labeled Group Node, Base Handle, Labeled Handle, Button Handle, Button Edge, Data Edge, Animated SVG Edge, Node Search, Zoom Slider, Zoom Select, DevTools, and two templates. We read it the way COMPONENTS.md has us read shadcn's source: it is the checklist of parts a complete canvas needs. Each maps to one of ours:

| React Flow UI                         | Ours                                                                |
| ------------------------------------- | ------------------------------------------------------------------- |
| Base Node                             | `CanvasNode` with Header, Icon, Title, Description, Content, Footer |
| Node Status Indicator                 | `CanvasNodeStatus` and the node's `status` prop                     |
| Node Tooltip, Node Appendix           | Our `Tooltip` and `CanvasNodeToolbar`                               |
| Labeled Handle, Base Handle           | `CanvasHandle` with `label`                                         |
| Button Handle                         | `CanvasHandle` with `action` (a plus that opens the library)        |
| Button Edge, Data Edge                | `CanvasEdge` with `insertable`, `CanvasEdgeLabel`                   |
| Animated SVG Edge                     | `CanvasEdge` with `animated`                                        |
| Placeholder Node                      | The `placeholder` node type                                         |
| Labeled Group Node                    | The `group` node type                                               |
| Database Schema Node                  | The `canvas-schema` example                                         |
| Node Search, Zoom Slider, Zoom Select | `CanvasSearch`, `CanvasControls` with the zoom menu                 |
| DevTools                              | Not shipped                                                         |

Where our source derives from theirs, the file keeps their MIT notice.

---

## 7. React Native

React Flow can't run there: it needs `react-dom`.

### 7.1 Options

| Option                                                | Verdict                                                                                                                                                                                               |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Our engine on Reanimated, Gesture Handler and SVG** | **Pick.** Nodes are real views, so they hold our `Input`, `Select`, `Badge` and `Switch` and stay accessible. All three libraries are already in the native tree. The edges reuse the shared geometry |
| A maintained React Native node editor library         | None found (search 2026-11-26). Packages that exist are demos with a handful of weekly downloads                                                                                                      |
| React Flow in an Expo DOM component (`'use dom'`)     | Rejected. Props cross an async bridge, nodes can't hold native components, gestures stay in a web view, and the screen would carry web chrome. Event Calendar rejected it for the same reasons        |
| A Skia renderer                                       | Rejected for 1.0. Nodes drawn in Skia can't hold native inputs and need their own accessibility tree. Kept for large read-only graphs (§2, Later); it would be the first Skia dependency in the tree  |

### 7.2 The native engine

- **One transformed layer.** Pan and zoom live in shared values (`x`, `y`, `scale`) applied to one `Animated.View`. Nodes are absolutely positioned views inside it; edges are one `Svg` layer below them. Pan and zoom never re-render React.
- **Gestures** (Gesture Handler 3, composed): one-finger pan on the pane, pinch zoom about the focal point, double tap to zoom in, two-finger double tap to zoom out, pan on a node to drag it (after a 120ms hold when the pane scrolls inside a ScrollView, immediately otherwise), pan from a handle to connect, long press for the context menu and to start multi-select.
- **Dragging** moves the dragged node's shared position; its connected edges recompute their path in a worklet through `useAnimatedProps` on the SVG `Path`. React state is written once, at the drop. This is why geometry must be worklet code (§5.2).
- **Hit testing** for connections uses handle positions measured with `onLayout` and kept in the model, so the target under the finger is a model query, never a view lookup.
- **Culling** from `canvas-viewport`: nodes outside the viewport plus a margin unmount when the graph passes 150 nodes; edges between two culled nodes don't draw.
- **Semantic zoom** below 0.5 swaps node content for the title row, which is also what keeps text legible on a phone.
- **Haptics and sounds:** a light tick when a drag snaps to the grid or a guide, a connect sound and haptic on a valid connection, an error haptic on an invalid drop, through the existing sounds and haptics adapters.
- **Inputs inside nodes:** focusing an input zooms the node to at least 1× and pans it above the keyboard, so typing never happens at 40% scale. Phase 0 proves the caret and selection handles at non-unit scale on iOS and Android.
- **Gesture conflicts:** the canvas claims gestures inside its frame only; the iOS back swipe from the left edge, a parent Drawer and the App Shell's sidebar keep theirs (`hitSlop` on the pane, `simultaneousWithExternalGesture` where a parent scrolls).

### 7.3 The native item

- Same exports and props as web (contract 9). `reactFlow`, `useCanvasEngine` and React Flow's raw types are a dated `parity-exceptions.json` entry.
- Phone chrome: controls collapse to one floating button group at the bottom end, the library and the inspector open in a `Drawer`, context menus open on long press, the minimap is off below the tablet width.
- iPad with a hardware keyboard gets the web key map; with a trackpad, two-finger scroll pans and pinch zooms.
- Behaviour parity is tested in the shared model: the same graph, gestures and keys give the same changes, snaps, validations and history on both platforms (fixture tests in `canvas-model.test.ts`). The paths are identical by construction; layout of node content can differ by a pixel between platforms, and the docs say so.

---

## 8. The default experience

### 8.1 Modes and input

| `mode`   | Pan                                                                                | Zoom                                          | Select | Edit | Page scroll over the canvas                           |
| -------- | ---------------------------------------------------------------------------------- | --------------------------------------------- | ------ | ---- | ----------------------------------------------------- |
| `edit`   | Scroll (trackpad), Space + drag, middle drag; drag on the pane with `panOn="drag"` | Pinch, ⌘ or Ctrl + scroll, keys               | Yes    | Yes  | Captured                                              |
| `view`   | Drag                                                                               | Pinch, ⌘ or Ctrl + scroll, controls           | Yes    | No   | Passes through until the canvas is focused or clicked |
| `static` | None                                                                               | None; fits its container and refits on resize | No     | No   | Always passes through                                 |

- **`panOn`** (`scroll` by default in `edit`, like design tools; `drag` for people used to maps and older diagram tools). In `edit` with `panOn="scroll"`, dragging the pane draws a marquee.
- **Touch on the web** (Tauri mobile, phone browsers): one finger pans, pinch zooms, long press opens the context menu, handles grow to the touch target. The page's own pinch zoom is blocked only inside the canvas.
- **Desktop windows:** Electron and Tauri send trackpad pinch as Ctrl + wheel, which React Flow already reads as zoom. Phase 0 checks it in both.

### 8.2 Keyboard

| Keys                           | Action                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------- |
| Tab, Shift + Tab               | Next and previous node, in reading order from the model (top to bottom, start to end) |
| Arrow keys                     | Focus the nearest node in that direction (ours, `canvas-keyboard`)                    |
| Alt + arrows (Option on macOS) | Move the selection one grid step; Shift + Alt for ten                                 |
| Enter                          | Open the node (`onNodeOpen`) or edit its title                                        |
| Space                          | Toggle selection; held, pan with the pointer                                          |
| C, then arrows and Enter       | Connect from the focused node: cycle compatible targets, confirm. Escape cancels      |
| Delete, Backspace              | Delete the selection                                                                  |
| ⌘ or Ctrl + A, C, X, V, D      | Select all, copy, cut, paste at the pointer or the viewport centre, duplicate         |
| ⌘ or Ctrl + Z, Shift + Z       | Undo, redo                                                                            |
| ⌘ or Ctrl + G, Shift + G       | Group, ungroup                                                                        |
| ⌘ or Ctrl + 0, +, −, Shift + 1 | 100%, zoom in, zoom out, fit view                                                     |
| ⌘ or Ctrl + K, or /            | Node search                                                                           |
| Escape                         | Cancel the connection or drag in progress, then clear the selection                   |

React Flow's own arrow-key move is turned off (`disableKeyboardA11y` for movement only), because arrows navigating and Alt + arrows moving is the pattern a keyboard user can work a whole graph with. Mind maps add Tab for a child and Enter for a sibling through `onKeyDown` in the example, not the component.

### 8.3 Connecting

- Drag from a handle; the connection line follows the pointer and snaps to the nearest valid handle within a radius (`connectionRadius`).
- Dropping on a node body connects to its first compatible handle.
- Dropping on the pane calls `onConnectToPane` with the flow position, so a workflow editor can open the library there and create the node already connected (n8n's pattern).
- **Invalid targets:** the handle shows the destructive ring, the line turns dashed `destructive`, the cursor is `not-allowed`, and a tooltip near the pointer gives the validator's reason ("An image output can't connect to a text input"). Releasing does nothing and the line returns to its source on the `move` timing.
- **Menu connect:** "Connect to…" in a node's context menu opens `Command` with every compatible target, grouped by node. This is the phone and screen-reader path, and it is quicker than dragging across a large graph.

### 8.4 States

| State                         | What the person sees                                                                                                                                                                                                                                                    |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Empty**                     | `Empty` at the viewport centre: icon, "Add your first node", a primary button that opens the library. In `view` and `static`, "Nothing here yet" without actions                                                                                                        |
| **Loading** (`loading`)       | Before any data: skeleton nodes in a loose grid, controls disabled, `aria-busy`. Reloading with data present: the graph stays, a `Spinner` sits in the controls panel                                                                                                   |
| **Error** (`error`)           | Graph failed to load: an `Alert` in the centre with the message and Retry (`onRetry`). A graph that is present stays visible under an Alert in the top panel                                                                                                            |
| **Saving and pending**        | A change whose async handler hasn't settled: the node or edge at 60% opacity with `progress` cursor; the rest of the canvas stays usable                                                                                                                                |
| **Rejected change**           | The change reverts on the `move` timing, a toast says why, with Retry. Undo history never records a rejected change                                                                                                                                                     |
| **Read-only** (`mode="view"`) | Handles hidden, no library, no delete; selection and the inspector still work                                                                                                                                                                                           |
| **Disabled** (`disabled`)     | The whole canvas at 50% opacity, no pointer events, still readable by screen readers                                                                                                                                                                                    |
| **Run status** (per node)     | `idle` none; `running` a sweep around the ring on the `reveal` role and an animated inbound edge; `success`, `warning`, `error` a role icon in the header and the role's border; `skipped` 50% opacity. Colour never alone: each has its icon and an `aria-description` |
| **Node errors**               | `invalid` on a node (a required input missing): destructive ring and a message in the footer, listed by `CanvasIssues` in a panel                                                                                                                                       |
| **Locked**                    | The lock control stops moving and connecting; selection and opening still work                                                                                                                                                                                          |
| **No room**                   | A parent with no height draws nothing in React Flow. The component sets a 400px minimum and warns once in development                                                                                                                                                   |
| **Long content**              | Titles truncate with the full text in a tooltip; edge labels truncate at 24 characters; numbers and statuses never truncate                                                                                                                                             |
| **Offscreen selection**       | Search or keyboard focus on a culled node pans it into view on the `move` timing                                                                                                                                                                                        |

### 8.5 Context menus

On our `ContextMenu` on web (right click, or long press on touch) and the native long-press menu, following DESIGN.md's menu rules (an icon on every item, destructive last and alone):

- **Pane:** Add node…, Paste, Select all, Fit view, Zoom to 100%.
- **Node:** Open, Rename…, Duplicate, Copy, Connect to…, Group, Bring to front, Send to back, Collapse, Delete.
- **Edge:** Insert node…, Edge type (sub-menu of values), Add label, Delete.
- **Selection:** Group, Align (sub-menu), Distribute, Duplicate, Delete.

---

## 9. Design-system fit

The look comes from the foundations; these are the choices the style map's comments will record.

- **Pane:** surface 1 (`bg-background`). The grid is dots in `foreground/10` (`/14` dark), 20px apart at 1×, the dot fixed at 1px on screen whatever the zoom, fading out below 0.4 so a zoomed-out graph isn't grey noise. Lines and cross are the same token.
- **Nodes:** a level 3 surface (`bg-surface-3 shadow-surface-3 rounded-xl`), no border, density padding (`p-(--density-12)`), a header row of `--density-36` with an icon tile in the node's palette colour and the title at Subtitle size, the description in Caption. Node text follows the density; the zoom scales it.
- **Hover** lifts the shadow to level 4 on the `feedback` timing. **Selected:** a 1.5px ring in `primary` (the foreground until a project picks a hue) and the level 4 shadow. **Focus-visible:** the standard 1px `ring` blue, outside the selection ring when both apply. **Dragging:** level 5 shadow and 1.01 scale on the `settle` spring; the drop settles back. Multi-selection draws one `primary/8` wash with a `primary/40` hairline around the group's bounds.
- **Handles:** a dot of `--density-8` on fine pointers and 24pt touch targets on coarse ones, `bg-surface-3` with the ring shadow, filling `primary` while a valid connection hovers it. On fine pointers handles fade in on node hover and focus; on touch they stay visible in `edit`.
- **Edges:** 1.5px `foreground/28`, hover `foreground/50`, selected `foreground`, the arrow marker following the stroke. Labels are a Badge-style pill on `bg-surface-3` at Caption size. Animated edges move a dash along the path on the `move` timing; reduced motion shows a static dash.
- **Groups:** a faint wash (`bg-hover`), `rounded-xl`, the label as a Caption above the top start corner. While a node drags over a group that would accept it, the group shows a dashed `primary/40` outline: the one dashed line in the component, because it describes an action in progress.
- **Notes:** `bg-warning-surface-1` (`-3` dark), the text in `text-foreground`, no handles by default.
- **Palette:** node accent colours come from `palette-model`, as Kanban's labels do; status colours from the roles; nothing written by hand.
- **Controls and panels:** a level 3 surface holding ghost icon `Button`s in a vertical `ButtonGroup`, a zoom menu showing the percentage in `tabular-nums`, `Tooltip`s with shortcuts in `Kbd`. **Minimap:** a level 3 surface, nodes in `foreground/16`, the viewport mask `background/70`, the viewport frame a `primary/40` hairline.
- **Library:** a panel of node kinds with search, using the fluid hover highlight (a list of alternatives). The canvas itself has no fluid hover: nodes are far apart, and a click in a gap must reach the pane.
- **Motion:** `fitView` and zoom buttons on the `move` timing; a new node enters on the `popup` recipe from 0.96; a deleted one leaves on its exit; auto layout moves nodes on the `settle` spring; a reverted change on `move`. All through the roles, so `data-motion` and reduced motion apply.
- **Cursors:** pane `grab`, `grabbing` while panning; nodes `pointer` (they open), `grabbing` while moving; handles `crosshair`; invalid target `not-allowed`; resize edges `nwse-resize` and its siblings. During a drag the whole window holds the cursor (DESIGN.md).
- **Sounds:** connect, drop, delete and undo map to existing sound families by `data-slot` and `data-sound`; no new recipe unless Phase 3 finds a gap.
- **Density and size:** `size="sm"` pins compact nodes for dense graphs; the region's `data-density` applies otherwise. Popups opened from the canvas read `useDensity()` before their portal.
- **No blur.** Panels and nodes are opaque surfaces: hundreds of blurred elements blank the page in some browsers, and a graph can easily have hundreds.

---

## 10. Performance

### 10.1 Rules

- `nodeTypes`, `edgeTypes`, every callback and option object passed to `<ReactFlow>` are stable for the canvas's life; callbacks read the latest props through refs (the Data Table and Event Calendar pattern).
- Node parts subscribe to their own node through `useNode(id)` and never read the nodes array. Status updates during a run change one node's data, so one node re-renders.
- Unchanged nodes keep their object identity through the optimistic layer and history; a drag replaces only the moved nodes.
- `onlyRenderVisibleElements` above 300 nodes; semantic zoom below 0.5 drops node content; the minimap draws plain rects above 500 nodes.
- History stores change sets, never graph snapshots.
- No ancestor `:has()` in the style map: an insert under a `:has()` ancestor restyles the whole docs page.

### 10.2 Budgets

| Workload                               | Web (M-series, Chrome, production build) | iPhone 15, Pixel 8 class |
| -------------------------------------- | ---------------------------------------- | ------------------------ |
| Drag one node, 500 nodes, 700 edges    | 60fps                                    | 60fps                    |
| Pan and zoom, 1,000 nodes, 1,500 edges | 60fps                                    | 55fps or better          |
| First render, 1,000 nodes              | Under 250ms main thread                  | Under 400ms              |
| A run status update on one node        | One node commit                          | One node commit          |
| Undo of a 50-node paste                | Under 16ms                               | Under 16ms               |

### 10.3 Bench

`canvas-large` doubles as the bench: a seeded 1,000-node graph, scripted pan, zoom and drag, traced in a standalone page and in the docs shell, since the docs CSS has distorted earlier measurements.

---

## 11. Accessibility

- The root is a labelled region (`aria-label` from `label`, `aria-roledescription="canvas"`) with a hidden summary kept current: "Workflow, 12 nodes, 14 connections, 2 selected".
- Nodes keep React Flow's `role="group"` with `aria-roledescription="node"`, the title as the name, and a description listing their connections ("Inputs from Fetch and Parse. Output to Summarize"). A node that holds interactive children never takes `role="button"`.
- Every interaction has a keyboard path (§8.2), including connecting, which React Flow lacks.
- **`CanvasOutline`:** an optional list view of the same graph, nodes in reading order with their connections as links that focus the target. A screen-reader user can work the graph from it, and the phone block offers it as a "List" toggle.
- Announcements through one polite live region: connected, disconnected, deleted with count, moved, undo and redo, a rejected change with its reason. React Flow's assertive move announcement is replaced by ours.
- Every string comes from `labels`, which feeds React Flow's `ariaLabelConfig` too.
- Status and validity always pair colour with an icon or text. Edges hold 3:1 against the pane in both themes at `foreground/28`; the contrast test gets a case for it.
- Native: nodes are accessibility elements with custom actions (Open, Connect to…, Move, Delete) and a `accessibilityValue` for status; VoiceOver and TalkBack checked on devices.

---

## 12. API

### 12.1 Data types

```ts
type CanvasNode<
  TData extends Record<string, unknown> = Record<string, unknown>,
  TType extends string = string,
> = {
  id: string
  type?: TType
  position: { x: number; y: number }
  data: TData
  width?: number
  height?: number
  parentId?: string
  selected?: boolean
  hidden?: boolean
  draggable?: boolean
  connectable?: boolean
  deletable?: boolean
  zIndex?: number
  /** Fabricator: run state shown on the node. */
  status?: "idle" | "running" | "success" | "warning" | "error" | "skipped"
  /** Fabricator: palette colour for the icon tile and accent. */
  color?: PaletteColor
}

type CanvasEdge<
  TData extends Record<string, unknown> = Record<string, unknown>,
> = {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
  type?: "bezier" | "smoothstep" | "step" | "straight" | (string & {})
  label?: string
  animated?: boolean
  selected?: boolean
  data?: TData
  marker?: "arrow" | "none"
}

type CanvasHandleSpec = {
  id: string
  side: "top" | "right" | "bottom" | "left"
  kind: "source" | "target"
  accepts?: string[]
  produces?: string
  max?: number
}
```

Every field matches React Flow's name and meaning, so a React Flow `Node[]` type-checks as `CanvasNode[]` for the shared fields. `status` and `color` are ours and travel in fields React Flow ignores.

### 12.2 The one-prop default

```tsx
<Canvas defaultNodes={nodes} defaultEdges={edges} />
```

Uncontrolled, `edit` mode, controls and minimap on, fit on first render, history on. The ten-line example on the docs page is this plus `nodeTypes`.

### 12.3 Props

| Prop                                                                     | Type                                                                     | Notes                                                                  |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `nodes`, `defaultNodes`, `onNodesChange`                                 | `CanvasNode[]`, `(changes: CanvasNodeChange[]) => void \| Promise<void>` | React Flow's names; changes are plain objects, not its changeset class |
| `edges`, `defaultEdges`, `onEdgesChange`                                 | The same for edges                                                       |                                                                        |
| `viewport`, `defaultViewport`, `onViewportChange`, `onViewportChangeEnd` | `{ x, y, zoom }`                                                         | `End` fires once a pan or zoom settles, for persistence                |
| `onConnect`, `onReconnect`, `onConnectToPane`                            | Typed connection callbacks, async allowed                                |                                                                        |
| `validateConnection`                                                     | `(connection, graph) => true \| string`                                  | A string is the reason shown; composes with handle `accepts`           |
| `nodeTypes`, `edgeTypes`                                                 | Records of components                                                    | Merged with ours                                                       |
| `mode`, `panOn`                                                          | `"edit" \| "view" \| "static"`, `"scroll" \| "drag"`                     | §8.1                                                                   |
| `snapToGrid`, `gridSize`, `guides`                                       | `boolean`, `number`, `boolean`                                           | Guides on by default in `edit`                                         |
| `background`                                                             | `"dots" \| "lines" \| "cross" \| "none"`                                 |                                                                        |
| `fitView`                                                                | `boolean \| FitViewOptions`                                              | On by default                                                          |
| `minZoom`, `maxZoom`                                                     | `number`                                                                 | 0.1 and 2                                                              |
| `loading`, `error`, `onRetry`, `disabled`                                |                                                                          | §8.4                                                                   |
| `onNodeOpen`, `onSelectionChange`                                        |                                                                          |                                                                        |
| `history`                                                                | `boolean \| { limit: number }`                                           | On, 100 steps                                                          |
| `label`, `labels`                                                        | `string`, partial strings record                                         | Accessible name, every visible and announced string                    |
| `size`                                                                   | `"sm" \| "default"`                                                      | Pins compact                                                           |
| `reactFlow`                                                              | `Partial<ReactFlowProps>`                                                | Web only, the escape hatch                                             |

### 12.4 Composition

```tsx
;<Canvas
  nodes={nodes}
  edges={edges}
  onNodesChange={applyNodes}
  onEdgesChange={applyEdges}
  nodeTypes={nodeTypes}
>
  <CanvasBackground />
  <CanvasControls />
  <CanvasMinimap />
  <CanvasPanel position="top-start">
    <CanvasLibrary items={library} />
  </CanvasPanel>
  <CanvasPanel position="top-end">
    <CanvasSearch />
  </CanvasPanel>
</Canvas>

function PromptNode({ id, data, status }: CanvasNodeProps<PromptData>) {
  return (
    <CanvasNode status={status}>
      <CanvasNodeHeader>
        <CanvasNodeIcon>
          <SparklesIcon />
        </CanvasNodeIcon>
        <CanvasNodeTitle>{data.title}</CanvasNodeTitle>
        <CanvasNodeStatus />
      </CanvasNodeHeader>
      <CanvasNodeContent>…</CanvasNodeContent>
      <CanvasHandle kind="target" side="left" id="in" accepts={["text"]} />
      <CanvasHandle
        kind="source"
        side="right"
        id="out"
        produces="text"
        label="Text"
      />
      <CanvasNodeToolbar>…</CanvasNodeToolbar>
    </CanvasNode>
  )
}
```

Exports: `Canvas`, `CanvasBackground`, `CanvasControls`, `CanvasMinimap`, `CanvasPanel`, `CanvasLibrary`, `CanvasSearch`, `CanvasOutline`, `CanvasIssues`, `CanvasNode`, `CanvasNodeHeader`, `CanvasNodeIcon`, `CanvasNodeTitle`, `CanvasNodeDescription`, `CanvasNodeContent`, `CanvasNodeFooter`, `CanvasNodeStatus`, `CanvasNodeToolbar`, `CanvasNodeResizer`, `CanvasHandle`, `CanvasEdge`, `CanvasEdgeLabel`, `useCanvas`, `useCanvasNode`, `useCanvasState`, and the types. Each part has `data-slot="canvas-<part>"`.

### 12.5 The controller

`useCanvas()` inside a `Canvas` returns: `nodes`, `edges`, `selection`, `viewport`; `addNodes`, `updateNode`, `removeElements`, `connect`, `group`, `ungroup`; `fitView`, `zoomTo`, `panTo`, `focusNode`; `undo`, `redo`, `canUndo`, `canRedo`; `copy`, `paste`; `layout(direction)` when `canvas-layout` is installed; `toJSON`, `fromJSON`. `useCanvasState(initialNodes, initialEdges)` is React Flow's `useNodesState` and `useEdgesState` in one, for apps that hold the graph themselves.

---

## 13. Bases, overrides and registry items

- **Source:** shared, in `registry/fabricator/shared/ui/canvas*.tsx`. The chrome that differs per base (context menus, dropdown, tooltip triggers, the zoom menu) lives in `registry/fabricator/{base,radix,aria}/ui/canvas-menus.tsx` under the same path, Base UI first. Everything else is identical across bases.
- **Items:**

| Item            | Type           | Files                                                                                                                                                                                                                                                                                                                                                               | Dependencies                                                                                                                                                                                            |
| --------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `canvas`        | `registry:ui`  | `ui/canvas.tsx`, `ui/canvas-engine.tsx`, `ui/canvas-node.tsx`, `ui/canvas-handle.tsx`, `ui/canvas-edge.tsx`, `ui/canvas-controls.tsx`, `ui/canvas-minimap.tsx`, `ui/canvas-background.tsx`, `ui/canvas-panel.tsx`, `ui/canvas-library.tsx`, `ui/canvas-search.tsx`, `ui/canvas-outline.tsx`, `ui/canvas-menus.tsx`, `hooks/use-canvas.ts`, `lib/canvas-*.ts` (§5.1) | `@xyflow/react@13.0.3`; `@fabricator/button`, `button-group`, `context-menu`, `dropdown-menu`, `tooltip`, `kbd`, `command`, `empty`, `alert`, `skeleton`, `spinner`, `badge`, `palette-model`, `sounds` |
| `canvas-layout` | `registry:lib` | `lib/canvas-layout.ts` (the port), `lib/canvas-layout-dagre.ts` (the adapter)                                                                                                                                                                                                                                                                                       | `@dagrejs/dagre@3.1.4`; `@fabricator/canvas`                                                                                                                                                            |

- `cssVars` carries no new tokens: everything maps to existing ones. The `css` field carries the `@layer xyflow` order and the `base.css` import.
- **Bundle cost:** `@xyflow/react` is 1.3 MB unpacked; the gzipped cost added to a page is measured in Phase 0 and stated on the docs page. The item is client-only (`"use client"`), so it never lands in a server bundle. Native adds no package.
- **Native:** `registry/native/ui/canvas*.tsx` and `registry/styles/native/canvas.css`, importing the same `lib/canvas-*.ts`.

---

## 14. Docs, examples and blocks

- **Docs page** per base and native: Preview, Installation (CLI and Manual, including the CSS layer line), Usage, Composition, Examples, API reference, Accessibility, and a "Coming from React Flow" section (what maps one to one, what `reactFlow` passes through).
- **Advanced references** under `/docs/advanced/canvas/`: `nodes`, `edges`, `connections` (handles, validation, keyboard connect), `controller`, `interaction` (modes, keys, touch), `layout`, `feedback` (states, optimistic changes, run status), `performance`.
- **Examples** (§3 plus): `canvas-example`, `canvas-custom-node`, `canvas-custom-edge`, `canvas-controlled`, `canvas-validation`, `canvas-library`, `canvas-subflows`, `canvas-readonly`. Content follows the Fabricator identity in `scripts/rebrand.ts`.
- **Blocks:** `canvas-01` (App Shell, node library in the sidebar, the canvas in the main column, an inspector panel that becomes a Drawer on phones, a Run button that drives node status), `canvas-02` (diagram editor with shapes, notes, auto layout, a List toggle to `CanvasOutline`).
- Docs previews run in fit frames and use `mode="view"` so the docs page scrolls past them.
- Group, catalog card, `meta.json` on every base, the skill catalogue and `DESIGN.md` per COMPONENT-GROUPS.md.

---

## 15. Testing

- **Model (Vitest, written first):** graph operations, validation rules and reasons, history coalescing and inverse changes, clipboard round trips and id remapping, geometry against `@xyflow/system` fixtures, viewport maths, guides, spatial navigation, culling. Native parity fixtures: the same input gives the same changes.
- **Web (Playwright where the repo runs it, otherwise the browser checks in §17):** drag, marquee, connect valid and invalid, keyboard connect, undo, paste, context menus, each mode's scroll behaviour, empty, loading, error and rejected states.
- **axe** on the docs page and both blocks, light and dark.
- **Native:** `bun run demo react-native:check`, iOS Simulator and Android Emulator by hand for gestures, inputs in nodes, haptics, VoiceOver and TalkBack.
- **Perf:** §10.3 before release, numbers recorded in this plan.

---

## 16. Phases

### Phase 0: spike, go or no-go (4 to 5 days)

- **Web:** React Flow 13.0.3 with `base.css` in `@layer xyflow` under Tailwind 4 and `fabricator.css`; our tokens through `--xy-*`; light page on a dark OS; gzipped size in a Next production build; React Compiler runtime under Next and Vite; trackpad pinch in Electron and Tauri; touch pan and pinch in Tauri mobile's WebView without the page zooming.
- **Native:** 300 nodes and 400 edges on an iPhone and an Android emulator: pan, pinch and drag at 60fps with edges recomputed in worklets; handle hit testing from the model; a `TextInput` inside a node at 0.6 and 1.4 scale (caret, selection handles, keyboard avoidance); the gesture composition inside a ScrollView and the App Shell.
- **No-go triggers:** our styles can't fully replace React Flow's without class selectors on more than the wrapper (then we ship `style.css` with variable overrides and record the deviation), or native drag can't hold 50fps (then native nodes render through Skia for movement only, a bigger spike).

### Phase 1: model and controller (1 week)

All of §5.1 with tests, `useCanvas` and the optimistic layer.

### Phase 2: web engine on Base UI (1 week)

`canvas-engine.tsx`, node, handle and edge parts, the style map, controls, minimap, background.

### Phase 3: the default experience (1.5 weeks)

Library, search, menus, keyboard map and keyboard connect, guides, all §8.4 states, `CanvasOutline`, announcements, sounds.

### Phase 4: Radix and Aria (2 to 3 days)

`canvas-menus.tsx` per base; checks on each.

### Phase 5: native (3 to 4 weeks)

The engine (§7.2), parts, phone chrome, accessibility actions, haptics, demo screens.

### Phase 6: layout, examples, blocks, docs and release (1.5 weeks)

`canvas-layout`, every §3 example, both blocks, docs and references, captures, the changelog section, the bench.

About nine to ten weeks in total; native is the largest and least certain part.

---

## 17. Done when

The repo's definitions of done apply in full (AGENTS.md, COMPONENTS.md, PLATFORMS.md, REGISTRY.md, COMPONENT-GROUPS.md). For Canvas specifically:

- [ ] Every scenario in §3 has its example or block, seen in the running site in light and dark, compact, default and spacious, each motion speed and reduced motion, at phone and desktop widths, keyboard only, axe clean.
- [ ] The whole of §8.2 works without a pointer, including connecting.
- [ ] Every state in §8.4 is reachable from an example.
- [ ] The §10.2 budgets hold, with the measured numbers written into this plan.
- [ ] `native:parity --strict` passes with only the dated escape-hatch exceptions; the native demo checked on the iOS Simulator and Android Emulator with VoiceOver and TalkBack.
- [ ] `shadcn add --dry-run` of `canvas` and `canvas-layout` succeeds for each base; installing into a fresh Next and Vite project draws the Fabricator look with no React Flow theme leaking.

---

## 18. Decisions taken (2026-11-27)

| #   | Question                                                  | Decision                                                                                                                                                                                |
| --- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | React Flow's attribution link                             | Hidden by default (`proOptions.hideAttribution`). React Flow is credited on the docs page, in its Acknowledgements and in `NOTICE.md`; a consumer can show it again through `reactFlow` |
| Q2  | Native in 1.0, or web first with a dated parity exception | Native in 1.0. Phase 5 stays in the release, and the release waits for it                                                                                                               |
| Q3  | Auto layout in 1.0                                        | Yes, as `canvas-layout` on dagre                                                                                                                                                        |
| Q4  | Name                                                      | `canvas`                                                                                                                                                                                |
| Q5  | Default pan input in `edit`                               | Like design tools: scroll pans, pinch or ⌘ or Ctrl + scroll zooms, Space + drag and middle drag pan, dragging the pane draws a marquee. `panOn="drag"` remains for viewers              |

---

## 19. Not verified

- The 13.0.1 to 13.0.3 patch contents (only 13.0.0's notes were read).
- `@xyflow/react`'s gzipped size and its React Compiler runtime under Next 16's bundler.
- Whether `base.css` alone leaves any visible default that needs a class selector.
- Whether React Flow 13 exposes `colorMode` beside `forceColorMode`; only `forceColorMode` was documented on the pages read.
- The name of `changeParent` (the changelog) versus `changeParentNode` (the blog).
- React Flow UI's licence beyond the site footer linking MIT, and whether its items name bare shadcn dependencies. Our plan doesn't depend on either.
- `@shopify/react-native-skia` 2.14.0 on Expo 58 (only relevant to Later).

---

## 20. Proposed edits to settled documents

- **`DESIGN.md`**, Choosing a component: a line under Records or its own: "`Canvas` for nodes and connections people arrange: workflow editors, diagrams, maps of a system; `mode="static"` for a diagram in a page."
- **`COMPONENTS.md`**, Dependencies: add `@xyflow/react` (Canvas) and `@dagrejs/dagre` (Canvas Layout); Known deviations: whatever class selector Phase 0 leaves on React Flow's wrappers.
- **`NOTICE.md`** and the docs' Acknowledgements: React Flow's MIT notice for the vendored geometry and any React Flow UI-derived source, and the credit that replaces the hidden attribution link.
- **`apps/web/lib/component-groups.ts`**, the catalog, `meta.json` per base, `skills/fabricator/components.md`, and the unreleased changelog page, per COMPONENT-GROUPS.md.

---

## 21. What the build found (2026-11-27)

### Built

- **Shared model** (`registry/fabricator/shared/lib/canvas-*.ts`, 83 tests): graph changes, validation, history with drag and nudge merging, geometry, viewport, guides, keyboard, clipboard, and the layout port with the dagre adapter. The geometry matches `@xyflow/react`'s `getBezierPath`, `getSmoothStepPath` and `getStraightPath` exactly over 1,568 fixtures.
- **Controller** (`shared/hooks/use-canvas.ts`): `useCanvasController`, `useCanvasState`, a stable `api` for parts and a separate state context, so a drag doesn't re-render every node.
- **Web** (`shared/ui/canvas*.tsx`, one source for all three bases; per-base `components/canvas-commands.tsx` for the search and connect dialogs and the toast), the style map, 11 examples per base, a docs page per base, six Advanced references, the group, the catalog card, the skill catalogue, the changelog, `NOTICE.md`, `DESIGN.md` and `COMPONENTS.md`.
- **Native** (`registry/native/ui/canvas*.tsx`, `lib/canvas-surface.tsx`, the native style map and example, its docs page and a `differences.ts` entry). Parity is clean, with one dated exception for live guide lines.
- `canvas-layout` on web and native.
- **Block `automation-01`** (Automation builder, its own Automation category in the gallery), replacing the planned `canvas-01` and `canvas-02`: a 20-step support workflow with an AI agent whose model, memory and tool plug into typed ports below it, a router and a condition with a handle per route, a grouped billing lane, a note, the step library, issues, Tidy up, Export as JSON, and a test run that plays the sample ticket's path (`getRunPath`, tested) while untaken lanes end skipped. The picked step's settings, connections and last output sit in an App Shell panel. Native port deferred with a dated exception.

### Changed against the plan

- **CSS cascade.** The item's `css` imports `@xyflow/react/dist/base.css` into Tailwind's `base` layer (`@import … layer(base)`); the shadcn CLI writes it after `@import "tailwindcss"` (seen in a dry run). React Flow's rules then sit under the utilities with no layer order for anyone to set up. The site's `globals.css` has the same line.
- **Edge contrast.** `foreground/28` misses 3:1; edges and arrows are `foreground/50`, `/40` in dark.
- **Native edges.** Animated SVG props (`d` from a worklet) stopped updating after mount in this setup, while Image Compare's work; the cause wasn't found. Native edges are static paths in an SVG inside the layer that pans and zooms, sized to the visible region at the settled zoom and counter-scaled. Pan and zoom move them with the nodes; a drag re-renders the edges it touches once a frame.
- **Native differences:** a dropped node snaps to neighbours and the grid without live guide lines; a running edge keeps its dashes still; library items are added with a press; no hardware keyboard map on iPad yet.
- **Menus and keyboard.** Shift F10 and the Menu key open the focused node's menu. `C` opens a list of valid targets rather than cycling handles on the canvas.
- **Ports, not arrows (2026-11-27 feedback).** Arrowheads read as pointing at a node rather than plugged into it, with a gap at each end. Edges now run handle centre to handle centre on the node's border, connected ports stay filled (`getConnectedPorts`), and `marker: "arrow"` is opt-in. The controls default to the top centre and the minimap is 132 × 88.
- **Fit.** `fitView.nodeIds` frames part of a large graph; on the web the fit holds through frame resizes until the view is moved, so an App Shell panel restoring its width doesn't crop the first view. A narrow canvas shows search as its icon beside the centred controls.
- **Layout and groups.** A connection to a node inside a group counts as one to the group, so Tidy up ranks the group in the flow instead of stranding it.
- **Node focus** is on the node frame (`nodesFocusable={false}` in React Flow), so focus is styled by slot, not by React Flow's class.

### Checked

- `bun run check` and `bun run test` pass; `native:parity --strict` is clean for Canvas (the one gap left is `input-group`, from other work on this branch); the native typecheck passes; `registry:native --check` compiles both items; `shadcn add --dry-run` succeeds for `canvas` on Base UI, Radix, React Aria and native.
- In the running site (Base UI, Radix, React Aria): light and dark, selection, the node menu from the keyboard, arrows and Alt + arrows, undo merging a run of nudges, keyboard connect and its announcement, empty, loading and error, read-only, static, schema, groups.
- `automation-01` in the running site on all three bases: light and dark previews, phone (390px) and tablet (820px) frames, a test run, Tidy up from the header menu (React Aria), step selection and the panel. On the iPhone simulator after the ports change: connected ports on node edges and the controls at the top centre.
- On the iPhone simulator: rendering, pan, pinch, level of detail, node drag with edges following, the long-press menu, Connect to… from the menu, empty, loading and error.

### Not built

- The automation block's native port (a phone composition of the step panel and library as sheets).
- The iPad hardware keyboard map; dragging library items on native.

### Not verified

- Android, VoiceOver and TalkBack, the iPad layout and the minimap on a tablet.
- Dragging a connection from a handle on native (the menu path was checked).
- The §10.2 budgets; axe on the docs page; trackpad pinch in Electron and Tauri; touch in Tauri mobile.
- Docs previews: fixed on 2026-11-27. Framed examples only get a page when their name starts with a prefix in `FRAME_EXAMPLE_PREFIXES` (`app/(view)/view/[style]/[name]/page.tsx`, documented in `docs/WEBSITE.md`); `canvas-` was missing. All 33 frames (11 examples × 3 bases) return 200.
