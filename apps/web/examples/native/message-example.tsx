import { Example, ExampleWrapper } from "@/examples/native/example"
import { CopyIcon, FileTextIcon } from "@fabricator-ui/icons-react-native"

import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/registry/native/ui/attachment"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/registry/native/ui/avatar"
import { Bubble, BubbleContent } from "@/registry/native/ui/bubble"
import { Button } from "@/registry/native/ui/button"
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
} from "@/registry/native/ui/message"
import { Text } from "@/registry/native/ui/text"

function MessageExample() {
  return (
    <ExampleWrapper>
      <Example title="Alignment" className="items-stretch">
        <Message align="start">
          <MessageContent>
            <Bubble variant="muted">
              <BubbleContent>Did the build pass?</BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
        <Message align="end">
          <MessageContent>
            <Bubble>
              <BubbleContent>It did, on the first try.</BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
      </Example>
      <Example title="Avatar" className="items-stretch">
        <Message>
          <MessageAvatar>
            <Avatar>
              <AvatarImage
                src="https://github.com/gabrielespinheira.png"
                alt="@gabrielespinheira"
              />
              <AvatarFallback>GE</AvatarFallback>
            </Avatar>
          </MessageAvatar>
          <MessageContent>
            <Bubble variant="muted">
              <BubbleContent>
                The component and example JSON now live under the UI registry.
              </BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
        <Message align="end">
          <MessageAvatar>
            <Avatar>
              <AvatarFallback>ER</AvatarFallback>
            </Avatar>
          </MessageAvatar>
          <MessageContent>
            <Bubble>
              <BubbleContent>Good. Ship it.</BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
      </Example>
      <Example title="Header and footer" className="items-stretch">
        <Message>
          <MessageAvatar>
            <Avatar>
              <AvatarFallback>OL</AvatarFallback>
            </Avatar>
          </MessageAvatar>
          <MessageContent>
            <MessageHeader>Olivia</MessageHeader>
            <Bubble variant="muted">
              <BubbleContent>I already checked the logs.</BubbleContent>
            </Bubble>
            <MessageFooter>Delivered 9:41</MessageFooter>
          </MessageContent>
        </Message>
        <Message align="end">
          <MessageContent>
            <Bubble>
              <BubbleContent>Send the report to the team.</BubbleContent>
            </Bubble>
            <MessageFooter>Read yesterday</MessageFooter>
          </MessageContent>
        </Message>
      </Example>
      <Example title="Ghost reply and attachment" className="items-stretch">
        <Message>
          <MessageContent>
            <MessageHeader>Assistant</MessageHeader>
            <Bubble variant="ghost">
              <BubbleContent>
                Here is the summary. Plain text runs the full width, with no
                frame around it.
              </BubbleContent>
            </Bubble>
            <Attachment>
              <AttachmentMedia>
                <FileTextIcon />
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>summary.pdf</AttachmentTitle>
                <AttachmentDescription>PDF · 1.4 MB</AttachmentDescription>
              </AttachmentContent>
            </Attachment>
            <MessageFooter>
              <Button size="icon-xs" variant="ghost" accessibilityLabel="Copy">
                <CopyIcon />
              </Button>
              <Text className="text-xs text-muted-foreground">12 seconds</Text>
            </MessageFooter>
          </MessageContent>
        </Message>
      </Example>
      <Example title="Group" className="items-stretch">
        <MessageGroup>
          <Message>
            <MessageAvatar />
            <MessageContent>
              <Bubble variant="muted">
                <BubbleContent>I checked the registry addresses.</BubbleContent>
              </Bubble>
            </MessageContent>
          </Message>
          <Message>
            <MessageAvatar>
              <Avatar>
                <AvatarFallback>GE</AvatarFallback>
              </Avatar>
            </MessageAvatar>
            <MessageContent>
              <Bubble variant="muted">
                <BubbleContent>They all resolve.</BubbleContent>
              </Bubble>
            </MessageContent>
          </Message>
        </MessageGroup>
      </Example>
    </ExampleWrapper>
  )
}

export { MessageExample }
