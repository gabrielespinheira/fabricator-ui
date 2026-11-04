import * as React from "react"
import { ActionSheetIOS, findNodeHandle, type Pressable } from "react-native"

export type MenuButton = React.ComponentRef<typeof Pressable>

/**
 * A native menu of choices: an action sheet on iPhone, a popover anchored on
 * the button on iPad. Cancel is added; `onSelect` gets the chosen option's index.
 */
export function showActionMenu({
  button,
  title,
  options,
  destructiveIndex,
  mode,
  onSelect,
}: {
  button: React.RefObject<MenuButton | null>
  title: string
  options: string[]
  destructiveIndex?: number
  mode: "light" | "dark"
  onSelect?: (index: number) => void
}) {
  ActionSheetIOS.showActionSheetWithOptions(
    {
      anchor: findNodeHandle(button.current) ?? undefined,
      title,
      options: [...options, "Cancel"],
      cancelButtonIndex: options.length,
      destructiveButtonIndex: destructiveIndex,
      userInterfaceStyle: mode,
    },
    (index) => {
      if (index < options.length) onSelect?.(index)
    }
  )
}
