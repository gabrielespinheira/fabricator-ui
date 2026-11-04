import { Example, ExampleWrapper } from "@/examples/native/example"
import {
  CheckIcon,
  CircleAlertIcon,
  InfoIcon,
  TriangleAlertIcon,
} from "@fabricator-ui/icons-react-native"
import { Pressable, View } from "react-native"

import { Badge } from "@/registry/native/ui/badge"
import { Spinner } from "@/registry/native/ui/spinner"
import { Text } from "@/registry/native/ui/text"

const VARIANTS = [
  "default",
  "secondary",
  "destructive",
  "outline",
  "ghost",
  "link",
  "info",
  "success",
  "warning",
  "error",
] as const

function BadgeExample() {
  return (
    <ExampleWrapper>
      <Example title="Variants" className="flex-row flex-wrap">
        {VARIANTS.map((variant) => (
          <Badge key={variant} variant={variant}>
            {variant}
          </Badge>
        ))}
      </Example>
      <Example title="With an icon" className="flex-row flex-wrap">
        <Badge>
          <CheckIcon />
          Verified
        </Badge>
        <Badge variant="info">
          <InfoIcon />
          New
        </Badge>
        <Badge variant="success">
          <CheckIcon />
          Paid
        </Badge>
        <Badge variant="warning">
          <TriangleAlertIcon />
          Overdue
        </Badge>
        <Badge variant="error">
          <CircleAlertIcon />
          Failed
        </Badge>
      </Example>
      <Example title="With a spinner">
        <Badge variant="secondary">
          <Spinner className="size-3" />
          Syncing
        </Badge>
      </Example>
      <Example title="Invalid">
        <Badge variant="outline" aria-invalid>
          Missing a date
        </Badge>
      </Example>
      <Example title="Pressable" className="flex-row flex-wrap">
        <Badge render={<Pressable onPress={() => {}} />}>Open</Badge>
        <Badge variant="info" asChild>
          <Pressable onPress={() => {}}>
            <Text>Details</Text>
          </Pressable>
        </Badge>
      </Example>
      <Example title="Beside text">
        <View className="flex-row items-center gap-2">
          <Text>Acme Inc</Text>
          <Badge variant="success">Active</Badge>
        </View>
      </Example>
    </ExampleWrapper>
  )
}

export { BadgeExample }
