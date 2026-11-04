import * as React from "react"
import { cn } from "cn"
import { View } from "react-native"

import { Button } from "@/registry/native/ui/button"
import {
  createToastManager,
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastIcon,
  ToastPortal,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  useToastManager,
  type ToastItem,
} from "@/registry/native/ui/toast"

// Sonner's `Toaster` and `toast()`, on the engine `toast` uses. The website
// imports `toast` from the `sonner` package, which needs a DOM, so here it comes
// from this file.

type ToastClassNames = {
  toast?: string
  title?: string
  description?: string
  actionButton?: string
  cancelButton?: string
  closeButton?: string
}

type Action = {
  label: React.ReactNode
  onPress: () => void
}

type ToastIcons = {
  success?: React.ReactNode
  info?: React.ReactNode
  warning?: React.ReactNode
  error?: React.ReactNode
  loading?: React.ReactNode
}

type SonnerData = {
  icon?: React.ReactNode
  closeButton?: boolean
  dismissible?: boolean
  action?: Action | React.ReactNode
  cancel?: Action | React.ReactNode
  className?: string
  classNames?: ToastClassNames
  jsx?: (id: string) => React.ReactElement
}

type ExternalToast = Omit<SonnerData, "jsx"> & {
  id?: string | number
  description?: (() => React.ReactNode) | React.ReactNode
  /** Time before it closes itself; `Infinity` never does. */
  duration?: number
  onDismiss?: (toast: ToastItem) => void
  onAutoClose?: (toast: ToastItem) => void
}

type Title = (() => React.ReactNode) | React.ReactNode

const manager = createToastManager()

function resolveNode(node: (() => React.ReactNode) | React.ReactNode) {
  return typeof node === "function" ? node() : node
}

function show(
  type: string | undefined,
  message: Title,
  data: ExternalToast = {}
) {
  const { id, description, duration, onDismiss, onAutoClose, ...rest } = data
  return manager.add({
    id: id === undefined ? undefined : String(id),
    type,
    title: resolveNode(message),
    description: resolveNode(description),
    timeout: duration === Infinity ? 0 : duration,
    data: rest,
    onClose(reason, closed) {
      if (reason === "auto") onAutoClose?.(closed)
      else onDismiss?.(closed)
    },
  })
}

type PromiseResult<TData> =
  | React.ReactNode
  | ((data: TData) => React.ReactNode | Promise<React.ReactNode>)

type PromiseData<TData> = Omit<ExternalToast, "description"> & {
  loading?: React.ReactNode
  success?: PromiseResult<TData>
  error?: PromiseResult<unknown>
  description?: PromiseResult<TData>
  finally?: () => void | Promise<void>
}

async function resolveResult<TValue>(
  result: PromiseResult<TValue>,
  value: TValue
) {
  return typeof result === "function" ? result(value) : result
}

const toast = Object.assign(
  (message: Title, data?: ExternalToast) => show(undefined, message, data),
  {
    success: (message: Title, data?: ExternalToast) =>
      show("success", message, data),
    info: (message: Title, data?: ExternalToast) => show("info", message, data),
    warning: (message: Title, data?: ExternalToast) =>
      show("warning", message, data),
    error: (message: Title, data?: ExternalToast) =>
      show("error", message, data),
    loading: (message: Title, data?: ExternalToast) =>
      show("loading", message, data),
    message: (message: Title, data?: ExternalToast) =>
      show(undefined, message, data),
    custom(
      jsx: (id: string) => React.ReactElement,
      { id, duration, onDismiss, onAutoClose, ...rest }: ExternalToast = {}
    ) {
      const added = show(undefined, null, {
        id,
        duration,
        onDismiss,
        onAutoClose,
      })
      manager.update(added, { data: { ...rest, jsx } })
      return added
    },
    promise<TData>(
      promise: Promise<TData> | (() => Promise<TData>),
      data: PromiseData<TData> = {}
    ) {
      const {
        loading,
        success,
        error,
        description,
        finally: onFinally,
        ...rest
      } = data
      const id = show("loading", loading, rest)
      const run = typeof promise === "function" ? promise() : promise
      const settled = run.then(
        async (value) => {
          manager.update(id, {
            type: "success",
            title: await resolveResult(success, value),
            description: await resolveResult(description, value),
          })
          return value
        },
        async (reason: unknown) => {
          manager.update(id, {
            type: "error",
            title: await resolveResult(error, reason),
          })
          throw reason
        }
      )
      if (onFinally) {
        settled.then(onFinally, onFinally)
      }
      return { id, unwrap: () => settled }
    },
    dismiss(id?: string | number) {
      manager.close(id === undefined ? undefined : String(id))
      return id
    },
    getToasts: () => manager.getToasts(),
  }
)

function isSonnerData(data: unknown): data is SonnerData {
  return typeof data === "object" && data !== null
}

