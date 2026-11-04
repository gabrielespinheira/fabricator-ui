// What a Field and its control tell each other. The website gets this from the
// DOM: `<label for>` presses the control, and `group-data-*` and `has-*` carry
// state. React Native has neither, so a control joins the nearest Field here.
import * as React from "react"

export function getFieldErrorMessages(
  errors: ({ message?: string } | undefined)[] | undefined
) {
  const messages = (errors ?? []).flatMap((error) =>
    error?.message ? [error.message] : []
  )
  return [...new Set(messages)]
}

type FieldScope = {
  isInvalid: boolean
  isDisabled: boolean
  /** Whether the control inside is on, for a label that is a choice card. */
  isChecked: boolean
  /** Presses the control: focuses it, or toggles it. */
  activate: () => void
  register: (activate: () => void) => () => void
  setChecked: (isChecked: boolean) => void
}

const FieldContext = React.createContext<FieldScope | null>(null)

/**
 * A scope controls can join. Scopes nest: a label wrapping a Field hears about
 * the control inside it, and a label beside a control presses its Field's.
 */
function useFieldScope({
  isInvalid = false,
  isDisabled = false,
}: {
  isInvalid?: boolean
  isDisabled?: boolean
}) {
  const parent = React.use(FieldContext)
  const control = React.useRef<(() => void) | null>(null)
  const [isChecked, setIsChecked] = React.useState(false)
  const parentRegister = parent?.register
  const parentSetChecked = parent?.setChecked
  const parentActivate = parent?.activate

  const register = React.useCallback(
    (activate: () => void) => {
      control.current = activate
      const leaveParent = parentRegister?.(activate)
      return () => {
        control.current = null
        leaveParent?.()
      }
    },
    [parentRegister]
  )
  const setChecked = React.useCallback(
    (next: boolean) => {
      setIsChecked(next)
      parentSetChecked?.(next)
    },
    [parentSetChecked]
  )
  const activate = React.useCallback(() => {
    if (control.current) control.current()
    else parentActivate?.()
  }, [parentActivate])

  const isScopeInvalid = isInvalid || (parent?.isInvalid ?? false)
  const isScopeDisabled = isDisabled || (parent?.isDisabled ?? false)
  return React.useMemo<FieldScope>(
    () => ({
      isInvalid: isScopeInvalid,
      isDisabled: isScopeDisabled,
      isChecked,
      activate,
      register,
      setChecked,
    }),
    [isScopeInvalid, isScopeDisabled, isChecked, activate, register, setChecked]
  )
}

/**
 * Joins the nearest Field, so its label presses this control and it follows the
 * Field's invalid and disabled state. Outside a Field it does nothing.
 */
function useFieldControl({
  activate,
  isChecked = false,
}: {
  activate?: () => void
  isChecked?: boolean
} = {}) {
  const field = React.use(FieldContext)
  const latest = React.useRef(activate)
  React.useEffect(() => {
    latest.current = activate
  })
  const register = field?.register
  React.useEffect(() => register?.(() => latest.current?.()), [register])
  const setChecked = field?.setChecked
  React.useEffect(() => {
    setChecked?.(isChecked)
  }, [setChecked, isChecked])
  return {
    isInvalid: field?.isInvalid ?? false,
    isDisabled: field?.isDisabled ?? false,
  }
}

export { FieldContext, useFieldControl, useFieldScope }
