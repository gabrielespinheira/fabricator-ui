import { useSyncExternalStore } from "react"

const MOBILE_QUERY = "(width < 768px)"

function subscribeToMobileChanges(onChange: () => void) {
  const media = window.matchMedia(MOBILE_QUERY)
  media.addEventListener("change", onChange)
  return () => media.removeEventListener("change", onChange)
}

export function useIsMobile() {
  return useSyncExternalStore(
    subscribeToMobileChanges,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false
  )
}