function isAction(action: Action | React.ReactNode): action is Action {
  return (
    typeof action === "object" &&
    action !== null &&
    "label" in action &&
    "onPress" in action
  )
}

const ICON_TYPES = ["success", "info", "warning", "error", "loading"] as const

function getTypeIcon(type: string | undefined, icons: ToastIcons | undefined) {
  const iconType = ICON_TYPES.find((name) => name === type)
  return iconType ? icons?.[iconType] : undefined
}

type ToastOptions = {
  className?: string
  classNames?: ToastClassNames
  closeButton?: boolean
  descriptionClassName?: string
}

function SonnerToast({
  item,
  closeButton,
  icons,
  toastOptions,
}: {
  item: ToastItem
  closeButton?: boolean
  icons?: ToastIcons
  toastOptions?: ToastOptions
}) {
  const data = isSonnerData(item.data) ? item.data : {}
  const classNames = { ...toastOptions?.classNames, ...data.classNames }
  const close = () => manager.close(item.id)
  const icon = data.icon ?? getTypeIcon(item.type, icons)
  const showClose = data.closeButton ?? toastOptions?.closeButton ?? closeButton
  const hasActions = Boolean(data.cancel || data.action || showClose)
  return (
    <Toast
      toast={item}
      swipeDirection={data.dismissible === false ? [] : undefined}
      className={cn(
        "cn-toast",
        toastOptions?.className,
        classNames.toast,
        data.className
      )}
    >
      {data.jsx ? (
        data.jsx(item.id)
      ) : (
        <ToastContent>
          {icon === undefined ? <ToastIcon type={item.type} /> : icon}
          <View className="min-w-0 flex-1 flex-col gap-1">
            <ToastTitle className={classNames.title} />
            <ToastDescription
              className={cn(
                toastOptions?.descriptionClassName,
                classNames.description
              )}
            />
          </View>
          {hasActions && (
            <View className="cn-sonner-actions shrink-0 flex-row items-center">
              {isAction(data.cancel) ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className={classNames.cancelButton}
                  onPress={() => {
                    if (isAction(data.cancel)) data.cancel.onPress()
                    close()
                  }}
                >
                  {data.cancel.label}
                </Button>
              ) : (
                data.cancel
              )}
              {isAction(data.action) ? (
                <ToastAction
                  className={classNames.actionButton}
                  onPress={() => {
                    if (isAction(data.action)) data.action.onPress()
                    close()
                  }}
                >
                  {data.action.label}
                </ToastAction>
              ) : (
                data.action
              )}
              {showClose && <ToastClose className={classNames.closeButton} />}
            </View>
          )}
        </ToastContent>
      )}
    </Toast>
  )
}

type ToasterProps = {
  /** Where it sits on the website. A phone keeps it at the top: accepted, unused. */
  position?:
    | "top-left"
    | "top-right"
    | "top-center"
    | "bottom-left"
    | "bottom-right"
    | "bottom-center"
  /** The app's theme applies here. Accepted, and changes nothing. */
  theme?: "light" | "dark" | "system"
  /** Status toasts colour only their icon. Accepted, and changes nothing. */
  richColors?: boolean
  /** Keeps the stack open instead of opening when pressed. */
  expand?: boolean
  duration?: number
  gap?: number
  visibleToasts?: number
  closeButton?: boolean
  toastOptions?: ToastOptions
  /** Extra space above the stack, in points. */
  offset?: number
  icons?: ToastIcons
  className?: string
  containerAriaLabel?: string
}

function SonnerHost({
  expand,
  gap,
  closeButton,
  toastOptions,
  offset,
  icons,
  className,
  containerAriaLabel,
}: Pick<
  ToasterProps,
  | "expand"
  | "gap"
  | "closeButton"
  | "toastOptions"
  | "offset"
  | "icons"
  | "className"
  | "containerAriaLabel"
>) {
  const { toasts } = useToastManager()
  // Mounts with its first toast, so it comes in over any dialog already open.
  if (toasts.length === 0) return null
  return (
    <ToastPortal>
      <ToastViewport
        expanded={expand}
        gap={gap}
        accessibilityLabel={containerAriaLabel}
        className={className}
        style={offset === undefined ? undefined : { marginTop: offset }}
      >
        {toasts.map((item) => (
          <SonnerToast
            key={item.id}
            item={item}
            closeButton={closeButton}
            icons={icons}
            toastOptions={toastOptions}
          />
        ))}
      </ToastViewport>
    </ToastPortal>
  )
}

const Toaster = ({
  position: _position,
  theme: _theme,
  richColors: _richColors,
  duration = 4000,
  visibleToasts = 3,
  ...props
}: ToasterProps) => (
  <ToastProvider
    toastManager={manager}
    timeout={duration}
    limit={visibleToasts}
  >
    <SonnerHost {...props} />
  </ToastProvider>
)

export { Toaster, toast, type ExternalToast, type ToasterProps }
