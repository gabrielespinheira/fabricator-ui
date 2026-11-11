"use client"

// Workspace Switcher: switches the organization, team or workspace an app
// is showing. Two variants:
//
// - `menu`: a dropdown with every workspace, then Create and Manage. Fits a
//   handful of workspaces.
// - `command`: a searchable dialog (⌘O by default), for people in many
//   workspaces. It searches names and descriptions, marks the current one
//   and lists its keys along the bottom. Extra groups (pending
//   invitations…) go in as children.
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
} from "@/registry/bases/base/ui/app-shell"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/registry/bases/base/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/bases/base/ui/dropdown-menu"
import { Kbd, KbdGroup } from "@/registry/bases/base/ui/kbd"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/registry/bases/base/ui/sidebar"
import { Spinner } from "@/registry/bases/base/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/registry/bases/base/ui/tooltip"
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

/** Matched by the command search: the name, the description and the id. */
function getSearchValue(workspace: Workspace) {
  return [workspace.name, workspace.description, workspace.id]
    .filter(Boolean)
    .join(" ")
}

/** A workspace in the list: its logo beside the name and description. The
 * check that marks the current one is decorative, so its name says it. */
function WorkspaceRow({
  workspace,
  isCurrent,
}: {
  workspace: Workspace
  isCurrent: boolean
}) {
  return (
    <>
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
      {isCurrent && <span className="sr-only">(current)</span>}
    </>
  )
}

/** The search dialog's keys. Hidden from screen readers, which announce
 * the list's own keyboard behaviour. */
function CommandHints() {
  return (
    <div
      aria-hidden
      data-slot="workspace-switcher-hints"
      className="cn-workspace-switcher-hints flex items-center"
    >
      <span className="cn-workspace-switcher-hint flex items-center">
        <KbdGroup>
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
        </KbdGroup>
        Navigate
      </span>
      <span className="cn-workspace-switcher-hint flex items-center">
        <Kbd>↵</Kbd>
        Switch
      </span>
      <span className="cn-workspace-switcher-hint ms-auto flex items-center">
        <Kbd>esc</Kbd>
        Close
      </span>
    </div>
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
    <button type="button" {...triggerProps} />
  ) : (
    <SidebarMenuButton size="lg" tooltip={active.name} {...triggerProps} />
  )

  const wrap = (node: React.ReactNode) =>
    isMark ? (
      node
    ) : (
      <SidebarMenu>
        <SidebarMenuItem>{node}</SidebarMenuItem>
      </SidebarMenu>
    )

  const tooltip = (node: React.ReactElement) =>
    isMark ? (
      <Tooltip>
        <TooltipTrigger render={node} />
        <TooltipContent side="bottom">
          {active.name}
          {shortcutLabel && (
            <span className="cn-workspace-switcher-shortcut">
              {shortcutLabel}
            </span>
          )}
        </TooltipContent>
      </Tooltip>
    ) : (
      node
    )

  if (variant === "command") {
    return (
      <>
        {wrap(
          tooltip(
            React.cloneElement(trigger, {
              onClick: () => setOpen(true),
              "aria-haspopup": "dialog",
              children: triggerContent,
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
                    <WorkspaceRow
                      workspace={workspace}
                      isCurrent={workspace.id === activeId}
                    />
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
            <CommandHints />
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
          {tooltip(
            <DropdownMenuTrigger render={trigger}>
              {triggerContent}
            </DropdownMenuTrigger>
          )}
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
                  onClick={() => select(workspace.id)}
                  className="cn-workspace-switcher-item"
                >
                  <WorkspaceRow
                    workspace={workspace}
                    isCurrent={workspace.id === activeId}
                  />
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
                    <DropdownMenuItem onClick={onCreate}>
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
                    <DropdownMenuItem onClick={onManage}>
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
