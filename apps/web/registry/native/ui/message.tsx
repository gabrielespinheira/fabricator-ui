import * as React from "react"
import { cn } from "cn"
import { View } from "react-native"

import { renderTextChildren, TextStyle } from "@/registry/native/ui/text"

type MessageAlign = "start" | "end"

type PartProps = { children?: React.ReactNode; variant?: string }

// React Native has no group-data-* or group-has-*: parts read the message's
// alignment and what it holds from here.
const MessageContext = React.createContext<{
  align: MessageAlign
  hasFooter: boolean
  hasGhost: boolean
}>({ align: "start", hasFooter: false, hasGhost: false })

/** Whether anything written below `children` matches. */
function hasPart(
  children: React.ReactNode,
  matches: (element: React.ReactElement<PartProps>) => boolean
): boolean {
  return React.Children.toArray(children).some(
    (child) =>
      React.isValidElement<PartProps>(child) &&
      (matches(child) || hasPart(child.props.children, matches))
  )
}

function MessageGroup({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="message-group"
      className={cn("cn-message-group min-w-0 flex-col", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

function Message({
  className,
  align = "start",
  children,
  ...props
}: React.ComponentProps<typeof View> & { align?: "start" | "end" }) {
  return (
    <MessageContext
      value={{
        align,
        hasFooter: hasPart(children, (part) => part.type === MessageFooter),
        hasGhost: hasPart(children, (part) => part.props.variant === "ghost"),
      }}
    >
      <TextStyle className="cn-message-text">
        <View
          data-slot="message"
          data-align={align}
          className={cn(
            "cn-message relative w-full min-w-0 flex-row data-[align=end]:flex-row-reverse",
            className
          )}
          {...props}
        >
          {renderTextChildren(children)}
        </View>
      </TextStyle>
    </MessageContext>
  )
}

function MessageAvatar({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const { hasFooter } = React.use(MessageContext)
  return (
    <View
      data-slot="message-avatar"
      data-footer={hasFooter}
      className={cn(
        "cn-message-avatar shrink-0 items-center justify-center self-end overflow-hidden",
        className
      )}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

function MessageContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const { align } = React.use(MessageContext)
  // The website's `*:data-slot:self-end`: every part, whatever its own alignment.
  const content =
    align === "end"
      ? React.Children.map(children, (child) =>
          React.isValidElement<{ className?: string }>(child) &&
          child.type !== React.Fragment
            ? React.cloneElement(child, {
                className: cn("self-end", child.props.className),
              })
            : child
        )
      : children
  return (
    <View
      data-slot="message-content"
      className={cn("cn-message-content min-w-0 flex-1 flex-col", className)}
      {...props}
    >
      {renderTextChildren(content)}
    </View>
  )
}

function MessageHeader({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const { hasGhost } = React.use(MessageContext)
  return (
    <TextStyle className="cn-message-header-text">
      <View
        data-slot="message-header"
        data-ghost={hasGhost}
        className={cn(
          "cn-message-header max-w-full min-w-0 flex-row items-center",
          className
        )}
        {...props}
      >
        {renderTextChildren(children)}
      </View>
    </TextStyle>
  )
}

function MessageFooter({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const { align, hasGhost } = React.use(MessageContext)
  return (
    <TextStyle className="cn-message-footer-text">
      <View
        data-slot="message-footer"
        data-align={align}
        data-ghost={hasGhost}
        className={cn(
          "cn-message-footer max-w-full min-w-0 flex-row items-center",
          className
        )}
        {...props}
      >
        {renderTextChildren(children)}
      </View>
    </TextStyle>
  )
}

export {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
}
