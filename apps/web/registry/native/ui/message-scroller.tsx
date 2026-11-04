import * as React from "react"
import { ArrowDownIcon, ArrowUpIcon } from "@fabricator-ui/icons-react-native"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import { FlatList, View, type FlatListProps } from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { useCSSVariable } from "uniwind"

import {
  createScrollerStore,
  getMessageIndex,
  getScrollableEdges,
  getVisibility,
  type MessageScrollerScrollable,
  type MessageScrollerVisibilityState,
} from "@/registry/native/lib/message-scroller-model"
import { useMotion } from "@/registry/native/lib/motion"
import { parseNumber } from "@/registry/native/lib/motion-tokens"
import { renderSlot, type RenderProps } from "@/registry/native/lib/render"
import { Button } from "@/registry/native/ui/button"
import { renderTextChildren } from "@/registry/native/ui/text"

// The website's parts on an inverted FlatList: the newest message is offset 0,
// so the list stays on it as messages arrive and as the last one grows.

type MessageScrollerDefaultScrollPosition = "start" | "end" | "last-anchor"
type MessageScrollerScrollAlign = "start" | "center" | "end" | "nearest"
type ScrollBehavior = "auto" | "smooth"

type MessageScrollerScrollOptions = {
  align?: MessageScrollerScrollAlign
  behavior?: ScrollBehavior
  scrollMargin?: number
}

type MessageElement = React.ReactElement<{
  messageId?: string
  scrollAnchor?: boolean
  children?: React.ReactNode
}>

type OnViewableItemsChanged = NonNullable<
  FlatListProps<MessageElement>["onViewableItemsChanged"]
>

// An inverted list measures from the bottom: the top of its viewport is 1.
const VIEW_POSITIONS: Record<MessageScrollerScrollAlign, number> = {
  start: 1,
  center: 0.5,
  end: 0,
  nearest: 0.5,
}

const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 1 }
const NOT_SCROLLABLE = { start: false, end: false }
const NO_ITEMS: readonly MessageElement[] = []
const NOTHING_VISIBLE: MessageScrollerVisibilityState = {
  currentAnchorId: null,
  visibleMessageIds: [],
}

function createScrollerState({
  autoScroll,
  defaultScrollPosition,
  scrollEdgeThreshold,
  scrollMargin,
}: {
  autoScroll?: boolean
  defaultScrollPosition: MessageScrollerDefaultScrollPosition
  scrollEdgeThreshold: number
  scrollMargin: number
}) {
  return {
    listRef: React.createRef<FlatList<MessageElement>>(),
    items: NO_ITEMS,
    metrics: { offset: 0, contentSize: 0, viewportSize: 0 },
    config: {
      autoScroll,
      defaultScrollPosition,
      scrollEdgeThreshold,
      scrollMargin,
    },
    scrollable: createScrollerStore<MessageScrollerScrollable>(
      NOT_SCROLLABLE,
      (a, b) => a.start === b.start && a.end === b.end
    ),
    visibility: createScrollerStore<MessageScrollerVisibilityState>(
      NOTHING_VISIBLE,
      (a, b) =>
        a.currentAnchorId === b.currentAnchorId &&
        a.visibleMessageIds.join() === b.visibleMessageIds.join()
    ),
    // Waiting to jump to a position other than the end: nothing shows until then.
    isPending: createScrollerStore<boolean>(
      defaultScrollPosition !== "end",
      Object.is
    ),
  }
}

type ScrollerState = ReturnType<typeof createScrollerState>

const MessageScrollerContext = React.createContext<ScrollerState | null>(null)

function useScrollerState() {
  const context = React.use(MessageScrollerContext)
  if (!context) {
    throw new Error(
      "MessageScroller parts must be used within a <MessageScrollerProvider />"
    )
  }
  return context
}

function scrollToMessageIn(
  state: ScrollerState,
  messageId: string,
  {
    align = "start",
    behavior = "auto",
    scrollMargin,
  }: MessageScrollerScrollOptions = {}
) {
  const index = getMessageIndex(
    state.items.map((item) => item.props),
    messageId
  )
  const list = state.listRef.current
  if (index === -1 || !list) return false
  list.scrollToIndex({
    index,
    animated: behavior === "smooth",
    viewPosition: VIEW_POSITIONS[align],
    viewOffset: scrollMargin ?? state.config.scrollMargin,
  })
  return true
}

function useMessageScroller() {
  const state = useScrollerState()
  return React.useMemo(
    () => ({
      scrollToEnd(options?: MessageScrollerScrollOptions) {
        const list = state.listRef.current
        if (!list) return false
        list.scrollToOffset({
          offset: 0,
          animated: options?.behavior === "smooth",
        })
        return true
      },
      scrollToStart(options?: MessageScrollerScrollOptions) {
        const list = state.listRef.current
        if (!list) return false
        list.scrollToEnd({ animated: options?.behavior === "smooth" })
        return true
      },
      scrollToMessage(
        messageId: string,
        options?: MessageScrollerScrollOptions
      ) {
        return scrollToMessageIn(state, messageId, options)
      },
    }),
    [state]
  )
}

