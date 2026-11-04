import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"

import { Checkbox } from "@/registry/native/ui/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "@/registry/native/ui/field"
import { Input } from "@/registry/native/ui/input"
import { RadioGroup, RadioGroupItem } from "@/registry/native/ui/radio-group"
import { Switch } from "@/registry/native/ui/switch"
import { Textarea } from "@/registry/native/ui/textarea"

function FieldExample() {
  const [isAccepted, setIsAccepted] = React.useState(true)
  return (
    <ExampleWrapper>
      <Example title="Vertical">
        <FieldGroup>
          <Field orientation="vertical">
            <FieldLabel>Name</FieldLabel>
            <Input placeholder="Gabs" />
            <FieldDescription>Shown on your invoices.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel>Press me to focus the box</FieldLabel>
            <Textarea placeholder="A note for Acme Inc" />
          </Field>
        </FieldGroup>
      </Example>
      <Example title="Horizontal: the label presses the control">
        <FieldGroup>
          <Field orientation="horizontal">
            <Switch accessibilityLabel="Marketing emails" />
            <FieldLabel>Marketing emails</FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle>Security alerts</FieldTitle>
              <FieldDescription>Always on for owners.</FieldDescription>
            </FieldContent>
            <Switch accessibilityLabel="Security alerts" defaultChecked />
          </Field>
          <Field orientation="horizontal">
            <Checkbox
              accessibilityLabel="Accept the terms"
              checked={isAccepted}
              onCheckedChange={setIsAccepted}
            />
            <FieldLabel onPress={() => setIsAccepted(!isAccepted)}>
              Accept the terms
            </FieldLabel>
          </Field>
        </FieldGroup>
      </Example>
      <Example title="Responsive">
        <Field orientation="responsive">
          <FieldLabel>Workspace</FieldLabel>
          <Input defaultValue="Acme Inc" />
        </Field>
      </Example>
      <Example title="Invalid">
        <Field data-invalid>
          <FieldLabel>Email</FieldLabel>
          <Input aria-invalid defaultValue="not an email" />
          <FieldError>Enter a valid email address.</FieldError>
        </Field>
        <Field data-invalid>
          <FieldLabel>Password</FieldLabel>
          <Textarea defaultValue="short" />
          <FieldError
            errors={[
              { message: "At least 8 characters." },
              { message: "At least one digit." },
            ]}
          />
        </Field>
      </Example>
      <Example title="Disabled">
        <Field data-disabled>
          <FieldLabel>Plan</FieldLabel>
          <Textarea defaultValue="Managed by your admin." />
        </Field>
      </Example>
      <Example title="A set, with a separator">
        <FieldSet>
          <FieldLegend>Delivery</FieldLegend>
          <FieldDescription>How should we reach you?</FieldDescription>
          <RadioGroup defaultValue="email">
            <Field orientation="horizontal">
              <RadioGroupItem accessibilityLabel="Email" value="email" />
              <FieldLabel>Email</FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <RadioGroupItem accessibilityLabel="Text" value="text" />
              <FieldLabel>Text message</FieldLabel>
            </Field>
          </RadioGroup>
          <FieldSeparator>Or</FieldSeparator>
          <FieldLegend variant="label">Not at all</FieldLegend>
          <FieldSeparator />
        </FieldSet>
      </Example>
      <Example title="Choice card">
        <RadioGroup defaultValue="pro">
          <FieldLabel>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>Pro</FieldTitle>
                <FieldDescription>For growing teams.</FieldDescription>
              </FieldContent>
              <RadioGroupItem accessibilityLabel="Pro" value="pro" />
            </Field>
          </FieldLabel>
          <FieldLabel>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>Enterprise</FieldTitle>
                <FieldDescription>For large companies.</FieldDescription>
              </FieldContent>
              <RadioGroupItem
                accessibilityLabel="Enterprise"
                value="enterprise"
              />
            </Field>
          </FieldLabel>
        </RadioGroup>
      </Example>
    </ExampleWrapper>
  )
}

export { FieldExample }
