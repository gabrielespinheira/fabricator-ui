// The engine under `toast` and `sonner`: Base UI's toast manager, without a DOM.
// Time comes from `timers`, so nothing here needs a real clock to test.

import type { ReactNode } from "react"

export type ToastTimers = {
  /** Calls back after `ms`; the function it returns cancels that. */
  set: (callback: () => void, ms: number) => () => void
  now: () => number
}

const SYSTEM_TIMERS: ToastTimers = {
  set(callback, ms) {
    const handle = setTimeout(callback, ms)
    return () => clearTimeout(handle)
  },
  now: () => Date.now(),
}

export type ToastCloseReason = "auto" | "dismiss"

export type ToastObject<TData = unknown, TAction = unknown> = {
  id: string
  title?: ReactNode
  description?: ReactNode
  type?: string
  /** Time before it closes itself; 0 never does. */
  timeout?: number
  /** `high` is announced at once, `low` when the reader is free. */
  priority?: "low" | "high"
  /** Counts updates, so a view can restart anything tied to the content. */
  updateKey: number
  /** Past the provider's `limit`: kept, but not shown. */
  limited?: boolean
  height?: number
  onClose?: (
    reason: ToastCloseReason,
    toast: ToastObject<TData, TAction>
  ) => void
  onRemove?: () => void
  actionProps?: TAction
  data?: TData
}

export type ToastAddOptions<TData = unknown, TAction = unknown> = Omit<
  ToastObject<TData, TAction>,
  "id" | "updateKey" | "limited" | "height"
> & { id?: string }

export type ToastUpdateOptions<TData = unknown, TAction = unknown> = Partial<
  Omit<ToastObject<TData, TAction>, "id" | "updateKey" | "limited" | "height">
>

type PromiseOption<TResult, TData, TAction> =
  | string
  | ToastUpdateOptions<TData, TAction>
  | ((result: TResult) => string | ToastUpdateOptions<TData, TAction>)

export type ToastPromiseOptions<TValue, TError, TData, TAction> = {
  loading: string | ToastUpdateOptions<TData, TAction>
  success: PromiseOption<TValue, TData, TAction>
  error: PromiseOption<TError, TData, TAction>
}

function resolvePromiseOption<TResult, TData, TAction>(
  option: PromiseOption<TResult, TData, TAction>,
  result: TResult
) {
  const resolved = typeof option === "function" ? option(result) : option
  return typeof resolved === "string" ? { description: resolved } : resolved
}

function applyLimit<TToast extends { limited?: boolean }>(
  toasts: TToast[],
  limit: number
) {
  return toasts.map((toast, index) => {
    const limited = index >= limit
    return Boolean(toast.limited) === limited ? toast : { ...toast, limited }
  })
}

type Timer = {
  remaining: number
  startedAt: number
  callback: () => void
  cancel?: () => void
}

