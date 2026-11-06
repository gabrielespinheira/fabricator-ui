import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/registry/native/ui/accordion"
import { Text } from "@/registry/native/ui/text"

const ITEMS = [
  {
    value: "notifications",
    trigger: "Notification settings",
    content: "Choose how you hear about updates: by email or by push.",
  },
  {
    value: "privacy",
    trigger: "Privacy and security",
    content:
      "Turn on two-factor authentication, manage connected devices and download your data.",
  },
  {
    value: "billing",
    trigger: "Billing and subscription",
    content: "See your plan, past invoices and the payment method on file.",
  },
]

function AccordionRows() {
  return ITEMS.map((item) => (
    <AccordionItem key={item.value} value={item.value}>
      <AccordionTrigger>{item.trigger}</AccordionTrigger>
      <AccordionContent>{item.content}</AccordionContent>
    </AccordionItem>
  ))
}

function AccordionExample() {
  const [value, setValue] = React.useState(["privacy"])
  return (
    <ExampleWrapper>
      <Example title="One open at a time">
        <Accordion defaultValue={["notifications"]}>
          <AccordionRows />
        </Accordion>
      </Example>
      <Example title="Several open">
        <Accordion multiple defaultValue={["notifications", "billing"]}>
          <AccordionRows />
        </Accordion>
      </Example>
      <Example title="Controlled">
        <Accordion value={value} onValueChange={setValue}>
          <AccordionRows />
        </Accordion>
        <Text className="text-muted-foreground">
          Open: {value.join(", ") || "nothing"}
        </Text>
      </Example>
      <Example title="A disabled item">
        <Accordion defaultValue={["available"]}>
          <AccordionItem value="available">
            <AccordionTrigger>Available</AccordionTrigger>
            <AccordionContent>
              You can open and close this one.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="locked" disabled>
            <AccordionTrigger>Locked</AccordionTrigger>
            <AccordionContent>This one stays shut.</AccordionContent>
          </AccordionItem>
        </Accordion>
      </Example>
      <Example title="All disabled">
        <Accordion disabled>
          <AccordionRows />
        </Accordion>
      </Example>
    </ExampleWrapper>
  )
}

export { AccordionExample }
