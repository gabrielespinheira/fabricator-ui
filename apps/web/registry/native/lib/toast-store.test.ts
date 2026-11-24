import { describe, expect, it, vi } from "vitest"

import {
  createToastStore,
  type ToastTimers,
} from "@/registry/native/lib/toast-store"

function createFakeTimers() {
  let now = 0
  let nextHandle = 1
  const pending = new Map<number, { at: number; callback: () => void }>()
  const timers: ToastTimers = {
    now: () => now,
    set: (callback, ms) => {
      const handle = nextHandle++
      pending.set(handle, { at: now + ms, callback })
      return () => pending.delete(handle)
    },
  }
  return {
    timers,
    pendingCount: () => pending.size,
    advance(ms: number) {
      now += ms
      for (const [handle, timer] of [...pending]) {
        if (timer.at <= now) {
          pending.delete(handle)
          timer.callback()
        }
      }
    },
  }
}

function setup(options: { timeout?: number; limit?: number } = {}) {
  const fake = createFakeTimers()
  const store = createToastStore({ timers: fake.timers, ...options })
  return { fake, store }
}

describe("add", () => {
  it("puts the newest first and returns its id", () => {
    const { store } = setup()
    const first = store.add({ title: "One" })
    const second = store.add({ title: "Two" })
    expect(store.getToasts().map((toast) => toast.id)).toEqual([second, first])
  })

  it("updates in place when the id exists, and restarts the timer", () => {
    const { fake, store } = setup({ timeout: 1000 })
    store.add({ id: "a", title: "One" })
    fake.advance(900)
    store.add({ id: "a", title: "Two" })
    expect(store.getToasts()).toHaveLength(1)
    expect(store.getToasts()[0]).toMatchObject({ title: "Two", updateKey: 1 })
    fake.advance(900)
    expect(store.getToasts()).toHaveLength(1)
    fake.advance(100)
    expect(store.getToasts()).toHaveLength(0)
  })
})

describe("timers", () => {
  it("closes after the default timeout and says why", () => {
    const { fake, store } = setup({ timeout: 1000 })
    const onClose = vi.fn()
    store.add({ title: "One", onClose })
    fake.advance(999)
    expect(store.getToasts()).toHaveLength(1)
    fake.advance(1)
    expect(store.getToasts()).toHaveLength(0)
    expect(onClose).toHaveBeenCalledWith(
      "auto",
      expect.objectContaining({ title: "One" })
    )
  })

  it("takes a per-toast timeout, and 0 never closes", () => {
    const { fake, store } = setup({ timeout: 1000 })
    store.add({ id: "short", timeout: 100 })
    store.add({ id: "forever", timeout: 0 })
    fake.advance(100)
    expect(store.getToasts().map((toast) => toast.id)).toEqual(["forever"])
    expect(fake.pendingCount()).toBe(0)
  })

  it("never times out a loading toast until it stops loading", () => {
    const { fake, store } = setup({ timeout: 1000 })
    const id = store.add({ type: "loading" })
    fake.advance(5000)
    expect(store.getToasts()).toHaveLength(1)
    store.update(id, { type: "success" })
    fake.advance(1000)
    expect(store.getToasts()).toHaveLength(0)
  })

  it("pauses and resumes with the time that was left", () => {
    const { fake, store } = setup({ timeout: 1000 })
    store.add({ title: "One" })
    fake.advance(400)
    store.pause()
    expect(fake.pendingCount()).toBe(0)
    fake.advance(5000)
    expect(store.getToasts()).toHaveLength(1)
    store.resume()
    fake.advance(599)
    expect(store.getToasts()).toHaveLength(1)
    fake.advance(1)
    expect(store.getToasts()).toHaveLength(0)
  })

  it("starts a toast added during a pause only on resume", () => {
    const { fake, store } = setup({ timeout: 1000 })
    store.pause()
    store.add({ title: "One" })
    fake.advance(5000)
    expect(store.getToasts()).toHaveLength(1)
    store.resume()
    fake.advance(1000)
    expect(store.getToasts()).toHaveLength(0)
  })
})

