"use client"

// Workspace Switcher: switches the organization, team or workspace an app
// is showing. Two variants:
//
// - `menu`: a dropdown with every workspace, then Create and Manage. Fits a
//   handful of workspaces.
// - `command`: a searchable dialog (⌘O by default), for people in many
//   workspaces. Extra groups (pending invitations…) go in as children.
//
// `size="row"` fills the sidebar header with logo, name and description;
// `size="mark"` is the logo alone, for a header row it shares with the user
// menu. `switchingTo` shows a "Switching…" overlay while the app loads the
// workspace a person picked.
import * as React from "react"
import { cn } from "cn"
import { createPortal } from "react-dom"

import {
  useShellShortcut,
  useShortcutLabel,
} from "@/registry/bases/radix/ui/app-shell"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/registry/bases/radix/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/bases/radix/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/registry/bases/radix/ui/sidebar"
import { Spinner } from "@/registry/bases/radix/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/registry/bases/radix/ui/tooltip"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

type Workspace = {
  id: string
  name: string
  /** A logo or icon. Default: the name's first letter. */
  logo?: React.ReactNode
  /** A second line: a plan, a role, a member count. */
  description?: string
}

function WorkspaceLogo({
  workspace,
  className,
}: {
  workspace: Workspace
  className?: string
}) {
  return (
    <span
      data-slot="workspace-switcher-logo"
      aria-hidden
      className={cn(
        "cn-workspace-switcher-logo flex shrink-0 items-center justify-center overflow-hidden",
        className
      )}
    >
      {workspace.logo ?? workspace.name.trim().charAt(0).toUpperCase()}
    </span>
  )
}

function CheckMark() {
  return (
    <IconPlaceholder
      lucide="CheckIcon"
      tabler="IconCheck"
      hugeicons="Tick02Icon"
      phosphor="CheckIcon"
      remixicon="RiCheckLine"
      className="cn-workspace-switcher-check ms-auto"
    />
  )
}

