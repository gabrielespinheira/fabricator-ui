// Registry items and overrides that exist only in Fabricator styles.
//
// Fabricator styles compile from the same base sources as the upstream styles,
// plus an overlay:
//
// - registry/fabricator/shared/<path>: files used by every base.
// - registry/fabricator/<base>/<path>: per-base files. A file with the same
//   path as an upstream source (e.g. ui/dropdown-menu.tsx) replaces it in the
//   Fabricator style only, so upstream styles keep their exact output.
//
// Overlay files import other registry files through
// `@/registry/bases/__base__/…`; the build substitutes the base being compiled.
// See docs/STYLES.md, "Overrides".

import { type Registry } from "shadcn/schema"

import { fabricatorBlocks } from "@/registry/fabricator/blocks"
import { FABRICATOR_FOUNDATIONS } from "@/registry/fabricator/foundations"

export const fabricatorItems = [
  {
    name: "theme-toggle",
    type: "registry:ui",
    title: "Theme Toggle",
    description:
      "A theme button with a morphing sun and moon, four page reveals that start at the pressed button.",
    dependencies: ["cn"],
    registryDependencies: ["@fabricator/button"],
    files: [
      { path: "ui/theme-toggle.tsx", type: "registry:ui" },
      { path: "lib/theme-toggle-model.ts", type: "registry:lib" },
      { path: "lib/theme-transition.ts", type: "registry:lib" },
      { path: "hooks/use-theme-preference.ts", type: "registry:hook" },
    ],
    categories: ["basics"],
    meta: { fabricator: true },
  },
  {
    name: "bot-face",
    type: "registry:ui",
    title: "BotFace",
    description:
      "An assistant face with ten fluid expressions, agent session mapping, fourteen silhouettes and subtle gaze tracking.",
    dependencies: ["cn", "class-variance-authority"],
    files: [
      { path: "ui/bot-face.tsx", type: "registry:ui" },
      { path: "lib/bot-face-model.ts", type: "registry:lib" },
      { path: "lib/color-model.ts", type: "registry:lib" },
      { path: "lib/bot-face-motion.ts", type: "registry:lib" },
      { path: "lib/bot-face-eye-morph.ts", type: "registry:lib" },
      { path: "lib/bot-face-session.ts", type: "registry:lib" },
      { path: "hooks/use-bot-face-state.ts", type: "registry:hook" },
    ],
    categories: ["chat"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/bot-face",
      },
    },
  },
  {
    name: "spinner-model",
    type: "registry:lib",
    title: "Spinner patterns",
    files: [{ path: "lib/spinner-model.ts", type: "registry:lib" }],
  },
  {
    name: "foundations",
    type: "registry:lib",
    title: "Foundations",
    description:
      "Fabricator surfaces, colour roles, interaction tokens, focus colour, motion, densities and scrollbars.",
    cssVars: FABRICATOR_FOUNDATIONS.cssVars,
    css: FABRICATOR_FOUNDATIONS.css,
  },
  {
    name: "density",
    type: "registry:ui",
    title: "Density",
    description:
      "DensityProvider sets compact, default or spacious for everything inside it, including the popups and dialogs it opens.",
    files: [{ path: "ui/density.tsx", type: "registry:ui" }],
    categories: ["layout"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/foundations/density",
      },
    },
  },
  {
    name: "spring-model",
    type: "registry:lib",
    title: "Spring Model",
    description:
      "Springs that keep their velocity when the target changes, and a highlight whose leading edge is stiff and trailing edge soft, read from the motion spring tokens.",
    files: [{ path: "lib/spring-model.ts", type: "registry:lib" }],
    meta: { fabricator: true },
  },
  {
    name: "fluid-hover",
    type: "registry:lib",
    title: "Fluid Hover",
    description:
      "One highlight that glides to the item nearest the pointer, and a selection background that slides between selected items. Both stretch toward their target on springs.",
    dependencies: ["@radix-ui/react-compose-refs@1.1.5"],
    registryDependencies: ["spring-model"],
    files: [{ path: "lib/fluid-hover.tsx", type: "registry:lib" }],
  },
  {
    name: "avatar-group-parting",
    type: "registry:lib",
    title: "Avatar Group Parting",
    description:
      "Parts an avatar group around the avatar a mouse enters or keyboard focus reaches, until the pointer leaves the group, and shows its name in one label that glides with it.",
    registryDependencies: ["density"],
    files: [{ path: "lib/avatar-group-parting.tsx", type: "registry:lib" }],
  },
  {
    name: "sounds",
    type: "registry:lib",
    title: "Sounds",
    description:
      "Interface sounds synthesized with the Web Audio API, and <SoundEffects /> to play them for every component. On by default.",
    files: [
      { path: "lib/sound-recipes.ts", type: "registry:lib" },
      { path: "lib/sounds.ts", type: "registry:lib" },
      { path: "components/sound-effects.tsx", type: "registry:component" },
    ],
  },
  {
    name: "desktop-window",
    type: "registry:hook",
    title: "Desktop Window",
    description:
      "Finds the Electron or Tauri window hosting the page and gives the App Shell what to lay out around, so one layout serves a browser and a desktop app.",
    files: [
      { path: "hooks/use-desktop-window.ts", type: "registry:hook" },
      { path: "lib/desktop-window.ts", type: "registry:lib" },
    ],
    meta: { fabricator: true },
  },
  {
    name: "file-tree",
    type: "registry:ui",
    title: "File Tree",
    description:
      "A desktop file explorer with folder guides, file-type icons, keyboard navigation, single and range selection, and open and delete callbacks.",
    dependencies: ["@fabricator-ui/icons"],
    registryDependencies: ["fluid-hover"],
    files: [
      { path: "ui/file-tree.tsx", type: "registry:ui" },
      { path: "lib/file-tree-model.ts", type: "registry:lib" },
    ],
    categories: ["navigation"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/file-tree",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/file-tree#examples",
      },
    },
  },
  {
    name: "file-upload",
    type: "registry:ui",
    title: "File Upload",
    description:
      "A file picker with a drop zone: type, size and count checks with reasons, and the picked files as Attachment rows.",
    registryDependencies: ["attachment", "button"],
    files: [
      { path: "ui/file-upload.tsx", type: "registry:ui" },
      { path: "lib/file-upload-model.ts", type: "registry:lib" },
    ],
    categories: ["forms"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/file-upload",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/file-upload#examples",
      },
    },
  },
  {
    name: "chat-input",
    type: "registry:ui",
    title: "Chat Input",
    description:
      "The message box of a chat: a pill that stacks once the draft wraps, or a large card, attachments with drop and paste, voice chat with a glow and a level-following mic, a context meter, and one send slot that starts voice, sends, queues and stops.",
    // voice-glow (MIT, no runtime dependencies, React 18+) draws the voice
    // chat glow; pinned like Relay, which uses the same version.
    dependencies: ["voice-glow@0.3.0"],
    registryDependencies: ["button", "spinner", "density"],
    files: [
      { path: "ui/chat-input.tsx", type: "registry:ui" },
      { path: "lib/chat-input-model.ts", type: "registry:lib" },
    ],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/chat-input",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/chat-input#examples",
      },
    },
  },
  {
    name: "video-player",
    type: "registry:ui",
    title: "Video Player",
    description:
      "A video with its own controls over the picture: a seek bar with chapters and a time preview, skip, volume, captions, speed, picture in picture, full screen and the common keyboard shortcuts. A compact variant keeps play, the seek bar, the time, mute and full screen.",
    registryDependencies: ["spinner"],
    files: [
      { path: "ui/video-player.tsx", type: "registry:ui" },
      { path: "lib/video-player-model.ts", type: "registry:lib" },
    ],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/video-player",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/video-player#examples",
      },
    },
  },
  {
    name: "audio-player",
    type: "registry:ui",
    title: "Audio Player",
    description:
      "An audio file on a card: the artwork, title and artist, a seek bar drawn as the file's waveform, the time played and left, skip back and forward, speed and volume. A cover variant shows a large artwork that breathes with the music, and a compact variant fits play, the waveform, the time and the speed on one row.",
    registryDependencies: ["spinner"],
    files: [
      { path: "ui/audio-player.tsx", type: "registry:ui" },
      { path: "lib/audio-player-model.ts", type: "registry:lib" },
      { path: "lib/video-player-model.ts", type: "registry:lib" },
    ],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/audio-player",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/audio-player#examples",
      },
    },
  },
  {
    name: "image-compare",
    type: "registry:ui",
    title: "Image Compare",
    description:
      "Two pictures of one scene in a single frame, split by a line you drag. The line bends like jelly and the picture is cut along it; a click or a key glides it there and a flick sends it to the edge.",
    files: [
      { path: "ui/image-compare.tsx", type: "registry:ui" },
      { path: "lib/image-compare-model.ts", type: "registry:lib" },
    ],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/image-compare",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/image-compare#examples",
      },
    },
  },
  {
    name: "rating",
    type: "registry:ui",
    title: "Rating",
    description:
      "A row of stars that holds a score. Hover previews it, a click or a drag sets it, in whole or half stars; read-only it shows any fraction. Yellow by default, or primary and the status colours.",
    files: [
      { path: "ui/rating.tsx", type: "registry:ui" },
      { path: "lib/rating-model.ts", type: "registry:lib" },
    ],
    categories: ["forms"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/rating",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/rating#examples",
      },
    },
  },
  {
    name: "folder",
    type: "registry:ui",
    title: "Folder",
    description:
      "A folder as a tile, the way a drive shows one: its first files or thumbnails peeking out, a cover for badges and avatars, its name and details. Hover lifts the files out and tips the front open. Any palette colour, solid or glass.",
    files: [
      { path: "ui/folder.tsx", type: "registry:ui" },
      { path: "lib/folder-model.ts", type: "registry:lib" },
    ],
    registryDependencies: ["palette-model"],
    categories: ["content"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/folder",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/folder#examples",
      },
    },
  },
  {
    name: "hold-button",
    type: "registry:ui",
    title: "Hold Button",
    description:
      "A button that confirms only when held for its whole duration: it fills as you hold, springs back and shakes if you let go early, and shows a check when done. For actions worth a second thought, without a dialog.",
    files: [
      { path: "ui/hold-button.tsx", type: "registry:ui" },
      { path: "lib/hold-button-model.ts", type: "registry:lib" },
    ],
    registryDependencies: ["fluid-hover", "spring-model"],
    categories: ["forms"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/hold-button",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/hold-button#examples",
      },
    },
  },
  {
    name: "slide-to-confirm",
    type: "registry:ui",
    title: "Slide to Confirm",
    description:
      "A track whose thumb you slide to the end to commit. It follows the finger, gives like rubber past the ends, springs back short of the end, and confirms from the keyboard with Enter.",
    files: [
      { path: "ui/slide-to-confirm.tsx", type: "registry:ui" },
      { path: "lib/slide-to-confirm-model.ts", type: "registry:lib" },
    ],
    categories: ["forms"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/slide-to-confirm",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/slide-to-confirm#examples",
      },
    },
  },
  {
    name: "stepper",
    type: "registry:ui",
    title: "Stepper",
    description:
      "The steps of a flow and where the person is in it. Finished steps draw a check, the current one pops up, and the line to the next step fills as each is done.",
    files: [
      { path: "ui/stepper.tsx", type: "registry:ui" },
      { path: "lib/stepper-model.ts", type: "registry:lib" },
    ],
    categories: ["navigation"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/stepper",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/stepper#examples",
      },
    },
  },
  {
    name: "morph-island",
    type: "registry:ui",
    title: "Morph Island",
    description:
      "One pill that morphs between live activities: a timer, an upload, a call. Width springs before height, so a change lands sideways and then drops, the island keeps its volume and gives a small squash, and the states cross-fade through a blur.",
    files: [
      { path: "ui/morph-island.tsx", type: "registry:ui" },
      { path: "lib/morph-island-model.ts", type: "registry:lib" },
    ],
    registryDependencies: ["spring-model"],
    categories: ["basics"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/morph-island",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/morph-island#examples",
      },
    },
  },
  {
    name: "password-strength",
    type: "registry:ui",
    title: "Password Strength",
    description:
      "Four bars under a password field that fill one after another as the password gets stronger, from the destructive role to success, with a word for how strong it is.",
    files: [
      { path: "ui/password-strength.tsx", type: "registry:ui" },
      { path: "lib/password-strength-model.ts", type: "registry:lib" },
    ],
    categories: ["forms"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/password-strength",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/password-strength#examples",
      },
    },
  },
  {
    name: "segmented-meter",
    type: "registry:ui",
    title: "Segmented Meter",
    description:
      "Parts of one total in a single bar with a legend, such as storage by kind. Each part takes a chart series colour and springs to a new size while the rest slide over.",
    files: [
      { path: "ui/segmented-meter.tsx", type: "registry:ui" },
      { path: "lib/segmented-meter-model.ts", type: "registry:lib" },
    ],
    categories: ["content"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/segmented-meter",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/segmented-meter#examples",
      },
    },
  },
  {
    name: "bottom-nav",
    type: "registry:ui",
    title: "Bottom Nav",
    description:
      "A phone app's tab bar: the current tab opens to show its name on a pill that slides between tabs, the others close to their icons, and the icon pops as it is picked.",
    files: [{ path: "ui/bottom-nav.tsx", type: "registry:ui" }],
    registryDependencies: ["fluid-hover"],
    categories: ["navigation"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/bottom-nav",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/bottom-nav#examples",
      },
    },
  },
  {
    name: "text-motion",
    type: "registry:ui",
    title: "Text Motion",
    description:
      "Text that plays in by character, word or line. Effects are layers that combine (fade, blur, rise, mask, flip, scramble, typing), with shimmer and wave loops, a group that plays lines in sequence and a rotating word. Timed by the motion roles.",
    files: [
      { path: "ui/text-motion.tsx", type: "registry:ui" },
      { path: "lib/text-motion-model.ts", type: "registry:lib" },
    ],
    categories: ["typography"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/text-motion",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/text-motion#examples",
      },
    },
  },
  {
    name: "blueprint",
    type: "registry:ui",
    title: "Blueprint",
    description:
      "Sketches a component into place: a dot field ripples out, guides and a dotted outline draw the frame with its size and a clock, each box, line of text and icon is traced under a reticle, then the content fades in as the drawing clears. Timed by the reveal motion role.",
    files: [
      { path: "ui/blueprint.tsx", type: "registry:ui" },
      { path: "lib/blueprint-model.ts", type: "registry:lib" },
    ],
    categories: ["basics"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/blueprint",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/blueprint#examples",
      },
    },
  },
  {
    name: "preview-rail",
    type: "registry:ui",
    title: "Preview Rail",
    description:
      "A rail of thin ticks, one per section, that swell around the pointer like a dock, with a card beside the rail naming the section it's on. A finger scrubs along it.",
    files: [
      { path: "ui/preview-rail.tsx", type: "registry:ui" },
      { path: "lib/preview-rail-model.ts", type: "registry:lib" },
    ],
    categories: ["navigation"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/preview-rail",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/preview-rail#examples",
      },
    },
  },
  {
    name: "model-picker",
    type: "registry:ui",
    title: "Model Picker",
    description:
      "The model switcher's panel: a reasoning effort slider that warms from blue to violet, routing tiles such as Auto, and the models grouped by provider. It goes in a popover of your own.",
    files: [
      { path: "ui/model-picker.tsx", type: "registry:ui" },
      { path: "lib/model-picker-model.ts", type: "registry:lib" },
    ],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/model-picker",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/model-picker#examples",
      },
    },
  },
  {
    name: "number-field",
    type: "registry:ui",
    title: "Number Field",
    description:
      "A number input with decrement and increment steppers, min, max and step, keyboard stepping, and locale formatting for currency, percent and units. A stepped value rolls into place.",
    registryDependencies: ["input-group", "number-roll"],
    files: [{ path: "ui/number-field.tsx", type: "registry:ui" }],
    categories: ["forms"],
    meta: {
      fabricator: true,
      // Radix has no number field: the radix item is the Base UI
      // implementation, and the build adds Base UI's packages to it.
      implementation: { radix: "base" },
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/number-field",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/number-field#examples",
      },
    },
  },
  {
    name: "date-picker",
    type: "registry:ui",
    title: "Date Picker",
    description:
      "A date field that opens a calendar, with an optional column of times, or a grid of months or years, a display format, a minimum and maximum, typing on request and a form value.",
    // @internationalized/date is for the React Aria calendar; date-fns reads
    // and writes the text in every base.
    dependencies: ["date-fns", "@internationalized/date"],
    registryDependencies: [
      "button",
      "calendar",
      "fluid-hover",
      "input-group",
      "popover",
      "time-input",
    ],
    files: [
      { path: "ui/date-picker.tsx", type: "registry:ui" },
      { path: "lib/date-picker-model.ts", type: "registry:lib" },
    ],
    categories: ["forms"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/date-picker",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/date-picker#examples",
      },
    },
  },
  {
    name: "multi-select",
    type: "registry:ui",
    title: "Multi Select",
    description:
      "A searchable list for picking several options, shown as chips in the field that pop in, wipe out and glide into place. The list stays open between picks.",
    registryDependencies: ["fluid-hover", "density"],
    files: [
      { path: "ui/multi-select.tsx", type: "registry:ui" },
      { path: "lib/multi-select-model.ts", type: "registry:lib" },
      { path: "hooks/use-chip-presence.ts", type: "registry:hook" },
    ],
    categories: ["forms"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/multi-select",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/multi-select#examples",
      },
    },
  },
  {
    name: "data-table",
    type: "registry:ui",
    title: "Data Table",
    description:
      "A TanStack table drawn as one sticky-headed grid: typed columns, sorting, Notion-style filters in header popovers, cells that edit in place, pinned and resizable columns, 10,000 virtual rows, infinite scroll or pages from a loader, loading and empty states, a selection bar, table settings and an optional footer of calculations.",
    // @internationalized/date is for the React Aria date filter's
    // RangeCalendar, as with Date Picker.
    dependencies: [
      "@tanstack/react-table@9.3.1",
      "@tanstack/react-virtual@3.14.26",
      "@internationalized/date",
    ],
    registryDependencies: [
      "avatar",
      "badge",
      "button",
      "calendar",
      "checkbox",
      "density",
      "dropdown-menu",
      "empty",
      "input",
      "input-group",
      "popover",
      "progress",
      "select",
      "separator",
      "skeleton",
      "sortable",
      "switch",
      "toggle-group",
    ],
    files: [
      { path: "ui/data-table.tsx", type: "registry:ui" },
      { path: "ui/data-table-cells.tsx", type: "registry:ui" },
      { path: "hooks/use-data-table.ts", type: "registry:hook" },
      { path: "lib/data-table-model.ts", type: "registry:lib" },
    ],
    categories: ["data"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/data-table",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/data-table#examples",
      },
    },
  },
  {
    name: "palette-model",
    type: "registry:lib",
    title: "Palette Model",
    description:
      "The colours a person gives an option, a column or an event, per theme.",
    files: [{ path: "lib/palette-model.ts", type: "registry:lib" }],
  },
  {
    name: "record-properties-model",
    type: "registry:lib",
    title: "Record Properties Model",
    description: "Shared field formatting, filtering and comparison.",
    files: [
      { path: "lib/data-table-model.ts", type: "registry:lib" },
      { path: "lib/property-model.ts", type: "registry:lib" },
      { path: "lib/property-types.ts", type: "registry:lib" },
      { path: "hooks/use-property-types.ts", type: "registry:hook" },
    ],
  },
  {
    name: "properties",
    type: "registry:ui",
    title: "Properties",
    description:
      "Typed fields read and edited as rows: a picker per type, files and pictures, settings behind each label, validation, and your own types beside the built-in ones.",
    // @internationalized/date is for React Aria's calendar in the date picker.
    dependencies: ["@internationalized/date"],
    registryDependencies: [
      "palette-model",
      "record-properties-model",
      "sortable",
      "button",
      "calendar",
      "checkbox",
      "color-picker",
      "command",
      "dropdown-menu",
      "input",
      "input-group",
      "number-field",
      "popover",
      "rating",
      "spinner",
      "switch",
      "textarea",
      "time-input",
      "tooltip",
    ],
    files: [
      { path: "ui/properties.tsx", type: "registry:ui" },
      { path: "components/property-controls.tsx", type: "registry:component" },
      { path: "components/property-editor.tsx", type: "registry:component" },
      { path: "components/property-files.tsx", type: "registry:component" },
      { path: "components/property-icons.tsx", type: "registry:component" },
      { path: "components/property-manager.tsx", type: "registry:component" },
      { path: "components/property-settings.tsx", type: "registry:component" },
      { path: "components/property-value.tsx", type: "registry:component" },
      { path: "hooks/use-delayed-save.ts", type: "registry:hook" },
      { path: "lib/file-upload-model.ts", type: "registry:lib" },
    ],
    meta: { fabricator: true },
  },
  {
    name: "record-view",
    type: "registry:ui",
    title: "Record View",
    description:
      "One record in a side panel over a live screen, a center dialog or a full page.",
    registryDependencies: [
      "button",
      "density",
      "dialog",
      "dropdown-menu",
      "skeleton",
    ],
    files: [
      { path: "ui/record-view.tsx", type: "registry:ui" },
      { path: "components/record-view-parts.tsx", type: "registry:component" },
      { path: "lib/record-view-model.ts", type: "registry:lib" },
    ],
    meta: { fabricator: true },
  },
  {
    name: "kanban",
    type: "registry:ui",
    title: "Kanban",
    description:
      "A board of columns and cards: drag and drop, keyboard moves, swimlanes, typed properties, filters, grouping, selection, quick create, limits and cursor pagination.",
    dependencies: ["@tanstack/react-virtual@3.14.26"],
    registryDependencies: [
      "palette-model",
      "record-properties-model",
      "properties",
      "sortable",
      "button",
      "drawer",
      "input",
      "input-group",
      "skeleton",
      "textarea",
    ],
    files: [
      { path: "ui/kanban.tsx", type: "registry:ui" },
      { path: "components/kanban-actions.tsx", type: "registry:component" },
      { path: "components/kanban-card.tsx", type: "registry:component" },
      { path: "components/kanban-column.tsx", type: "registry:component" },
      { path: "components/kanban-composer.tsx", type: "registry:component" },
      { path: "components/kanban-drag.tsx", type: "registry:component" },
      { path: "components/kanban-toolbar.tsx", type: "registry:component" },
      { path: "hooks/use-kanban.ts", type: "registry:hook" },
      { path: "hooks/use-kanban-keys.ts", type: "registry:hook" },
      { path: "hooks/use-kanban-pages.ts", type: "registry:hook" },
      { path: "lib/kanban-model.ts", type: "registry:lib" },
    ],
    meta: { fabricator: true },
  },
  {
    name: "event-calendar",
    type: "registry:ui",
    title: "Event Calendar",
    description:
      "A Google Calendar-class scheduler on FullCalendar: day, N-day, week, month and agenda views, drag to create, move and resize, recurring events with scoped edits, time zones, a month-by-month loader, optimistic changes with undo, keyboard moves and shortcuts, settings, a mini month and a calendar list.",
    // FullCalendar 7 needs temporal-polyfill beside it. @internationalized/date
    // is for the React Aria date and time fields in the event form, and
    // @tanstack/react-virtual draws the agenda's days in view.
    dependencies: [
      "@fullcalendar/react@7.1.5",
      "temporal-polyfill@1.0.8",
      "@date-fns/tz@1.5.0",
      "date-fns",
      "@internationalized/date",
      "@tanstack/react-virtual@3.14.26",
    ],
    registryDependencies: [
      "palette-model",
      "button",
      "calendar",
      "checkbox",
      "context-menu",
      "date-picker",
      "density",
      "dialog",
      "drawer",
      "empty",
      "field",
      "input",
      "kbd",
      "popover",
      "radio-group",
      "select",
      "switch",
      "textarea",
      "time-input",
    ],
    files: [
      { path: "ui/event-calendar.tsx", type: "registry:ui" },
      { path: "ui/event-calendar-engine.tsx", type: "registry:ui" },
      { path: "ui/event-calendar-event.tsx", type: "registry:ui" },
      { path: "ui/event-calendar-agenda.tsx", type: "registry:ui" },
      { path: "hooks/use-event-calendar.ts", type: "registry:hook" },
      { path: "lib/event-calendar-model.ts", type: "registry:lib" },
      { path: "lib/event-calendar-recurrence.ts", type: "registry:lib" },
      { path: "lib/event-calendar-loader.ts", type: "registry:lib" },
    ],
    categories: ["data", "calendar"],
    meta: {
      fabricator: true,
      baseRegistryDependencies: {
        base: ["toast"],
        radix: ["sonner"],
        aria: ["sonner"],
      },
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/event-calendar",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/event-calendar#examples",
      },
    },
  },
  {
    name: "canvas",
    type: "registry:ui",
    title: "Canvas",
    description:
      "An infinite, zoomable surface of nodes and connections for workflow editors, diagrams and node-based tools, on React Flow: typed handles with connection rules, undo, copy and paste, alignment guides, groups, run status, a node library, search, keyboard navigation and connect, and every state from empty to failed.",
    // React Flow 13 draws the web canvas. Its structural stylesheet goes in
    // Tailwind's base layer, under the utilities, so the style map's classes
    // and the --xy-* variables it sets win without a layer order to set up.
    dependencies: ["@xyflow/react@13.0.3"],
    registryDependencies: [
      "palette-model",
      "properties",
      "alert",
      "button",
      "command",
      "empty",
      "kbd",
      "skeleton",
      "spinner",
    ],
    css: { '@import "@xyflow/react/dist/base.css" layer(base)': {} },
    files: [
      { path: "ui/canvas.tsx", type: "registry:ui" },
      { path: "ui/canvas-context.tsx", type: "registry:ui" },
      { path: "ui/canvas-engine.tsx", type: "registry:ui" },
      { path: "ui/canvas-node.tsx", type: "registry:ui" },
      { path: "ui/canvas-edge.tsx", type: "registry:ui" },
      { path: "components/canvas-commands.tsx", type: "registry:component" },
      { path: "hooks/use-canvas.ts", type: "registry:hook" },
      { path: "lib/canvas-model.ts", type: "registry:lib" },
      { path: "lib/canvas-geometry.ts", type: "registry:lib" },
      { path: "lib/canvas-validation.ts", type: "registry:lib" },
      { path: "lib/canvas-history.ts", type: "registry:lib" },
      { path: "lib/canvas-viewport.ts", type: "registry:lib" },
      { path: "lib/canvas-guides.ts", type: "registry:lib" },
      { path: "lib/canvas-keyboard.ts", type: "registry:lib" },
      { path: "lib/canvas-clipboard.ts", type: "registry:lib" },
      { path: "lib/canvas-layout.ts", type: "registry:lib" },
    ],
    categories: ["data", "diagram"],
    meta: {
      fabricator: true,
      baseRegistryDependencies: {
        base: ["toast"],
        radix: ["sonner"],
        aria: ["sonner"],
      },
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/canvas",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/canvas#examples",
      },
    },
  },
  {
    name: "canvas-layout",
    type: "registry:lib",
    title: "Canvas Layout",
    description:
      "Automatic layered layout for the Canvas on dagre: flows, trees and org charts arranged down or across, through the Canvas's layout port.",
    dependencies: ["@dagrejs/dagre@3.1.4"],
    registryDependencies: ["canvas"],
    files: [{ path: "lib/canvas-layout-dagre.ts", type: "registry:lib" }],
    categories: ["diagram"],
    meta: { fabricator: true },
  },
  {
    name: "chart-kit",
    type: "registry:lib",
    title: "Chart Kit",
    description:
      "What every chart is drawn with: series colours from the chart palette, number formatting, value scales, the tooltip, the legend, axes, the keyboard inspector and the hidden data table. The same model lays charts out on React Native.",
    // d3-scale (ISC, no DOM) rounds value domains to clean ticks; tree-shaken
    // to the linear scale. Pinned: the model relies on its tick rules.
    dependencies: ["d3-scale@4.0.3"],
    devDependencies: ["@types/d3-scale@4.0.9"],
    files: [
      { path: "ui/chart-kit.tsx", type: "registry:ui" },
      { path: "lib/chart-model.ts", type: "registry:lib" },
      { path: "lib/chart-cartesian-model.ts", type: "registry:lib" },
    ],
    categories: ["charts"],
    meta: { fabricator: true },
  },
  {
    name: "area-chart",
    type: "registry:ui",
    title: "Area Chart",
    description:
      "Change over time as filled areas: one or several series, stacked or stretched to 100%, smooth, straight or stepped, with a gliding crosshair and tooltip, a legend that hides and spotlights series, a draw-in and morphing data.",
    // d3-shape (ISC, no DOM) draws the curves and areas.
    dependencies: ["d3-shape@3.2.1"],
    devDependencies: ["@types/d3-shape@3.2.0"],
    registryDependencies: ["chart-kit"],
    files: [
      { path: "ui/area-chart.tsx", type: "registry:ui" },
      { path: "ui/chart-line-plot.tsx", type: "registry:ui" },
      { path: "lib/chart-line-model.ts", type: "registry:lib" },
    ],
    categories: ["charts"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/area-chart",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/area-chart#examples",
      },
    },
  },
  {
    name: "line-chart",
    type: "registry:ui",
    title: "Line Chart",
    description:
      "Change over time as lines for comparing series, with dashed series for targets and forecasts, a gliding crosshair and tooltip, a legend that hides and spotlights series, a draw-in and morphing data.",
    dependencies: ["d3-shape@3.2.1"],
    devDependencies: ["@types/d3-shape@3.2.0"],
    registryDependencies: ["chart-kit"],
    files: [
      { path: "ui/line-chart.tsx", type: "registry:ui" },
      { path: "ui/chart-line-plot.tsx", type: "registry:ui" },
      { path: "lib/chart-line-model.ts", type: "registry:lib" },
    ],
    categories: ["charts"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/line-chart",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/line-chart#examples",
      },
    },
  },
  {
    name: "bar-chart",
    type: "registry:ui",
    title: "Bar Chart",
    description:
      "Magnitude by category: bars side by side or stacked, as columns or rows, at most 24px thick with rounded data ends, a highlight that glides between categories, a tooltip, a legend that hides and spotlights series, bars that grow in and morph with the data.",
    registryDependencies: ["chart-kit"],
    files: [
      { path: "ui/bar-chart.tsx", type: "registry:ui" },
      { path: "ui/chart-bar-plot.tsx", type: "registry:ui" },
      { path: "lib/chart-bar-model.ts", type: "registry:lib" },
    ],
    categories: ["charts"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/bar-chart",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/bar-chart#examples",
      },
    },
  },
  {
    name: "pie-chart",
    type: "registry:ui",
    title: "Pie Chart",
    description:
      "Parts of one whole: slices clockwise from 12 o'clock as one unbroken disc, the smallest past seven folded into Other, shares printed inside on request, a slice that lifts under the pointer with a tooltip, a legend, a sweep-in and slices that turn with the data.",
    // d3-shape (ISC, no DOM) lays out the pie and draws its arcs.
    dependencies: ["d3-shape@3.2.1"],
    devDependencies: ["@types/d3-shape@3.2.0"],
    registryDependencies: ["chart-kit"],
    files: [
      { path: "ui/pie-chart.tsx", type: "registry:ui" },
      { path: "ui/chart-pie-plot.tsx", type: "registry:ui" },
      { path: "lib/chart-pie-model.ts", type: "registry:lib" },
    ],
    categories: ["charts"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/pie-chart",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/pie-chart#examples",
      },
    },
  },
  {
    name: "donut-chart",
    type: "registry:ui",
    title: "Donut Chart",
    description:
      "Parts of one whole as a ring with the total in the centre, which swaps to the slice under the pointer, and a value list with share bars beside or under it, a sweep-in and slices that turn with the data.",
    dependencies: ["d3-shape@3.2.1"],
    devDependencies: ["@types/d3-shape@3.2.0"],
    registryDependencies: ["chart-kit"],
    files: [
      { path: "ui/donut-chart.tsx", type: "registry:ui" },
      { path: "ui/chart-pie-plot.tsx", type: "registry:ui" },
      { path: "lib/chart-pie-model.ts", type: "registry:lib" },
    ],
    categories: ["charts"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/donut-chart",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/donut-chart#examples",
      },
    },
  },
  {
    name: "composition-chart",
    type: "registry:ui",
    title: "Composition Chart",
    description:
      "How the mix of a whole changes over time: a 100% column per period, each part its share, with a legend that reads every part's share of the inspected column, a highlight that glides between columns, a tooltip, columns that grow in and morph with the data.",
    registryDependencies: ["chart-kit"],
    files: [
      { path: "ui/composition-chart.tsx", type: "registry:ui" },
      { path: "ui/chart-bar-plot.tsx", type: "registry:ui" },
      { path: "lib/chart-bar-model.ts", type: "registry:lib" },
      { path: "lib/chart-composition-model.ts", type: "registry:lib" },
    ],
    categories: ["charts"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/composition-chart",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/composition-chart#examples",
      },
    },
  },
  {
    name: "candlestick-chart",
    type: "registry:ui",
    title: "Candlestick Chart",
    description:
      "Open, high, low and close per period, rising in the success colour and falling in destructive, with an optional volume band, a dashed line at the latest close with its price, a crosshair and tooltip with the signed change, bodies that grow in and candles that slide when a period is added.",
    registryDependencies: ["chart-kit"],
    files: [
      { path: "ui/candlestick-chart.tsx", type: "registry:ui" },
      { path: "lib/chart-candlestick-model.ts", type: "registry:lib" },
    ],
    categories: ["charts"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/candlestick-chart",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/candlestick-chart#examples",
      },
    },
  },
  {
    name: "bump-chart",
    type: "registry:ui",
    title: "Bump Chart",
    description:
      "Rank over time, who overtook whom: a line per series through its rank at every index, ranks as given or scores ranked per index, rings holding each rank, names at the line ends, a tooltip with each move, a legend with the latest standing, a sweep-in and points that move to their new places.",
    // d3-shape (ISC, no DOM) draws the bump curves.
    dependencies: ["d3-shape@3.2.1"],
    devDependencies: ["@types/d3-shape@3.2.0"],
    registryDependencies: ["chart-kit"],
    files: [
      { path: "ui/bump-chart.tsx", type: "registry:ui" },
      { path: "lib/chart-bump-model.ts", type: "registry:lib" },
    ],
    categories: ["charts"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/bump-chart",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/bump-chart#examples",
      },
    },
  },
  {
    name: "treemap",
    type: "registry:ui",
    title: "Treemap",
    description:
      "Hierarchical parts of a whole: a cell per leaf sized by its value, washed in its top-level group's colour with its name and value inside when they fit, a deeper wash and tooltip under the pointer, a legend that hides and spotlights groups, cells that scale in and re-lay smoothly with the data.",
    // d3-hierarchy (ISC, no DOM) lays out the squarified treemap.
    dependencies: ["d3-hierarchy@3.1.3"],
    devDependencies: ["@types/d3-hierarchy@3.1.7"],
    registryDependencies: ["chart-kit"],
    files: [
      { path: "ui/treemap.tsx", type: "registry:ui" },
      { path: "lib/chart-treemap-model.ts", type: "registry:lib" },
    ],
    categories: ["charts"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/treemap",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/treemap#examples",
      },
    },
  },
  {
    name: "funnel-chart",
    type: "registry:ui",
    title: "Funnel Chart",
    description:
      "Ordered stages losing volume, vertical or horizontal: one shape split into stages joined by smooth tapers, in one hue that lightens stage by stage, each value on a pill and each conversion beside its taper, a highlight and tooltip with the share and conversion, stages that grow in and morph with the data.",
    registryDependencies: ["chart-kit"],
    files: [
      { path: "ui/funnel-chart.tsx", type: "registry:ui" },
      { path: "lib/chart-funnel-model.ts", type: "registry:lib" },
    ],
    categories: ["charts"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/funnel-chart",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/funnel-chart#examples",
      },
    },
  },
  {
    name: "sankey-chart",
    type: "registry:ui",
    title: "Sankey Chart",
    description:
      "Flow volumes between stages: nodes in columns sized by what flows through them, ribbons as thick as each flow in their source's colour, labels beside the nodes, a highlight of everything a node or link touches with a tooltip, links that extend from their sources and morph with the data.",
    registryDependencies: ["chart-kit"],
    files: [
      { path: "ui/sankey-chart.tsx", type: "registry:ui" },
      { path: "lib/chart-sankey-model.ts", type: "registry:lib" },
    ],
    categories: ["charts"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/sankey-chart",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/sankey-chart#examples",
      },
    },
  },
  {
    name: "heat-calendar",
    type: "registry:ui",
    title: "Heat Calendar",
    description:
      "A value per day over months, as a grid of weeks by weekdays in five levels of one hue: month and weekday labels, the range and a Less to More key, square cells sized to the width that scroll past their minimum, a lifted cell and tooltip that glide from day to day, a diagonal draw-in and levels that ease with the data.",
    // date-fns does the calendar maths and @date-fns/tz keeps it in UTC, so
    // a server and a browser put a value on the same day.
    dependencies: ["date-fns", "@date-fns/tz@1.5.0"],
    registryDependencies: ["chart-kit"],
    files: [
      { path: "ui/heat-calendar.tsx", type: "registry:ui" },
      { path: "lib/chart-heat-calendar-model.ts", type: "registry:lib" },
    ],
    categories: ["charts"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/heat-calendar",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/heat-calendar#examples",
      },
    },
  },
  {
    name: "status-bar",
    type: "registry:ui",
    title: "Status Bar",
    description:
      "Uptime as one tall pill per day or period, coloured by status with the status roles: the first and last day and the uptime share under it, a legend naming every status shown, a lifted pill and tooltip with the day's note, pills that rise in a wave and crossfade when a status changes.",
    // date-fns and @date-fns/tz read dates as UTC days, as Heat Calendar does.
    dependencies: ["date-fns", "@date-fns/tz@1.5.0"],
    registryDependencies: ["chart-kit"],
    files: [
      { path: "ui/status-bar.tsx", type: "registry:ui" },
      { path: "lib/chart-status-bar-model.ts", type: "registry:lib" },
    ],
    categories: ["charts"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/status-bar",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/status-bar#examples",
      },
    },
  },
  {
    name: "radial-chart",
    type: "registry:ui",
    title: "Radial Chart",
    description:
      "Progress of a few values against their target as concentric rings, round a full circle or a half gauge: a faint track and a round-capped arc per ring, the first ring's share in the centre, a tooltip, a legend, arcs that sweep in and turn with the data.",
    // d3-shape (ISC, no DOM) draws the round-capped arcs.
    dependencies: ["d3-shape@3.2.1"],
    devDependencies: ["@types/d3-shape@3.2.0"],
    registryDependencies: ["chart-kit"],
    files: [
      { path: "ui/radial-chart.tsx", type: "registry:ui" },
      { path: "lib/chart-radial-model.ts", type: "registry:lib" },
    ],
    categories: ["charts"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/radial-chart",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/radial-chart#examples",
      },
    },
  },
  {
    name: "radar-chart",
    type: "registry:ui",
    title: "Radar Chart",
    description:
      "Several measures of one or more subjects on shared axes: a hairline grid of polygons and spokes, a washed polygon per series, an inspector that steps through the axes with a ringed dot per series and a tooltip, a legend, polygons that grow in and morph with the data.",
    registryDependencies: ["chart-kit"],
    files: [
      { path: "ui/radar-chart.tsx", type: "registry:ui" },
      { path: "lib/chart-radar-model.ts", type: "registry:lib" },
    ],
    categories: ["charts"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/radar-chart",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/radar-chart#examples",
      },
    },
  },
  // MARK: next chart
  {
    name: "time-input",
    type: "registry:ui",
    title: "Time Input",
    description:
      "A text field that takes a typed time or one picked on a looping 3D wheel of hours, minutes and seconds, in 12- or 24-hour form, with a range and a form value.",
    registryDependencies: ["input-group", "popover", "spring-model"],
    files: [
      { path: "ui/time-input.tsx", type: "registry:ui" },
      { path: "ui/time-wheel.tsx", type: "registry:ui" },
      { path: "lib/time-input-model.ts", type: "registry:lib" },
      { path: "lib/time-wheel-model.ts", type: "registry:lib" },
    ],
    categories: ["forms"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/time-input",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/time-input#examples",
      },
    },
  },
  {
    name: "syntax-highlight",
    type: "registry:ui",
    title: "Syntax Highlight",
    description:
      "Code coloured by the foundations' syntax tokens, in over 30 languages, read from a name or a file name: a title bar with the file and Copy, line numbers, highlighted, added and removed lines, and wrapping. The same tokenizer runs on React Native.",
    // refractor (MIT, typed, no DOM) reads the code: Prism's grammars as
    // plain ESM, synchronous, so it renders on the server and on React
    // Native alike. Core plus the bundled languages is ~37 kB gzipped.
    // Pinned: the model maps its token names.
    dependencies: ["refractor@5.0.0"],
    registryDependencies: ["button"],
    files: [
      { path: "ui/syntax-highlight.tsx", type: "registry:ui" },
      { path: "lib/syntax-highlight-model.ts", type: "registry:lib" },
    ],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/syntax-highlight",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/syntax-highlight#examples",
      },
    },
  },
  {
    name: "markdown",
    type: "registry:ui",
    title: "Markdown",
    description:
      "Markdown drawn with the Editor's document typography in three sizes: headings, lists and tasks, quotes, code, tables, images and links, with anything it doesn't model kept as its source. Its own parser, no dependencies.",
    registryDependencies: ["syntax-highlight"],
    files: [
      { path: "ui/markdown.tsx", type: "registry:ui" },
      { path: "lib/editor-model.ts", type: "registry:lib" },
      { path: "lib/markdown-parse.ts", type: "registry:lib" },
      { path: "lib/markdown-tree.ts", type: "registry:lib" },
    ],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/markdown",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/markdown#examples",
      },
    },
  },
  {
    name: "editor",
    type: "registry:ui",
    title: "Rich Text Editor",
    description:
      "A rich text editor whose value is Markdown: a toolbar, a selection bar, a keyboard bar on phones, shortcuts and Markdown shortcuts, saving unedited blocks byte for byte. Its own engine, shared with React Native, no dependencies.",
    registryDependencies: ["markdown", "syntax-highlight", "toggle"],
    files: [
      { path: "ui/editor.tsx", type: "registry:ui" },
      { path: "hooks/use-editor-floating.ts", type: "registry:hook" },
      { path: "hooks/use-editor-toolbar.ts", type: "registry:hook" },
      { path: "lib/editor-commands.ts", type: "registry:lib" },
      { path: "lib/editor-dom.ts", type: "registry:lib" },
      { path: "lib/editor-input.ts", type: "registry:lib" },
      { path: "lib/editor-kit.ts", type: "registry:lib" },
      { path: "lib/editor-store.ts", type: "registry:lib" },
      { path: "lib/editor-surface-model.ts", type: "registry:lib" },
      { path: "lib/editor-table.ts", type: "registry:lib" },
      { path: "lib/editor-transaction.ts", type: "registry:lib" },
      { path: "lib/markdown-serialize.ts", type: "registry:lib" },
    ],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/editor",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/editor#examples",
      },
    },
  },
  {
    name: "color-picker",
    type: "registry:ui",
    title: "Color Picker",
    description:
      "A color picker with a saturation area, hue and alpha sliders, HEX, RGB, HSL and OKLCH fields, swatches and the eyedropper, inline or in a popover.",
    registryDependencies: [
      "button",
      "button-group",
      "input-group",
      "popover",
      "select",
      "slider",
      "tooltip",
      "fluid-hover",
    ],
    files: [
      { path: "ui/color-picker.tsx", type: "registry:ui" },
      { path: "lib/color-model.ts", type: "registry:lib" },
    ],
    categories: ["forms"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/color-picker",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/color-picker#examples",
      },
    },
  },
  {
    name: "app-shell-model",
    type: "registry:lib",
    title: "App Shell model",
    description:
      "The App Shell's behaviour as plain data and pure functions: navigation, tabs, panels, layout, shortcuts, resize and breadcrumbs. No DOM, so a React Native shell can share it.",
    files: [{ path: "lib/app-shell-model.ts", type: "registry:lib" }],
  },
  {
    name: "sidebar-model",
    type: "registry:lib",
    title: "Sidebar model",
    description:
      "The Sidebar's plain data and rules: its toggle's glyph, and how the phone sidebar's reveal moves and settles. No DOM, so a React Native shell can share it.",
    files: [{ path: "lib/sidebar-model.ts", type: "registry:lib" }],
  },
  {
    name: "slider-model",
    type: "registry:lib",
    title: "Slider model",
    description:
      "The Slider's step dots and the rule that tells a drag from a press, so a click on the track glides and a drag follows the pointer.",
    files: [
      { path: "lib/slider-model.ts", type: "registry:lib" },
      { path: "hooks/use-slider-drag.ts", type: "registry:hook" },
    ],
  },
  {
    name: "input-search-model",
    type: "registry:lib",
    title: "Input search model",
    description:
      "When a search field offers its clear button and what Escape does: clears the text, or reaches the dialog around an empty field.",
    files: [{ path: "lib/input-search-model.ts", type: "registry:lib" }],
  },
  {
    name: "accordion-shape",
    type: "registry:lib",
    title: "Accordion shape",
    description:
      "Joins closed accordion items into one card and parts an open one from its neighbours, for the web and React Native.",
    files: [
      { path: "lib/accordion-model.ts", type: "registry:lib" },
      { path: "hooks/use-accordion-shape.ts", type: "registry:hook" },
    ],
  },
  {
    name: "toast-stack",
    type: "registry:lib",
    title: "Toast Stack",
    description:
      "Sizes toasts to their text and stacks them, for Toast and Sonner.",
    files: [
      { path: "lib/toast-stack-model.ts", type: "registry:lib" },
      { path: "hooks/use-toast-stack.ts", type: "registry:hook" },
    ],
  },
  {
    name: "tooltip-travel",
    type: "registry:lib",
    title: "Tooltip travel",
    description:
      "Moving between triggers, a tooltip opens at the last one's place and size and springs to its own, so one tooltip seems to travel along a toolbar.",
    registryDependencies: ["fluid-hover", "spring-model"],
    files: [
      { path: "lib/tooltip-travel-model.ts", type: "registry:lib" },
      { path: "hooks/use-tooltip-travel.ts", type: "registry:hook" },
    ],
    meta: { fabricator: true },
  },
  {
    name: "number-roll",
    type: "registry:lib",
    title: "Number roll",
    description:
      "Rolls a number field's value into place when it steps: up when it grows, down when it shrinks, on the soft spring.",
    registryDependencies: ["fluid-hover", "spring-model"],
    files: [
      { path: "lib/number-roll-model.ts", type: "registry:lib" },
      { path: "hooks/use-number-roll.ts", type: "registry:hook" },
    ],
    meta: { fabricator: true },
  },
  {
    name: "radio-glide",
    type: "registry:lib",
    title: "Radio glide",
    description:
      "Glides the Radio Group's checked dot from the radio it leaves to the one picked.",
    registryDependencies: ["fluid-hover"],
    files: [
      { path: "lib/radio-glide-model.ts", type: "registry:lib" },
      { path: "hooks/use-radio-glide.ts", type: "registry:hook" },
    ],
  },
  {
    name: "sortable",
    type: "registry:lib",
    title: "Sortable",
    description:
      "The one drag-and-drop adapter: pointer sorting in lists and between groups, used by Tab Strip, App Nav, Kanban and the Data Table.",
    // Pinned exactly: @dnd-kit/react is pre-1.0 and changes its API between
    // minors. This file is the only one that imports it.
    dependencies: [
      "@dnd-kit/react@0.5.3",
      "@dnd-kit/dom@0.5.3",
      "@dnd-kit/abstract@0.5.3",
    ],
    files: [{ path: "lib/sortable.tsx", type: "registry:lib" }],
  },
  {
    name: "app-shell",
    type: "registry:ui",
    title: "App Shell",
    description:
      "The frame an app lives in: sidebar, main column with header and breadcrumb, panels that dock or float by the room left, one shortcut registry, and native-window chrome for Electron and Tauri.",
    registryDependencies: [
      "app-shell-model",
      "sidebar",
      "breadcrumb",
      "button",
      "drawer",
      "dropdown-menu",
      "kbd",
      "sheet",
      "tabs",
      "tooltip",
    ],
    files: [{ path: "ui/app-shell.tsx", type: "registry:ui" }],
    categories: ["layout"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/app-shell",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/app-shell#examples",
      },
    },
  },
  {
    name: "tab-strip",
    type: "registry:ui",
    title: "Tab Strip",
    description:
      "Document tabs as in a browser or an editor: pinned and preview tabs, drag to reorder, close variants, reopen, rename and the usual shortcuts.",
    registryDependencies: [
      "app-shell-model",
      "app-shell",
      "sortable",
      "fluid-hover",
      "button",
      "context-menu",
      "dropdown-menu",
      "spinner",
      "tooltip",
    ],
    files: [{ path: "ui/tab-strip.tsx", type: "registry:ui" }],
    categories: ["navigation"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/tab-strip",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/tab-strip#examples",
      },
    },
  },
  {
    name: "app-nav",
    type: "registry:component",
    title: "App Nav",
    description:
      "Renders a navigation model into the Sidebar: groups, badges, statuses, children, row actions, reordering, pinning and hiding.",
    registryDependencies: [
      "app-shell-model",
      "app-shell",
      "sortable",
      "sidebar",
      "button",
      "context-menu",
      "dialog",
      "dropdown-menu",
      "switch",
    ],
    files: [{ path: "ui/app-nav.tsx", type: "registry:ui" }],
    categories: ["navigation"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/app-nav",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/app-nav#examples",
      },
    },
  },
  {
    name: "workspace-switcher",
    type: "registry:component",
    title: "Workspace Switcher",
    description:
      "Switches the organization or workspace: a menu for a few, a searchable dialog for many, and an overlay while the next one loads.",
    registryDependencies: [
      "app-shell",
      "sidebar",
      "command",
      "dropdown-menu",
      "kbd",
      "spinner",
      "tooltip",
    ],
    files: [{ path: "ui/workspace-switcher.tsx", type: "registry:ui" }],
    categories: ["navigation"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/workspace-switcher",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/workspace-switcher#examples",
      },
    },
  },
  {
    name: "user-menu",
    type: "registry:component",
    title: "User Menu",
    description:
      "The signed-in person's menu, as a sidebar row or an avatar mark, with tabs for the theme.",
    registryDependencies: [
      "sidebar",
      "avatar",
      "dropdown-menu",
      "theme-toggle",
    ],
    files: [{ path: "ui/user-menu.tsx", type: "registry:ui" }],
    categories: ["navigation"],
    meta: {
      fabricator: true,
      links: {
        docs: "https://fabricator-ui.vercel.app/docs/components/base/user-menu",
        examples:
          "https://fabricator-ui.vercel.app/docs/components/base/user-menu#examples",
      },
    },
  },
  ...[
    {
      name: "app-shell-01",
      title: "App Shell 01",
      description:
        "A workspace app: account and organization in the sidebar's first row, customizable grouped navigation, a breadcrumb that hands over to the page title, and a details panel.",
      registryDependencies: [
        "app-shell",
        "app-nav",
        "workspace-switcher",
        "user-menu",
      ],
    },
    {
      name: "app-shell-02",
      title: "App Shell 02",
      description:
        "A workbench: document tabs above the content, a resources panel switched from the tab row, a status bar, and a sidebar that peeks.",
      registryDependencies: ["app-shell", "app-nav", "tab-strip"],
    },
    {
      name: "app-shell-03",
      title: "App Shell 03",
      description:
        "A classic SaaS layout: team switcher on top, the person's menu at the bottom, and a sidebar that collapses to icons.",
      registryDependencies: [
        "app-shell",
        "app-nav",
        "workspace-switcher",
        "user-menu",
      ],
    },
    {
      name: "app-shell-04",
      title: "App Shell 04",
      description:
        "A desktop app for Electron or Tauri: tabs in a titlebar row that clears the native window controls, with drag regions.",
      registryDependencies: ["app-shell", "app-nav", "tab-strip"],
    },
    {
      name: "app-shell-05",
      title: "App Shell 05",
      description:
        "Mobile first: a tab bar and a floating primary action on phones, and a message that swaps in over the list.",
      registryDependencies: ["app-shell", "app-nav"],
    },
  ].map((block) => ({
    ...block,
    type: "registry:block" as const,
    files: [
      {
        path: `blocks/${block.name}/page.tsx`,
        type: "registry:page" as const,
        target: "app/dashboard/page.tsx",
      },
    ],
    categories: ["app-shell", "dashboard"],
    meta: { fabricator: true },
  })),
  ...fabricatorBlocks,
  {
    name: "radius-pill",
    type: "registry:theme",
    title: "Pill radius",
    description:
      "Sets --radius to 1.25rem: controls become full pills and containers stay concentric. The default is 0.5rem.",
    cssVars: {
      light: { radius: "1.25rem" },
    },
  },
] satisfies Registry["items"]

