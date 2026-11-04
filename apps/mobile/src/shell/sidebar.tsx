import * as React from "react"
import type { NavItem, NavPreferences } from "@fabricator-ui/app-shell-model"
import { ChevronsUpDownIcon, type LucideIcon } from "lucide-react-native"
import {
  ActionSheetIOS,
  findNodeHandle,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"

import { NAV_GROUPS, USER, WORKSPACES } from "../nav"
import { SIZE, type Theme } from "../theme"
import { NavList } from "./nav-list"

type MenuButton = React.ComponentRef<typeof Pressable>

/** Where a menu anchors: a popover on the button on iPad, ignored on iPhone. */
function getAnchor(button: React.RefObject<MenuButton | null>) {
  return findNodeHandle(button.current) ?? undefined
}

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
  theme,
}: {
  workspaceId: string
  onWorkspaceChange: (id: string) => void
  theme: Theme
}) {
  const button = React.useRef<MenuButton>(null)
  const workspace =
    WORKSPACES.find((entry) => entry.id === workspaceId) ?? WORKSPACES[0]
  const choose = () =>
    ActionSheetIOS.showActionSheetWithOptions(
      {
        anchor: getAnchor(button),
        title: "Workspaces",
        options: [...WORKSPACES.map((entry) => entry.name), "Cancel"],
        cancelButtonIndex: WORKSPACES.length,
        userInterfaceStyle: theme.isDark ? "dark" : "light",
      },
      (index) => {
        const picked = WORKSPACES[index]
        if (picked) onWorkspaceChange(picked.id)
      }
    )
  return (
    <Pressable
      ref={button}
      onPress={choose}
      accessibilityRole="button"
      accessibilityLabel={`Workspace: ${workspace.name}. Switch workspace`}
      style={({ pressed }) => [
        styles.identity,
        pressed && { backgroundColor: theme.hover },
      ]}
    >
      <View style={[styles.mark, { backgroundColor: theme.mark }]}>
        <Text style={[styles.markText, { color: theme.markForeground }]}>
          {workspace.name[0]}
        </Text>
      </View>
      <View style={styles.identityText}>
        <Text
          numberOfLines={1}
          style={[styles.identityName, { color: theme.foreground }]}
        >
          {workspace.name}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.identityMeta, { color: theme.mutedOnFrame }]}
        >
          {workspace.plan}
        </Text>
      </View>
      <ChevronsUpDownIcon size={16} color={theme.muted} strokeWidth={1.75} />
    </Pressable>
  )
}

function UserMenu({ theme }: { theme: Theme }) {
  const button = React.useRef<MenuButton>(null)
  const open = () =>
    ActionSheetIOS.showActionSheetWithOptions(
      {
        anchor: getAnchor(button),
        title: USER.email,
        options: ["Profile", "Notifications", "Sign out", "Cancel"],
        destructiveButtonIndex: 2,
        cancelButtonIndex: 3,
        userInterfaceStyle: theme.isDark ? "dark" : "light",
      },
      () => {}
    )
  return (
    <Pressable
      ref={button}
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`${USER.name}, account menu`}
      style={({ pressed }) => [
        styles.identity,
        pressed && { backgroundColor: theme.hover },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: theme.active }]}>
        <Text style={[styles.avatarText, { color: theme.foreground }]}>
          {getInitials(USER.name)}
        </Text>
      </View>
      <View style={styles.identityText}>
        <Text
          numberOfLines={1}
          style={[styles.identityName, { color: theme.foreground }]}
        >
          {USER.name}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.identityMeta, { color: theme.mutedOnFrame }]}
        >
          {USER.email}
        </Text>
      </View>
      <ChevronsUpDownIcon size={16} color={theme.muted} strokeWidth={1.75} />
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
  insetTop,
  insetBottom,
  theme,
}: {
  activeId: string | null
  preferences: NavPreferences
  onPreferencesChange: (preferences: NavPreferences) => void
  onNavigate: (item: NavItem<LucideIcon>) => void
  workspaceId: string
  onWorkspaceChange: (id: string) => void
  insetTop: number
  insetBottom: number
  theme: Theme
}) {
  return (
    <View style={[styles.sidebar, { backgroundColor: theme.frame }]}>
      <View style={[styles.header, { paddingTop: insetTop + 8 }]}>
        <WorkspaceSwitcher
          workspaceId={workspaceId}
          onWorkspaceChange={onWorkspaceChange}
          theme={theme}
        />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <NavList
          groups={NAV_GROUPS}
          activeId={activeId}
          preferences={preferences}
          onPreferencesChange={onPreferencesChange}
          onNavigate={onNavigate}
          theme={theme}
        />
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insetBottom + 8 }]}>
        <UserMenu theme={theme} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  sidebar: { flex: 1 },
  header: { paddingHorizontal: 8, paddingBottom: 8 },
  content: { paddingHorizontal: 8, paddingBottom: 16 },
  footer: { paddingHorizontal: 8, paddingTop: 8 },
  identity: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
    borderRadius: SIZE.rowRadius,
  },
  mark: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  markText: { fontSize: 15, fontWeight: "600" },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 12, fontWeight: "600" },
  identityText: { flex: 1, minWidth: 0 },
  identityName: { fontSize: SIZE.text, fontWeight: "600" },
  identityMeta: { fontSize: SIZE.small },
})
