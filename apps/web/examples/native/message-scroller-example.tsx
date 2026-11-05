import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { ScrollView, View } from "react-native"

import { Button } from "@/registry/native/ui/button"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScroller,
  useMessageScrollerScrollable,
  useMessageScrollerVisibility,
} from "@/registry/native/ui/message-scroller"
import { Text } from "@/registry/native/ui/text"

type Message = { id: string; role: "user" | "assistant"; text: string }

const CONVERSATION: Message[] = Array.from({ length: 12 }, (_, index) => ({
  id: `message-${index + 1}`,
  role: index % 2 === 0 ? "user" : "assistant",
  text:
    index % 2 === 0
      ? `Check section ${index + 1} of the transcript.`
      : `Section ${index + 1} is ready. Scroll state updates without rerendering the rows.`,
}))

function Bubble({ message }: { message: Message }) {
  return (
    <View
      className={
        message.role === "user"
          ? "max-w-[80%] self-end rounded-xl bg-primary px-3 py-2"
          : "max-w-[80%] self-start rounded-xl bg-muted px-3 py-2"
      }
    >
      <Text
        className={
          message.role === "user"
            ? "text-primary-foreground"
            : "text-foreground"
        }
      >
        {message.text}
      </Text>
    </View>
  )
}

function Transcript({ messages }: { messages: Message[] }) {
  // A conversation normally fills a screen. This demo's page scrolls too, and a
  // list warns when it finds a scrolling parent in its context.
  return (
    <ScrollView.Context value={null}>
      <MessageScrollerContent className="p-4">
        {messages.map((message) => (
          <MessageScrollerItem
            key={message.id}
            messageId={message.id}
            scrollAnchor={message.role === "user"}
          >
            <Bubble message={message} />
          </MessageScrollerItem>
        ))}
      </MessageScrollerContent>
    </ScrollView.Context>
  )
}

function ScrollStatus() {
  const { start, end } = useMessageScrollerScrollable()
  const { currentAnchorId, visibleMessageIds } = useMessageScrollerVisibility()
  return (
    <Text className="text-xs text-muted-foreground">
      {`Older above: ${start}. Newer below: ${end}. Anchor: ${currentAnchorId ?? "none"}. Showing ${visibleMessageIds.length}.`}
    </Text>
  )
}

function Commands() {
  const scroller = useMessageScroller()
  return (
    <View className="flex-row flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        onPress={() => scroller.scrollToStart({ behavior: "smooth" })}
      >
        Start
      </Button>
      <Button
        variant="outline"
        size="sm"
        onPress={() =>
          scroller.scrollToMessage("message-5", { behavior: "smooth" })
        }
      >
        Message 5
      </Button>
      <Button
        variant="outline"
        size="sm"
        onPress={() => scroller.scrollToEnd({ behavior: "smooth" })}
      >
        End
      </Button>
    </View>
  )
}

function MessageScrollerExample() {
  const [messages, setMessages] = React.useState(CONVERSATION)
  const addMessage = () =>
    setMessages((current) => [
      ...current,
      {
        id: `message-${current.length + 1}`,
        role: current.length % 2 === 0 ? "user" : "assistant",
        text: `Message ${current.length + 1} just arrived.`,
      },
    ])
  return (
    <ExampleWrapper fit>
      <Example
        title="Sticks to the bottom as messages arrive"
        className="items-stretch"
      >
        <MessageScrollerProvider>
          <View className="h-80 rounded-lg border border-border">
            <MessageScroller>
              <MessageScrollerViewport>
                <Transcript messages={messages} />
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          </View>
        </MessageScrollerProvider>
        <Button variant="outline" onPress={addMessage}>
          Add a message
        </Button>
      </Example>
      <Example
        title="Scroll state, opening at the start"
        className="items-stretch"
      >
        <MessageScrollerProvider defaultScrollPosition="start">
          <ScrollStatus />
          <View className="h-80 rounded-lg border border-border">
            <MessageScroller>
              <MessageScrollerViewport>
                <Transcript messages={CONVERSATION} />
              </MessageScrollerViewport>
              <MessageScrollerButton direction="start" />
              <MessageScrollerButton />
            </MessageScroller>
          </View>
        </MessageScrollerProvider>
      </Example>
      <Example
        title="Driven from outside, opening at the last anchor"
        className="items-stretch"
      >
        <MessageScrollerProvider defaultScrollPosition="last-anchor">
          <Commands />
          <View className="h-80 rounded-lg border border-border">
            <MessageScroller>
              <MessageScrollerViewport>
                <Transcript messages={CONVERSATION} />
              </MessageScrollerViewport>
            </MessageScroller>
          </View>
        </MessageScrollerProvider>
      </Example>
      <Example
        title="Doesn't follow new messages, with a custom button"
        className="items-stretch"
      >
        <MessageScrollerProvider autoScroll={false}>
          <View className="h-80 rounded-lg border border-border">
            <MessageScroller>
              <MessageScrollerViewport>
                <Transcript messages={messages} />
              </MessageScrollerViewport>
              <MessageScrollerButton variant="outline" size="default">
                Jump to the latest
              </MessageScrollerButton>
            </MessageScroller>
          </View>
        </MessageScrollerProvider>
        <Button variant="outline" onPress={addMessage}>
          Add a message
        </Button>
      </Example>
    </ExampleWrapper>
  )
}

export { MessageScrollerExample }
