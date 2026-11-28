/** Read at playback time so changes apply without a React render. */
export function isMotionOff(element?: Element | null) {
  if (typeof document === "undefined") return true
  return (
    document.documentElement.dataset.motion === "off" ||
    Boolean(element?.closest('[data-motion="off"]')) ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}
