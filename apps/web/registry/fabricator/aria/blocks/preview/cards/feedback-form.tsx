"use client"

// Fabricator: uses Select instead of NativeSelect, which isn't part of the
// Fabricator library. Everything else matches the upstream file.
import { Button } from "@/registry/bases/aria/ui/button"
import { Card, CardContent, CardFooter } from "@/registry/bases/aria/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/registry/bases/aria/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/bases/aria/ui/select"
import { Textarea } from "@/registry/bases/aria/ui/textarea"

export function FeedbackForm() {
  return (
    <Card>
      <CardContent>
        <form id="feedback-form">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="topic">Topic</FieldLabel>
              <Select placeholder="Select a topic">
                <SelectTrigger id="topic" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem id="ai">AI</SelectItem>
                    <SelectItem id="accounts-and-access-controls">
                      Accounts and Access Controls
                    </SelectItem>
                    <SelectItem id="billing">Billing</SelectItem>
                    <SelectItem id="cdn">CDN (Firewall, Caching)</SelectItem>
                    <SelectItem id="ci-cd">
                      CI/CD (Builds, Deployments, Environment Variables)
                    </SelectItem>
                    <SelectItem id="dashboard-interface">
                      Dashboard Interface (Navigation, UI Issues)
                    </SelectItem>
                    <SelectItem id="domains">Domains</SelectItem>
                    <SelectItem id="frameworks">Frameworks</SelectItem>
                    <SelectItem id="marketplace-and-integrations">
                      Marketplace and Integrations
                    </SelectItem>
                    <SelectItem id="observability">
                      Observability (Observability, Logs, Monitoring)
                    </SelectItem>
                    <SelectItem id="storage">Storage</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="feedback">Feedback</FieldLabel>
              <Textarea
                id="feedback"
                placeholder="Your feedback helps us improve..."
              />
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <Button
          type="submit"
          form="feedback-form"
          className="style-sera:w-full"
        >
          Submit
        </Button>
      </CardFooter>
    </Card>
  )
}
