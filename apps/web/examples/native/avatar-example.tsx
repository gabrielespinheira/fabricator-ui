import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { CheckIcon, PlusIcon } from "@fabricator-ui/icons-react-native"

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/registry/native/ui/avatar"
import { Button } from "@/registry/native/ui/button"
import { Text } from "@/registry/native/ui/text"

const GABS = "https://github.com/gabrielespinheira.png"
const MAX = "https://github.com/maxleiter.png"
const RABBIT = "https://github.com/evilrabbit.png"

const SIZES = ["sm", "default", "lg"] as const

function AvatarExample() {
  const [src, setSrc] = React.useState<string | undefined>(GABS)
  const [status, setStatus] = React.useState("idle")
  return (
    <ExampleWrapper>
      <Example title="Sizes" className="flex-row items-center">
        {SIZES.map((size) => (
          <Avatar key={size} size={size}>
            <AvatarImage src={GABS} alt="@gabrielespinheira" />
            <AvatarFallback>GE</AvatarFallback>
          </Avatar>
        ))}
      </Example>
      <Example title="Fallback only" className="flex-row items-center">
        {SIZES.map((size) => (
          <Avatar key={size} size={size}>
            <AvatarFallback>GE</AvatarFallback>
          </Avatar>
        ))}
      </Example>
      <Example
        title="An image that fails, and a slow fallback"
        className="flex-row items-center"
      >
        <Avatar>
          <AvatarImage src="https://fabricator.dev/missing.png" alt="Missing" />
          <AvatarFallback>ER</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarImage src={RABBIT} alt="@evilrabbit" />
          <AvatarFallback delay={600}>ER</AvatarFallback>
        </Avatar>
      </Example>
      <Example title="Changing the image">
        <Avatar size="lg">
          <AvatarImage
            src={src}
            alt="@gabrielespinheira"
            onLoadingStatusChange={setStatus}
          />
          <AvatarFallback>GE</AvatarFallback>
        </Avatar>
        <Text className="text-muted-foreground">Status: {status}</Text>
        <Button
          size="sm"
          variant="outline"
          onPress={() =>
            setSrc(src === GABS ? MAX : src === MAX ? undefined : GABS)
          }
        >
          Next image
        </Button>
      </Example>
      <Example title="Badge" className="flex-row items-center">
        {SIZES.map((size) => (
          <Avatar key={size} size={size}>
            <AvatarImage src={GABS} alt="@gabrielespinheira" />
            <AvatarFallback>GE</AvatarFallback>
            <AvatarBadge>
              <CheckIcon />
            </AvatarBadge>
          </Avatar>
        ))}
      </Example>
      <Example title="Group">
        {SIZES.map((size) => (
          <AvatarGroup key={size}>
            <Avatar size={size}>
              <AvatarImage src={GABS} alt="@gabrielespinheira" />
              <AvatarFallback>GE</AvatarFallback>
            </Avatar>
            <Avatar size={size}>
              <AvatarImage src={MAX} alt="@maxleiter" />
              <AvatarFallback>LR</AvatarFallback>
            </Avatar>
            <Avatar size={size}>
              <AvatarImage src={RABBIT} alt="@evilrabbit" />
              <AvatarFallback>ER</AvatarFallback>
            </Avatar>
            <AvatarGroupCount>+3</AvatarGroupCount>
          </AvatarGroup>
        ))}
        <AvatarGroup>
          <Avatar>
            <AvatarFallback>GE</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>LR</AvatarFallback>
          </Avatar>
          <AvatarGroupCount>
            <PlusIcon />
          </AvatarGroupCount>
        </AvatarGroup>
      </Example>
    </ExampleWrapper>
  )
}

export { AvatarExample }
