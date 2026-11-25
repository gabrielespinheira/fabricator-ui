import * as React from "react"
import {
  CheckIcon,
  LinkIcon,
  MaximizeIcon,
  PanelRightIcon,
  SquareIcon,
  XIcon,
} from "@fabricator-ui/icons-react-native"
import { cn } from "cn"
import {
  Image,
  ScrollView,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import {
  recordViewModes,
  type RecordViewMode,
  type RecordViewProps,
} from "@/registry/fabricator/shared/lib/record-view-model"
import { ControlSheet } from "@/registry/native/lib/control-sheet"
import { Button } from "@/registry/native/ui/button"
import { Drawer, DrawerContent, DrawerTitle } from "@/registry/native/ui/drawer"
import { Skeleton } from "@/registry/native/ui/skeleton"
import { Text } from "@/registry/native/ui/text"

// Record View: one record in a side panel, a centred sheet or the whole screen.
// On a phone every mode is a drawer, and Full page fills the screen.

const modeIcons: Record<RecordViewMode, typeof XIcon> = {
  side: PanelRightIcon,
  center: SquareIcon,
  page: MaximizeIcon,
}

function RecordView({
  open,
  onOpenChange,
  mode = "side",
  onModeChange,
  title,
  onTitleChange,
  description,
  context,
  actions,
  cover,
  aside,
  children,
  state = "ready",
  isReadOnly,
  onRetry,
  onCopyLink,
  footer,
  className,
}: RecordViewProps) {
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const isWide = width >= 768
  const isPage = mode === "page"
  const isSidePanel = mode === "side" && isWide
  const isCentered = mode === "center" && isWide
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      modal={!isSidePanel}
      swipeDirection={isSidePanel ? "right" : "down"}
    >
      <DrawerContent
        data-slot="record-view-surface"
        className={cn("cn-record-view", className)}
        style={
          isPage
            ? {
                height: "100%",
                maxHeight: "100%",
                width: "100%",
                maxWidth: "100%",
                borderRadius: 0,
              }
            : isSidePanel
              ? { height: "100%" }
              : isCentered
                ? {
                    height: "72%",
                    width: "84%",
                    maxWidth: 640,
                    borderRadius: 20,
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    overflow: "hidden",
                  }
                : undefined
        }
        {...(isCentered
          ? {
              viewportProps: {
                style: { justifyContent: "center", alignItems: "center" },
              },
            }
          : {})}
      >
        <View
          data-slot="record-view"
          data-mode={mode}
          className="cn-record-view-layout min-h-0 flex-1"
          style={
            isPage
              ? {
                  paddingTop: insets.top,
                  paddingBottom: insets.bottom,
                  paddingLeft: insets.left,
                  paddingRight: insets.right,
                }
              : undefined
          }
        >
          <RecordViewHeader
            mode={mode}
            context={context}
            description={description}
            isReadOnly={isReadOnly}
            onOpenChange={onOpenChange}
            onModeChange={onModeChange}
            onCopyLink={onCopyLink}
            actions={actions}
          />
          <RecordViewBody>
            <DrawerTitle className="sr-only">{title}</DrawerTitle>
            {state === "ready" && cover}
            <View className="cn-record-view-content">
              {state !== "missing" && state !== "error" && (
                <RecordViewTitle
                  title={title}
                  onTitleChange={isReadOnly ? undefined : onTitleChange}
                />
              )}
              <RecordViewState state={state} onRetry={onRetry}>
                <View
                  data-columns={isPage && width >= 900}
                  className="cn-record-view-columns"
                  style={
                    isPage && width >= 900
                      ? { flexDirection: "row-reverse" }
                      : undefined
                  }
                >
                  {aside && (
                    <View
                      data-slot="record-view-aside"
                      data-columns={isPage && width >= 900}
                      className="cn-record-view-aside"
                    >
                      {aside}
                    </View>
                  )}
                  <View
                    data-slot="record-view-main"
                    className="cn-record-view-main min-w-0"
                    style={isPage && width >= 900 ? { flex: 1 } : undefined}
                  >
                    {children}
                  </View>
                </View>
              </RecordViewState>
            </View>
          </RecordViewBody>
          {footer && <RecordViewFooter>{footer}</RecordViewFooter>}
        </View>
      </DrawerContent>
    </Drawer>
  )
}