// Extra dependencies for items whose Fabricator source differs from upstream.
// Bare names are namespaced to @fabricator by the build.
// Applied only for bases that have an override file for the item.
export const fabricatorOverrides: Record<
  string,
  { dependencies?: string[]; registryDependencies?: string[] }
> = {
  spinner: { registryDependencies: ["spinner-model"] },
  // An avatar's optional tooltip, and its group's parting.
  avatar: { registryDependencies: ["tooltip", "avatar-group-parting"] },
  // Portalled popups, dialogs and sheets read the nearest DensityProvider.
  dialog: { registryDependencies: ["density"] },
  "alert-dialog": { registryDependencies: ["density"] },
  sheet: { registryDependencies: ["density"] },
  drawer: { registryDependencies: ["density"] },
  popover: { registryDependencies: ["density"] },
  "hover-card": { registryDependencies: ["density"] },
  tooltip: { registryDependencies: ["density", "tooltip-travel"] },
  "dropdown-menu": { registryDependencies: ["fluid-hover", "density"] },
  "context-menu": { registryDependencies: ["fluid-hover", "density"] },
  select: { registryDependencies: ["fluid-hover", "density"] },
  combobox: { registryDependencies: ["fluid-hover", "density"] },
  command: { registryDependencies: ["fluid-hover"] },
  "navigation-menu": { registryDependencies: ["fluid-hover", "density"] },
  tabs: { registryDependencies: ["fluid-hover"] },
  "toggle-group": { registryDependencies: ["fluid-hover"] },
  sidebar: { registryDependencies: ["fluid-hover", "kbd", "sidebar-model"] },
  accordion: { registryDependencies: ["fluid-hover", "accordion-shape"] },
  table: { registryDependencies: ["fluid-hover"] },
  questionnaire: { registryDependencies: ["fluid-hover"] },
  // InputSearch: the clear button and Escape.
  "input-group": { registryDependencies: ["input-search-model"] },
  slider: { registryDependencies: ["slider-model"] },
  "radio-group": { registryDependencies: ["radio-glide"] },
  toast: { registryDependencies: ["toast-stack", "fluid-hover"] },
  sonner: { dependencies: ["cn"], registryDependencies: ["toast-stack"] },
  // The month and year dropdowns are the library's Select.
  calendar: { registryDependencies: ["select"] },
}