function useMessageScrollerScrollable() {
  const { scrollable } = useScrollerState()
  return React.useSyncExternalStore(scrollable.subscribe, scrollable.get)
}

function useMessageScrollerVisibility() {
  const { visibility } = useScrollerState()
  return React.useSyncExternalStore(visibility.subscribe, visibility.get)
}

function MessageScrollerProvider({
  children,
  autoScroll,
  defaultScrollPosition = "end",
  scrollEdgeThreshold = 8,
  scrollPreviousItemPeek: _scrollPreviousItemPeek,
  scrollMargin = 0,
}: {
  children?: React.ReactNode
  /** Follows new messages while the reader is at the bottom. `false` stays put. */
  autoScroll?: boolean
  defaultScrollPosition?: MessageScrollerDefaultScrollPosition
  scrollEdgeThreshold?: number
  /** Website only: a new turn isn't anchored to the top here. */
  scrollPreviousItemPeek?: number
  scrollMargin?: number
}) {
  const [state] = React.useState(() =>
    createScrollerState({
      autoScroll,
      defaultScrollPosition,
      scrollEdgeThreshold,
      scrollMargin,
    })
  )
  state.config.autoScroll = autoScroll
  state.config.scrollEdgeThreshold = scrollEdgeThreshold
  state.config.scrollMargin = scrollMargin
  return (
    <MessageScrollerContext value={state}>{children}</MessageScrollerContext>
  )
}