function SwitchingOverlay({ workspace }: { workspace: Workspace }) {
  return createPortal(
    <div
      role="status"
      data-slot="workspace-switcher-overlay"
      className="cn-workspace-switcher-overlay fixed inset-0 z-50 flex flex-col items-center justify-center"
    >
      <WorkspaceLogo
        workspace={workspace}
        className="cn-workspace-switcher-overlay-logo"
      />
      <span className="cn-workspace-switcher-overlay-text">
        <Spinner />
        Switching to {workspace.name}…
      </span>
    </div>,
    document.body
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
  /** Opens the switcher inside an AppShell. null turns it off. */
  shortcut?: string | null
  /** The workspace being opened; shows a "Switching…" overlay. */
  switchingTo?: string | null
  className?: string
  /** More menu items (menu) or command groups (command). */
  children?: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const { isMobile } = useSidebar()
  const active = workspaces.find((workspace) => workspace.id === activeId)
  const switching = workspaces.find((workspace) => workspace.id === switchingTo)
  const shortcutLabel = useShortcutLabel({ keys: shortcut })

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
  const triggerContent = (
    <>
      <WorkspaceLogo workspace={active} />
      {!isMark && (
        <>
          <span className="cn-workspace-switcher-text grid min-w-0 flex-1 text-start">
            <span className="cn-workspace-switcher-name truncate">
              {active.name}
            </span>
            {active.description && (
              <span className="cn-workspace-switcher-description truncate">
                {active.description}
              </span>
            )}
          </span>
          <IconPlaceholder
            lucide="ChevronsUpDownIcon"
            tabler="IconSelector"
            hugeicons="UnfoldMoreIcon"
            phosphor="CaretUpDownIcon"
            remixicon="RiArrowUpDownLine"
            className="cn-workspace-switcher-chevron ms-auto"
          />
        </>
      )}
    </>
  )

  const triggerProps = {
    "aria-label": isMark ? `${label}: ${active.name}` : undefined,
    "data-workspace-switcher": size,
    className: cn("cn-workspace-switcher-trigger", className),
  }

  const trigger = isMark ? (
    <button type="button" {...triggerProps}>
      {triggerContent}
    </button>
  ) : (
    <SidebarMenuButton size="lg" tooltip={active.name} {...triggerProps}>
      {triggerContent}
    </SidebarMenuButton>
  )

  const wrap = (node: React.ReactNode) =>
    isMark ? (
      node
    ) : (
      <SidebarMenu>
        <SidebarMenuItem>{node}</SidebarMenuItem>
      </SidebarMenu>
    )

  // `wrapTrigger` puts another trigger (the menu's) around the tooltip's, so
  // that one's data-state is the one on the element. A local provider: Radix
  // tooltips need one, and the app may not have it.
  const tooltip = (
    node: React.ReactElement,
    wrapTrigger: (element: React.ReactElement) => React.ReactElement = (
      element
    ) => element
  ) =>
    isMark ? (
      <TooltipProvider delayDuration={600}>
        <Tooltip>
          {wrapTrigger(<TooltipTrigger asChild>{node}</TooltipTrigger>)}
          <TooltipContent side="bottom">
            {active.name}
            {shortcutLabel && (
              <span className="cn-workspace-switcher-shortcut">
                {shortcutLabel}
              </span>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ) : (
      wrapTrigger(node)
    )

  if (variant === "command") {
    return (
      <>
        {wrap(
          tooltip(
            React.cloneElement(trigger, {
              onClick: () => setOpen(true),
              "aria-haspopup": "dialog",
            })
          )
        )}
        <CommandDialog
          open={open}
          onOpenChange={setOpen}
          title={label}
          description={`Search ${label.toLowerCase()}`}
        >
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}…`} />
            <CommandList>
              <CommandEmpty>Nothing found.</CommandEmpty>
              <CommandGroup heading={label}>
                {workspaces.map((workspace) => (
                  <CommandItem
                    key={workspace.id}
                    value={`${workspace.name} ${workspace.id}`}
                    onSelect={() => select(workspace.id)}
                  >
                    <WorkspaceLogo
                      workspace={workspace}
                      className="cn-workspace-switcher-logo-sm"
                    />
                    <span className="truncate">{workspace.name}</span>
                    {workspace.id === activeId && <CheckMark />}
                  </CommandItem>
                ))}
              </CommandGroup>
              {children}
              {(onCreate || onManage) && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    {onCreate && (
                      <CommandItem
                        onSelect={() => {
                          setOpen(false)
                          onCreate()
                        }}
                      >
                        <IconPlaceholder
                          lucide="PlusIcon"
                          tabler="IconPlus"
                          hugeicons="PlusSignIcon"
                          phosphor="PlusIcon"
                          remixicon="RiAddLine"
                        />
                        {createLabel}
                      </CommandItem>
                    )}
                    {onManage && (
                      <CommandItem
                        onSelect={() => {
                          setOpen(false)
                          onManage()
                        }}
                      >
                        <IconPlaceholder
                          lucide="SettingsIcon"
                          tabler="IconSettings"
                          hugeicons="Settings01Icon"
                          phosphor="GearIcon"
                          remixicon="RiSettings3Line"
                        />
                        {manageLabel}
                      </CommandItem>
                    )}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </CommandDialog>
        {switching && <SwitchingOverlay workspace={switching} />}
      </>
    )
  }

  return (
    <>
      {wrap(
        <DropdownMenu open={open} onOpenChange={setOpen}>
          {tooltip(trigger, (node) => (
            <DropdownMenuTrigger asChild>{node}</DropdownMenuTrigger>
          ))}
          <DropdownMenuContent
            align="start"
            side={isMobile || isMark ? "bottom" : "right"}
            sideOffset={4}
            className="cn-workspace-switcher-menu"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>{label}</DropdownMenuLabel>
              {workspaces.map((workspace) => (
                <DropdownMenuItem
                  key={workspace.id}
                  onSelect={() => select(workspace.id)}
                  className="cn-workspace-switcher-item"
                >
                  <WorkspaceLogo
                    workspace={workspace}
                    className="cn-workspace-switcher-logo-sm"
                  />
                  <span className="grid min-w-0 flex-1">
                    <span className="truncate">{workspace.name}</span>
                    {workspace.description && (
                      <span className="cn-workspace-switcher-description truncate">
                        {workspace.description}
                      </span>
                    )}
                  </span>
                  {workspace.id === activeId && <CheckMark />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            {children}
            {(onCreate || onManage) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {onCreate && (
                    <DropdownMenuItem onSelect={onCreate}>
                      <IconPlaceholder
                        lucide="PlusIcon"
                        tabler="IconPlus"
                        hugeicons="PlusSignIcon"
                        phosphor="PlusIcon"
                        remixicon="RiAddLine"
                      />
                      {createLabel}
                    </DropdownMenuItem>
                  )}
                  {onManage && (
                    <DropdownMenuItem onSelect={onManage}>
                      <IconPlaceholder
                        lucide="SettingsIcon"
                        tabler="IconSettings"
                        hugeicons="Settings01Icon"
                        phosphor="GearIcon"
                        remixicon="RiSettings3Line"
                      />
                      {manageLabel}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {switching && <SwitchingOverlay workspace={switching} />}
    </>
  )
}

export { WorkspaceSwitcher, type Workspace }
