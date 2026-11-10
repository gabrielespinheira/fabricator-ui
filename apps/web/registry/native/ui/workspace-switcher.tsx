// Workspace Switcher: switches the organization, team or workspace an app is
// showing. Two variants:
//
// - `menu`: every workspace, then Create and Manage. Fits a handful of workspaces.
//   A popover on tablets, a sheet on phones.
// - `command`: a searchable dialog, for people in many workspaces. It searches
//   names and descriptions and marks the current one; the website's key hints
//   have no keys to name here. Extra groups (pending invitations…) go in as
//   children.
//
// `size="row"` fills the sidebar header with logo, name and description;
// `size="mark"` is the logo alone, for a header row it shares with the user menu.
// `switchingTo` shows a "Switching…" overlay while the app loads the workspace a
// person picked. `shortcut` is accepted and does nothing: no global key events.
import * as React from "react"
import {
  CheckIcon,
  ChevronsUpDownIcon,
  PlusIcon,
  SettingsIcon,
} from "@fabricator-ui/icons-react-native"
import { Portal } from "@rn-primitives/portal"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import { Pressable, View } from "react-native"
import Animated from "react-native-reanimated"

import { MenuSheet } from "@/registry/native/lib/menu-sheet"
import { useSurfaceAnimation } from "@/registry/native/lib/motion"
import { useShellShortcut } from "@/registry/native/ui/app-shell"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/registry/native/ui/command"
import { DensityScope, useDensity } from "@/registry/native/ui/density"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/native/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  useSidebarCollapse,
} from "@/registry/native/ui/sidebar"
import { Spinner } from "@/registry/native/ui/spinner"
import { renderTextChildren, Text, TextStyle } from "@/registry/native/ui/text"

type Workspace = {
  id: string
  name: string
  /** A logo or icon. Default: the name's first letter. */
  logo?: React.ReactNode
  /** A second line: a plan, a role, a member count. */
  description?: string
}

const workspaceLogoTextVariants = cva("cn-workspace-switcher-logo-text")
const workspaceLogoSmallTextVariants = cva("cn-workspace-switcher-logo-sm-text")
const workspaceLogoOverlayTextVariants = cva(
  "cn-workspace-switcher-overlay-logo-text"
)

function WorkspaceLogo({
  workspace,
  className,
  textClassName,
}: {
  workspace: Workspace
  className?: string
  /** What its letter or icon takes: text has no cascade here. */
  textClassName: string
}) {
  return (
    <TextStyle className={textClassName}>
      <View
        data-slot="workspace-switcher-logo"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className={cn(
          "cn-workspace-switcher-logo shrink-0 items-center justify-center overflow-hidden",
          className
        )}
      >
        {renderTextChildren(
          workspace.logo ?? workspace.name.trim().charAt(0).toUpperCase()
        )}
      </View>
    </TextStyle>
  )
}

function CheckMark() {
  return (
    <TextStyle className="cn-workspace-switcher-check-text">
      <View className="cn-workspace-switcher-check items-center justify-center">
        <CheckIcon />
      </View>
    </TextStyle>
  )
}

/** Matched by the command search: the name, the description and the id. */
function getSearchValue(workspace: Workspace) {
  return [workspace.name, workspace.description, workspace.id]
    .filter(Boolean)
    .join(" ")
}

/** A workspace in the list: its logo beside the name and description. */
function WorkspaceRow({ workspace }: { workspace: Workspace }) {
  return (
    <>
      <WorkspaceLogo
        workspace={workspace}
        className="cn-workspace-switcher-logo-sm"
        textClassName={workspaceLogoSmallTextVariants()}
      />
      <View className="min-w-0 flex-1 flex-col">
        <Text numberOfLines={1}>{workspace.name}</Text>
        {workspace.description ? (
          <Text numberOfLines={1} className="cn-workspace-switcher-description">
            {workspace.description}
          </Text>
        ) : null}
      </View>
    </>
  )
}

function SwitchingOverlay({ workspace }: { workspace: Workspace }) {
  const name = React.useId()
  const density = useDensity()
  const { entering, exiting } = useSurfaceAnimation("move")
  return (
    <Portal name={name}>
      <DensityScope density={density}>
        <Animated.View
          data-slot="workspace-switcher-overlay"
          role="status"
          accessibilityLiveRegion="polite"
          aria-modal
          entering={entering}
          exiting={exiting}
          className="cn-workspace-switcher-overlay absolute inset-0 flex-col items-center justify-center"
        >
          <WorkspaceLogo
            workspace={workspace}
            className="cn-workspace-switcher-overlay-logo"
            textClassName={workspaceLogoOverlayTextVariants()}
          />
          <View className="cn-workspace-switcher-overlay-text flex-row items-center">
            <Spinner />
            <Text className="cn-workspace-switcher-overlay-label">
              Switching to {workspace.name}…
            </Text>
          </View>
        </Animated.View>
      </DensityScope>
    </Portal>
  )
}