export function createToastStore<TData = unknown, TAction = unknown>({
  timers = SYSTEM_TIMERS,
  timeout: initialTimeout = 5000,
  limit: initialLimit = 3,
}: { timers?: ToastTimers; timeout?: number; limit?: number } = {}) {
  type Toast = ToastObject<TData, TAction>

  let toasts: Toast[] = []
  let defaultTimeout = initialTimeout
  let limit = initialLimit
  let isPaused = false
  let nextId = 1
  const scheduled = new Map<string, Timer>()
  const listeners = new Set<() => void>()

  const commit = (next: Toast[]) => {
    toasts = applyLimit(next, limit)
    listeners.forEach((listener) => listener())
  }

  const start = (timer: Timer) => {
    timer.startedAt = timers.now()
    timer.cancel = timers.set(timer.callback, timer.remaining)
  }

  const clearTimer = (id: string) => {
    scheduled.get(id)?.cancel?.()
    scheduled.delete(id)
  }

  const finish = (toast: Toast, reason: ToastCloseReason) => {
    toast.onClose?.(reason, toast)
    toast.onRemove?.()
  }

  const closeOne = (id: string, reason: ToastCloseReason) => {
    const toast = toasts.find((candidate) => candidate.id === id)
    if (!toast) return
    clearTimer(id)
    commit(toasts.filter((candidate) => candidate.id !== id))
    finish(toast, reason)
  }

  const schedule = (toast: Toast) => {
    clearTimer(toast.id)
    const duration = toast.timeout ?? defaultTimeout
    if (toast.type === "loading" || duration <= 0) return
    const timer: Timer = {
      remaining: duration,
      startedAt: timers.now(),
      callback: () => closeOne(toast.id, "auto"),
    }
    scheduled.set(toast.id, timer)
    if (!isPaused) start(timer)
  }

  const update = (
    id: string,
    updates:
      | ToastUpdateOptions<TData, TAction>
      | ((toast: Toast) => ToastUpdateOptions<TData, TAction>),
    restartTimer = false
  ) => {
    const toast = toasts.find((candidate) => candidate.id === id)
    if (!toast) return
    const merged = {
      ...toast,
      ...(typeof updates === "function" ? updates(toast) : updates),
      updateKey: toast.updateKey + 1,
    }
    commit(
      toasts.map((candidate) => (candidate.id === id ? merged : candidate))
    )
    const timingChanged =
      toast.type !== merged.type || toast.timeout !== merged.timeout
    if (restartTimer || timingChanged || !scheduled.has(id)) schedule(merged)
  }

  const add = (options: ToastAddOptions<TData, TAction>) => {
    const id = options.id ?? `toast-${nextId++}`
    if (toasts.some((toast) => toast.id === id)) {
      const { id: _id, ...updates } = options
      update(id, updates, true)
      return id
    }
    const toast: Toast = { ...options, id, updateKey: 0 }
    commit([toast, ...toasts])
    schedule(toast)
    return id
  }

  return {
    add,
    update: (
      id: string,
      updates:
        | ToastUpdateOptions<TData, TAction>
        | ((toast: Toast) => ToastUpdateOptions<TData, TAction>)
    ) => update(id, updates),
    close(id?: string) {
      if (id !== undefined) {
        closeOne(id, "dismiss")
        return
      }
      const closing = toasts
      scheduled.forEach((_timer, toastId) => clearTimer(toastId))
      commit([])
      closing.forEach((toast) => finish(toast, "dismiss"))
    },
    promise<TValue, TError = unknown>(
      promise: Promise<TValue>,
      options: ToastPromiseOptions<TValue, TError, TData, TAction>
    ) {
      const id = add({
        ...(typeof options.loading === "string"
          ? { description: options.loading }
          : options.loading),
        type: "loading",
      })
      return promise.then(
        (result) => {
          update(id, {
            ...resolvePromiseOption(options.success, result),
            type: "success",
          })
          return result
        },
        (error: TError) => {
          update(id, {
            ...resolvePromiseOption(options.error, error),
            type: "error",
          })
          throw error
        }
      )
    },
    pause() {
      if (isPaused) return
      isPaused = true
      for (const timer of scheduled.values()) {
        timer.cancel?.()
        timer.cancel = undefined
        timer.remaining -= timers.now() - timer.startedAt
      }
    },
    resume() {
      if (!isPaused) return
      isPaused = false
      for (const timer of scheduled.values()) start(timer)
    },
    setHeight(id: string, height: number) {
      const toast = toasts.find((candidate) => candidate.id === id)
      if (!toast || toast.height === height) return
      commit(
        toasts.map((candidate) =>
          candidate.id === id ? { ...candidate, height } : candidate
        )
      )
    },
    /** What the provider's props set. */
    configure(options: { timeout?: number; limit?: number }) {
      defaultTimeout = options.timeout ?? defaultTimeout
      if (options.limit === undefined || options.limit === limit) return
      limit = options.limit
      commit(toasts)
    },
    getLimit: () => limit,
    getToasts: () => toasts,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export type ToastStore<TData = unknown, TAction = unknown> = ReturnType<
  typeof createToastStore<TData, TAction>
>

/**
 * Where each toast sits. Collapsed, the newest is in front and the others peek
 * out from under it at its height, scaled down by index. Expanded, they run one
 * under another. Past the limit they're kept but transparent.
 */
export function getToastStack(
  toasts: readonly { height?: number }[],
  {
    expanded,
    gap,
    peek,
    limit,
  }: { expanded: boolean; gap: number; peek: number; limit: number }
) {
  // A new toast has no height until it's laid out; the one it covered does.
  const frontHeight = toasts.find((toast) => toast.height)?.height
  let offset = 0
  return toasts.map((toast, index) => {
    const opacity = index < limit ? 1 : 0
    if (expanded) {
      const translateY = offset
      offset += (toast.height ?? 0) + gap
      return {
        translateY,
        scale: 1,
        opacity,
        isBehind: false,
        height: undefined,
      }
    }
    const scale = Math.max(0, 1 - index * 0.1)
    return {
      translateY: ((frontHeight ?? 0) * (1 - scale)) / 2 + index * peek,
      scale,
      opacity,
      isBehind: index > 0,
      height: index > 0 ? frontHeight : undefined,
    }
  })
}
