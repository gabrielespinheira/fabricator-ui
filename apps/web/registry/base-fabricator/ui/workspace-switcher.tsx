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
} from "@/registry/base-fabricator/ui/app-shell"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/registry/base-fabricator/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/base-fabricator/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/registry/base-fabricator/ui/sidebar"
import { Spinner } from "@/registry/base-fabricator/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/registry/base-fabricator/ui/tooltip"
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
        "flex size-(--density-32) shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary text-(length:--density-text-13) text-primary-foreground weight-semibold [&_img]:size-full [&_img]:object-cover [&_svg]:size-(--density-icon-16)",
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
      className="ms-auto size-(--density-icon-16) text-foreground"
    />
  )
}

function SwitchingOverlay({ workspace }: { workspace: Workspace }) {
  return createPortal(
    <div
      role="status"
      data-slot="workspace-switcher-overlay"
      className="fixed inset-0 z-50 flex animate-in flex-col items-center justify-center gap-(--density-16) bg-background/80 backdrop-blur-sm duration-move ease-enter fade-in"
    >
      <WorkspaceLogo
        workspace={workspace}
        className="size-(--density-48) rounded-xl text-(length:--density-text-16)"
      />
      <span className="flex items-center gap-(--density-8) text-(length:--density-text-13) text-muted-foreground">
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
          <span className="grid min-w-0 flex-1 text-start leading-tight">
            <span className="truncate text-(length:--density-text-13) text-foreground weight-semibold">
              {active.name}
            </span>
            {active.description && (
              <span className="truncate text-(length:--density-text-12) text-muted-foreground">
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
            className="ms-auto me-[calc((var(--density-20)-var(--density-icon-16))/2)] size-(--density-icon-16) text-muted-foreground"
          />
        </>
      )}
    </>
  )

  const triggerProps = {
    "aria-label": isMark ? `${label}: ${active.name}` : undefined,
    "data-workspace-switcher": size,
    className: cn(
      "data-popup-open:bg-hover data-popup-open:text-foreground data-[workspace-switcher=mark]:flex data-[workspace-switcher=mark]:size-(--density-36) data-[workspace-switcher=mark]:shrink-0 data-[workspace-switcher=mark]:cursor-pointer data-[workspace-switcher=mark]:items-center data-[workspace-switcher=mark]:justify-center data-[workspace-switcher=mark]:rounded-lg data-[workspace-switcher=mark]:ring-ring data-[workspace-switcher=mark]:transition-colors data-[workspace-switcher=mark]:duration-feedback data-[workspace-switcher=mark]:ease-feedback data-[workspace-switcher=mark]:outline-none data-[workspace-switcher=mark]:hover:bg-hover data-[workspace-switcher=mark]:focus-visible:ring-1 data-open:bg-hover data-open:text-foreground",
      className
    ),
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
            <span className="ms-(--density-6) text-background/70">
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
                      className="size-(--density-24) rounded-md text-(length:--density-text-11) [&_svg]:size-(--density-icon-14)"
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
          {tooltip(
            <DropdownMenuTrigger render={trigger}>
              {triggerContent}
            </DropdownMenuTrigger>
          )}
          <DropdownMenuContent
            align="start"
            side={isMobile || isMark ? "bottom" : "right"}
            sideOffset={4}
            className="min-w-56"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>{label}</DropdownMenuLabel>
              {workspaces.map((workspace) => (
                <DropdownMenuItem
                  key={workspace.id}
                  onClick={() => select(workspace.id)}
                  className="h-auto gap-(--density-8) py-(--density-6)"
                >
                  <WorkspaceLogo
                    workspace={workspace}
                    className="size-(--density-24) rounded-md text-(length:--density-text-11) [&_svg]:size-(--density-icon-14)"
                  />
                  <span className="grid min-w-0 flex-1">
                    <span className="truncate">{workspace.name}</span>
                    {workspace.description && (
                      <span className="truncate text-(length:--density-text-12) text-muted-foreground">
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
