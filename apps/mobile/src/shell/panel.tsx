import { XIcon } from "lucide-react-native"
import { Modal, Pressable, StyleSheet, Text, View } from "react-native"

import { PANEL_VIEWS } from "../nav"
import { SIZE, type Theme } from "../theme"
import { IconButton } from "./icon-button"

/** The panel's views as a segmented control, Fabricator's tab track. */
function ViewTabs({
  view,
  onViewChange,
  theme,
}: {
  view: string | null
  onViewChange: (view: string) => void
  theme: Theme
}) {
  return (
    <View
      role="tablist"
      style={[styles.track, { backgroundColor: theme.hover }]}
    >
      {PANEL_VIEWS.map((entry) => {
        const isActive = entry.value === view
        return (
          <Pressable
            key={entry.value}
            role="tab"
            accessibilityState={{ selected: isActive }}
            onPress={() => onViewChange(entry.value)}
            style={[
              styles.tab,
              isActive && [
                styles.tabActive,
                { backgroundColor: theme.popover, borderColor: theme.cardEdge },
              ],
            ]}
          >
            <Text
              style={[
                styles.tabLabel,
                {
                  color: isActive ? theme.foreground : theme.muted,
                  fontWeight: isActive ? "600" : "500",
                },
              ]}
            >
              {entry.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

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
  theme,
}: {
  title: string
  view: string | null
  onViewChange: (view: string) => void
  onClose: () => void
  theme: Theme
}) {
  const body = BODIES[view ?? "details"] ?? BODIES.details
  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <ViewTabs view={view} onViewChange={onViewChange} theme={theme} />
        <IconButton
          icon={XIcon}
          label="Close the panel"
          onPress={onClose}
          theme={theme}
        />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: theme.foreground }]}>{title}</Text>
        <Text style={[styles.text, { color: theme.muted }]}>
          {body?.(title)}
        </Text>
      </View>
    </View>
  )
}

/** The panel on a phone (and on a narrow iPad): the native sheet. */
export function PanelSheet({
  isOpen,
  onClose,
  theme,
  children,
}: {
  isOpen: boolean
  onClose: () => void
  theme: Theme
  children: React.ReactNode
}) {
  return (
    <Modal
      visible={isOpen}
      presentationStyle="pageSheet"
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.sheet, { backgroundColor: theme.main }]}>
        {children}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  panel: { flex: 1 },
  header: {
    height: SIZE.header,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  track: {
    flexDirection: "row",
    padding: 3,
    borderRadius: 11,
    gap: 2,
  },
  tab: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "transparent",
  },
  tabActive: {
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 1 },
  },
  tabLabel: { fontSize: SIZE.small },
  body: { paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  title: { fontSize: SIZE.text, fontWeight: "600" },
  text: { fontSize: SIZE.text, lineHeight: 22 },
  sheet: { flex: 1, paddingTop: 8 },
})