function WorkspaceSwitcher({
  workspaces,
  activeId,
  onSelect,
  onCreate,
  onManage,
  createLabel = "Create workspace",
  manageLabel = "Manage workspaces",
  label = "Workspaces",
  variant = "menu",
  size = "row",
  shortcut = "mod+o",
  switchingTo,
  className,
  children,
}: {
  workspaces: Workspace[]
  activeId: string
  onSelect: (id: string) => void
  onCreate?: () => void
  onManage?: () => void
  createLabel?: string
  manageLabel?: string
  /** Names the list (the menu label, the dialog title). */
  label?: string
  variant?: "menu" | "command"
  size?: "row" | "mark"
  /** Kept so code from the website compiles: no global key events. */
  shortcut?: string | null
  /** The workspace being opened; shows a "Switching…" overlay. */
  switchingTo?: string | null
  className?: string
  /** More menu items (menu) or command groups (command). */
  children?: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const { isMobile } = useSidebar()
  const collapse = useSidebarCollapse()
  const active = workspaces.find((workspace) => workspace.id === activeId)
  const switching = workspaces.find((workspace) => workspace.id === switchingTo)

  useShellShortcut(
    { id: "workspace.switch", keys: shortcut, label: "Switch workspace" },
    () => setOpen(true)
  )

  if (!active) return null

  const select = (id: string) => {
    setOpen(false)
    if (id !== activeId) onSelect(id)
  }

  const isMark = size === "mark"
  const isCompact = isMark || collapse === "icon"
  const triggerContent = (
    <>
      <WorkspaceLogo
        workspace={active}
        textClassName={workspaceLogoTextVariants()}
      />
      {!isCompact && (
        <>
          <View className="cn-workspace-switcher-text flex-1 flex-col">
            <Text numberOfLines={1} className="cn-workspace-switcher-name">
              {active.name}
            </Text>
            {active.description ? (
              <Text
                numberOfLines={1}
                className="cn-workspace-switcher-description"
              >
                {active.description}
              </Text>
            ) : null}
          </View>
          <TextStyle className="cn-workspace-switcher-chevron-text">
            <View className="cn-workspace-switcher-chevron ml-auto items-center justify-center">
              <ChevronsUpDownIcon strokeWidth={1.5} />
            </View>
          </TextStyle>
        </>
      )}
    </>
  )

  const triggerProps = {
    accessibilityLabel: `${label}: ${active.name}`,
    "aria-expanded": open,
    "data-workspace-switcher": size,
    "data-state": open ? "open" : "closed",
  }
  const trigger = isMark ? (
    <Pressable
      role="button"
      hitSlop={4}
      className={cn(
        "cn-workspace-switcher-trigger shrink-0 items-center justify-center",
        className
      )}
      {...triggerProps}
    />
  ) : (
    <SidebarMenuButton
      size="lg"
      className={cn("cn-workspace-switcher-trigger", className)}
      {...triggerProps}
    />
  )
  const pressableTrigger = React.cloneElement(trigger, {
    onPress: () => setOpen(true),
    children: triggerContent,
  })

  const wrap = (node: React.ReactNode) =>
    isMark ? (
      node
    ) : (
      <SidebarMenu>
        <SidebarMenuItem>{node}</SidebarMenuItem>
      </SidebarMenu>
    )

  if (variant === "command") {
    return (
      <>
        {wrap(pressableTrigger)}
        <CommandDialog
          open={open}
          onOpenChange={setOpen}
          title={label}
          description={`Search ${label.toLowerCase()}`}
        >
          <CommandInput placeholder={`Search ${label.toLowerCase()}…`} />
          <CommandList>
            <CommandEmpty>No {label.toLowerCase()} found.</CommandEmpty>
            <CommandGroup heading={label}>
              {workspaces.map((workspace) => (
                <CommandItem
                  key={workspace.id}
                  value={getSearchValue(workspace)}
                  data-checked={workspace.id === activeId}
                  onSelect={() => select(workspace.id)}
                  className="cn-workspace-switcher-item"
                >
                  <WorkspaceRow workspace={workspace} />
                </CommandItem>
              ))}
            </CommandGroup>
            {children}
            {onCreate || onManage ? (
              <>
                <CommandSeparator />
                <CommandGroup>
                  {onCreate ? (
                    <CommandItem
                      value={createLabel}
                      onSelect={() => {
                        setOpen(false)
                        onCreate()
                      }}
                    >
                      <PlusIcon />
                      {createLabel}
                    </CommandItem>
                  ) : null}
                  {onManage ? (
                    <CommandItem
                      value={manageLabel}
                      onSelect={() => {
                        setOpen(false)
                        onManage()
                      }}
                    >
                      <SettingsIcon />
                      {manageLabel}
                    </CommandItem>
                  ) : null}
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </CommandDialog>
        {switching ? <SwitchingOverlay workspace={switching} /> : null}
      </>
    )
  }

  const items = (
    <>
      <DropdownMenuGroup>
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        {workspaces.map((workspace) => (
          <DropdownMenuItem
            key={workspace.id}
            onPress={() => select(workspace.id)}
            className="cn-workspace-switcher-item"
          >
            <WorkspaceRow workspace={workspace} />
            {workspace.id === activeId ? <CheckMark /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuGroup>
      {children}
      {onCreate || onManage ? (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {onCreate ? (
              <DropdownMenuItem onPress={onCreate}>
                <PlusIcon />
                {createLabel}
              </DropdownMenuItem>
            ) : null}
            {onManage ? (
              <DropdownMenuItem onPress={onManage}>
                <SettingsIcon />
                {manageLabel}
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuGroup>
        </>
      ) : null}
    </>
  )

  return (
    <>
      {wrap(
        isMobile ? (
          <>
            {pressableTrigger}
            <MenuSheet open={open} onOpenChange={setOpen} label={label}>
              {items}
            </MenuSheet>
          </>
        ) : (
          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger render={trigger}>
              {triggerContent}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side={isMark ? "bottom" : "right"}
              sideOffset={4}
              className="cn-workspace-switcher-menu"
            >
              {items}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      )}
      {switching ? <SwitchingOverlay workspace={switching} /> : null}
    </>
  )
}

export { WorkspaceSwitcher, type Workspace }
