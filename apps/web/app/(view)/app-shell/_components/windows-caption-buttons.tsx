import { cn } from "cn"

// Windows 11's caption buttons: 46px wide, one-pixel 10px glyphs, and its red
// behind Close. overlayWidth in getPlaygroundWindow is their width.
const CAPTION_BUTTONS = [
  {
    name: "minimize",
    glyph: <path d="M0 5.5h10" />,
    hover: "hover:bg-foreground/10",
  },
  {
    name: "maximize",
    glyph: <rect x="0.5" y="0.5" width="9" height="9" rx="1" />,
    hover: "hover:bg-foreground/10",
  },
  {
    name: "close",
    glyph: <path d="m.5.5 9 9m0-9-9 9" />,
    hover: "hover:bg-[#c42b1c] hover:text-white",
  },
]

/** A browser has no native window, so previews draw its buttons. */
export function WindowsCaptionButtons({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("flex text-foreground", className)}>
      {CAPTION_BUTTONS.map(({ name, glyph, hover }) => (
        <span
          key={name}
          className={cn(
            "pointer-events-auto flex w-[46px] items-center justify-center transition-colors duration-feedback ease-feedback",
            hover
          )}
        >
          <svg
            viewBox="0 0 10 10"
            className="size-2.5 fill-none stroke-current"
          >
            {glyph}
          </svg>
        </span>
      ))}
    </div>
  )
}