function RecordViewHeader({
  mode = "side",
  context,
  description,
  isReadOnly,
  onModeChange,
  actions,
  onCopyLink,
  onOpenChange,
}: Pick<
  RecordViewProps,
  | "mode"
  | "context"
  | "description"
  | "isReadOnly"
  | "onModeChange"
  | "actions"
  | "onCopyLink"
  | "onOpenChange"
>) {
  const [isModeOpen, setIsModeOpen] = React.useState(false)
  const ModeIcon = modeIcons[mode]
  return (
    <View
      data-slot="record-view-header"
      className="cn-record-view-header flex-row items-center"
    >
      <View
        data-slot="record-view-context"
        className="cn-record-view-context min-w-0 flex-1 flex-row items-center"
      >
        {typeof context === "string" || (!context && description) ? (
          <Text
            numberOfLines={1}
            className="cn-record-view-context-text shrink"
          >
            {typeof context === "string" ? context : description}
          </Text>
        ) : (
          context
        )}
        {isReadOnly && <Text className="cn-record-view-badge">Read only</Text>}
      </View>
      <View
        data-slot="record-view-actions"
        className="cn-record-view-actions flex-row items-center"
      >
        {onCopyLink && <RecordViewCopyLink onCopyLink={onCopyLink} />}
        {onModeChange && (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              accessibilityLabel="Open record in"
              onPress={() => setIsModeOpen(true)}
            >
              <ModeIcon />
            </Button>
            <ControlSheet
              open={isModeOpen}
              onOpenChange={setIsModeOpen}
              label="Open record in"
              groups={[
                {
                  id: "modes",
                  items: recordViewModes.map(({ id, label }) => {
                    const Icon = modeIcons[id]
                    return {
                      type: "check" as const,
                      id,
                      label,
                      icon: <Icon />,
                      isChecked: id === mode,
                      onSelect: () => onModeChange(id),
                    }
                  }),
                },
              ]}
            />
          </>
        )}
        {actions}
        <Button
          variant="ghost"
          size="icon-sm"
          accessibilityLabel="Close record"
          onPress={() => onOpenChange(false)}
        >
          <XIcon />
        </Button>
      </View>
    </View>
  )
}

function RecordViewCopyLink({ onCopyLink }: { onCopyLink: () => void }) {
  const [isCopied, setIsCopied] = React.useState(false)
  React.useEffect(() => {
    if (!isCopied) return
    const timer = setTimeout(() => setIsCopied(false), 1600)
    return () => clearTimeout(timer)
  }, [isCopied])
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      accessibilityLabel={isCopied ? "Link copied" : "Copy link"}
      onPress={() => {
        onCopyLink()
        setIsCopied(true)
      }}
    >
      {isCopied ? <CheckIcon /> : <LinkIcon />}
    </Button>
  )
}

/** The record's name. Editable, it saves on leaving the field. */
function RecordViewTitle({
  title,
  onTitleChange,
  className,
}: Pick<RecordViewProps, "title" | "onTitleChange"> & { className?: string }) {
  if (!onTitleChange)
    return (
      <Text
        data-slot="record-view-title"
        accessibilityRole="header"
        className={cn("cn-record-view-title", className)}
      >
        {title}
      </Text>
    )
  return (
    <TextInput
      key={title}
      data-slot="record-view-title"
      accessibilityLabel="Title"
      defaultValue={title}
      multiline
      scrollEnabled={false}
      submitBehavior="blurAndSubmit"
      selectionColorClassName="accent-primary"
      className={cn("cn-record-view-title-field", className)}
      onEndEditing={(event) => {
        const next = event.nativeEvent.text.trim()
        if (next && next !== title) onTitleChange(next)
      }}
    />
  )
}

