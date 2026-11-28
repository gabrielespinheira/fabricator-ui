import * as React from "react"

// The colour of the surface below, for what paints a fade over its content
// (React Native has no mask): a ScrollArea in a Card fades to the card, not
// to the page. The website gets the same from `--current-surface`.

const SurfaceColorContext = React.createContext<string | undefined>(undefined)

function SurfaceColorProvider({
  color,
  children,
}: {
  /** The surface's colour; `undefined` keeps the one around it. */
  color: string | undefined
  children: React.ReactNode
}) {
  const outer = React.use(SurfaceColorContext)
  return (
    <SurfaceColorContext value={color ?? outer}>{children}</SurfaceColorContext>
  )
}

function useSurfaceColor() {
  return React.use(SurfaceColorContext)
}

export { SurfaceColorProvider, useSurfaceColor }
