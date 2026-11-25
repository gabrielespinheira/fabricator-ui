"use client"

import * as React from "react"

import {
  isBillingSample,
  type BillingSample,
} from "@/registry/bases/__base__/blocks/billing-01/lib/billing-data"

// Changing plan is a step of its own, kept in the hash so Back leaves it.
// The sample situation is read from ?state=, so each one can be linked.

const PLANS_HASH = "#plans"

function subscribeToLocation(onChange: () => void) {
  window.addEventListener("hashchange", onChange)
  window.addEventListener("popstate", onChange)
  return () => {
    window.removeEventListener("hashchange", onChange)
    window.removeEventListener("popstate", onChange)
  }
}

function getSample(): BillingSample {
  const state = new URLSearchParams(window.location.search).get("state")
  return isBillingSample(state) ? state : "active"
}

export function useBillingSample() {
  const linked = React.useSyncExternalStore<BillingSample>(
    subscribeToLocation,
    getSample,
    () => "active"
  )
  const [picked, setPicked] = React.useState<BillingSample | null>(null)
  return [picked ?? linked, setPicked] as const
}

export function useIsChangingPlan() {
  const isChangingPlan = React.useSyncExternalStore(
    subscribeToLocation,
    () => window.location.hash === PLANS_HASH,
    () => false
  )
  return {
    isChangingPlan,
    openPlans() {
      window.location.hash = PLANS_HASH
    },
    closePlans() {
      if (window.location.hash !== PLANS_HASH) return
      const { pathname, search } = window.location
      window.history.replaceState(window.history.state, "", pathname + search)
      window.dispatchEvent(new HashChangeEvent("hashchange"))
    },
  }
}
