import { Modal, StyleSheet, Text, View } from "react-native"

import { PANEL_VIEWS } from "../nav"
import { FONT, useStyles, useTheme, type Theme } from "../theme"
import { getControlInset, IconButton } from "./icon-button"
import { SegmentedControl } from "./segmented-control"
import { SidebarToggleIcon } from "./sidebar-toggle-icon"

const BODIES: Record<string, (title: string) => string> = {
  details: (title) =>
    `${title} is open. The panel docks beside the page on an iPad and opens as a sheet on a phone, the placement the model picks for the window's width.`,
  activity: () => "Nothing new today.",
  comments: () => "No comments yet.",
}

/** What the panel shows: its view tabs, then the view. */
export function PanelContent({
  title,
  view,
  onViewChange,
  onClose,
  isDocked,
}: {
  title: string
  view: string | null
  onViewChange: (view: string) => void
  onClose: () => void
  /** Docked, the shell's toggle stays over this header's end and closes it. */
  isDocked: boolean
}) {
  const theme = useTheme()
  const styles = useStyles(buildStyles)
  const body = BODIES[view ?? "details"] ?? BODIES.details
  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <SegmentedControl
          label="Panel view"
          options={PANEL_VIEWS}
          value={view}
          onChange={onViewChange}
        />
        {isDocked ? (
          <View style={styles.toggleSlot} />
        ) : (
          <IconButton label="Close the panel" onPress={onClose} isExpanded>
            <SidebarToggleIcon
              isOpen
              side="right"
              background={theme.colors.panel}
            />
          </IconButton>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.text}>{body?.(title)}</Text>
      </View>
    </View>
  )
}

/** The panel on a phone (and on a narrow iPad): a native sheet, or the screen. */
export function PanelSheet({
  isOpen,
  isScreen,
  insetTop,
  onClose,
  children,
}: {
  isOpen: boolean
  /** Takes the whole screen instead of a sheet. */
  isScreen: boolean
  insetTop: number
  onClose: () => void
  children: React.ReactNode
}) {
  const styles = useStyles(buildStyles)
  return (
    <Modal
      visible={isOpen}
      presentationStyle={isScreen ? "fullScreen" : "pageSheet"}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.sheet, isScreen && { paddingTop: insetTop }]}>
        {children}
      </View>
    </Modal>
  )
}

const buildStyles = (theme: Theme) =>
  StyleSheet.create({
    panel: { flex: 1 },
    header: {
      height: theme.space[48],
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.space[6],
      paddingLeft: theme.space[12],
      paddingRight: getControlInset(theme),
    },
    toggleSlot: { width: theme.compact.space[36] },
    body: {
      paddingHorizontal: theme.space[16],
      paddingTop: theme.space[8],
      gap: theme.space[8],
    },
    title: {
      fontFamily: FONT.semibold,
      fontSize: theme.text[13],
      color: theme.colors.foreground,
    },
    text: {
      fontFamily: FONT.regular,
      fontSize: theme.text[13],
      lineHeight: theme.text[13] * 1.5,
      color: theme.colors.muted,
    },
    sheet: {
      flex: 1,
      paddingTop: theme.space[8],
      backgroundColor: theme.colors.panel,
    },
  })
