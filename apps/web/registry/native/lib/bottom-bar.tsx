import * as React from "react"

// The bottom of a phone screen belongs to one bar at a time. The App Shell
// provides this slot and its tab bar steps aside while something claims it;
// the Editor claims it while it has focus and puts its formatting bar in the
// tab bar's place, as Notes and Notion do. Neither knows the other exists.

type BottomBarValue = {
  /** How many parts hold the bottom bar right now. */
  claims: number
  /** Takes the bottom bar; call what it returns to give it back. */
  claim: () => () => void
}

const BottomBarContext = React.createContext<BottomBarValue | null>(null)

function BottomBarProvider({ children }: { children?: React.ReactNode }) {
  const [claims, setClaims] = React.useState(0)
  const claim = React.useCallback(() => {
    setClaims((count) => count + 1)
    let isReleased = false
    return () => {
      if (isReleased) return
      isReleased = true
      setClaims((count) => Math.max(count - 1, 0))
    }
  }, [])
  const value = React.useMemo(() => ({ claims, claim }), [claims, claim])
  return <BottomBarContext value={value}>{children}</BottomBarContext>
}

/** Holds the bottom bar while `isActive`, when there is a slot to hold. */
function useBottomBarClaim(isActive: boolean) {
  const claim = React.use(BottomBarContext)?.claim
  React.useLayoutEffect(() => {
    if (!isActive || !claim) return
    return claim()
  }, [isActive, claim])
}

/** Whether something other than the tab bar holds the bottom of the screen. */
function useIsBottomBarClaimed() {
  return (React.use(BottomBarContext)?.claims ?? 0) > 0
}

export { BottomBarProvider, useBottomBarClaim, useIsBottomBarClaimed }
