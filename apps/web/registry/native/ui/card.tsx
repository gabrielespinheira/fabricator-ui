import * as React from "react"
import { cn } from "cn"
import { View } from "react-native"

import { renderTextChildren, Text, TextStyle } from "@/registry/native/ui/text"

type CardSize = "default" | "sm"

// React Native has no group-data-*: parts read the card's size from here.
const CardContext = React.createContext<CardSize>("default")

function Card({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof View> & { size?: CardSize }) {
  return (
    <CardContext value={size}>
      <TextStyle className="cn-card-text">
        <View
          data-slot="card"
          data-size={size}
          className={cn("cn-card flex-col", className)}
          {...props}
        >
          {renderTextChildren(children)}
        </View>
      </TextStyle>
    </CardContext>
  )
}

function CardHeader({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const size = React.use(CardContext)
  return (
    <View
      data-slot="card-header"
      data-size={size}
      className={cn("cn-card-header", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<typeof Text>) {
  const size = React.use(CardContext)
  return (
    <Text
      data-slot="card-title"
      data-size={size}
      role="heading"
      className={cn("cn-card-title", className)}
      {...props}
    />
  )
}

function CardDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      data-slot="card-description"
      className={cn("cn-card-description", className)}
      {...props}
    />
  )
}

function CardAction({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="card-action"
      className={cn("cn-card-action", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

function CardContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const size = React.use(CardContext)
  return (
    <View
      data-slot="card-content"
      data-size={size}
      className={cn("cn-card-content", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

function CardFooter({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const size = React.use(CardContext)
  return (
    <View
      data-slot="card-footer"
      data-size={size}
      className={cn("cn-card-footer flex-row items-center", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
}