describe("update", () => {
  it("merges, bumps updateKey and takes a function", () => {
    const { store } = setup()
    const id = store.add({ title: "One", description: "Keep" })
    store.update(id, (toast) => ({ title: `${String(toast.title)}!` }))
    expect(store.getToasts()[0]).toMatchObject({
      title: "One!",
      description: "Keep",
      updateKey: 1,
    })
  })

  it("ignores an unknown id", () => {
    const { store } = setup()
    store.update("nope", { title: "One" })
    expect(store.getToasts()).toHaveLength(0)
  })
})

describe("close", () => {
  it("removes one toast and reports a dismissal", () => {
    const { store } = setup()
    const onClose = vi.fn()
    const onRemove = vi.fn()
    const id = store.add({ title: "One", onClose, onRemove })
    store.add({ title: "Two" })
    store.close(id)
    expect(store.getToasts()).toHaveLength(1)
    expect(onClose).toHaveBeenCalledWith(
      "dismiss",
      expect.objectContaining({ id })
    )
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it("removes them all without an id, and clears their timers", () => {
    const { fake, store } = setup()
    store.add({ title: "One" })
    store.add({ title: "Two" })
    store.close()
    expect(store.getToasts()).toHaveLength(0)
    expect(fake.pendingCount()).toBe(0)
  })

  it("ignores an id it doesn't know", () => {
    const { store } = setup()
    store.add({ title: "One" })
    store.close("nope")
    expect(store.getToasts()).toHaveLength(1)
  })
})

describe("stacking", () => {
  it("marks toasts over the limit, oldest first, and restores them", () => {
    const { store } = setup({ limit: 2 })
    const oldest = store.add({ title: "One" })
    store.add({ title: "Two" })
    const newest = store.add({ title: "Three" })
    const limitedOf = () =>
      store
        .getToasts()
        .filter((toast) => toast.limited)
        .map((toast) => toast.id)
    expect(limitedOf()).toEqual([oldest])
    store.close(newest)
    expect(limitedOf()).toEqual([])
  })

  it("applies a new limit", () => {
    const { store } = setup({ limit: 3 })
    store.add({ title: "One" })
    store.add({ title: "Two" })
    store.configure({ limit: 1 })
    expect(store.getToasts().filter((toast) => toast.limited)).toHaveLength(1)
  })

  it("keeps the measured size", () => {
    const { store } = setup()
    const id = store.add({ title: "One" })
    store.setSize(id, { width: 180, height: 64 })
    expect(store.getToasts()[0]?.size).toEqual({ width: 180, height: 64 })
  })

  it("tells no one when the size is the one it had", () => {
    const { store } = setup()
    const id = store.add({ title: "One" })
    store.setSize(id, { width: 180, height: 64 })
    const before = store.getToasts()
    store.setSize(id, { width: 180, height: 64 })
    expect(store.getToasts()).toBe(before)
  })
})

describe("promise", () => {
  it("goes from loading to success with the result", async () => {
    const { store } = setup()
    await store.promise(Promise.resolve({ name: "Event" }), {
      loading: "Creating…",
      success: (data) => `${data.name} created.`,
      error: "Failed",
    })
    expect(store.getToasts()[0]).toMatchObject({
      type: "success",
      description: "Event created.",
    })
  })

  it("goes from loading to error and rethrows", async () => {
    const { store } = setup()
    const promise = store.promise(Promise.reject(new Error("no")), {
      loading: "Creating…",
      success: "Done",
      error: (error: Error) => error.message,
    })
    expect(store.getToasts()[0]).toMatchObject({
      type: "loading",
      description: "Creating…",
    })
    await expect(promise).rejects.toThrow("no")
    expect(store.getToasts()[0]).toMatchObject({
      type: "error",
      description: "no",
    })
  })

  it("takes option objects", async () => {
    const { store } = setup()
    await store.promise(Promise.resolve(1), {
      loading: { title: "Wait" },
      success: { title: "Done" },
      error: "Failed",
    })
    expect(store.getToasts()[0]).toMatchObject({
      type: "success",
      title: "Done",
    })
  })
})

describe("subscribe", () => {
  it("notifies on change with a new list, and stops after unsubscribing", () => {
    const { store } = setup()
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    const before = store.getToasts()
    store.add({ title: "One" })
    expect(listener).toHaveBeenCalledTimes(1)
    expect(store.getToasts()).not.toBe(before)
    unsubscribe()
    store.add({ title: "Two" })
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
