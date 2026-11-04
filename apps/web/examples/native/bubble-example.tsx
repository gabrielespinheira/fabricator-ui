import { Example, ExampleWrapper } from "@/examples/native/example"
import { Pressable } from "react-native"

import {
  Bubble,
  BubbleContent,
  BubbleGroup,
  BubbleReactions,
} from "@/registry/native/ui/bubble"
import { Text } from "@/registry/native/ui/text"

const VARIANTS = [
  "default",
  "secondary",
  "muted",
  "tinted",
  "outline",
  "ghost",
  "destructive",
] as const

function BubbleExample() {
  return (
    <ExampleWrapper>
      <Example title="Variants" className="items-stretch">
        {VARIANTS.map((variant) => (
          <Bubble key={variant} variant={variant}>
            <BubbleContent>A {variant} bubble, in the chat.</BubbleContent>
          </Bubble>
        ))}
      </Example>
      <Example title="Alignment" className="items-stretch">
        <Bubble variant="muted" align="start">
          <BubbleContent>Did the build pass?</BubbleContent>
        </Bubble>
        <Bubble align="end">
          <BubbleContent>
            It did, and this reply is long enough to wrap so the bubble's width
            shows.
          </BubbleContent>
        </Bubble>
      </Example>
      <Example title="Group" className="items-stretch">
        <BubbleGroup>
          <Bubble variant="muted">
            <BubbleContent>I checked the registry addresses.</BubbleContent>
          </Bubble>
          <Bubble variant="muted">
            <BubbleContent>They all resolve.</BubbleContent>
          </Bubble>
        </BubbleGroup>
      </Example>
      <Example title="Pressable" className="items-stretch">
        <Bubble variant="tinted" align="end">
          <BubbleContent render={<Pressable onPress={() => {}} />}>
            I forgot my password
          </BubbleContent>
        </Bubble>
        <Bubble variant="outline" align="end">
          <BubbleContent asChild>
            <Pressable onPress={() => {}}>
              <Text>Talk to a person</Text>
            </Pressable>
          </BubbleContent>
        </Bubble>
      </Example>
      <Example title="Reactions" className="items-stretch gap-10 py-10">
        <Bubble variant="muted" align="end">
          <BubbleContent>
            I don't need tests, I know my code works.
          </BubbleContent>
          <BubbleReactions
            align="start"
            role="img"
            aria-label="Reactions: thumbs up"
          >
            <Text>👍</Text>
          </BubbleReactions>
        </Bubble>
        <Bubble variant="muted">
          <BubbleContent>Bold.</BubbleContent>
          <BubbleReactions role="img" aria-label="Reactions: eyes, and 2 more">
            <Text>👀</Text>
            <Text>+2</Text>
          </BubbleReactions>
        </Bubble>
        <Bubble align="end">
          <BubbleContent>Tests passed on the first try.</BubbleContent>
          <BubbleReactions
            side="top"
            align="start"
            role="img"
            aria-label="Reactions: party"
          >
            <Text>🎉</Text>
          </BubbleReactions>
        </Bubble>
        <Bubble>
          <BubbleContent>Reactions sit on the bubble's edge.</BubbleContent>
          <BubbleReactions
            side="bottom"
            align="end"
            role="img"
            aria-label="Reactions: clap"
          >
            <Text>👏</Text>
          </BubbleReactions>
        </Bubble>
      </Example>
    </ExampleWrapper>
  )
}

export { BubbleExample }
