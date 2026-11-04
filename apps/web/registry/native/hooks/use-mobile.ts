import { useWindowDimensions } from "react-native"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  return useWindowDimensions().width < MOBILE_BREAKPOINT
}
