import { cn } from "cn"

// Fabricator override: the frame glides to a new ratio on the move timing,
// and a `style` prop merges with the ratio instead of replacing it.
function AspectRatio({
  ratio,
  className,
  style,
  ...props
}: React.ComponentProps<"div"> & { ratio: number }) {
  return (
    <div
      data-slot="aspect-ratio"
      style={
        {
          "--ratio": ratio,
          ...style,
        } as React.CSSProperties
      }
      className={cn(
        "relative aspect-(--ratio) transition-[aspect-ratio] duration-move ease-move motion-reduce:transition-none",
        className
      )}
      {...props}
    />
  )
}

export { AspectRatio }
