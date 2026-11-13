"use client"

import * as React from "react"
import { EyeIcon, EyeOffIcon, SearchIcon } from "lucide-react"

import { ColorPickerPopover } from "@/styles/base-fabricator/ui/color-picker"
import { DatePicker } from "@/styles/base-fabricator/ui/date-picker"
import {
  FileUpload,
  FileUploadField,
} from "@/styles/base-fabricator/ui/file-upload"
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/styles/base-fabricator/ui/number-field"
import { TimeInput } from "@/styles/base-fabricator/ui/time-input"
import { Field, FieldGroup, FieldLabel } from "@/styles/base-nova/ui/field"
import { Input } from "@/styles/base-nova/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/styles/base-nova/ui/input-group"

function PasswordField() {
  const [isVisible, setIsVisible] = React.useState(false)

  return (
    <Field>
      <FieldLabel htmlFor="input-type-password">Password</FieldLabel>
      <InputGroup>
        <InputGroupInput
          id="input-type-password"
          type={isVisible ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Enter a password"
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            aria-label={isVisible ? "Hide password" : "Show password"}
            aria-pressed={isVisible}
            onClick={() => setIsVisible(!isVisible)}
          >
            {isVisible ? <EyeOffIcon /> : <EyeIcon />}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </Field>
  )
}

function FileField() {
  return (
    <Field>
      <FieldLabel htmlFor="input-type-file">Files</FieldLabel>
      <FileUpload multiple>
        <FileUploadField id="input-type-file" />
      </FileUpload>
    </Field>
  )
}

export function InputTypes() {
  return (
    <FieldGroup className="grid w-full max-w-xl gap-x-4 gap-y-5 sm:grid-cols-2">
      <Field>
        <FieldLabel htmlFor="input-type-text">Text</FieldLabel>
        <Input id="input-type-text" placeholder="Jordan Lee" />
      </Field>
      <Field>
        <FieldLabel htmlFor="input-type-email">Email</FieldLabel>
        <Input
          id="input-type-email"
          type="email"
          placeholder="jordan@fabricator.dev"
        />
      </Field>
      <PasswordField />
      <Field>
        <FieldLabel htmlFor="input-type-number">Number</FieldLabel>
        <NumberField id="input-type-number" defaultValue={42} min={0}>
          <NumberFieldGroup>
            <NumberFieldDecrement />
            <NumberFieldInput />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>
      </Field>
      <Field>
        <FieldLabel htmlFor="input-type-tel">Phone</FieldLabel>
        <Input id="input-type-tel" type="tel" placeholder="+1 555 0100" />
      </Field>
      <Field>
        <FieldLabel htmlFor="input-type-url">URL</FieldLabel>
        <Input
          id="input-type-url"
          type="url"
          placeholder="https://fabricator.dev"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="input-type-search">Search</FieldLabel>
        <InputGroup>
          <InputGroupInput
            id="input-type-search"
            type="search"
            placeholder="Search..."
          />
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
        </InputGroup>
      </Field>
      <Field>
        <FieldLabel htmlFor="input-type-date">Date</FieldLabel>
        <DatePicker id="input-type-date" placeholder="Nov 12, 2026" />
      </Field>
      <Field>
        <FieldLabel htmlFor="input-type-time">Time</FieldLabel>
        <TimeInput id="input-type-time" placeholder="9:30 AM" />
      </Field>
      <Field>
        <FieldLabel htmlFor="input-type-date-time">Date and time</FieldLabel>
        <DatePicker id="input-type-date-time" hasTime />
      </Field>
      <Field>
        <FieldLabel htmlFor="input-type-month">Month</FieldLabel>
        <DatePicker id="input-type-month" granularity="month" />
      </Field>
      <Field>
        <FieldLabel>Color</FieldLabel>
        <div>
          <ColorPickerPopover defaultValue="#6b97ff" />
        </div>
      </Field>
      <FileField />
    </FieldGroup>
  )
}