/**
 * Upstream items the Fabricator library leaves out of its registry, mapped
 * to the item that replaces them in other items' dependencies (null drops the
 * dependency). The library doesn't ship controls that only restyle a raw
 * native element: Native Select is replaced by Select everywhere. Menubar is
 * left out: desktop apps take their menus from the window, and pages use a
 * Dropdown Menu. Chart is
 * left out for now, together with the blocks built on it (dashboard-01 and
 * the preview / preview-02 showcase blocks). The upstream styles, compiled
 * only for the parity check, keep every upstream item. Items that used an
 * excluded one get a Fabricator override that
 * uses the replacement (registry/fabricator/<base>/...).
 */
export const FABRICATOR_EXCLUDED_ITEMS: Record<string, string | null> = {
  "native-select": "select",
  "native-select-example": null,
  menubar: null,
  "menubar-example": null,
  chart: null,
  "chart-example": null,
  "dashboard-01": null,
  preview: null,
  "preview-02": null,
}

/**
 * Whether a demo file (`<item>-<intent>.tsx`) belongs to an excluded item.
 * A Fabricator item whose name only starts with an excluded one keeps its
 * demos: `preview-rail-demo.tsx` is Preview Rail's, not the `preview` block's.
 */
export function isFabricatorExcludedDemo(file: string) {
  const isOwnedByFabricatorItem = (excluded: string) =>
    fabricatorItems.some(
      (item) =>
        item.name.length > excluded.length &&
        item.name.startsWith(`${excluded}-`) &&
        file.startsWith(`${item.name}-`)
    )
  return Object.keys(FABRICATOR_EXCLUDED_ITEMS).some(
    (name) => file.startsWith(`${name}-`) && !isOwnedByFabricatorItem(name)
  )
}

/** Items that every Fabricator component installs alongside itself. */
export const FABRICATOR_REQUIRED_ITEMS = ["foundations"]