function MessageScroller({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="message-scroller"
      className={cn(
        "cn-message-scroller relative size-full min-h-0 flex-col overflow-hidden",
        className
      )}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

function MessageScrollerViewport({
  className,
  children,
  role = "region",
  "aria-label": ariaLabel = "Messages",
  preserveScrollOnPrepend: _preserveScrollOnPrepend,
  ...props
}: React.ComponentProps<typeof View> & {
  /** Older messages load past the far end of an inverted list: always true here. */
  preserveScrollOnPrepend?: boolean
}) {
  const { isPending } = useScrollerState()
  const isWaiting = React.useSyncExternalStore(
    isPending.subscribe,
    isPending.get
  )
  return (
    <View
      data-slot="message-scroller-viewport"
      data-pending-scroll={isWaiting}
      role={role}
      aria-label={ariaLabel}
      className={cn(
        "cn-message-scroller-viewport size-full min-h-0 min-w-0",
        className
      )}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

// Grows to the viewport with its end at the top, so a short conversation reads
// from the top down, as it does on the website.
const messageScrollerContentVariants = cva(
  "cn-message-scroller-content grow flex-col justify-end"
)

function renderItem({ item }: { item: MessageElement }) {
  return item
}

function getItemKey(item: MessageElement, index: number) {
  return item.key ?? String(index)
}

function isMessageElement(child: React.ReactNode): child is MessageElement {
  return React.isValidElement(child)
}

function toMessageElements(children: React.ReactNode): MessageElement[] {
  return React.Children.toArray(renderTextChildren(children))
    .filter(isMessageElement)
    .flatMap((child) =>
      child.type === React.Fragment
        ? toMessageElements(child.props.children)
        : [child]
    )
}

function MessageScrollerContent({
  className,
  children,
  role = "log",
  "aria-relevant": _ariaRelevant,
  spacerClassName: _spacerClassName,
  onScroll,
  onContentSizeChange,
  onLayout,
  ...props
}: Omit<
  React.ComponentProps<typeof FlatList<MessageElement>>,
  "children" | "data" | "renderItem" | "inverted" | "keyExtractor"
> & {
  children?: React.ReactNode
  "aria-relevant"?: string
  /** Website only: nothing here needs a spacer under the last message. */
  spacerClassName?: string
}) {
  const state = useScrollerState()
  const items = React.useMemo(() => toMessageElements(children), [children])
  const data = React.useMemo(() => [...items].reverse(), [items])
  state.items = items

  const updateEdges = () => {
    state.scrollable.set(
      getScrollableEdges({
        ...state.metrics,
        threshold: state.config.scrollEdgeThreshold,
      })
    )
  }

  // FlatList throws if this changes between renders.
  const onViewableItemsChanged = React.useRef<OnViewableItemsChanged>(
    ({ viewableItems }) => {
      const visible = new Set<string>()
      for (const { item } of viewableItems) {
        if (item.props.messageId !== undefined) {
          visible.add(item.props.messageId)
        }
      }
      state.visibility.set(
        getVisibility(
          state.items.map((item) => item.props),
          visible
        )
      )
    }
  ).current

  const { autoScroll, scrollEdgeThreshold } = state.config
  const visiblePosition = React.useMemo(
    () => ({
      minIndexForVisible: 0,
      autoscrollToTopThreshold:
        autoScroll === false ? undefined : scrollEdgeThreshold,
    }),
    [autoScroll, scrollEdgeThreshold]
  )

  const applyDefaultPosition = () => {
    if (!state.isPending.get()) return
    const list = state.listRef.current
    if (!list || items.length === 0) return
    state.isPending.set(false)
    if (state.config.defaultScrollPosition === "start") {
      list.scrollToEnd({ animated: false })
      return
    }
    const anchor = [...items].reverse().find((item) => item.props.scrollAnchor)
      ?.props.messageId
    if (anchor !== undefined) scrollToMessageIn(state, anchor)
  }

  return (
    <FlatList
      ref={(list) => {
        state.listRef.current = list
      }}
      data-slot="message-scroller-content"
      role={role}
      accessibilityLiveRegion="polite"
      inverted
      data={data}
      renderItem={renderItem}
      keyExtractor={getItemKey}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      nestedScrollEnabled
      viewabilityConfig={VIEWABILITY_CONFIG}
      onViewableItemsChanged={onViewableItemsChanged}
      maintainVisibleContentPosition={visiblePosition}
      onScroll={(event) => {
        state.metrics.offset = event.nativeEvent.contentOffset.y
        updateEdges()
        onScroll?.(event)
      }}
      onContentSizeChange={(width, height) => {
        state.metrics.contentSize = height
        updateEdges()
        applyDefaultPosition()
        onContentSizeChange?.(width, height)
      }}
      onLayout={(event) => {
        state.metrics.viewportSize = event.nativeEvent.layout.height
        updateEdges()
        onLayout?.(event)
      }}
      onScrollToIndexFailed={({ index, averageItemLength }) => {
        // Not laid out yet: get close, and the list measures it on the way.
        state.listRef.current?.scrollToOffset({
          offset: index * averageItemLength,
          animated: false,
        })
      }}
      contentContainerClassName={messageScrollerContentVariants({ className })}
      {...props}
    />
  )
}

function MessageScrollerItem({
  className,
  children,
  messageId,
  scrollAnchor = false,
  ...props
}: React.ComponentProps<typeof View> & {
  messageId?: string
  scrollAnchor?: boolean
}) {
  return (
    <View
      data-slot="message-scroller-item"
      data-message-id={messageId}
      data-scroll-anchor={scrollAnchor}
      className={cn("cn-message-scroller-item min-w-0 shrink-0", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

function MessageScrollerButton({
  direction = "end",
  behavior = "smooth",
  className,
  children,
  render,
  variant = "secondary",
  size = "icon-sm",
  onPress,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "render" | "asChild"> &
  Pick<RenderProps, "render"> & {
    direction?: "start" | "end"
    behavior?: ScrollBehavior
  }) {
  const scroller = useMessageScroller()
  const scrollable = useMessageScrollerScrollable()
  const isActive = direction === "start" ? scrollable.start : scrollable.end
  const motion = useMotion("popup")
  const inactiveScale = parseNumber(useCSSVariable("--motion-popup-scale"), 1)
  const travel = direction === "start" ? -1 : 1

  const progress = useSharedValue(isActive ? 1 : 0)
  React.useEffect(() => {
    progress.value = withTiming(isActive ? 1 : 0, {
      duration: isActive ? motion.enterMs : motion.exitMs,
      easing: isActive ? motion.enterEasing : motion.exitEasing,
    })
  }, [isActive, motion, progress])
  const reducedMotion = motion.isReduced
  const style = useAnimatedStyle(() => {
    if (reducedMotion) return { opacity: progress.value }
    return {
      opacity: progress.value,
      transform: [
        { translateY: (1 - progress.value) * travel * 24 },
        { scale: inactiveScale + (1 - inactiveScale) * progress.value },
      ],
    }
  })

  const shared = {
    "data-slot": "message-scroller-button",
    "data-direction": direction,
    "data-variant": variant,
    "data-size": size,
    "data-active": isActive,
    accessibilityLabel:
      direction === "end" ? "Scroll to end" : "Scroll to start",
    className: cn("cn-message-scroller-button", className),
    disabled: !isActive,
    onPress: (event: Parameters<NonNullable<typeof onPress>>[0]) => {
      onPress?.(event)
      if (direction === "start") scroller.scrollToStart({ behavior })
      else scroller.scrollToEnd({ behavior })
    },
    ...props,
  }
  const content =
    children ??
    (direction === "end" ? (
      <ArrowDownIcon aria-hidden />
    ) : (
      <ArrowUpIcon aria-hidden />
    ))

  return (
    <Animated.View
      data-direction={direction}
      pointerEvents={isActive ? "box-none" : "none"}
      aria-hidden={!isActive}
      className="absolute inset-x-0 items-center data-[direction=end]:bottom-4 data-[direction=start]:top-4"
      style={style}
    >
      {renderSlot({ render }, shared, content) ?? (
        <Button variant={variant} size={size} {...shared}>
          {content}
        </Button>
      )}
    </Animated.View>
  )
}

export {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
  useMessageScroller,
  useMessageScrollerScrollable,
  useMessageScrollerVisibility,
}
