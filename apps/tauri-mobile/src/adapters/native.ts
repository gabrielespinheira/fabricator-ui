import { z } from "zod"

const runtimeSchema = z.object({
  platform: z.string(),
  architecture: z.string(),
  version: z.string(),
})

const noteSchema = z.object({
  text: z.string(),
  updatedAt: z.number().nullable(),
})

type InvokeCommand = "get_runtime" | "read_note" | "write_note"
type InvokeArguments = { text: string } | undefined
type NativeCore = {
  invoke: (command: InvokeCommand, args?: InvokeArguments) => Promise<unknown>
}

function isNativeCore(value: unknown): value is NativeCore {
  return (
    typeof value === "object" &&
    value !== null &&
    "invoke" in value &&
    typeof value.invoke === "function"
  )
}

function getNativeCore() {
  const global: unknown = Reflect.get(window, "__TAURI__")
  if (typeof global !== "object" || global === null || !("core" in global))
    return null
  return isNativeCore(global.core) ? global.core : null
}

export function hasNativeHost() {
  return getNativeCore() !== null
}

export async function readRuntime() {
  const core = getNativeCore()
  if (!core) return null
  return runtimeSchema.parse(await core.invoke("get_runtime"))
}

export async function readNativeNote() {
  const core = getNativeCore()
  if (!core)
    throw new Error("Native storage is available inside the Tauri app.")
  return noteSchema.parse(await core.invoke("read_note"))
}

export async function writeNativeNote(text: string) {
  const core = getNativeCore()
  if (!core)
    throw new Error("Native storage is available inside the Tauri app.")
  return noteSchema.parse(await core.invoke("write_note", { text }))
}

export function describeNativeError(error: unknown) {
  const failure = z.object({ message: z.string() }).safeParse(error)
  if (failure.success) return failure.data.message
  return error instanceof Error ? error.message : "The native request failed."
}
