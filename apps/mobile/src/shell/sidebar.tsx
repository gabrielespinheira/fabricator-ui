import * as React from "react"
import type { NavItem, NavPreferences } from "@fabricator-ui/app-shell-model"
import { ChevronsUpDownIcon, type LucideIcon } from "lucide-react-native"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"

import { NAV_GROUPS, USER, WORKSPACES } from "../nav"
import { FONT, useStyles, useTheme, type Theme } from "../theme"
import { showActionMenu, type MenuButton } from "./action-menu"
import { IconButton } from "./icon-button"
import { NavList } from "./nav-list"
import { SidebarToggleIcon } from "./sidebar-toggle-icon"

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
}

/** The workspace you're in; picking another opens the native action sheet. */
function WorkspaceSwitcher({
  workspaceId,
  onWorkspaceChange,
}: {
  workspaceId: string
  onWorkspaceChange: (id: string) => void
}) {
  const theme = useTheme()
  const styles = useStyles(buildStyles)
  const button = React.useRef<MenuButton>(null)
  const workspace =
    WORKSPACES.find((entry) => entry.id === workspaceId) ?? WORKSPACES[0]
  const choose = () =>
    showActionMenu({
      button,
      title: "Workspaces",
      options: WORKSPACES.map((entry) => entry.name),
      mode: theme.mode,
      onSelect: (index) => {
        const picked = WORKSPACES[index]
        if (picked) onWorkspaceChange(picked.id)
      },
    })
  return (
    <Pressable
      ref={button}
      onPress={choose}
      accessibilityRole="button"
      accessibilityLabel={`Workspace: ${workspace.name}. Switch workspace`}
      style={({ pressed }) => [styles.identity, pressed && styles.pressed]}
    >
      <View style={styles.mark}>
        <Text style={styles.markText}>{workspace.name[0]}</Text>
      </View>
      <View style={styles.identityText}>
        <Text numberOfLines={1} style={styles.identityName}>
          {workspace.name}
        </Text>
        <Text numberOfLines={1} style={styles.identityMeta}>
          {workspace.plan}
        </Text>
      </View>
      <ChevronsUpDownIcon
        size={theme.icon[16]}
        color={theme.colors.mutedOnFrame}
        strokeWidth={1.5}
      />
    </Pressable>
  )
}

function UserMenu() {
  const theme = useTheme()
  const styles = useStyles(buildStyles)
  const button = React.useRef<MenuButton>(null)
  const open = () =>
    showActionMenu({
      button,
      title: USER.email,
      options: ["Profile", "Notifications", "Sign out"],
      destructiveIndex: 2,
      mode: theme.mode,
    })
  return (
    <Pressable
      ref={button}
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`${USER.name}, account menu`}
      style={({ pressed }) => [styles.identity, pressed && styles.pressed]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(USER.name)}</Text>
      </View>
      <View style={styles.identityText}>
        <Text numberOfLines={1} style={styles.identityName}>
          {USER.name}
        </Text>
        <Text numberOfLines={1} style={styles.identityMeta}>
          {USER.email}
        </Text>
      </View>
      <ChevronsUpDownIcon
        size={theme.icon[16]}
        color={theme.colors.mutedOnFrame}
        strokeWidth={1.5}
      />
    </Pressable>
  )
}

/** The sidebar: the workspace, the navigation and the account, on the frame. */
export function Sidebar({
  activeId,
  preferences,
  onPreferencesChange,
  onNavigate,
  workspaceId,
  onWorkspaceChange,
  onToggle,
  insetTop,
  insetBottom,
}: {
  activeId: string | null
  preferences: NavPreferences
  onPreferencesChange: (preferences: NavPreferences) => void
  onNavigate: (item: NavItem<LucideIcon>) => void
  workspaceId: string
  onWorkspaceChange: (id: string) => void
  onToggle: () => void
  insetTop: number
  insetBottom: number
}) {
  const theme = useTheme()
  const styles = useStyles(buildStyles)
  return (
    <View style={styles.sidebar}>
      <View style={[styles.header, { paddingTop: insetTop + theme.space[8] }]}>
        <View style={styles.switcher}>
          <WorkspaceSwitcher
            workspaceId={workspaceId}
            onWorkspaceChange={onWorkspaceChange}
          />
        </View>
        <IconButton label="Hide the sidebar" onPress={onToggle} isExpanded>
          <SidebarToggleIcon
            isOpen
            color={theme.colors.mutedOnFrame}
            background={theme.colors.main}
          />
        </IconButton>
      </View>
      <ScrollView>
        <NavList
          groups={NAV_GROUPS}
          activeId={activeId}
          preferences={preferences}
          onPreferencesChange={onPreferencesChange}
          onNavigate={onNavigate}
        />
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insetBottom + 8 }]}>
        <UserMenu />
      </View>
    </View>
  )
}

const buildStyles = (theme: Theme) =>
  StyleSheet.create({
    sidebar: { flex: 1, backgroundColor: theme.colors.frame },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.space[8],
      paddingHorizontal: theme.space[8],
      paddingBottom: theme.space[4],
    },
    switcher: { flex: 1, minWidth: 0 },
    footer: { paddingHorizontal: theme.space[8], paddingTop: theme.space[4] },
    identity: {
      minHeight: theme.space[48],
      flexDirection: "row",
      alignItems: "center",
      gap: theme.space[8],
      paddingHorizontal: theme.space[8],
      borderRadius: theme.radius.lg,
    },
    pressed: { backgroundColor: theme.colors.hover },
    mark: {
      width: theme.space[32],
      height: theme.space[32],
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    markText: {
      fontFamily: FONT.semibold,
      fontSize: theme.text[13],
      color: theme.colors.primaryForeground,
    },
    avatar: {
      width: theme.space[32],
      height: theme.space[32],
      borderRadius: theme.space[32] / 2,
      backgroundColor: theme.colors.active,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontFamily: FONT.medium,
      fontSize: theme.text[12],
      color: theme.colors.foreground,
    },
    identityText: { flex: 1, minWidth: 0 },
    identityName: {
      fontFamily: FONT.semibold,
      fontSize: theme.text[13],
      color: theme.colors.foreground,
    },
    identityMeta: {
      fontFamily: FONT.regular,
      fontSize: theme.text[12],
      color: theme.colors.mutedOnFrame,
    },
  })
