"use client"

// Fabricator: uses Select instead of NativeSelect, which isn't part of the
// Fabricator library. Everything else matches the upstream file.
import { Button } from "@/registry/bases/base/ui/button"
import { Card, CardContent, CardFooter } from "@/registry/bases/base/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/registry/bases/base/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/bases/base/ui/select"
import { Textarea } from "@/registry/bases/base/ui/textarea"

export function FeedbackForm() {
  return (
    <Card>
      <CardContent>
        <form id="feedback-form">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="topic">Topic</FieldLabel>
              <Select
                items={[
                  { label: "Select a topic", value: null },
                  { label: "AI", value: "ai" },
                  {
                    label: "Accounts and Access Controls",
                    value: "accounts-and-access-controls",
                  },
                  { label: "Billing", value: "billing" },
                  { label: "CDN (Firewall, Caching)", value: "cdn" },
                  {
                    label: "CI/CD (Builds, Deployments, Environment Variables)",
                    value: "ci-cd",
                  },
                  {
                    label: "Dashboard Interface (Navigation, UI Issues)",
                    value: "dashboard-interface",
                  },
                  { label: "Domains", value: "domains" },
                  { label: "Frameworks", value: "frameworks" },
                  {
                    label: "Marketplace and Integrations",
                    value: "marketplace-and-integrations",
                  },
                  {
                    label: "Observability (Observability, Logs, Monitoring)",
                    value: "observability",
                  },
                  { label: "Storage", value: "storage" },
                ]}
              >
                <SelectTrigger id="topic" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={null}>Select a topic</SelectItem>
                    <SelectItem value="ai">AI</SelectItem>
                    <SelectItem value="accounts-and-access-controls">
                      Accounts and Access Controls
                    </SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="cdn">CDN (Firewall, Caching)</SelectItem>
                    <SelectItem value="ci-cd">
                      CI/CD (Builds, Deployments, Environment Variables)
                    </SelectItem>
                    <SelectItem value="dashboard-interface">
                      Dashboard Interface (Navigation, UI Issues)
                    </SelectItem>
                    <SelectItem value="domains">Domains</SelectItem>
                    <SelectItem value="frameworks">Frameworks</SelectItem>
                    <SelectItem value="marketplace-and-integrations">
                      Marketplace and Integrations
                    </SelectItem>
                    <SelectItem value="observability">
                      Observability (Observability, Logs, Monitoring)
                    </SelectItem>
                    <SelectItem value="storage">Storage</SelectItem>
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
