"use client"

import * as React from "react"

import { SearchIcon } from "@/lib/site-icons"
import { Checkbox } from "@/styles/base-fabricator/ui/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/styles/base-fabricator/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/styles/base-fabricator/ui/input-group"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/styles/base-fabricator/ui/input-otp"
import { Kbd } from "@/styles/base-fabricator/ui/kbd"
import { Label } from "@/styles/base-fabricator/ui/label"
import {
  RadioGroup,
  RadioGroupItem,
} from "@/styles/base-fabricator/ui/radio-group"
import { Search } from "@/styles/base-fabricator/ui/search"
import { Slider } from "@/styles/base-fabricator/ui/slider"
import { Switch } from "@/styles/base-fabricator/ui/switch"

export function SwitchDemo() {
  return (
    <FieldGroup className="w-[220px] gap-4">
      <Field orientation="horizontal">
        <Switch id="home-notifications" defaultChecked />
        <FieldLabel htmlFor="home-notifications">Notifications</FieldLabel>
      </Field>
      <Field orientation="horizontal">
        <Switch id="home-sounds" />
        <FieldLabel htmlFor="home-sounds">Sound effects</FieldLabel>
      </Field>
      <Field orientation="horizontal">
        <Switch id="home-autosave" defaultChecked />
        <FieldLabel htmlFor="home-autosave">Auto-save</FieldLabel>
      </Field>
    </FieldGroup>
  )
}

export function SliderDemo() {
  const [value, setValue] = React.useState(35)

  return (
    <div className="flex w-[260px] flex-col gap-3">
      <div className="flex items-center justify-between text-sm">
        <Label htmlFor="home-opacity">Opacity</Label>
        <span className="text-muted-foreground tabular-nums">{value}%</span>
      </div>
      <Slider
        id="home-opacity"
        value={[value]}
        onValueChange={(next) =>
          setValue(Array.isArray(next) ? next[0] : (next as number))
        }
        max={100}
        step={1}
      />
    </div>
  )
}

const SPRINGS = [
  { value: "fast", label: "Fast spring" },
  { value: "moderate", label: "Moderate spring" },
  { value: "slow", label: "Slow spring" },
  { value: "none", label: "No animation" },
]

export function RadioGroupDemo() {
  return (
    <RadioGroup defaultValue="moderate" className="w-[200px]">
      {SPRINGS.map((spring) => (
        <Field key={spring.value} orientation="horizontal">
          <RadioGroupItem
            value={spring.value}
            id={`home-spring-${spring.value}`}
          />
          <FieldLabel htmlFor={`home-spring-${spring.value}`}>
            {spring.label}
          </FieldLabel>
        </Field>
      ))}
    </RadioGroup>
  )
}

const PEOPLE = [
  {
    id: "ana",
    name: "Ana Silva",
    role: "Design",
  },
  {
    id: "tomas",
    name: "Tomás Reyes",
    role: "Engineering",
  },
  {
    id: "mia",
    name: "Mia Chen",
    role: "Research",
  },
  {
    id: "leo",
    name: "Leo Martin",
    role: "Product",
  },
]

// Assignees: one horizontal Field per person, as in the Field docs.
export function CheckboxDemo() {
  const [picked, setPicked] = React.useState<string[]>(["ana", "tomas"])

  return (
    <FieldGroup className="w-[240px] gap-4">
      {PEOPLE.map((person) => (
        <Field key={person.id} orientation="horizontal">
          <Checkbox
            id={`assign-${person.id}`}
            checked={picked.includes(person.id)}
            onCheckedChange={(checked) =>
              setPicked((current) =>
                checked
                  ? [...current, person.id]
                  : current.filter((id) => id !== person.id)
              )
            }
          />
          <FieldContent>
            <FieldLabel htmlFor={`assign-${person.id}`}>
              {person.name}
            </FieldLabel>
            <FieldDescription>{person.role}</FieldDescription>
          </FieldContent>
        </Field>
      ))}
    </FieldGroup>
  )
}

export function InputOTPDemo() {
  const [value, setValue] = React.useState("482")

  return (
    <InputOTP maxLength={6} value={value} onChange={setValue}>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  )
}

export function SearchDemo() {
  return (
    <InputGroup className="w-[280px]">
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput placeholder="Search components" />
      <InputGroupAddon align="inline-end">
        <Kbd>⌘K</Kbd>
      </InputGroupAddon>
    </InputGroup>
  )
}

/** Search: a round button that springs open into the field. */
export function SearchFieldDemo() {
  return (
    <div className="flex w-[280px] justify-center">
      <Search size="lg" width="280px" placeholder="Search components" />
    </div>
  )
}