function RecordViewBody({
  className,
  ...props
}: React.ComponentProps<typeof ScrollView>) {
  return (
    <ScrollView
      data-slot="record-view-body"
      keyboardShouldPersistTaps="handled"
      className={cn("cn-record-view-body min-h-0", className)}
      {...props}
    />
  )
}

/** The record's picture. One that doesn't load leaves no gap behind. */
function RecordViewCover({
  src,
  alt = "",
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof View>, "children"> & {
  src: string
  alt?: string
  /** Controls over the picture, such as "Change". */
  children?: React.ReactNode
}) {
  const [failed, setFailed] = React.useState<string | null>(null)
  if (failed === src) return null
  return (
    <View
      data-slot="record-view-cover"
      className={cn("cn-record-view-cover overflow-hidden", className)}
      {...props}
    >
      <Image
        accessible={alt !== ""}
        accessibilityLabel={alt || undefined}
        source={{ uri: src }}
        resizeMode="cover"
        className="size-full"
        onError={() => setFailed(src)}
      />
      {children && (
        <View className="cn-record-view-cover-actions absolute flex-row items-center">
          {children}
        </View>
      )}
    </View>
  )
}

function RecordViewSection({
  className,
  title,
  children,
  ...props
}: React.ComponentProps<typeof View> & { title?: string }) {
  return (
    <View
      data-slot="record-view-section"
      className={cn("cn-record-view-section flex-col", className)}
      {...props}
    >
      {title && (
        <Text
          accessibilityRole="header"
          className="cn-record-view-section-title"
        >
          {title}
        </Text>
      )}
      {children}
    </View>
  )
}

function RecordViewFooter({
  className,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="record-view-footer"
      className={cn("cn-record-view-footer flex-row items-center", className)}
      {...props}
    />
  )
}

function RecordViewState({
  state = "ready",
  children,
  onRetry,
}: Pick<RecordViewProps, "state" | "onRetry" | "children">) {
  if (state === "loading")
    return (
      <View
        data-slot="record-view-loading"
        accessibilityLabel="Loading record"
        accessibilityState={{ busy: true }}
        className="cn-record-view-state"
      >
        {[0, 1, 2, 3, 4].map((row) => (
          <View
            key={row}
            className="cn-record-view-skeleton flex-row items-center"
          >
            <Skeleton className="cn-record-view-skeleton-label" />
            <Skeleton className="cn-record-view-skeleton-value" />
          </View>
        ))}
        <Skeleton className="cn-record-view-skeleton-block" />
      </View>
    )
  if (state === "missing")
    return (
      <View
        data-slot="record-view-missing"
        className="cn-record-view-message items-center"
      >
        <Text className="cn-record-view-message-title">
          This record isn’t here
        </Text>
        <Text className="cn-record-view-message-text">
          It may have been deleted, or you may not have access to it.
        </Text>
      </View>
    )
  if (state === "error")
    return (
      <View
        data-slot="record-view-error"
        className="cn-record-view-message items-center"
      >
        <Text
          accessibilityRole="alert"
          className="cn-record-view-message-title"
        >
          Couldn’t load this record
        </Text>
        <Text className="cn-record-view-message-text">
          Check your connection and try again.
        </Text>
        {onRetry && (
          <Button size="sm" variant="outline" onPress={onRetry}>
            Try again
          </Button>
        )}
      </View>
    )
  return <>{children}</>
}

export {
  RecordView,
  RecordViewBody,
  RecordViewCover,
  RecordViewFooter,
  RecordViewHeader,
  RecordViewSection,
  RecordViewState,
  RecordViewTitle,
  type RecordViewMode,
  type RecordViewProps,
}
