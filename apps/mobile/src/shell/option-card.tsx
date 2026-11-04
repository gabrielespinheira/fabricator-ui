import { StyleSheet, Text, View, type ViewStyle } from "react-native"

import { FONT, useStyles, type Theme } from "../theme"

/** The website's Card: a title and description, its content, then a footer. */
export function OptionCard({
  title,
  description,
  action,
  footer,
  style,
  children,
}: {
  title?: string
  description?: string
  /** Beside the title. */
  action?: React.ReactNode
  footer?: React.ReactNode
  style?: ViewStyle
  children: React.ReactNode
}) {
  const styles = useStyles(buildStyles)
  return (
    <View style={[styles.card, style]}>
      {title !== undefined && (
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
            {action}
          </View>
          {description !== undefined && (
            <Text style={styles.description}>{description}</Text>
          )}
        </View>
      )}
      <View style={styles.content}>{children}</View>
      {footer !== undefined && <View style={styles.footer}>{footer}</View>}
    </View>
  )
}

const buildStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      gap: theme.space[16],
      paddingVertical: theme.space[16],
      borderRadius: theme.radius.xl,
      backgroundColor: theme.colors.popover,
      boxShadow: theme.shadows.selection,
    },
    header: { gap: theme.space[4], paddingHorizontal: theme.space[16] },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.space[8],
    },
    title: {
      fontFamily: FONT.medium,
      fontSize: theme.text[14],
      color: theme.colors.foreground,
    },
    description: {
      fontFamily: FONT.regular,
      fontSize: theme.text[13],
      lineHeight: theme.text[13] * 1.5,
      color: theme.colors.muted,
    },
    content: { paddingHorizontal: theme.space[16] },
    footer: {
      flexDirection: "row",
      justifyContent: "flex-end",
      paddingHorizontal: theme.space[16],
    },
  })
