"use client"

// Fabricator: uses Select instead of NativeSelect, which isn't part of the
// Fabricator library. Everything else matches the upstream file.
import { Button } from "@/registry/bases/radix/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/bases/radix/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/registry/bases/radix/ui/field"
import { Input } from "@/registry/bases/radix/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/bases/radix/ui/select"
import { Textarea } from "@/registry/bases/radix/ui/textarea"

export function GithubProfile() {
  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Manage your profile information.</CardDescription>
      </CardHeader>
      <CardContent>
        <form id="profile">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input id="name" placeholder="gabrielespinheira" />
              <FieldDescription>
                Your name may appear around GitHub where you contribute or are
                mentioned. You can remove it at any time.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Public Email</FieldLabel>
              <Select>
                <SelectTrigger id="email" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="m@gabrielespinheira.com">
                      m@gabrielespinheira.com
                    </SelectItem>
                    <SelectItem value="m@gmail.com">m@gmail.com</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>
                You can manage verified email addresses in your{" "}
                <a href="#email-settings">email settings</a>.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="bio">Bio</FieldLabel>
              <Textarea
                id="bio"
                placeholder="Tell us a little bit about yourself"
              />
              <FieldDescription>
                You can <span>@mention</span> other users and organizations to
                link to them.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <Button form="profile" className="style-sera:w-full">
          Save Profile
        </Button>
      </CardFooter>
    </Card>
  )
}
