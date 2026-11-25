"use client"

import * as React from "react"

import { notifyBilling } from "@/registry/bases/__base__/blocks/billing-01/components/billing-controls"
import { type BillingCard } from "@/registry/bases/__base__/blocks/billing-01/lib/billing-card-model"
import {
  SAMPLE_NOW,
  type BillingInvoiceRecord,
  type BillingState,
} from "@/registry/bases/__base__/blocks/billing-01/lib/billing-data"
import {
  formatDay,
  formatMoney,
  formatQuantity,
  getPlan,
  type BillingAccount,
  type BillingDetails,
  type BillingEstimate,
  type BillingPlanChange,
  type BillingSelection,
} from "@/registry/bases/__base__/blocks/billing-01/lib/billing-model"

const FIRST_NEW_NUMBER = 1044

function toInvoice(
  state: BillingState,
  change: BillingPlanChange
): BillingInvoiceRecord {
  return {
    ...change.today,
    id: `AC-${FIRST_NEW_NUMBER + state.invoices.length}`,
    date: SAMPLE_NOW,
    status: "processing",
  }
}

/** The account and what people do to it. Swap each step for your API call. */
export function useBilling(initial: BillingState) {
  const [state, setState] = React.useState(initial)
  const { account } = state
  const planName = getPlan(account.planId).name

  const commit = (
    patch: Partial<BillingState>,
    message: string,
    canUndo = true
  ) => {
    setState({ ...state, ...patch })
    notifyBilling(message, canUndo ? () => setState(state) : undefined)
  }

  const commitAccount = (patch: Partial<BillingAccount>, message: string) =>
    commit({ account: { ...account, ...patch } }, message)

  return {
    state,

    applyEstimate(draft: BillingEstimate) {
      const added = draft.seats - account.seats
      const runs = { extraRuns: draft.extraRuns }
      if (added > 0) {
        commitAccount(
          {
            ...runs,
            seats: draft.seats,
            addedSeats: account.addedSeats + added,
          },
          `${formatQuantity(added, "seat", "seats")} added`
        )
        return
      }
      if (added < 0) {
        const { planId, interval } = account
        commitAccount(
          { ...runs, scheduled: { planId, interval, seats: draft.seats } },
          `${draft.seats} seats from ${formatDay(account.periodEnd, SAMPLE_NOW)}`
        )
        return
      }
      commitAccount(
        runs,
        draft.extraRuns === "pause"
          ? "Automations pause at the limit"
          : "Automations keep running past the limit"
      )
    },

    changePlan(selection: BillingSelection, change: BillingPlanChange) {
      const { name } = getPlan(selection.planId)
      if (change.timing === "renewal") {
        commitAccount(
          { scheduled: selection },
          `${name} starts on ${formatDay(change.renewsOn, SAMPLE_NOW)}`
        )
        return
      }
      commit(
        {
          account: {
            ...account,
            ...selection,
            status: "active",
            scheduled: null,
            addedSeats: 0,
            periodEnd: change.renewsOn,
            ...(change.renewsOn !== account.periodEnd && {
              periodStart: SAMPLE_NOW,
            }),
          },
          invoices: [toInvoice(state, change), ...state.invoices],
        },
        `${name} is on. ${formatMoney(change.today.total)} is being charged`,
        false
      )
    },

    keepPlan() {
      commitAccount({ scheduled: null }, `${planName} stays as it is`)
    },

    cancel() {
      commitAccount(
        { status: "canceled", scheduled: null },
        `${planName} ends on ${formatDay(account.periodEnd, SAMPLE_NOW)}`
      )
    },

    resume() {
      commitAccount({ status: "active" }, `${planName} is back on`)
    },

    /** A new card also settles what the old one couldn't pay. */
    saveCard(card: BillingCard) {
      const failed = state.invoices.find(({ status }) => status === "failed")
      commit(
        {
          card,
          account: {
            ...account,
            status: account.status === "past-due" ? "active" : account.status,
          },
          invoices: state.invoices.map((invoice) =>
            invoice.status === "failed"
              ? { ...invoice, status: "paid" }
              : invoice
          ),
        },
        failed
          ? `Card updated, ${formatMoney(failed.total)} paid`
          : "Card updated",
        false
      )
    },

    saveDetails(details: BillingDetails) {
      commitAccount({ details }, "Billing details saved")
    },

    keepRunning() {
      commitAccount({ extraRuns: "continue" }, "Automations are running again")
    },
  }
}
