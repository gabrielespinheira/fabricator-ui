import * as React from "react"
import * as DropdownMenuPrimitive from "@rn-primitives/dropdown-menu"
import { cn } from "cn"
import { View } from "react-native"

import { FluidHoverScrollList } from "@/registry/native/lib/fluid-hover"
import {
  SheetSurface,
  SheetSurfaceScrollView,
} from "@/registry/native/lib/sheet-surface"
import { renderTextChildren, TextStyle } from "@/registry/native/ui/text"

/**
 * A menu on a phone: DropdownMenu's rows in a sheet from the bottom. The rows need a
 * menu's context, and a sheet leaves the React tree, so it holds its own; pressing
 * a row that closes the menu closes the sheet.
 */
function MenuSheet({
  open,
  onOpenChange,
  label,
  className,
  children,
  ...props
}: Omit<
  React.ComponentProps<typeof SheetSurface>,
  "open" | "onOpenChange" | "side"
> & {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Names the sheet for screen readers. */
  label?: string
}) {
  return (
    <SheetSurface
      data-slot="menu-sheet"
      accessibilityLabel={label}
      open={open}
      onOpenChange={onOpenChange}
      side="bottom"
      className={cn("cn-menu-sheet", className)}
      {...props}
    >
      <DropdownMenuPrimitive.Root
        className="shrink"
        onOpenChange={(next) => {
          if (!next) onOpenChange(false)
        }}
      >
        <TextStyle className="cn-menu-sheet-text">
          <View className="cn-menu-sheet-handle items-center">
            <View className="cn-menu-sheet-handle-bar" />
          </View>
          <FluidHoverScrollList ScrollComponent={SheetSurfaceScrollView}>
            {renderTextChildren(children)}
          </FluidHoverScrollList>
        </TextStyle>
      </DropdownMenuPrimitive.Root>
    </SheetSurface>
  )
}

export { MenuSheet }
