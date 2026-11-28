// The features the /features page presents, in order. Each preview is mapped
// by id in the page.

export type Feature = {
  id: string
  name: string
  title: string
  lead: string
  reasons: string[]
  code: string
  language: "tsx" | "bash"
  docs: { href: string; label: string }
}

export const FEATURES = [
  {
    id: "fluid-hover",
    name: "Fluid hover",
    title: "One highlight that follows the hand",
    lead: "Menus, selects, tabs, tables, accordions and the sidebar share one highlight that glides to the item nearest the pointer. It never switches off between rows, so a list reads as one surface instead of a stack of buttons.",
    reasons: [
      "A plain :hover goes dark in every gap, and each blink pulls the eye back to the list.",
      "The nearest item always wins, so a click in the gap between two rows still lands.",
      "It follows keyboard focus while the pointer is away, and skips disabled rows.",
    ],
    code: `const fluid = useFluidHover({
  items: "[data-item]",
})

<div ref={fluid.attach} {...fluid.props}>
  <FluidHoverHighlight hover={fluid.hover} />
  {items}
</div>`,
    language: "tsx",
    docs: { href: "/docs/foundations/fluid-hover", label: "Fluid Hover" },
  },
  {
    id: "squircle",
    name: "Squircle",
    title: "Corners that ease into the edge",
    lead: "Pick the Squircle shape and every corner becomes continuous, the way Apple draws them. A circular corner meets the straight edge with a visible kink; a superellipse blends into it, so cards and buttons look softer at the same radius.",
    reasons: [
      "Corners come from roles (control, surface, card), so nested layers stay concentric in every shape.",
      "Sizes and spacing are the same in Rounded, Squircle and Pill, so switching never moves a layout.",
      "Chrome, Edge and Electron draw it with CSS corner-shape, iOS with a continuous border curve. Other browsers fall back to round corners.",
    ],
    code: `npx fabricator-ui@latest add radius-squircle`,
    language: "bash",
    docs: { href: "/docs/foundations/radius#squircle", label: "Radius" },
  },
  {
    id: "safe-submenus",
    name: "Safe submenus",
    title: "Menus that know where you're heading",
    lead: "Reaching for a submenu on a diagonal crosses the rows below its trigger, and in most menus each of them steals the submenu. Fabricator watches the direction of the pointer, and while it points at the open submenu, those rows wait.",
    reasons: [
      "Every move is checked against the triangle between the pointer and the submenu's near edge.",
      "Two moves away from it, a press or a 300ms rest hand the rows back, so a change of mind is never ignored.",
      "Dropdown Menu and Context Menu do it on Base UI, Radix and React Aria, with nothing to configure.",
    ],
    code: `<DropdownMenuSub>
  <DropdownMenuSubTrigger>Share</DropdownMenuSubTrigger>
  <DropdownMenuSubContent>
    <DropdownMenuItem>Copy link</DropdownMenuItem>
  </DropdownMenuSubContent>
</DropdownMenuSub>`,
    language: "tsx",
    docs: {
      href: "/docs/components/base/dropdown-menu",
      label: "Dropdown Menu",
    },
  },
  {
    id: "surfaces",
    name: "Surfaces",
    title: "Depth instead of dividing lines",
    lead: "Eight elevation levels, each a background paired with its own shadow. The shadow starts with a 1px ring that draws the edge, so cards, menus and dialogs need no borders. In dark mode each level is a step lighter than the one below.",
    reasons: [
      "Height separates layers, which keeps screens calm and free of lines.",
      "Hover and press are translucent washes (bg-hover, bg-active), so they work on any level.",
      "One base colour tints the whole ladder, with text kept AA in light and dark.",
    ],
    code: `<div className="bg-surface-3 shadow-surface-3">
  {/* a card or a popover */}
</div>`,
    language: "tsx",
    docs: { href: "/docs/foundations/colors#surfaces", label: "Colors" },
  },
  {
    id: "sounds",
    name: "Sounds",
    title: "Interfaces you can hear",
    lead: "Thirty-two short, quiet sounds, synthesized with the Web Audio API at the moment they play. There are no audio files and no dependencies, and your components don't change.",
    reasons: [
      "Each family has its own material, so you can tell what you touched without looking.",
      "<SoundEffects /> finds the sound from data-slot and ARIA roles, so every component plays once it mounts.",
      "Pass the person's setting to enabled and they can switch sounds off.",
    ],
    code: `<SoundEffects enabled={soundsOn} />

<Button data-sound="copy">Copy link</Button>`,
    language: "tsx",
    docs: { href: "/docs/foundations/sounds", label: "Sounds" },
  },
  {
    id: "scroll-fade",
    name: "Scroll fade",
    title: "Edges that show there's more",
    lead: "A scroller dissolves at the edge where more content waits and sharpens when you reach the end. It is one class, drawn on an eased curve, with no JavaScript and no scroll listeners.",
    reasons: [
      "The mask fades the content itself, so it fits any background without picking a colour.",
      "Scroll-driven animations track the position: the top fades in as you leave it, the bottom clears at the end.",
      "A list that doesn't overflow gets no fade, so you can add it everywhere.",
    ],
    code: `<div className="scroll-fade overflow-y-auto">
  {/* a long list */}
</div>`,
    language: "tsx",
    docs: { href: "/docs/utils/scroll-fade", label: "scroll-fade" },
  },
  {
    id: "blueprint",
    name: "Blueprint",
    title: "Sketched into place",
    lead: "Wrap any component and it is drawn before it appears: a dot field ripples out, guides and a dotted outline frame it, every box and line of text is traced, then the real content fades in over the drawing.",
    reasons: [
      "It reads the layout from what you wrap, so a card, a form or a whole panel each gets its own drawing.",
      "With loading, the sketch holds and keeps scanning until the data arrives, so it doubles as a loading state.",
      "Its timing follows the motion setting, and Reduce Motion skips the drawing.",
    ],
    code: `<Blueprint loading={isLoading}>
  <Card>…</Card>
</Blueprint>`,
    language: "tsx",
    docs: { href: "/docs/components/base/blueprint", label: "Blueprint" },
  },
] as const satisfies readonly Feature[]

export type FeatureId = (typeof FEATURES)[number]["id"]
