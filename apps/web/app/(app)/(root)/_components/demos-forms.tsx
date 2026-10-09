"use client"

import * as React from "react"

import { SearchIcon } from "@/lib/site-icons"
import {
  FluidHoverHighlight,
  useFluidHover,
  useMergedRef,
} from "@/styles/base-fabricator/lib/fluid-hover"
import { Checkbox } from "@/styles/base-fabricator/ui/checkbox"
import {
  Field,
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
    gradient:
      "radial-gradient(circle at 30% 30%, #fbcfe8, #ec4899 45%, #a855f7)",
  },
  {
    id: "tomas",
    name: "Tomás Reyes",
    role: "Engineering",
    gradient:
      "radial-gradient(circle at 30% 30%, #bae6fd, #3b82f6 45%, #6366f1)",
  },
  {
    id: "mia",
    name: "Mia Chen",
    role: "Research",
    gradient:
      "radial-gradient(circle at 30% 30%, #d9f99d, #22c55e 45%, #14b8a6)",
  },
  {
    id: "leo",
    name: "Leo Martin",
    role: "Product",
    gradient:
      "radial-gradient(circle at 30% 30%, #fed7aa, #f97316 45%, #ef4444)",
  },
]

// Assignees: whole rows toggle their checkbox, one highlight glides between
// rows, and the picked faces stack up in the pill.
export function CheckboxDemo() {
  const [picked, setPicked] = React.useState<string[]>(["ana", "tomas"])
  const fluid = useFluidHover<HTMLDivElement>({ items: "[data-row]" })
  const listRef = useMergedRef(fluid.attach)
  const assigned = PEOPLE.filter((person) => picked.includes(person.id))

  return (
    <div className="flex w-[260px] flex-col gap-2.5">
      <div className="flex h-11 w-fit items-center gap-2 rounded-full bg-foreground/[0.06] ps-1.5 pe-3">
        <div className="flex -space-x-2.5">
          {assigned.length > 0 ? (
            assigned.map((person) => (
              <span
                key={person.id}
                className="size-8 rounded-full ring-2 ring-surface-3 transition-transform duration-moderate ease-spring-bounce dark:ring-surface-2"
                style={{ background: person.gradient }}
              />
            ))
          ) : (
            <span className="size-8 rounded-full border border-dashed border-foreground/25" />
          )}
        </div>
        <span className="text-[13px] text-muted-foreground tabular-nums">
          {assigned.length === 0 ? "Unassigned" : `${assigned.length} assigned`}
        </span>
      </div>
      <div
        ref={listRef}
        {...fluid.props}
        className="relative isolate flex flex-col rounded-[20px] bg-foreground/[0.04] p-1.5"
      >
        <FluidHoverHighlight hover={fluid.hover} className="rounded-xl" />
        {PEOPLE.map((person) => (
          <label
            key={person.id}
            data-row=""
            className="flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2"
          >
            <span
              aria-hidden
              className="size-8 shrink-0 rounded-full"
              style={{ background: person.gradient }}
            />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[13px] font-medium text-foreground">
                {person.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {person.role}
              </span>
            </span>
            <Checkbox
              checked={picked.includes(person.id)}
              onCheckedChange={(checked) =>
                setPicked((current) =>
                  checked
                    ? [...current, person.id]
                    : current.filter((id) => id !== person.id)
                )
              }
            />
          </label>
        ))}
      </div>
    </div>
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
    <InputGroup className="h-11 w-[280px] rounded-full ps-1">
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput placeholder="Search components" />
      <InputGroupAddon align="inline-end" className="pe-3">
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
