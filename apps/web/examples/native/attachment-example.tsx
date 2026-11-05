import { Example, ExampleWrapper } from "@/examples/native/example"
import {
  CheckIcon,
  ClockIcon,
  FileTextIcon,
  FileWarningIcon,
  RefreshCwIcon,
  XIcon,
} from "@fabricator-ui/icons-react-native"
import { Image } from "react-native"

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/registry/native/ui/attachment"
import { Spinner } from "@/registry/native/ui/spinner"
import { Text } from "@/registry/native/ui/text"

const PHOTO =
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&auto=format&fit=crop&q=80"

const SIZES = ["default", "sm", "xs"] as const

function AttachmentExample() {
  return (
    <ExampleWrapper fit>
      <Example title="States" className="items-stretch">
        <Attachment state="idle" className="w-full">
          <AttachmentMedia>
            <ClockIcon />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>selected-file.pdf</AttachmentTitle>
            <AttachmentDescription>Ready to upload</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction accessibilityLabel="Remove selected-file.pdf">
              <XIcon />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
        <Attachment state="uploading" className="w-full">
          <AttachmentMedia>
            <Spinner />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>design-system.zip</AttachmentTitle>
            <AttachmentDescription>Uploading · 64%</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction accessibilityLabel="Cancel upload">
              <XIcon />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
        <Attachment state="processing" className="w-full">
          <AttachmentMedia>
            <FileTextIcon />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>market-research.pdf</AttachmentTitle>
            <AttachmentDescription>Processing document</AttachmentDescription>
          </AttachmentContent>
        </Attachment>
        <Attachment state="error" className="w-full">
          <AttachmentMedia>
            <FileWarningIcon />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>financial-model.xlsx</AttachmentTitle>
            <AttachmentDescription>
              Upload failed. Try again.
            </AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction accessibilityLabel="Retry upload">
              <RefreshCwIcon />
            </AttachmentAction>
            <AttachmentAction accessibilityLabel="Remove financial-model.xlsx">
              <XIcon />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
        <Attachment state="done" className="w-full">
          <AttachmentMedia>
            <CheckIcon />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>uploaded-report.pdf</AttachmentTitle>
            <AttachmentDescription>Uploaded</AttachmentDescription>
          </AttachmentContent>
        </Attachment>
      </Example>
      <Example title="Sizes">
        {SIZES.map((size) => (
          <Attachment key={size} size={size} orientation="horizontal">
            <AttachmentMedia>
              <FileTextIcon />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>report-{size}.pdf</AttachmentTitle>
              <AttachmentDescription>PDF · 1.4 MB</AttachmentDescription>
            </AttachmentContent>
          </Attachment>
        ))}
      </Example>
      <Example title="Text only">
        {SIZES.map((size) => (
          <Attachment key={size} size={size}>
            <AttachmentContent>
              <AttachmentTitle>notes-{size}.txt</AttachmentTitle>
            </AttachmentContent>
          </Attachment>
        ))}
      </Example>
      <Example title="Orientation: vertical" className="flex-row flex-wrap">
        <Attachment orientation="vertical">
          <AttachmentMedia variant="image">
            <Image src={PHOTO} alt="An office with plants by the window" />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>workspace.png</AttachmentTitle>
            <AttachmentDescription>PNG · 820 KB</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction
              variant="secondary"
              accessibilityLabel="Remove workspace.png"
            >
              <XIcon />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
        <Attachment orientation="vertical" state="uploading">
          <AttachmentMedia variant="image">
            <Image src={PHOTO} alt="An office with plants by the window" />
          </AttachmentMedia>
        </Attachment>
        <Attachment orientation="vertical" state="uploading">
          <AttachmentMedia variant="icon">
            <Spinner />
          </AttachmentMedia>
        </Attachment>
      </Example>
      <Example title="Pressable">
        <Attachment>
          <AttachmentMedia>
            <FileTextIcon />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>briefing-notes.pdf</AttachmentTitle>
            <AttachmentDescription>Press to open</AttachmentDescription>
          </AttachmentContent>
          <AttachmentTrigger accessibilityLabel="Open briefing-notes.pdf" />
        </Attachment>
      </Example>
      <Example title="Group" className="items-stretch p-3">
        <AttachmentGroup>
          {["briefing-notes.pdf", "customers.csv", "renderer.tsx"].map(
            (name) => (
              <Attachment key={name} className="w-56">
                <AttachmentMedia>
                  <FileTextIcon />
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>{name}</AttachmentTitle>
                  <AttachmentDescription>Swipe for more</AttachmentDescription>
                </AttachmentContent>
              </Attachment>
            )
          )}
        </AttachmentGroup>
        <Text className="px-1 text-muted-foreground">
          A horizontal scroller. Attachments keep their width.
        </Text>
      </Example>
    </ExampleWrapper>
  )
}

export { AttachmentExample }
